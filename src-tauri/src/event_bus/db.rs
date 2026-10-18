use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Mutex, MutexGuard};
use rusqlite::{params, Connection, OptionalExtension};

use super::types::{
    AppendEventInput, CheckpointMode, CheckpointResult, EventRecord, NodeRevisionRecord,
    PruneOptions, PruneResult,
};

/// Default threshold of uncheckpointed event appends before automatically triggering WAL truncation.
pub const DEFAULT_CHECKPOINT_THRESHOLD: usize = 500;

/// Check whether a rusqlite error represents a database lock or busy condition.
#[allow(dead_code)]
pub fn is_locked_error(err: &rusqlite::Error) -> bool {
    match err {
        rusqlite::Error::SqliteFailure(ffi_err, _) => matches!(
            ffi_err.code,
            rusqlite::ffi::ErrorCode::DatabaseBusy | rusqlite::ffi::ErrorCode::DatabaseLocked
        ),
        _ => {
            let s = err.to_string().to_lowercase();
            s.contains("busy") || s.contains("locked")
        }
    }
}

/// Check whether an error message string represents a database lock or busy condition.
#[allow(dead_code)]
pub fn is_locked_error_str(err: &str) -> bool {
    let s = err.to_lowercase();
    s.contains("busy") || s.contains("locked")
}

/// Thread-safe SQLite WAL EventBus engine with auto-checkpointing, lock self-healing, and compaction.
pub struct EventBus {
    pub(crate) conn: Mutex<Connection>,
    appends_since_checkpoint: AtomicUsize,
    checkpoint_threshold: AtomicUsize,
}

#[allow(dead_code)]
impl EventBus {
    /// Open or create an EventBus database at the specified path with crash lock retry and self-healing.
    /// Configures WAL mode, normal synchronous durability, busy timeout, and runs DDL schema migrations.
    pub fn open(path: &Path) -> Result<Self, String> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create event_bus directory: {e}"))?;
        }

        // Retry open and initialization up to 5 times if database is temporarily locked by another process or crash
        let mut retries = 0;
        let bus = loop {
            match Self::try_open_and_init(path) {
                Ok(b) => break b,
                Err(e) => {
                    if retries < 5 && is_locked_error_str(&e) {
                        retries += 1;
                        std::thread::sleep(std::time::Duration::from_millis(100 * retries as u64));
                    } else {
                        return Err(format!("Failed to open event_bus sqlite db: {e}"));
                    }
                }
            }
        };

        Ok(bus)
    }

    fn try_open_and_init(path: &Path) -> Result<Self, String> {
        let conn = Connection::open(path).map_err(|e| format!("Connection::open error: {e}"))?;
        Self::init_connection(conn)
    }

    /// Open an in-memory SQLite EventBus for testing and ephemeral execution.
    pub fn open_in_memory() -> Result<Self, String> {
        let conn = Connection::open_in_memory()
            .map_err(|e| format!("Failed to open in-memory sqlite db: {e}"))?;

        Self::init_connection(conn)
    }

    fn init_connection(conn: Connection) -> Result<Self, String> {
        // Configure C-level busy timeout of 5000ms for connection lock resilience
        conn.busy_timeout(std::time::Duration::from_millis(5000))
            .map_err(|e| format!("Failed to set SQLite busy timeout: {e}"))?;

        // High-performance Pragmas per ADR and design requirements
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;
             PRAGMA busy_timeout = 5000;
             PRAGMA temp_store = MEMORY;
             PRAGMA mmap_size = 268435456;",
        )
        .map_err(|e| format!("Failed to apply SQLite PRAGMAs: {e}"))?;

        // Crash lock self-healing: passively reconcile and checkpoint any dirty WAL frames
        // left over from prior process termination
        let _ = conn.execute_batch("PRAGMA wal_checkpoint(PASSIVE);");

        // DDL Migrations
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS events (
                seq INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT NOT NULL UNIQUE,
                command_id TEXT,
                batch_id TEXT,
                event_type TEXT NOT NULL,
                target_node_id TEXT NOT NULL,
                actor TEXT NOT NULL,
                base_rev INTEGER NOT NULL,
                new_rev INTEGER NOT NULL,
                payload TEXT NOT NULL,
                idempotency_key TEXT,
                created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_events_target ON events(target_node_id, seq);
            CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);

            CREATE TABLE IF NOT EXISTS node_revisions (
                node_id TEXT PRIMARY KEY,
                current_rev INTEGER NOT NULL,
                last_seq INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );",
        )
        .map_err(|e| format!("Failed to initialize EventBus DDL schema: {e}"))?;

        Ok(Self {
            conn: Mutex::new(conn),
            appends_since_checkpoint: AtomicUsize::new(0),
            checkpoint_threshold: AtomicUsize::new(DEFAULT_CHECKPOINT_THRESHOLD),
        })
    }

    /// Safely acquire the connection mutex with crash lock self-healing.
    /// If another thread previously panicked while holding the connection lock,
    /// the poisoned lock is recovered, any dangling transaction is rolled back,
    /// and normal database access is restored.
    fn get_connection(&self) -> Result<MutexGuard<'_, Connection>, String> {
        match self.conn.lock() {
            Ok(guard) => Ok(guard),
            Err(poisoned) => {
                let guard = poisoned.into_inner();
                // Roll back any dangling transaction left unfinished by the panicked thread
                if !guard.is_autocommit() {
                    let _ = guard.execute_batch("ROLLBACK;");
                }
                Ok(guard)
            }
        }
    }

    /// Set the automatic WAL checkpoint write count threshold (0 to disable).
    pub fn set_checkpoint_threshold(&self, threshold: usize) {
        self.checkpoint_threshold.store(threshold, Ordering::SeqCst);
    }

    /// Get current automatic WAL checkpoint write count threshold.
    pub fn get_checkpoint_threshold(&self) -> usize {
        self.checkpoint_threshold.load(Ordering::SeqCst)
    }

    /// Get number of appends recorded since the last WAL checkpoint.
    pub fn pending_appends_count(&self) -> usize {
        self.appends_since_checkpoint.load(Ordering::SeqCst)
    }

    /// Current timestamp in epoch milliseconds.
    fn current_timestamp_ms() -> i64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0)
    }

    /// Fetch the current revision of a target node. Returns 0 if node is unknown.
    pub fn get_node_revision(&self, node_id: &str) -> Result<u64, String> {
        let conn = self.get_connection()?;

        let mut stmt = conn
            .prepare_cached("SELECT current_rev FROM node_revisions WHERE node_id = ?1")
            .map_err(|e| format!("SQLite prepare error: {e}"))?;

        let rev: Option<i64> = stmt
            .query_row(params![node_id], |row| row.get(0))
            .optional()
            .map_err(|e| format!("SQLite query error: {e}"))?;

        Ok(rev.unwrap_or(0) as u64)
    }

    /// Fetch all node revision records currently registered.
    pub fn get_all_revisions(&self) -> Result<Vec<NodeRevisionRecord>, String> {
        let conn = self.get_connection()?;

        let mut stmt = conn
            .prepare_cached(
                "SELECT node_id, current_rev, last_seq, updated_at FROM node_revisions ORDER BY node_id ASC",
            )
            .map_err(|e| format!("SQLite prepare error: {e}"))?;

        let rows = stmt
            .query_map([], |row| {
                let current_rev: i64 = row.get(1)?;
                Ok(NodeRevisionRecord {
                    node_id: row.get(0)?,
                    current_rev: current_rev as u64,
                    last_seq: row.get(2)?,
                    updated_at: row.get(3)?,
                })
            })
            .map_err(|e| format!("SQLite query map error: {e}"))?;

        let mut results = Vec::new();
        for r in rows {
            results.push(r.map_err(|e| format!("SQLite row read error: {e}"))?);
        }
        Ok(results)
    }

    /// Read the highest monotonic seq number across events, node_revisions watermark, and sqlite_sequence.
    pub fn get_latest_seq(&self) -> Result<i64, String> {
        let conn = self.get_connection()?;

        // 1. Try events table first
        let mut stmt = conn
            .prepare_cached("SELECT COALESCE(MAX(seq), 0) FROM events")
            .map_err(|e| format!("SQLite prepare error: {e}"))?;

        let seq: i64 = stmt
            .query_row([], |row| row.get(0))
            .map_err(|e| format!("SQLite query error: {e}"))?;

        if seq > 0 {
            return Ok(seq);
        }

        // 2. Fallback to node_revisions watermark if events table was pruned
        let mut rev_stmt = conn
            .prepare_cached("SELECT COALESCE(MAX(last_seq), 0) FROM node_revisions")
            .map_err(|e| format!("SQLite prepare error: {e}"))?;

        let rev_seq: i64 = rev_stmt
            .query_row([], |row| row.get(0))
            .unwrap_or(0);

        if rev_seq > 0 {
            return Ok(rev_seq);
        }

        // 3. Fallback to sqlite_sequence if table exists
        let mut seq_stmt = conn
            .prepare_cached("SELECT seq FROM sqlite_sequence WHERE name = 'events'")
            .map_err(|e| format!("SQLite prepare error: {e}"))?;

        let sqlite_seq: Option<i64> = seq_stmt
            .query_row([], |row| row.get(0))
            .optional()
            .unwrap_or(None);

        Ok(sqlite_seq.unwrap_or(0))
    }

    /// Append a single event transactionally (<5ms latency).
    /// Automatically triggers WAL checkpoint when cumulative appends reach the threshold.
    pub fn append_event(&self, input: AppendEventInput) -> Result<EventRecord, String> {
        let record = {
            let mut conn = self.get_connection()?;
            let tx = conn
                .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
                .map_err(|e| format!("Failed to begin SQLite transaction: {e}"))?;

            let record = Self::insert_event_internal(&tx, input)?;

            tx.commit()
                .map_err(|e| format!("Failed to commit SQLite transaction: {e}"))?;

            record
        };

        self.record_appends_and_maybe_checkpoint(1);

        Ok(record)
    }

    /// Append a batch of events within a single atomic SQLite transaction (<5ms IPC micro-batching).
    /// Automatically triggers WAL checkpoint when cumulative appends reach the threshold.
    pub fn append_events_batch(
        &self,
        inputs: Vec<AppendEventInput>,
    ) -> Result<Vec<EventRecord>, String> {
        if inputs.is_empty() {
            return Ok(Vec::new());
        }

        let count = inputs.len();
        let results = {
            let mut conn = self.get_connection()?;
            let tx = conn
                .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
                .map_err(|e| format!("Failed to begin SQLite transaction: {e}"))?;

            let mut results = Vec::with_capacity(count);
            for input in inputs {
                let record = Self::insert_event_internal(&tx, input)?;
                results.push(record);
            }

            tx.commit()
                .map_err(|e| format!("Failed to commit SQLite transaction: {e}"))?;

            results
        };

        self.record_appends_and_maybe_checkpoint(count);

        Ok(results)
    }

    /// Track new appends and trigger WAL checkpoint (TRUNCATE) if threshold is exceeded.
    fn record_appends_and_maybe_checkpoint(&self, count: usize) {
        let threshold = self.checkpoint_threshold.load(Ordering::SeqCst);
        if threshold == 0 {
            return;
        }
        let total = self
            .appends_since_checkpoint
            .fetch_add(count, Ordering::SeqCst)
            + count;
        if total >= threshold {
            let _ = self.checkpoint_internal(CheckpointMode::Truncate);
        }
    }

    /// Internal helper to insert an event and update node_revisions using prepared cached statements.
    fn insert_event_internal(
        tx: &rusqlite::Transaction<'_>,
        input: AppendEventInput,
    ) -> Result<EventRecord, String> {
        if input.event_type.trim().is_empty() {
            return Err("validation: event_type cannot be empty".to_string());
        }
        if input.target_node_id.trim().is_empty() {
            return Err("validation: target_node_id cannot be empty".to_string());
        }

        // 1. Idempotency check: if key already exists, return existing EventRecord
        if let Some(ref idem) = input.idempotency_key {
            if !idem.trim().is_empty() {
                let mut check_stmt = tx
                    .prepare_cached(
                        "SELECT seq, event_id, command_id, batch_id, event_type, target_node_id, actor, base_rev, new_rev, payload, idempotency_key, created_at
                         FROM events WHERE idempotency_key = ?1 LIMIT 1",
                    )
                    .map_err(|e| format!("SQLite prepare error: {e}"))?;

                let existing = check_stmt
                    .query_row(params![idem], |row| {
                        let payload_str: String = row.get(9)?;
                        let payload = serde_json::from_str(&payload_str).unwrap_or(serde_json::Value::Null);
                        let base_rev_i64: i64 = row.get(7)?;
                        let new_rev_i64: i64 = row.get(8)?;
                        Ok(EventRecord {
                            seq: row.get(0)?,
                            event_id: row.get(1)?,
                            command_id: row.get(2)?,
                            batch_id: row.get(3)?,
                            event_type: row.get(4)?,
                            target_node_id: row.get(5)?,
                            actor: row.get(6)?,
                            base_rev: base_rev_i64 as u64,
                            new_rev: new_rev_i64 as u64,
                            payload,
                            idempotency_key: row.get(10)?,
                            created_at: row.get(11)?,
                        })
                    })
                    .optional()
                    .map_err(|e| format!("SQLite idempotency query error: {e}"))?;

                if let Some(record) = existing {
                    return Ok(record);
                }
            }
        }

        let event_id = input
            .event_id
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

        let actor = input
            .actor
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| "designer".to_string());

        let now_ms = input.created_at.unwrap_or_else(Self::current_timestamp_ms);

        let target_node_id = input.target_node_id;

        // 2. Resolve base_rev & new_rev
        let (base_rev, new_rev) = {
            let mut rev_stmt = tx
                .prepare_cached("SELECT current_rev FROM node_revisions WHERE node_id = ?1")
                .map_err(|e| format!("SQLite prepare error: {e}"))?;

            let current_in_db: u64 = rev_stmt
                .query_row(params![&target_node_id], |row| {
                    let r: i64 = row.get(0)?;
                    Ok(r as u64)
                })
                .optional()
                .map_err(|e| format!("SQLite rev lookup error: {e}"))?
                .unwrap_or(0);

            let base = input.base_rev.unwrap_or(current_in_db);
            let next = input.new_rev.unwrap_or(base + 1);
            (base, next)
        };

        // 3. Serialize payload
        let payload_value = input.payload.unwrap_or_else(|| serde_json::json!({}));
        let payload_str = serde_json::to_string(&payload_value)
            .map_err(|e| format!("JSON serialization error: {e}"))?;

        // 4. Insert into events table
        {
            let mut insert_stmt = tx
                .prepare_cached(
                    "INSERT INTO events (
                        event_id, command_id, batch_id, event_type, target_node_id,
                        actor, base_rev, new_rev, payload, idempotency_key, created_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                )
                .map_err(|e| format!("SQLite prepare error: {e}"))?;

            insert_stmt
                .execute(params![
                    event_id,
                    input.command_id,
                    input.batch_id,
                    input.event_type,
                    target_node_id,
                    actor,
                    base_rev as i64,
                    new_rev as i64,
                    payload_str,
                    input.idempotency_key,
                    now_ms,
                ])
                .map_err(|e| format!("Failed to insert event into SQLite: {e}"))?;
        }

        let seq = tx.last_insert_rowid();

        // 5. Upsert into node_revisions table
        {
            let mut upsert_stmt = tx
                .prepare_cached(
                    "INSERT INTO node_revisions (node_id, current_rev, last_seq, updated_at)
                     VALUES (?1, ?2, ?3, ?4)
                     ON CONFLICT(node_id) DO UPDATE SET
                         current_rev = excluded.current_rev,
                         last_seq = excluded.last_seq,
                         updated_at = excluded.updated_at",
                )
                .map_err(|e| format!("SQLite prepare error: {e}"))?;

            upsert_stmt
                .execute(params![
                    target_node_id,
                    new_rev as i64,
                    seq,
                    now_ms,
                ])
                .map_err(|e| format!("Failed to upsert node_revisions: {e}"))?;
        }

        Ok(EventRecord {
            seq,
            event_id,
            command_id: input.command_id,
            batch_id: input.batch_id,
            event_type: input.event_type,
            target_node_id,
            actor,
            base_rev,
            new_rev,
            payload: payload_value,
            idempotency_key: input.idempotency_key,
            created_at: now_ms,
        })
    }

    /// Query ordered events with optional filtering by target, sequence floor, and page limit.
    pub fn query_events(
        &self,
        target: Option<&str>,
        since_seq: Option<i64>,
        limit: Option<usize>,
    ) -> Result<Vec<EventRecord>, String> {
        let conn = self.get_connection()?;

        let page_limit = limit.unwrap_or(1000) as i64;
        let seq_floor = since_seq.unwrap_or(0);

        let mut results = Vec::new();

        if let Some(tgt) = target {
            let mut stmt = conn
                .prepare_cached(
                    "SELECT seq, event_id, command_id, batch_id, event_type, target_node_id, actor, base_rev, new_rev, payload, idempotency_key, created_at
                     FROM events
                     WHERE target_node_id = ?1 AND seq >= ?2
                     ORDER BY seq ASC
                     LIMIT ?3",
                )
                .map_err(|e| format!("SQLite prepare error: {e}"))?;

            let rows = stmt
                .query_map(params![tgt, seq_floor, page_limit], Self::map_event_row)
                .map_err(|e| format!("SQLite query error: {e}"))?;

            for r in rows {
                results.push(r.map_err(|e| format!("SQLite read error: {e}"))?);
            }
        } else {
            let mut stmt = conn
                .prepare_cached(
                    "SELECT seq, event_id, command_id, batch_id, event_type, target_node_id, actor, base_rev, new_rev, payload, idempotency_key, created_at
                     FROM events
                     WHERE seq >= ?1
                     ORDER BY seq ASC
                     LIMIT ?2",
                )
                .map_err(|e| format!("SQLite prepare error: {e}"))?;

            let rows = stmt
                .query_map(params![seq_floor, page_limit], Self::map_event_row)
                .map_err(|e| format!("SQLite query error: {e}"))?;

            for r in rows {
                results.push(r.map_err(|e| format!("SQLite read error: {e}"))?);
            }
        }

        Ok(results)
    }

    /// Run SQLite WAL checkpoint with default TRUNCATE mode.
    /// Smoothly merges WAL log back to the main database and truncates the -wal file.
    pub fn checkpoint(&self) -> Result<CheckpointResult, String> {
        self.checkpoint_internal(CheckpointMode::Truncate)
    }

    /// Run SQLite WAL checkpoint with the specified mode.
    pub fn checkpoint_with_mode(&self, mode: CheckpointMode) -> Result<CheckpointResult, String> {
        self.checkpoint_internal(mode)
    }

    fn checkpoint_internal(&self, mode: CheckpointMode) -> Result<CheckpointResult, String> {
        let conn = self.get_connection()?;
        let mode_str = match mode {
            CheckpointMode::Passive => "PASSIVE",
            CheckpointMode::Full => "FULL",
            CheckpointMode::Restart => "RESTART",
            CheckpointMode::Truncate => "TRUNCATE",
        };

        let sql = format!("PRAGMA wal_checkpoint({});", mode_str);
        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| format!("SQLite prepare error for wal_checkpoint: {e}"))?;

        let result = stmt
            .query_row([], |row| {
                let busy: i32 = row.get(0).unwrap_or(0);
                let log: i64 = row.get(1).unwrap_or(0);
                let checkpointed: i64 = row.get(2).unwrap_or(0);
                Ok(CheckpointResult {
                    busy: busy != 0,
                    log,
                    checkpointed,
                })
            })
            .unwrap_or(CheckpointResult {
                busy: false,
                log: 0,
                checkpointed: 0,
            });

        if !result.busy {
            self.appends_since_checkpoint.store(0, Ordering::SeqCst);
        }
        Ok(result)
    }

    /// Prune old event logs to prevent unbounded database growth while preserving node_revisions baseline.
    pub fn prune(&self, options: PruneOptions) -> Result<PruneResult, String> {
        let (cutoff, deleted_count, remaining_count) = {
            let mut conn = self.get_connection()?;
            let tx = conn
                .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
                .map_err(|e| format!("Failed to begin SQLite transaction: {e}"))?;

            let total_count: u64 = tx
                .query_row("SELECT COUNT(*) FROM events", [], |row| row.get(0))
                .map_err(|e| format!("SQLite count query error: {e}"))?;

            // 1. Calculate retention limit boundary (if retain_latest is specified)
            // If retain_latest is K and total_count <= K, retention boundary is 0 (NOTHING may be deleted).
            // If total_count > K, retention boundary is seq_at_offset + 1 (can delete seq < seq_at_offset + 1).
            let retention_boundary: Option<i64> = if let Some(retain_latest) = options.retain_latest {
                if total_count <= retain_latest as u64 {
                    Some(0)
                } else {
                    let mut stmt = tx
                        .prepare_cached(
                            "SELECT seq FROM events ORDER BY seq DESC LIMIT 1 OFFSET ?1",
                        )
                        .map_err(|e| format!("SQLite prepare error: {e}"))?;

                    let seq_at_offset: Option<i64> = stmt
                        .query_row(params![retain_latest as i64], |row| row.get(0))
                        .optional()
                        .map_err(|e| format!("SQLite query error: {e}"))?;

                    seq_at_offset.map(|s| s + 1)
                }
            } else {
                None
            };

            // 2. Calculate requested deletion candidate cutoffs
            let mut candidates: Vec<i64> = Vec::new();

            if let Some(before_seq) = options.before_seq {
                if before_seq > 0 {
                    candidates.push(before_seq);
                }
            }

            if let Some(before_timestamp) = options.before_timestamp {
                // Find the first event with created_at >= before_timestamp to avoid deleting out-of-order events
                let mut min_stmt = tx
                    .prepare_cached(
                        "SELECT MIN(seq) FROM events WHERE created_at >= ?1",
                    )
                    .map_err(|e| format!("SQLite prepare error: {e}"))?;

                let min_kept_seq: Option<i64> = min_stmt
                    .query_row(params![before_timestamp], |row| row.get(0))
                    .optional()
                    .map_err(|e| format!("SQLite query error: {e}"))?
                    .flatten();

                if let Some(first_kept) = min_kept_seq {
                    if first_kept > 0 {
                        candidates.push(first_kept);
                    }
                } else if total_count > 0 {
                    // All existing events have created_at < before_timestamp
                    let max_seq: i64 = tx
                        .query_row("SELECT COALESCE(MAX(seq), 0) FROM events", [], |row| row.get(0))
                        .map_err(|e| format!("SQLite query error: {e}"))?;
                    if max_seq > 0 {
                        candidates.push(max_seq + 1);
                    }
                }
            }

            // If retain_latest was specified without before_seq or before_timestamp,
            // the candidate is simply the retention boundary.
            if candidates.is_empty() {
                if let Some(boundary) = retention_boundary {
                    candidates.push(boundary);
                }
            }

            // Determine final cutoff respecting the retention boundary constraint
            let mut final_cutoff = candidates.into_iter().min().unwrap_or(0);
            if let Some(boundary) = retention_boundary {
                final_cutoff = final_cutoff.min(boundary);
            }

            let deleted = if final_cutoff > 0 {
                tx.execute("DELETE FROM events WHERE seq < ?1", params![final_cutoff])
                    .map_err(|e| format!("Failed to delete pruned events: {e}"))? as u64
            } else {
                0
            };

            let remaining: u64 = tx
                .query_row("SELECT COUNT(*) FROM events", [], |row| row.get(0))
                .map_err(|e| format!("Failed to count remaining events: {e}"))?;

            tx.commit()
                .map_err(|e| format!("Failed to commit SQLite prune transaction: {e}"))?;

            (final_cutoff, deleted, remaining)
        };

        // Checkpoint outside transaction lock if requested
        let checkpoint = if options.checkpoint_after {
            Some(self.checkpoint_internal(CheckpointMode::Truncate)?)
        } else {
            None
        };

        Ok(PruneResult {
            deleted_count,
            pruned_before_seq: cutoff,
            remaining_count,
            checkpoint,
        })
    }

    fn map_event_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<EventRecord> {
        let payload_str: String = row.get(9)?;
        let payload: serde_json::Value =
            serde_json::from_str(&payload_str).unwrap_or(serde_json::Value::Null);
        let base_rev_i64: i64 = row.get(7)?;
        let new_rev_i64: i64 = row.get(8)?;

        Ok(EventRecord {
            seq: row.get(0)?,
            event_id: row.get(1)?,
            command_id: row.get(2)?,
            batch_id: row.get(3)?,
            event_type: row.get(4)?,
            target_node_id: row.get(5)?,
            actor: row.get(6)?,
            base_rev: base_rev_i64 as u64,
            new_rev: new_rev_i64 as u64,
            payload,
            idempotency_key: row.get(10)?,
            created_at: row.get(11)?,
        })
    }
}

impl Drop for EventBus {
    fn drop(&mut self) {
        if let Ok(conn) = self.conn.get_mut() {
            let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");
        }
    }
}
