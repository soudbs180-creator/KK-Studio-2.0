#[path = "../src/command_bus/mod.rs"]
mod command_bus;

use command_bus::{Actor, Command, CommandBus, ERR_INVALID_COMMAND, ERR_NODE_LOCKED, ERR_REV_CONFLICT};
use serde_json::json;
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use std::thread;

#[test]
fn test_stress_concurrent_designer_dispatches_single_target() {
    let bus = Arc::new(CommandBus::new());
    let target = "node-stress-concurrent-1";

    let num_threads = 20;
    let ops_per_thread = 50;
    let total_ops = num_threads * ops_per_thread;

    let handles: Vec<_> = (0..num_threads)
        .map(|t_idx| {
            let bus = Arc::clone(&bus);
            thread::spawn(move || {
                let mut results = Vec::with_capacity(ops_per_thread);
                for op_idx in 0..ops_per_thread {
                    let cmd = Command {
                        id: format!("cmd-{}-{}", t_idx, op_idx),
                        r#type: "canvas.node.move".to_string(),
                        target: target.to_string(),
                        payload: json!({ "t": t_idx, "op": op_idx }),
                        actor: Actor::Designer,
                        base_rev: 0, // Designer has preemptive authority
                        batch_id: None,
                        idempotency_key: None,
                    };
                    let res = bus.dispatch(cmd).expect("dispatch failed");
                    results.push(res);
                }
                results
            })
        })
        .collect();

    let mut all_results = Vec::with_capacity(total_ops);
    for h in handles {
        let results = h.join().expect("thread panicked");
        all_results.extend(results);
    }

    assert_eq!(all_results.len(), total_ops);

    // Verify all new_rev values are strictly unique and range 1..=total_ops
    let mut rev_set = HashSet::new();
    let mut seq_set = HashSet::new();

    for res in &all_results {
        assert!(res.success);
        assert_eq!(res.target, target);
        assert!(
            res.new_rev > 0 && res.new_rev <= total_ops as u64,
            "new_rev out of bounds: {}",
            res.new_rev
        );
        assert!(
            rev_set.insert(res.new_rev),
            "Duplicate new_rev detected: {}",
            res.new_rev
        );
        assert!(
            seq_set.insert(res.seq),
            "Duplicate seq detected: {}",
            res.seq
        );
    }

    // Target node revision must match total_ops exactly
    assert_eq!(bus.get_revision(target), total_ops as u64);
    assert_eq!(bus.get_current_seq(), total_ops as u64);
}

#[test]
fn test_stress_concurrent_multi_node_dispatches() {
    let bus = Arc::new(CommandBus::new());
    let num_nodes = 8;
    let num_threads = 16;
    let ops_per_thread = 25;

    let handles: Vec<_> = (0..num_threads)
        .map(|t_idx| {
            let bus = Arc::clone(&bus);
            thread::spawn(move || {
                for op in 0..ops_per_thread {
                    let target_id = format!("node-multi-{}", (t_idx + op) % num_nodes);
                    let cmd = Command {
                        id: format!("cmd-multi-{}-{}", t_idx, op),
                        r#type: "canvas.node.update".to_string(),
                        target: target_id,
                        payload: json!({ "t": t_idx, "op": op }),
                        actor: Actor::Designer,
                        base_rev: 0,
                        batch_id: None,
                        idempotency_key: None,
                    };
                    bus.dispatch(cmd).expect("dispatch should succeed");
                }
            })
        })
        .collect();

    for h in handles {
        h.join().expect("thread join");
    }

    // Verify total dispatches
    let total_dispatches = (num_threads * ops_per_thread) as u64;
    assert_eq!(bus.get_current_seq(), total_dispatches);

    // Verify sum of all node revisions equals total_dispatches
    let mut sum_revs = 0;
    for n in 0..num_nodes {
        let node_id = format!("node-multi-{}", n);
        sum_revs += bus.get_revision(&node_id);
    }
    assert_eq!(sum_revs, total_dispatches);
}

#[test]
fn test_stress_stale_agent_rejection() {
    let bus = Arc::new(CommandBus::new());
    let target = "node-agent-stale";

    // 1. Initial state: rev = 0
    assert_eq!(bus.get_revision(target), 0);

    // 2. Designer advances rev 0 -> 1
    let designer_cmd = Command {
        id: "cmd-designer-init".to_string(),
        r#type: "canvas.node.create".to_string(),
        target: target.to_string(),
        payload: json!({ "content": "initial" }),
        actor: Actor::Designer,
        base_rev: 0,
        batch_id: None,
        idempotency_key: None,
    };
    let res = bus.dispatch(designer_cmd).unwrap();
    assert_eq!(res.new_rev, 1);
    assert_eq!(bus.get_revision(target), 1);

    // 3. Stale agent commands with base_rev = 0 MUST be strictly rejected
    let stale_agent_cmd = Command {
        id: "cmd-agent-stale-1".to_string(),
        r#type: "canvas.node.update".to_string(),
        target: target.to_string(),
        payload: json!({ "generated": true }),
        actor: Actor::Agent,
        base_rev: 0, // stale!
        batch_id: None,
        idempotency_key: None,
    };
    let err = bus.dispatch(stale_agent_cmd).unwrap_err();
    assert_eq!(err.code, ERR_REV_CONFLICT);
    assert_eq!(err.current_rev, 1);
    assert_eq!(bus.get_revision(target), 1);

    // 4. Future agent commands with base_rev = 2 MUST also be rejected (cannot skip revisions)
    let future_agent_cmd = Command {
        id: "cmd-agent-future".to_string(),
        r#type: "canvas.node.update".to_string(),
        target: target.to_string(),
        payload: json!({ "generated": true }),
        actor: Actor::Agent,
        base_rev: 2, // future!
        batch_id: None,
        idempotency_key: None,
    };
    let err = bus.dispatch(future_agent_cmd).unwrap_err();
    assert_eq!(err.code, ERR_REV_CONFLICT);
    assert_eq!(err.current_rev, 1);
    assert_eq!(bus.get_revision(target), 1);

    // 5. Valid agent command with base_rev = 1 MUST succeed and advance to 2
    let valid_agent_cmd = Command {
        id: "cmd-agent-valid".to_string(),
        r#type: "canvas.node.update".to_string(),
        target: target.to_string(),
        payload: json!({ "generated": true }),
        actor: Actor::Agent,
        base_rev: 1, // matches!
        batch_id: None,
        idempotency_key: None,
    };
    let res = bus.dispatch(valid_agent_cmd).unwrap();
    assert_eq!(res.new_rev, 2);
    assert_eq!(bus.get_revision(target), 2);

    // 6. Rapid concurrent stale dispatches from 20 threads: all must be rejected
    let num_stale_threads = 20;
    let handles: Vec<_> = (0..num_stale_threads)
        .map(|i| {
            let bus = Arc::clone(&bus);
            thread::spawn(move || {
                let cmd = Command {
                    id: format!("cmd-stale-thread-{}", i),
                    r#type: "canvas.node.update".to_string(),
                    target: target.to_string(),
                    payload: json!({ "i": i }),
                    actor: Actor::Agent,
                    base_rev: 1, // now stale because rev is 2
                    batch_id: None,
                    idempotency_key: None,
                };
                bus.dispatch(cmd)
            })
        })
        .collect();

    for h in handles {
        let err = h.join().expect("thread join").unwrap_err();
        assert_eq!(err.code, ERR_REV_CONFLICT);
        assert_eq!(err.current_rev, 2);
    }

    // Node rev must still be 2
    assert_eq!(bus.get_revision(target), 2);
}

#[test]
fn test_stress_idempotency_sequential_replay() {
    let bus = CommandBus::new();
    let target = "node-idemp-seq";
    let idem_key = "idemp-unique-key-12345".to_string();

    let cmd = Command {
        id: "cmd-idemp-seq-1".to_string(),
        r#type: "canvas.node.update".to_string(),
        target: target.to_string(),
        payload: json!({ "style": "bold" }),
        actor: Actor::Designer,
        base_rev: 0,
        batch_id: None,
        idempotency_key: Some(idem_key.clone()),
    };

    // First dispatch
    let first_result = bus.dispatch(cmd.clone()).unwrap();
    assert_eq!(first_result.new_rev, 1);
    assert_eq!(first_result.seq, 1);

    // 100 sequential duplicate dispatches
    for _ in 0..100 {
        let dup_result = bus.dispatch(cmd.clone()).unwrap();
        assert_eq!(first_result, dup_result);
        assert_eq!(dup_result.new_rev, 1);
        assert_eq!(dup_result.seq, 1);
    }

    // Revision and seq must still be 1
    assert_eq!(bus.get_revision(target), 1);
    assert_eq!(bus.get_current_seq(), 1);
}

#[test]
fn test_stress_lock_table_preemption_hook_ordering() {
    let bus = Arc::new(CommandBus::new());
    let target = "node-lock-preempt";

    let preemption_calls = Arc::new(Mutex::new(Vec::new()));
    let p_clone = Arc::clone(&preemption_calls);
    bus.set_preemption_hook(move |tgt, task_id| {
        let mut list = p_clone.lock().unwrap();
        list.push((tgt.to_string(), task_id.to_string()));
    });

    // Acquire lock
    bus.acquire_lock(target, "task-agent-999", Actor::Agent).unwrap();
    assert!(bus.is_locked(target));

    // Agent attempts dispatch -> ERR_NODE_LOCKED
    let agent_cmd = Command {
        id: "cmd-agent-locked".to_string(),
        r#type: "canvas.node.update".to_string(),
        target: target.to_string(),
        payload: json!({}),
        actor: Actor::Agent,
        base_rev: 0,
        batch_id: None,
        idempotency_key: None,
    };
    let err = bus.dispatch(agent_cmd).unwrap_err();
    assert_eq!(err.code, ERR_NODE_LOCKED);

    // Designer dispatches -> Preemption
    let designer_cmd = Command {
        id: "cmd-designer-override".to_string(),
        r#type: "canvas.node.override".to_string(),
        target: target.to_string(),
        payload: json!({ "reason": "user_drag" }),
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

    // Assert preemption hook received the exact target and task_id
    let calls = preemption_calls.lock().unwrap();
    assert_eq!(calls.len(), 1);
    assert_eq!(calls[0], (target.to_string(), "task-agent-999".to_string()));
}

#[test]
fn test_stress_unicode_and_special_targets() {
    let bus = CommandBus::new();
    let unicode_target = "画布节点_🚀_12345!@#$%^&*()";

    let cmd = Command {
        id: "cmd-unicode-1".to_string(),
        r#type: "canvas.node.update".to_string(),
        target: unicode_target.to_string(),
        payload: json!({ "key": "你好，世界！" }),
        actor: Actor::Designer,
        base_rev: 0,
        batch_id: None,
        idempotency_key: None,
    };

    let res = bus.dispatch(cmd).unwrap();
    assert_eq!(res.target, unicode_target);
    assert_eq!(res.new_rev, 1);
    assert_eq!(bus.get_revision(unicode_target), 1);
}

#[test]
fn test_stress_concurrent_identical_idempotency_key() {
    let bus = Arc::new(CommandBus::new());
    let target = "node-concurrent-idem";
    let idem_key = "idem-concurrent-shared-key".to_string();
    let num_threads = 20;

    let barrier = Arc::new(std::sync::Barrier::new(num_threads));

    let handles: Vec<_> = (0..num_threads)
        .map(|i| {
            let bus = Arc::clone(&bus);
            let barrier = Arc::clone(&barrier);
            let idem_key = idem_key.clone();
            thread::spawn(move || {
                let cmd = Command {
                    id: format!("cmd-idem-thread-{}", i),
                    r#type: "canvas.node.update".to_string(),
                    target: target.to_string(),
                    payload: json!({ "attempt": i }),
                    actor: Actor::Designer,
                    base_rev: 0,
                    batch_id: None,
                    idempotency_key: Some(idem_key),
                };
                barrier.wait();
                bus.dispatch(cmd)
            })
        })
        .collect();

    let mut results = Vec::new();
    for h in handles {
        let res = h.join().expect("thread join").expect("dispatch should succeed");
        results.push(res);
    }

    let final_rev = bus.get_revision(target);
    assert_eq!(
        final_rev, 1,
        "Concurrent idempotency violation: expected revision 1, but got {}",
        final_rev
    );
}

#[test]
fn test_stress_preemption_hook_reentrancy() {
    let bus = Arc::new(CommandBus::new());
    let target = "node-preempt-reentrancy";

    let bus_clone = Arc::clone(&bus);
    bus.set_preemption_hook(move |tgt, _task_id| {
        // Callback checks if the target is still locked
        let _ = bus_clone.is_locked(tgt);
    });

    bus.acquire_lock(target, "task-agent-deadlock-check", Actor::Agent).unwrap();

    let (sender, receiver) = std::sync::mpsc::channel();
    let bus_for_thread = Arc::clone(&bus);
    thread::spawn(move || {
        let cmd = Command {
            id: "cmd-designer-reentrant".to_string(),
            r#type: "canvas.node.override".to_string(),
            target: target.to_string(),
            payload: json!({}),
            actor: Actor::Designer,
            base_rev: 0,
            batch_id: None,
            idempotency_key: None,
        };
        let res = bus_for_thread.dispatch(cmd);
        sender.send(res).unwrap();
    });

    // Wait with a 2-second timeout to catch the deadlock
    match receiver.recv_timeout(std::time::Duration::from_millis(1500)) {
        Ok(res) => {
            println!("Reentrancy test completed without deadlock: {:?}", res.is_ok());
            assert!(res.is_ok());
        }
        Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
            panic!("DEADLOCK DETECTED! Preemption hook deadlocked because `self.locks.write()` was held during hook execution!");
        }
        Err(err) => panic!("Channel error: {:?}", err),
    }
}


