use serde::{Deserialize, Serialize};

/// Frozen EventRecord schema representing an immutable event in the SQLite EventBus.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EventRecord {
    /// Monotonically increasing sequential ID assigned by SQLite AUTOINCREMENT
    pub seq: i64,
    /// Unique event UUID
    #[serde(alias = "event_id")]
    pub event_id: String,
    /// Optional command ID that triggered this event
    #[serde(default, skip_serializing_if = "Option::is_none", alias = "command_id")]
    pub command_id: Option<String>,
    /// Optional batch ID for grouped operations
    #[serde(default, skip_serializing_if = "Option::is_none", alias = "batch_id")]
    pub batch_id: Option<String>,
    /// Event type taxonomy (e.g., "canvas.node.created", "canvas.node.moved")
    #[serde(alias = "event_type")]
    pub event_type: String,
    /// Target node ID or entity ID
    #[serde(alias = "target_node_id", alias = "target")]
    pub target_node_id: String,
    /// Originating actor: "designer", "agent", or "system"
    pub actor: String,
    /// Node revision before this event
    #[serde(alias = "base_rev")]
    pub base_rev: u64,
    /// Node revision after this event
    #[serde(alias = "new_rev")]
    pub new_rev: u64,
    /// Structured payload for this event
    pub payload: serde_json::Value,
    /// Optional idempotency key for deduplication
    #[serde(default, skip_serializing_if = "Option::is_none", alias = "idempotency_key")]
    pub idempotency_key: Option<String>,
    /// Creation timestamp in milliseconds (epoch)
    #[serde(alias = "created_at", alias = "timestamp")]
    pub created_at: i64,
}

/// Flexible input schema for appending an event to the EventBus.
/// Supports both camelCase and snake_case field aliases for seamless IPC.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppendEventInput {
    /// Unique event ID. If omitted or empty, a UUID v4 is automatically generated.
    #[serde(default, alias = "id", alias = "event_id")]
    pub event_id: Option<String>,
    /// Optional command ID that caused this event
    #[serde(default, alias = "command_id")]
    pub command_id: Option<String>,
    /// Optional batch ID for atomic grouped operations
    #[serde(default, alias = "batch_id")]
    pub batch_id: Option<String>,
    /// Event type string (e.g. "canvas.node.created", "canvas.node.moved")
    #[serde(alias = "type", alias = "event_type")]
    pub event_type: String,
    /// Target node ID or entity ID
    #[serde(alias = "target", alias = "target_node_id")]
    pub target_node_id: String,
    /// Actor initiating the event ("designer", "agent", "system")
    #[serde(default, alias = "actor")]
    pub actor: Option<String>,
    /// Expected base revision of target node. If omitted, uses current revision in database.
    #[serde(default, alias = "base_rev")]
    pub base_rev: Option<u64>,
    /// Target node revision after this event. If omitted, computed as base_rev + 1.
    #[serde(default, alias = "new_rev")]
    pub new_rev: Option<u64>,
    /// Event payload. If omitted, defaults to an empty JSON object.
    #[serde(default)]
    pub payload: Option<serde_json::Value>,
    /// Optional idempotency key for duplicate elimination
    #[serde(default, alias = "idempotency_key")]
    pub idempotency_key: Option<String>,
    /// Timestamp in milliseconds. If omitted, defaults to current system time.
    #[serde(default, alias = "created_at", alias = "timestamp")]
    pub created_at: Option<i64>,
}

/// Snapshot record of a node's current revision status.
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NodeRevisionRecord {
    pub node_id: String,
    pub current_rev: u64,
    pub last_seq: i64,
    pub updated_at: i64,
}

/// Query parameters for retrieving events from the EventBus.
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EventQuery {
    #[serde(default, alias = "target", alias = "target_node_id")]
    pub target: Option<String>,
    #[serde(default, alias = "since_seq", alias = "from_seq")]
    pub since_seq: Option<i64>,
    #[serde(default)]
    pub limit: Option<usize>,
}

/// Checkpoint mode for SQLite WAL maintenance.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CheckpointMode {
    Passive,
    Full,
    Restart,
    Truncate,
}

impl Default for CheckpointMode {
    fn default() -> Self {
        Self::Truncate
    }
}

/// Result returned from a SQLite WAL checkpoint operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CheckpointResult {
    /// True if SQLite could not complete checkpoint due to active concurrent locks.
    pub busy: bool,
    /// Total number of frames in the WAL file prior to checkpoint.
    pub log: i64,
    /// Total number of frames successfully checkpointed back to main DB.
    pub checkpointed: i64,
}

/// Options for pruning historical event logs to prevent SQLite file bloat.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PruneOptions {
    /// Delete events strictly with seq < before_seq
    #[serde(default, alias = "before_seq", alias = "beforeSeq")]
    pub before_seq: Option<i64>,
    /// Retain at most the newest N events (older events are pruned)
    #[serde(
        default,
        alias = "retain_latest",
        alias = "retainLatest",
        alias = "keep_latest",
        alias = "keepLatest"
    )]
    pub retain_latest: Option<usize>,
    /// Delete events created before timestamp (epoch ms)
    #[serde(default, alias = "before_timestamp", alias = "beforeTimestamp")]
    pub before_timestamp: Option<i64>,
    /// Whether to run PRAGMA wal_checkpoint(TRUNCATE) after pruning to shrink WAL file
    #[serde(
        default = "default_checkpoint_after",
        alias = "checkpoint_after",
        alias = "checkpointAfter"
    )]
    pub checkpoint_after: bool,
}

fn default_checkpoint_after() -> bool {
    true
}

impl Default for PruneOptions {
    fn default() -> Self {
        Self {
            before_seq: None,
            retain_latest: None,
            before_timestamp: None,
            checkpoint_after: true,
        }
    }
}

/// Result of an event log pruning operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PruneResult {
    /// Number of event records pruned from the database
    pub deleted_count: u64,
    /// Sequence cutoff threshold below which events were deleted (seq < pruned_before_seq)
    pub pruned_before_seq: i64,
    /// Total remaining event count in the database
    pub remaining_count: u64,
    /// Checkpoint result if checkpoint_after was executed
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub checkpoint: Option<CheckpointResult>,
}
