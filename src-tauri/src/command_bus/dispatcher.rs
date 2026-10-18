use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, RwLock};

use super::types::{
    Actor, Command, CommandDispatchError, CommandResult, LockState,
};

/// Preemption hook signature: (target_node_id, cancelled_task_id)
pub type PreemptionHook = Box<dyn Fn(&str, &str) + Send + Sync + 'static>;

/// CommandBus manages atomic revision checks, command dispatching,
/// node lock lifecycle, and idempotency caching.
pub struct CommandBus {
    /// In-memory node revisions map: target node_id -> current_rev
    revisions: Arc<RwLock<HashMap<String, u64>>>,
    /// In-memory node lock table: target node_id -> LockState
    locks: Arc<RwLock<HashMap<String, LockState>>>,
    /// Idempotency cache: idempotency_key -> CommandResult
    idempotency_cache: Arc<RwLock<HashMap<String, CommandResult>>>,
    /// Global monotonic sequence generator for event / command ordering
    seq: Arc<AtomicU64>,
    /// Hook invoked when a Designer command preempts an Agent generating lock
    preemption_hook: Arc<RwLock<Option<PreemptionHook>>>,
}

impl Default for CommandBus {
    fn default() -> Self {
        Self::new()
    }
}

#[allow(dead_code)]
impl CommandBus {
    /// Create a new, thread-safe CommandBus instance.
    pub fn new() -> Self {
        Self {
            revisions: Arc::new(RwLock::new(HashMap::new())),
            locks: Arc::new(RwLock::new(HashMap::new())),
            idempotency_cache: Arc::new(RwLock::new(HashMap::new())),
            seq: Arc::new(AtomicU64::new(0)),
            preemption_hook: Arc::new(RwLock::new(None)),
        }
    }

    /// Retrieve the current revision of a target node.
    /// If the node has not yet been modified, its revision is 0.
    pub fn get_revision(&self, target: &str) -> u64 {
        self.revisions
            .read()
            .ok()
            .and_then(|revs| revs.get(target).copied())
            .unwrap_or(0)
    }

    /// Explicitly set the revision of a target node (e.g. during recovery or testing).
    pub fn set_revision(&self, target: &str, rev: u64) {
        if let Ok(mut revs) = self.revisions.write() {
            revs.insert(target.to_string(), rev);
        }
    }

    /// Read the current global monotonic sequence number.
    pub fn get_current_seq(&self) -> u64 {
        self.seq.load(Ordering::SeqCst)
    }

    /// Register a callback to be invoked when a Designer preempts an in-flight Agent task.
    pub fn set_preemption_hook<F>(&self, hook: F)
    where
        F: Fn(&str, &str) + Send + Sync + 'static,
    {
        if let Ok(mut guard) = self.preemption_hook.write() {
            *guard = Some(Box::new(hook));
        }
    }

    /// Acquire a generating lock on `target` for an Agent `task_id`.
    /// Fails with `ERR_NODE_LOCKED` if the node is already in `Generating` state.
    pub fn acquire_lock(
        &self,
        target: &str,
        task_id: &str,
        actor: Actor,
    ) -> Result<(), CommandDispatchError> {
        let current_rev = self.get_revision(target);
        if target.trim().is_empty() || task_id.trim().is_empty() {
            return Err(CommandDispatchError::invalid_command(
                "Target and task_id cannot be empty",
                current_rev,
            ));
        }
        let mut locks = self.locks.write().map_err(|_| {
            CommandDispatchError::invalid_command("Lock table poisoned", current_rev)
        })?;

        if let Some(lock) = locks.get(target) {
            if let LockState::Generating {
                task_id: existing_task,
                ..
            } = lock
            {
                return Err(CommandDispatchError::node_locked(
                    target,
                    current_rev,
                    &format!("Node is already generating under task '{}'", existing_task),
                ));
            }
        }

        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);

        locks.insert(
            target.to_string(),
            LockState::Generating {
                task_id: task_id.to_string(),
                actor,
                started_at: now_ms,
            },
        );

        Ok(())
    }

    /// Release any lock held on `target`.
    pub fn release_lock(&self, target: &str) {
        if let Ok(mut locks) = self.locks.write() {
            locks.remove(target);
        }
    }

    /// Get current lock state of `target`.
    pub fn get_lock_state(&self, target: &str) -> LockState {
        self.locks
            .read()
            .ok()
            .and_then(|locks| locks.get(target).cloned())
            .unwrap_or(LockState::Idle)
    }

    /// Check if `target` is currently locked in `Generating` state.
    pub fn is_locked(&self, target: &str) -> bool {
        matches!(self.get_lock_state(target), LockState::Generating { .. })
    }

    /// Atomically dispatch a Command through the CommandBus.
    ///
    /// 1. Validates command fields.
    /// 2. Checks idempotency cache: if previously executed, returns cached result.
    /// 3. Checks node lock state:
    ///    - If Agent and node is Generating: rejects with ERR_NODE_LOCKED.
    ///    - If Designer and node is Generating: preempts Agent task, clears lock, invokes preemption hook.
    /// 4. Checks optimistic revision (`base_rev`):
    ///    - If Agent and `command.base_rev != current_rev`: rejects with ERR_REV_CONFLICT.
    ///    - If Designer / System: accepts and increments revision.
    /// 5. Advances `node_rev` by 1 (`new_rev = current_rev + 1`).
    /// 6. Generates monotonic `seq`.
    /// 7. Stores result in idempotency cache if key provided.
    pub fn dispatch(&self, command: Command) -> Result<CommandResult, CommandDispatchError> {
        let current_rev = self.get_revision(&command.target);

        // 1. Validation
        if command.id.trim().is_empty() {
            return Err(CommandDispatchError::invalid_command(
                "Command 'id' cannot be empty",
                current_rev,
            ));
        }
        if command.r#type.trim().is_empty() {
            return Err(CommandDispatchError::invalid_command(
                "Command 'type' cannot be empty",
                current_rev,
            ));
        }
        if command.target.trim().is_empty() {
            return Err(CommandDispatchError::invalid_command(
                "Command 'target' cannot be empty",
                current_rev,
            ));
        }

        // 2. Idempotency Check
        if let Some(ref key) = command.idempotency_key {
            if let Ok(cache) = self.idempotency_cache.read() {
                if let Some(cached) = cache.get(key) {
                    return Ok(cached.clone());
                }
            }
        }

        let target = &command.target;

        // 3. Lock & Preemption Evaluation
        let mut preempted_task_id: Option<String> = None;
        {
            let mut locks = self.locks.write().map_err(|_| {
                CommandDispatchError::invalid_command("Lock table poisoned", current_rev)
            })?;

            if let Some(lock) = locks.get(target) {
                if let LockState::Generating { task_id, .. } = lock {
                    match command.actor {
                        Actor::Agent => {
                            return Err(CommandDispatchError::node_locked(
                                target,
                                current_rev,
                                &format!("Node is locked by active agent task '{}'", task_id),
                            ));
                        }
                        Actor::Designer => {
                            // Preempt Agent: clear lock and record task_id
                            preempted_task_id = Some(task_id.clone());
                            locks.remove(target);
                        }
                        Actor::System => {
                            // System commands can proceed
                        }
                    }
                }
            }
        } // `locks` write guard is explicitly dropped here

        // Fire preemption hook AFTER dropping `locks` write guard to prevent deadlocks
        if let Some(ref task_id) = preempted_task_id {
            if let Ok(hook_guard) = self.preemption_hook.read() {
                if let Some(ref hook) = *hook_guard {
                    hook(target, task_id);
                }
            }
        }

        // 4. Atomic Revision Check, Advance, and Idempotency Cache Update
        let result = {
            let mut revs = self.revisions.write().map_err(|_| {
                CommandDispatchError::invalid_command("Revisions lock poisoned", current_rev)
            })?;

            // Double-check idempotency cache under revisions lock to prevent concurrent races
            if let Some(ref key) = command.idempotency_key {
                if let Ok(cache) = self.idempotency_cache.read() {
                    if let Some(cached) = cache.get(key) {
                        return Ok(cached.clone());
                    }
                }
            }

            let current = *revs.get(target).unwrap_or(&0);

            // Agent commands MUST match base_rev exactly
            if command.base_rev != current && command.actor == Actor::Agent {
                return Err(CommandDispatchError::rev_conflict(
                    target,
                    command.base_rev,
                    current,
                ));
            }

            // Advance node_rev: new_rev = current_rev + 1
            let next_rev = current + 1;
            revs.insert(target.clone(), next_rev);

            // Generate monotonic sequence number
            let next_seq = self.seq.fetch_add(1, Ordering::SeqCst) + 1;

            let result = CommandResult::success(target, command.base_rev, next_rev, next_seq);

            // Atomically update idempotency cache before releasing revisions lock
            if let Some(ref key) = command.idempotency_key {
                if let Ok(mut cache) = self.idempotency_cache.write() {
                    cache.insert(key.clone(), result.clone());
                }
            }

            result
        };

        Ok(result)
    }

    /// Dispatch command and return `CommandResult`, capturing any error
    /// as a failure result (`success: false`).
    pub fn dispatch_safe(&self, command: Command) -> CommandResult {
        let target = command.target.clone();
        match self.dispatch(command) {
            Ok(res) => res,
            Err(err) => CommandResult::failure(target, err.code, err.current_rev, err.message),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_command_serde_frozen_fields() {
        let cmd = Command {
            id: "cmd-uuid-1".to_string(),
            r#type: "canvas.node.update".to_string(),
            target: "node-100".to_string(),
            payload: json!({ "x": 100, "y": 200 }),
            actor: Actor::Designer,
            base_rev: 0,
            batch_id: Some("batch-1".to_string()),
            idempotency_key: Some("idem-1".to_string()),
        };

        let serialized = serde_json::to_string(&cmd).unwrap();
        assert!(serialized.contains("\"id\":\"cmd-uuid-1\""));
        assert!(serialized.contains("\"type\":\"canvas.node.update\""));
        assert!(serialized.contains("\"target\":\"node-100\""));
        assert!(serialized.contains("\"actor\":\"designer\""));
        assert!(serialized.contains("\"base_rev\":0"));
        assert!(serialized.contains("\"batch_id\":\"batch-1\""));
        assert!(serialized.contains("\"idempotency_key\":\"idem-1\""));

        // Test roundtrip
        let deserialized: Command = serde_json::from_str(&serialized).unwrap();
        assert_eq!(cmd, deserialized);

        // Test camelCase aliases from frontend JSON
        let frontend_json = r#"{
            "id": "cmd-uuid-2",
            "type": "canvas.node.move",
            "target": "node-101",
            "payload": { "dx": 5 },
            "actor": "agent",
            "baseRev": 3,
            "batchId": "b-2",
            "idempotencyKey": "idem-2"
        }"#;
        let from_frontend: Command = serde_json::from_str(frontend_json).unwrap();
        assert_eq!(from_frontend.actor, Actor::Agent);
        assert_eq!(from_frontend.base_rev, 3);
        assert_eq!(from_frontend.batch_id.as_deref(), Some("b-2"));
        assert_eq!(from_frontend.idempotency_key.as_deref(), Some("idem-2"));

        // Test "user" alias for Actor::Designer
        let user_cmd_json = r#"{
            "id": "cmd-uuid-3",
            "type": "canvas.node.move",
            "target": "node-102",
            "payload": {},
            "actor": "user",
            "base_rev": 1
        }"#;
        let from_user: Command = serde_json::from_str(user_cmd_json).unwrap();
        assert_eq!(from_user.actor, Actor::Designer);
    }

    #[test]
    fn test_atomic_node_rev_increment() {
        let bus = CommandBus::new();
        let target = "node-alpha";
        assert_eq!(bus.get_revision(target), 0);

        // Rev 0 -> 1 (Designer)
        let cmd1 = Command {
            id: "cmd-1".to_string(),
            r#type: "canvas.node.create".to_string(),
            target: target.to_string(),
            payload: json!({ "x": 10 }),
            actor: Actor::Designer,
            base_rev: 0,
            batch_id: None,
            idempotency_key: None,
        };
        let res1 = bus.dispatch(cmd1).unwrap();
        assert!(res1.success);
        assert_eq!(res1.base_rev, 0);
        assert_eq!(res1.new_rev, 1);
        assert_eq!(res1.seq, 1);
        assert_eq!(bus.get_revision(target), 1);

        // Rev 1 -> 2 (Agent with matching base_rev)
        let cmd2 = Command {
            id: "cmd-2".to_string(),
            r#type: "canvas.node.update".to_string(),
            target: target.to_string(),
            payload: json!({ "x": 20 }),
            actor: Actor::Agent,
            base_rev: 1,
            batch_id: None,
            idempotency_key: None,
        };
        let res2 = bus.dispatch(cmd2).unwrap();
        assert!(res2.success);
        assert_eq!(res2.base_rev, 1);
        assert_eq!(res2.new_rev, 2);
        assert_eq!(res2.seq, 2);
        assert_eq!(bus.get_revision(target), 2);

        // Rev 2 -> 3 (System)
        let cmd3 = Command {
            id: "cmd-3".to_string(),
            r#type: "canvas.node.sync".to_string(),
            target: target.to_string(),
            payload: json!({ "x": 30 }),
            actor: Actor::System,
            base_rev: 2,
            batch_id: None,
            idempotency_key: None,
        };
        let res3 = bus.dispatch(cmd3).unwrap();
        assert!(res3.success);
        assert_eq!(res3.base_rev, 2);
        assert_eq!(res3.new_rev, 3);
        assert_eq!(res3.seq, 3);
        assert_eq!(bus.get_revision(target), 3);
    }

    #[test]
    fn test_conflict_rejection_agent_stale_base_rev() {
        let bus = CommandBus::new();
        let target = "node-beta";

        // Advance to rev 1
        let cmd1 = Command {
            id: "cmd-1".to_string(),
            r#type: "canvas.node.create".to_string(),
            target: target.to_string(),
            payload: json!({}),
            actor: Actor::Designer,
            base_rev: 0,
            batch_id: None,
            idempotency_key: None,
        };
        bus.dispatch(cmd1).unwrap();
        assert_eq!(bus.get_revision(target), 1);

        // Agent attempts dispatch with stale base_rev = 0
        let stale_agent_cmd = Command {
            id: "cmd-stale".to_string(),
            r#type: "canvas.node.complete_generation".to_string(),
            target: target.to_string(),
            payload: json!({ "image": "out.png" }),
            actor: Actor::Agent,
            base_rev: 0,
            batch_id: None,
            idempotency_key: None,
        };

        let err = bus.dispatch(stale_agent_cmd).unwrap_err();
        assert_eq!(err.code, "ERR_REV_CONFLICT");
        assert_eq!(err.current_rev, 1);
        assert!(err.message.contains("Revision conflict"));

        // Verify node revision was NOT incremented
        assert_eq!(bus.get_revision(target), 1);
    }

    #[test]
    fn test_designer_preemptive_authority() {
        let bus = CommandBus::new();
        let target = "node-gamma";

        // Advance to rev 2
        bus.set_revision(target, 2);

        // Designer dispatches with base_rev = 0 (stale, but Designer has preemptive authority)
        let designer_cmd = Command {
            id: "cmd-designer".to_string(),
            r#type: "canvas.node.move".to_string(),
            target: target.to_string(),
            payload: json!({ "x": 500 }),
            actor: Actor::Designer,
            base_rev: 0,
            batch_id: None,
            idempotency_key: None,
        };

        let res = bus.dispatch(designer_cmd).unwrap();
        assert!(res.success);
        assert_eq!(res.base_rev, 0);
        assert_eq!(res.new_rev, 3);
        assert_eq!(bus.get_revision(target), 3);
    }

    #[test]
    fn test_idempotency_key_handling() {
        let bus = CommandBus::new();
        let target = "node-delta";
        let idem_key = "idemp-key-999".to_string();

        let cmd = Command {
            id: "cmd-first".to_string(),
            r#type: "canvas.node.update".to_string(),
            target: target.to_string(),
            payload: json!({ "color": "red" }),
            actor: Actor::Designer,
            base_rev: 0,
            batch_id: None,
            idempotency_key: Some(idem_key.clone()),
        };

        let res1 = bus.dispatch(cmd.clone()).unwrap();
        assert_eq!(res1.new_rev, 1);
        assert_eq!(res1.seq, 1);
        assert_eq!(bus.get_revision(target), 1);

        // Re-dispatch with identical idempotency key
        let res2 = bus.dispatch(cmd).unwrap();
        assert_eq!(res2.new_rev, 1);
        assert_eq!(res2.seq, 1);
        assert_eq!(res1, res2);

        // Target revision remains 1 (not 2)
        assert_eq!(bus.get_revision(target), 1);
    }

    #[test]
    fn test_lock_state_and_designer_preemption() {
        let bus = Arc::new(CommandBus::new());
        let target = "node-epsilon";

        // Track preemption callbacks
        let preempted_task = Arc::new(std::sync::Mutex::new(None));
        let preempt_clone = Arc::clone(&preempted_task);
        bus.set_preemption_hook(move |_tgt, task_id| {
            let mut guard = preempt_clone.lock().unwrap();
            *guard = Some(task_id.to_string());
        });

        // Agent acquires generating lock
        bus.acquire_lock(target, "task-long-run-42", Actor::Agent).unwrap();
        assert!(bus.is_locked(target));

        // Another agent tries to dispatch: rejected with ERR_NODE_LOCKED
        let agent_cmd = Command {
            id: "cmd-agent".to_string(),
            r#type: "canvas.node.update".to_string(),
            target: target.to_string(),
            payload: json!({}),
            actor: Actor::Agent,
            base_rev: 0,
            batch_id: None,
            idempotency_key: None,
        };
        let err = bus.dispatch(agent_cmd).unwrap_err();
        assert_eq!(err.code, "ERR_NODE_LOCKED");

        // Designer dispatches: triggers preemption
        let designer_cmd = Command {
            id: "cmd-designer-preempt".to_string(),
            r#type: "canvas.node.override".to_string(),
            target: target.to_string(),
            payload: json!({ "userAction": "drag" }),
            actor: Actor::Designer,
            base_rev: 0,
            batch_id: None,
            idempotency_key: None,
        };
        let res = bus.dispatch(designer_cmd).unwrap();
        assert!(res.success);
        assert_eq!(res.new_rev, 1);

        // Assert lock was cleared
        assert!(!bus.is_locked(target));
        // Assert preemption hook was called with task ID
        assert_eq!(
            preempted_task.lock().unwrap().as_deref(),
            Some("task-long-run-42")
        );
    }

    #[test]
    fn test_command_validation_empty_fields() {
        let bus = CommandBus::new();

        // Empty ID
        let cmd_bad_id = Command {
            id: "  ".to_string(),
            r#type: "canvas.node.update".to_string(),
            target: "node-1".to_string(),
            payload: json!({}),
            actor: Actor::Designer,
            base_rev: 0,
            batch_id: None,
            idempotency_key: None,
        };
        assert_eq!(
            bus.dispatch(cmd_bad_id).unwrap_err().code,
            "ERR_INVALID_COMMAND"
        );

        // Empty Target
        let cmd_bad_target = Command {
            id: "cmd-1".to_string(),
            r#type: "canvas.node.update".to_string(),
            target: "".to_string(),
            payload: json!({}),
            actor: Actor::Designer,
            base_rev: 0,
            batch_id: None,
            idempotency_key: None,
        };
        assert_eq!(
            bus.dispatch(cmd_bad_target).unwrap_err().code,
            "ERR_INVALID_COMMAND"
        );

        // Empty Type
        let cmd_bad_type = Command {
            id: "cmd-1".to_string(),
            r#type: " ".to_string(),
            target: "node-1".to_string(),
            payload: json!({}),
            actor: Actor::Designer,
            base_rev: 0,
            batch_id: None,
            idempotency_key: None,
        };
        assert_eq!(
            bus.dispatch(cmd_bad_type).unwrap_err().code,
            "ERR_INVALID_COMMAND"
        );
    }

    #[test]
    fn test_concurrent_dispatches_thread_safety() {
        let bus = Arc::new(CommandBus::new());
        let handles: Vec<_> = (0..10)
            .map(|i| {
                let bus = Arc::clone(&bus);
                std::thread::spawn(move || {
                    let cmd = Command {
                        id: format!("cmd-thread-{}", i),
                        r#type: "canvas.node.update".to_string(),
                        target: "node-shared".to_string(),
                        payload: json!({ "thread": i }),
                        actor: Actor::Designer,
                        base_rev: 0,
                        batch_id: None,
                        idempotency_key: None,
                    };
                    bus.dispatch(cmd).unwrap()
                })
            })
            .collect();

        for h in handles {
            let res = h.join().unwrap();
            assert!(res.success);
        }

        // Shared node must have reached revision 10
        assert_eq!(bus.get_revision("node-shared"), 10);
        // Sequence must have reached 10
        assert_eq!(bus.get_current_seq(), 10);
    }

    #[test]
    fn test_preemption_hook_reentrancy_no_deadlock() {
        let bus = Arc::new(CommandBus::new());
        let target = "node-reentrancy-test";
        let task_id = "agent-task-123";

        let bus_clone = Arc::clone(&bus);
        let checked_lock_during_hook = Arc::new(std::sync::Mutex::new(false));
        let checked_clone = Arc::clone(&checked_lock_during_hook);

        bus.set_preemption_hook(move |tgt, _tid| {
            // Reentrancy: read lock status from inside the callback
            let locked = bus_clone.is_locked(tgt);
            let state = bus_clone.get_lock_state(tgt);
            let mut guard = checked_clone.lock().unwrap();
            *guard = !locked && matches!(state, LockState::Idle);
        });

        bus.acquire_lock(target, task_id, Actor::Agent).unwrap();
        assert!(bus.is_locked(target));

        let designer_cmd = Command {
            id: "cmd-preempt".to_string(),
            r#type: "canvas.node.override".to_string(),
            target: target.to_string(),
            payload: json!({ "userAction": "delete" }),
            actor: Actor::Designer,
            base_rev: 0,
            batch_id: None,
            idempotency_key: None,
        };

        let res = bus.dispatch(designer_cmd).unwrap();
        assert!(res.success);
        assert_eq!(res.new_rev, 1);
        assert!(!bus.is_locked(target));
        assert_eq!(*checked_lock_during_hook.lock().unwrap(), true);
    }

    #[test]
    fn test_concurrent_identical_idempotency_race_prevention() {
        let bus = Arc::new(CommandBus::new());
        let target = "node-idem-race";
        let idem_key = "idem-race-key-42".to_string();
        let num_threads = 16;
        let barrier = Arc::new(std::sync::Barrier::new(num_threads));

        let handles: Vec<_> = (0..num_threads)
            .map(|i| {
                let bus = Arc::clone(&bus);
                let barrier = Arc::clone(&barrier);
                let key = idem_key.clone();
                std::thread::spawn(move || {
                    let cmd = Command {
                        id: format!("cmd-idem-{}", i),
                        r#type: "canvas.node.update".to_string(),
                        target: target.to_string(),
                        payload: json!({ "attempt": i }),
                        actor: Actor::Designer,
                        base_rev: 0,
                        batch_id: None,
                        idempotency_key: Some(key),
                    };
                    barrier.wait();
                    bus.dispatch(cmd)
                })
            })
            .collect();

        let mut results = Vec::new();
        for h in handles {
            let res = h.join().unwrap().unwrap();
            results.push(res);
        }

        // All threads must receive the EXACT same revision and sequence
        let first = &results[0];
        assert_eq!(first.new_rev, 1);
        assert_eq!(first.seq, 1);

        for r in &results {
            assert_eq!(r.new_rev, 1);
            assert_eq!(r.seq, 1);
        }

        // Final revision in bus must be exactly 1, not incremented 16 times
        assert_eq!(bus.get_revision(target), 1);
        assert_eq!(bus.get_current_seq(), 1);
    }

    #[test]
    fn test_acquire_lock_empty_inputs_validation() {
        let bus = CommandBus::new();
        let err1 = bus.acquire_lock("   ", "task-1", Actor::Agent).unwrap_err();
        assert_eq!(err1.code, "ERR_INVALID_COMMAND");
        assert!(err1.message.contains("Target and task_id cannot be empty"));

        let err2 = bus.acquire_lock("node-1", "", Actor::Agent).unwrap_err();
        assert_eq!(err2.code, "ERR_INVALID_COMMAND");
        assert!(err2.message.contains("Target and task_id cannot be empty"));
    }
}
