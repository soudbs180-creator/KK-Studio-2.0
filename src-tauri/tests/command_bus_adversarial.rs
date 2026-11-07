#[path = "../src/command_bus/mod.rs"]
mod command_bus;

use command_bus::{
    Actor, Command, CommandBus, LockState, ERR_INVALID_COMMAND, ERR_NODE_LOCKED, ERR_REV_CONFLICT,
};
use serde_json::json;
use std::sync::{Arc, Mutex};
use std::thread;

// ============================================================================
// 1. Target Initialization Stress Tests
// ============================================================================

#[test]
fn test_brand_new_node_starts_at_rev_0_and_increments_to_1() {
    let bus = CommandBus::new();
    let target = "brand-new-node-xyz";

    // 1. Verify brand new node revision is 0
    assert_eq!(
        bus.get_revision(target),
        0,
        "Uninitialized node must have revision 0"
    );

    // 2. Dispatch first Designer command with base_rev = 0
    let cmd = Command {
        id: "cmd-init-1".to_string(),
        r#type: "canvas.node.create".to_string(),
        target: target.to_string(),
        payload: json!({ "x": 100, "y": 200, "label": "Initial Node" }),
        actor: Actor::Designer,
        base_rev: 0,
        batch_id: None,
        idempotency_key: None,
    };

    let result = bus
        .dispatch(cmd)
        .expect("First dispatch on brand new node must succeed");

    assert!(result.success);
    assert_eq!(result.target, target);
    assert_eq!(result.base_rev, 0);
    assert_eq!(result.new_rev, 1);
    assert_eq!(result.seq, 1);
    assert_eq!(
        bus.get_revision(target),
        1,
        "Target revision must be 1 after first dispatch"
    );
}

#[test]
fn test_brand_new_node_agent_base_rev_matching_and_mismatch() {
    let bus = CommandBus::new();
    let target_agent = "brand-new-agent-node";

    // Agent with base_rev = 0 succeeds on brand new node
    let agent_cmd_ok = Command {
        id: "cmd-agent-ok".to_string(),
        r#type: "canvas.node.init".to_string(),
        target: target_agent.to_string(),
        payload: json!({ "status": "initializing" }),
        actor: Actor::Agent,
        base_rev: 0,
        batch_id: None,
        idempotency_key: None,
    };
    let res = bus
        .dispatch(agent_cmd_ok)
        .expect("Agent with base_rev 0 on brand new node must succeed");
    assert_eq!(res.new_rev, 1);
    assert_eq!(bus.get_revision(target_agent), 1);

    // Second brand new node: Agent with base_rev = 1 MUST be rejected
    let target_stale = "brand-new-stale-node";
    assert_eq!(bus.get_revision(target_stale), 0);

    let agent_cmd_fail = Command {
        id: "cmd-agent-fail".to_string(),
        r#type: "canvas.node.init".to_string(),
        target: target_stale.to_string(),
        payload: json!({ "status": "initializing" }),
        actor: Actor::Agent,
        base_rev: 1, // Stale! Node is brand new (rev 0)
        batch_id: None,
        idempotency_key: None,
    };

    let err = bus
        .dispatch(agent_cmd_fail)
        .expect_err("Agent with base_rev 1 on brand new node must fail");
    assert_eq!(err.code, ERR_REV_CONFLICT);
    assert_eq!(err.current_rev, 0);
    assert_eq!(
        bus.get_revision(target_stale),
        0,
        "Failed command must not increment revision"
    );
}

#[test]
fn test_concurrent_initialization_of_distinct_nodes() {
    let bus = Arc::new(CommandBus::new());
    let mut handles = vec![];

    for i in 0..50 {
        let bus = Arc::clone(&bus);
        handles.push(thread::spawn(move || {
            let target = format!("node-concurrent-init-{}", i);
            assert_eq!(bus.get_revision(&target), 0);

            let cmd = Command {
                id: format!("cmd-init-{}", i),
                r#type: "canvas.node.create".to_string(),
                target: target.clone(),
                payload: json!({ "index": i }),
                actor: Actor::Designer,
                base_rev: 0,
                batch_id: None,
                idempotency_key: None,
            };

            let res = bus.dispatch(cmd).unwrap();
            assert_eq!(res.base_rev, 0);
            assert_eq!(res.new_rev, 1);
            assert_eq!(bus.get_revision(&target), 1);
            res.seq
        }));
    }

    let mut seqs = vec![];
    for h in handles {
        seqs.push(h.join().unwrap());
    }

    assert_eq!(seqs.len(), 50);
    // All 50 nodes reached rev 1, seq reached 50
    assert_eq!(bus.get_current_seq(), 50);
    // All sequence numbers must be unique
    seqs.sort();
    seqs.dedup();
    assert_eq!(seqs.len(), 50, "All 50 seq numbers must be unique");
}

// ============================================================================
// 2. Designer Preemption Stress Tests
// ============================================================================

#[test]
fn test_designer_preemption_on_stale_base_rev() {
    let bus = CommandBus::new();
    let target = "node-preempt-stale";

    // Advance node to revision 5 through 5 sequential steps
    for i in 0..5 {
        let cmd = Command {
            id: format!("cmd-setup-{}", i),
            r#type: "canvas.node.update".to_string(),
            target: target.to_string(),
            payload: json!({ "step": i }),
            actor: Actor::System,
            base_rev: i,
            batch_id: None,
            idempotency_key: None,
        };
        bus.dispatch(cmd).unwrap();
    }
    assert_eq!(bus.get_revision(target), 5);

    // Designer dispatches with stale base_rev = 0
    let designer_stale = Command {
        id: "cmd-designer-stale-0".to_string(),
        r#type: "canvas.node.override".to_string(),
        target: target.to_string(),
        payload: json!({ "userAction": "manual_override" }),
        actor: Actor::Designer,
        base_rev: 0, // Stale! Current is 5
        batch_id: None,
        idempotency_key: None,
    };

    let res = bus
        .dispatch(designer_stale)
        .expect("Designer must succeed even with stale base_rev");
    assert!(res.success);
    assert_eq!(res.base_rev, 0);
    assert_eq!(res.new_rev, 6, "Revision must increment from 5 to 6");
    assert_eq!(bus.get_revision(target), 6);

    // Designer dispatches with arbitrary non-matching base_rev = 999
    let designer_future = Command {
        id: "cmd-designer-future-999".to_string(),
        r#type: "canvas.node.move".to_string(),
        target: target.to_string(),
        payload: json!({ "x": 999 }),
        actor: Actor::Designer,
        base_rev: 999, // Non-matching base_rev
        batch_id: None,
        idempotency_key: None,
    };

    let res2 = bus
        .dispatch(designer_future)
        .expect("Designer must succeed with any base_rev");
    assert!(res2.success);
    assert_eq!(res2.new_rev, 7);
    assert_eq!(bus.get_revision(target), 7);
}

#[test]
fn test_designer_preemption_clears_generating_lock_and_invokes_hook() {
    let bus = Arc::new(CommandBus::new());
    let target = "node-locked-agent";
    let task_id = "agent-task-long-generation-99";

    let hooked_calls = Arc::new(Mutex::new(Vec::<(String, String)>::new()));
    let hook_capture = Arc::clone(&hooked_calls);
    bus.set_preemption_hook(move |tgt, tid| {
        let mut list = hook_capture.lock().unwrap();
        list.push((tgt.to_string(), tid.to_string()));
    });

    // 1. Agent acquires Generating lock
    bus.acquire_lock(target, task_id, Actor::Agent).unwrap();
    assert!(bus.is_locked(target));
    let lock_state = bus.get_lock_state(target);
    match lock_state {
        LockState::Generating {
            ref task_id,
            actor,
            started_at,
        } => {
            assert_eq!(task_id, "agent-task-long-generation-99");
            assert_eq!(actor, Actor::Agent);
            assert!(started_at > 0);
        }
        _ => panic!("Expected Generating lock state"),
    }

    // 2. Another agent command is blocked
    let agent_cmd = Command {
        id: "cmd-agent-blocked".to_string(),
        r#type: "canvas.node.update".to_string(),
        target: target.to_string(),
        payload: json!({ "attempt": 1 }),
        actor: Actor::Agent,
        base_rev: 0,
        batch_id: None,
        idempotency_key: None,
    };
    let err = bus.dispatch(agent_cmd).unwrap_err();
    assert_eq!(err.code, ERR_NODE_LOCKED);
    assert!(err.message.contains(task_id));

    // 3. Designer preemption command
    let designer_cmd = Command {
        id: "cmd-designer-preempt".to_string(),
        r#type: "canvas.node.drag".to_string(),
        target: target.to_string(),
        payload: json!({ "dragged": true }),
        actor: Actor::Designer,
        base_rev: 0,
        batch_id: None,
        idempotency_key: None,
    };
    let res = bus
        .dispatch(designer_cmd)
        .expect("Designer must preempt and succeed");
    assert!(res.success);
    assert_eq!(res.new_rev, 1);

    // 4. Assert lock was released
    assert!(!bus.is_locked(target));
    assert_eq!(bus.get_lock_state(target), LockState::Idle);

    // 5. Assert hook was called exactly once with correct target and task ID
    let calls = hooked_calls.lock().unwrap();
    assert_eq!(calls.len(), 1);
    assert_eq!(calls[0], (target.to_string(), task_id.to_string()));
}

// ============================================================================
// 3. Payload Varieties Stress Tests
// ============================================================================

#[test]
fn test_payload_varieties_serde_and_dispatch() {
    let bus = CommandBus::new();

    let test_cases = vec![
        ("payload-string", json!("plain string payload")),
        ("payload-int", json!(123456789)),
        ("payload-float", json!(3.141592653589793)),
        ("payload-bool-true", json!(true)),
        ("payload-bool-false", json!(false)),
        ("payload-null", serde_json::Value::Null),
        ("payload-empty-array", json!([])),
        (
            "payload-mixed-array",
            json!([1, "two", null, true, { "sub": "val" }, [4, 5]]),
        ),
        ("payload-empty-obj", json!({})),
        (
            "payload-deep-obj",
            json!({
                "meta": {
                    "version": "2.0.0",
                    "nested": {
                        "deep": {
                            "list": [10, 20, 30],
                            "nullable": null
                        }
                    }
                },
                "flags": [true, false, true]
            }),
        ),
        (
            "payload-unicode-and-emojis",
            json!({
                "title": "设计师创作画布 🎨🚀✨",
                "transparency_preserved": true,
                "alpha_channel": 0.85,
                "tags": ["多模态", "电商跨境", "KK-Studio 2.0"]
            }),
        ),
    ];

    for (target, payload) in test_cases {
        let cmd = Command {
            id: format!("cmd-{}", target),
            r#type: "canvas.node.test_payload".to_string(),
            target: target.to_string(),
            payload: payload.clone(),
            actor: Actor::Designer,
            base_rev: 0,
            batch_id: Some("batch-payload".to_string()),
            idempotency_key: Some(format!("key-{}", target)),
        };

        // Test serde roundtrip
        let serialized = serde_json::to_string(&cmd).expect("Command must serialize");
        let deserialized: Command =
            serde_json::from_str(&serialized).expect("Command must deserialize");
        assert_eq!(cmd.payload, deserialized.payload);
        assert_eq!(cmd.id, deserialized.id);
        assert_eq!(cmd.actor, deserialized.actor);

        // Dispatch through bus
        let res = bus
            .dispatch(deserialized)
            .expect("Dispatch with payload variety must succeed");
        assert!(res.success);
        assert_eq!(res.new_rev, 1);
        assert_eq!(bus.get_revision(target), 1);
    }
}

// ============================================================================
// 4. Validation Rejection Stress Tests
// ============================================================================

#[test]
fn test_validation_empty_command_id() {
    let bus = CommandBus::new();
    let bad_ids = vec!["", "   ", "\t", "\n\r", "   \t  \n "];

    for bad_id in bad_ids {
        let cmd = Command {
            id: bad_id.to_string(),
            r#type: "canvas.node.update".to_string(),
            target: "valid-target".to_string(),
            payload: json!({}),
            actor: Actor::Designer,
            base_rev: 0,
            batch_id: None,
            idempotency_key: None,
        };

        let err = bus
            .dispatch(cmd)
            .expect_err("Empty or whitespace ID must be rejected");
        assert_eq!(err.code, ERR_INVALID_COMMAND);
        assert!(err.message.contains("Command 'id' cannot be empty"));
        assert_eq!(bus.get_revision("valid-target"), 0);
    }
}

#[test]
fn test_validation_empty_target() {
    let bus = CommandBus::new();
    let bad_targets = vec!["", "   ", "\t\t", "\r\n", "   \n "];

    for bad_target in bad_targets {
        let cmd = Command {
            id: "valid-cmd-id".to_string(),
            r#type: "canvas.node.update".to_string(),
            target: bad_target.to_string(),
            payload: json!({}),
            actor: Actor::Designer,
            base_rev: 0,
            batch_id: None,
            idempotency_key: None,
        };

        let err = bus
            .dispatch(cmd)
            .expect_err("Empty or whitespace target must be rejected");
        assert_eq!(err.code, ERR_INVALID_COMMAND);
        assert!(err.message.contains("Command 'target' cannot be empty"));
    }
}

#[test]
fn test_validation_empty_type() {
    let bus = CommandBus::new();
    let bad_types = vec!["", "   ", "\t", "\n"];

    for bad_type in bad_types {
        let cmd = Command {
            id: "valid-cmd-id".to_string(),
            r#type: bad_type.to_string(),
            target: "node-target-1".to_string(),
            payload: json!({}),
            actor: Actor::Designer,
            base_rev: 0,
            batch_id: None,
            idempotency_key: None,
        };

        let err = bus
            .dispatch(cmd)
            .expect_err("Empty or whitespace type must be rejected");
        assert_eq!(err.code, ERR_INVALID_COMMAND);
        assert!(err.message.contains("Command 'type' cannot be empty"));
        assert_eq!(bus.get_revision("node-target-1"), 0);
    }
}

// ============================================================================
// 5. Advanced Edge Cases & Concurrency
// ============================================================================

#[test]
fn test_idempotency_cache_exact_replay_and_no_mutation() {
    let bus = CommandBus::new();
    let target = "node-idemp-test";
    let key = "unique-idemp-token-12345".to_string();

    let cmd = Command {
        id: "cmd-idemp-init".to_string(),
        r#type: "canvas.node.resize".to_string(),
        target: target.to_string(),
        payload: json!({ "width": 800, "height": 600 }),
        actor: Actor::Designer,
        base_rev: 0,
        batch_id: None,
        idempotency_key: Some(key),
    };

    let first_res = bus.dispatch(cmd.clone()).unwrap();
    assert_eq!(first_res.base_rev, 0);
    assert_eq!(first_res.new_rev, 1);
    let first_seq = first_res.seq;

    // Retry 5 times
    for _ in 0..5 {
        let retry_res = bus.dispatch(cmd.clone()).unwrap();
        assert_eq!(retry_res, first_res);
        assert_eq!(retry_res.seq, first_seq);
        assert_eq!(bus.get_revision(target), 1);
        assert_eq!(bus.get_current_seq(), first_seq);
    }
}

#[test]
fn test_dispatch_safe_wrapper_returns_failure_result() {
    let bus = CommandBus::new();

    // 1. Invalid target should return failure result instead of panicking
    let invalid_cmd = Command {
        id: "cmd-safe-1".to_string(),
        r#type: "canvas.node.test".to_string(),
        target: "".to_string(),
        payload: json!({}),
        actor: Actor::Designer,
        base_rev: 0,
        batch_id: None,
        idempotency_key: None,
    };
    let res = bus.dispatch_safe(invalid_cmd);
    assert!(!res.success);
    assert_eq!(res.error.as_deref(), Some(ERR_INVALID_COMMAND));

    // 2. Conflict on agent should return failure result with ERR_REV_CONFLICT
    bus.set_revision("node-safe-target", 5);
    let agent_conflict_cmd = Command {
        id: "cmd-safe-2".to_string(),
        r#type: "canvas.node.test".to_string(),
        target: "node-safe-target".to_string(),
        payload: json!({}),
        actor: Actor::Agent,
        base_rev: 0, // stale
        batch_id: None,
        idempotency_key: None,
    };
    let res2 = bus.dispatch_safe(agent_conflict_cmd);
    assert!(!res2.success);
    assert_eq!(res2.error.as_deref(), Some(ERR_REV_CONFLICT));
    assert_eq!(res2.current_rev, Some(5));
}

#[test]
fn test_preemption_hook_can_query_revision_and_seq() {
    let bus = Arc::new(CommandBus::new());
    let target = "node-hook-query";
    let task_id = "task-query-test";

    bus.set_revision(target, 4);

    let observed_rev = Arc::new(Mutex::new(None));
    let observed_clone = Arc::clone(&observed_rev);
    let bus_clone = Arc::clone(&bus);

    bus.set_preemption_hook(move |tgt, _tid| {
        let rev = bus_clone.get_revision(tgt);
        let seq = bus_clone.get_current_seq();
        let mut obs = observed_clone.lock().unwrap();
        *obs = Some((rev, seq));
    });

    bus.acquire_lock(target, task_id, Actor::Agent).unwrap();

    let designer_cmd = Command {
        id: "cmd-preempt-query".to_string(),
        r#type: "canvas.node.override".to_string(),
        target: target.to_string(),
        payload: json!({}),
        actor: Actor::Designer,
        base_rev: 0,
        batch_id: None,
        idempotency_key: None,
    };

    let res = bus.dispatch(designer_cmd).unwrap();
    assert_eq!(res.new_rev, 5);

    let (obs_rev, obs_seq) = observed_rev.lock().unwrap().expect("Hook must have run");
    assert_eq!(obs_rev, 4);
    assert_eq!(obs_seq, 0); // Seq hasn't incremented yet when hook runs
}

#[test]
fn test_preemption_hook_lock_reentrancy_behavior() {
    let bus = Arc::new(CommandBus::new());
    let target = "node-hook-lock-query";
    let task_id = "task-lock-query-test";

    let bus_clone = Arc::clone(&bus);
    let hook_finished = Arc::new(Mutex::new(false));
    let hook_finished_clone = Arc::clone(&hook_finished);

    bus.set_preemption_hook(move |tgt, _tid| {
        // Attempting to read lock state while write lock is held:
        // In dispatcher.rs:
        // locks.remove(target);
        // hook(...)
        // Since `locks` write guard is still in scope, calling `bus.is_locked()` tries to acquire `locks.read()`.
        // If this deadlocks, we spawn it on a thread with a 500ms timeout.
        let is_locked = bus_clone.is_locked(tgt);
        let mut f = hook_finished_clone.lock().unwrap();
        *f = !is_locked;
    });

    bus.acquire_lock(target, task_id, Actor::Agent).unwrap();

    let bus_for_dispatch = Arc::clone(&bus);
    let (tx, rx) = std::sync::mpsc::channel();

    thread::spawn(move || {
        let designer_cmd = Command {
            id: "cmd-preempt-lock".to_string(),
            r#type: "canvas.node.override".to_string(),
            target: target.to_string(),
            payload: json!({}),
            actor: Actor::Designer,
            base_rev: 0,
            batch_id: None,
            idempotency_key: None,
        };
        let res = bus_for_dispatch.dispatch(designer_cmd);
        let _ = tx.send(res);
    });

    // Wait at most 1 second
    match rx.recv_timeout(std::time::Duration::from_millis(1000)) {
        Ok(dispatch_res) => {
            let res = dispatch_res.unwrap();
            assert!(res.success);
            assert_eq!(*hook_finished.lock().unwrap(), true);
        }
        Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
            panic!("DEADLOCK DETECTED! Calling `bus.is_locked()` inside preemption hook deadlocked because `locks.write()` is held during callback invocation!");
        }
        Err(e) => panic!("Channel error: {:?}", e),
    }
}

#[test]
fn test_preemption_hook_panic_does_not_poison_lock_table() {
    let bus = Arc::new(CommandBus::new());
    let target = "node-hook-panic";
    let task_id = "task-panic-test";

    bus.set_preemption_hook(|_tgt, _tid| {
        panic!("Simulated hook panic");
    });

    bus.acquire_lock(target, task_id, Actor::Agent).unwrap();

    let bus_clone = Arc::clone(&bus);
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(move || {
        let designer_cmd = Command {
            id: "cmd-preempt-panic".to_string(),
            r#type: "canvas.node.override".to_string(),
            target: target.to_string(),
            payload: json!({}),
            actor: Actor::Designer,
            base_rev: 0,
            batch_id: None,
            idempotency_key: None,
        };
        let _ = bus_clone.dispatch(designer_cmd);
    }));

    // Now try to acquire a lock on a completely unrelated node:
    let unrelated_res = bus.acquire_lock("unrelated-node", "task-other", Actor::Agent);
    assert!(
        unrelated_res.is_ok(),
        "Preemption hook panic must not poison lock table for other nodes"
    );
}
