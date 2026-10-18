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
