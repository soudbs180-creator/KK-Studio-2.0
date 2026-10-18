use serde::{Deserialize, Serialize};

/// Predefined error codes for CommandBus dispatching
pub const ERR_REV_CONFLICT: &str = "ERR_REV_CONFLICT";
pub const ERR_NODE_LOCKED: &str = "ERR_NODE_LOCKED";
pub const ERR_INVALID_COMMAND: &str = "ERR_INVALID_COMMAND";

/// Actor executing the command: Designer, Agent, or System.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Actor {
    #[serde(alias = "user")]
    Designer,
    Agent,
    System,
}

impl std::fmt::Display for Actor {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Actor::Designer => write!(f, "designer"),
            Actor::Agent => write!(f, "agent"),
            Actor::System => write!(f, "system"),
        }
    }
}

/// Frozen Command schema for CommandBus dispatch.
/// All fields are strongly typed and immutable during command lifecycle.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Command {
    /// Unique command ID (UUID v4)
    pub id: String,
    /// Command type identifier (e.g. "canvas.node.update", "canvas.node.move")
    pub r#type: String,
    /// Target canvas node or entity ID
    pub target: String,
    /// Arbitrary payload data for the command
    pub payload: serde_json::Value,
    /// Originating actor (Designer, Agent, System)
    pub actor: Actor,
    /// Expected base revision for optimistic concurrency check
    #[serde(alias = "baseRev")]
    pub base_rev: u64,
    /// Optional batch ID for grouped command dispatches
    #[serde(default, skip_serializing_if = "Option::is_none", alias = "batchId")]
    pub batch_id: Option<String>,
    /// Optional idempotency key to prevent duplicate command processing
    #[serde(default, skip_serializing_if = "Option::is_none", alias = "idempotencyKey")]
    pub idempotency_key: Option<String>,
}

/// Command dispatch result schema.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CommandResult {
    /// True if command was accepted and processed successfully
    pub success: bool,
    /// Target node ID
    pub target: String,
    /// Expected base revision of target node before dispatch
    #[serde(alias = "baseRev")]
    pub base_rev: u64,
    /// New revision of target node after dispatch
    #[serde(alias = "newRev", alias = "node_rev", alias = "nodeRev")]
    pub new_rev: u64,
    /// Monotonic global sequence number assigned to this command
    pub seq: u64,
    /// Error code if dispatch failed (e.g. ERR_REV_CONFLICT)
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// Current revision of target node when failure occurred
    #[serde(default, skip_serializing_if = "Option::is_none", alias = "currentRev")]
    pub current_rev: Option<u64>,
    /// Human-readable explanation of result or failure
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[allow(dead_code)]
impl CommandResult {
    /// Construct a successful dispatch result.
    pub fn success(target: impl Into<String>, base_rev: u64, new_rev: u64, seq: u64) -> Self {
        Self {
            success: true,
            target: target.into(),
            base_rev,
            new_rev,
            seq,
            error: None,
            current_rev: None,
            message: None,
        }
    }

    /// Construct a failed dispatch result.
    pub fn failure(
        target: impl Into<String>,
        error_code: impl Into<String>,
        current_rev: u64,
        message: impl Into<String>,
    ) -> Self {
        let tgt = target.into();
        Self {
            success: false,
            target: tgt,
            base_rev: current_rev,
            new_rev: current_rev,
            seq: 0,
            error: Some(error_code.into()),
            current_rev: Some(current_rev),
            message: Some(message.into()),
        }
    }

    /// Accessor for `node_rev` (synonym for `new_rev`).
    pub fn node_rev(&self) -> u64 {
        self.new_rev
    }
}

/// Strongly-typed error returned on command dispatch failures.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CommandDispatchError {
    /// Error code string (ERR_REV_CONFLICT, ERR_NODE_LOCKED, ERR_INVALID_COMMAND)
    pub code: String,
    /// Current revision of the target node
    #[serde(alias = "currentRev")]
    pub current_rev: u64,
    /// Detailed error description
    pub message: String,
}

impl CommandDispatchError {
    /// Create a revision conflict error (ERR_REV_CONFLICT).
    pub fn rev_conflict(target: &str, base_rev: u64, current_rev: u64) -> Self {
        Self {
            code: ERR_REV_CONFLICT.to_string(),
            current_rev,
            message: format!(
                "Revision conflict on target '{}': base_rev ({}) != current_rev ({})",
                target, base_rev, current_rev
            ),
        }
    }

    /// Create a node locked error (ERR_NODE_LOCKED).
    pub fn node_locked(target: &str, current_rev: u64, reason: &str) -> Self {
        Self {
            code: ERR_NODE_LOCKED.to_string(),
            current_rev,
            message: format!("Target '{}' is locked: {}", target, reason),
        }
    }

    /// Create an invalid command error (ERR_INVALID_COMMAND).
    pub fn invalid_command(message: impl Into<String>, current_rev: u64) -> Self {
        Self {
            code: ERR_INVALID_COMMAND.to_string(),
            current_rev,
            message: message.into(),
        }
    }
}

impl std::fmt::Display for CommandDispatchError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for CommandDispatchError {}

/// Lock state of a target canvas node.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum LockState {
    /// Node is free for concurrent interaction
    Idle,
    /// Node is locked by an in-flight background Agent generation task
    Generating {
        task_id: String,
        actor: Actor,
        started_at: i64,
    },
}
