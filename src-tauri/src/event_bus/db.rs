use std::path::Path;
use std::sync::Mutex;
use rusqlite::{params, Connection, OptionalExtension};

use super::types::{AppendEventInput, EventRecord, NodeRevisionRecord};

/// Thread-safe SQLite WAL EventBus engine.
pub struct EventBus {
    conn: Mutex<Connection>,
}

#[allow(dead_code)]
impl EventBus {
    /// Open or create an EventBus database at the specified path.
    /// Configures WAL mode, normal synchronous durability, and runs DDL schema migrations.
    pub fn open(path: &Path) -> Result<Self, String> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create event_bus directory: {e}"))?;
        }

        let conn = Connection::open(path)
            .map_err(|e| format!("Failed to open event_bus sqlite db: {e}"))?;

        Self::init_connection(conn)
    }

    /// Open an in-memory SQLite EventBus for testing and ephemeral execution.
    pub fn open_in_memory() -> Result<Self, String> {
        let conn = Connection::open_in_memory()
            .map_err(|e| format!("Failed to open in-memory sqlite db: {e}"))?;

        Self::init_connection(conn)
    }

    fn init_connection(conn: Connection) -> Result<Self, String> {
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
        })
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
        let conn = self
            .conn
            .lock()
            .map_err(|_| "EventBus connection lock poisoned".to_string())?;

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
        let conn = self
            .conn
            .lock()
            .map_err(|_| "EventBus connection lock poisoned".to_string())?;

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

    /// Read the highest monotonic seq number in the events table.
    pub fn get_latest_seq(&self) -> Result<i64, String> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| "EventBus connection lock poisoned".to_string())?;

        let mut stmt = conn
            .prepare_cached("SELECT COALESCE(MAX(seq), 0) FROM events")
            .map_err(|e| format!("SQLite prepare error: {e}"))?;

        let seq: i64 = stmt
            .query_row([], |row| row.get(0))
            .map_err(|e| format!("SQLite query error: {e}"))?;

        Ok(seq)
    }

    /// Append a single event transactionally (<5ms latency).
    pub fn append_event(&self, input: AppendEventInput) -> Result<EventRecord, String> {
        let mut conn = self
            .conn
            .lock()
            .map_err(|_| "EventBus connection lock poisoned".to_string())?;

        let tx = conn
            .transaction()
            .map_err(|e| format!("Failed to begin SQLite transaction: {e}"))?;

        let record = Self::insert_event_internal(&tx, input)?;

        tx.commit()
            .map_err(|e| format!("Failed to commit SQLite transaction: {e}"))?;

        Ok(record)
    }

    /// Append a batch of events within a single atomic SQLite transaction (<5ms IPC micro-batching).
    pub fn append_events_batch(
        &self,
        inputs: Vec<AppendEventInput>,
    ) -> Result<Vec<EventRecord>, String> {
        if inputs.is_empty() {
            return Ok(Vec::new());
        }

        let mut conn = self
            .conn
            .lock()
            .map_err(|_| "EventBus connection lock poisoned".to_string())?;

        let tx = conn
            .transaction()
            .map_err(|e| format!("Failed to begin SQLite transaction: {e}"))?;

        let mut results = Vec::with_capacity(inputs.len());
        for input in inputs {
            let record = Self::insert_event_internal(&tx, input)?;
            results.push(record);
        }

        tx.commit()
            .map_err(|e| format!("Failed to commit SQLite transaction: {e}"))?;

        Ok(results)
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
        let conn = self
            .conn
            .lock()
            .map_err(|_| "EventBus connection lock poisoned".to_string())?;

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
