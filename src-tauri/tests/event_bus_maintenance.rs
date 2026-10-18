#[path = "../src/event_bus/mod.rs"]
mod event_bus;

use event_bus::{AppendEventInput, CheckpointMode, EventBus, PruneOptions};
use serde_json::json;
use std::sync::Arc;
use std::thread;
use std::time::Duration;

#[test]
fn test_maintenance_wal_checkpoint_and_truncation_cycle() {
    let db_dir = std::env::temp_dir().join(format!("test_maint_wal_{}", uuid::Uuid::new_v4()));
    let db_path = db_dir.join("events.db");
    let bus = EventBus::open(&db_path).expect("open EventBus");

    // Cycle 1: append 200 events
    for i in 1..=200 {
        bus.append_event(AppendEventInput {
            event_type: "canvas.node.created".into(),
            target_node_id: format!("node-{}", i),
            payload: Some(json!({ "cycle": 1, "data": "payload-chunk".repeat(20) })),
            ..Default::default()
        })
        .expect("append cycle 1");
    }

    let wal_path = db_dir.join("events.db-wal");
    assert!(wal_path.exists());
    let wal_size_1 = std::fs::metadata(&wal_path).map(|m| m.len()).unwrap_or(0);
    assert!(wal_size_1 > 0);

    // Explicit checkpoint truncate
    let ckpt1 = bus.checkpoint().expect("checkpoint 1");
    assert!(!ckpt1.busy);
    let wal_size_after_1 = std::fs::metadata(&wal_path).map(|m| m.len()).unwrap_or(0);
    assert_eq!(wal_size_after_1, 0, "WAL must be truncated to 0 bytes");

    // Cycle 2: append another 200 events
    for i in 201..=400 {
        bus.append_event(AppendEventInput {
            event_type: "canvas.node.moved".into(),
            target_node_id: format!("node-{}", i),
            payload: Some(json!({ "cycle": 2, "pos": [i, i * 2] })),
            ..Default::default()
        })
        .expect("append cycle 2");
    }

    let wal_size_2 = std::fs::metadata(&wal_path).map(|m| m.len()).unwrap_or(0);
    assert!(wal_size_2 > 0);

    // Another checkpoint truncate
    let ckpt2 = bus.checkpoint_with_mode(CheckpointMode::Truncate).expect("checkpoint 2");
    assert!(!ckpt2.busy);
    let wal_size_after_2 = std::fs::metadata(&wal_path).map(|m| m.len()).unwrap_or(0);
    assert_eq!(wal_size_after_2, 0);

    drop(bus);
    let _ = std::fs::remove_dir_all(&db_dir);
}

#[test]
fn test_maintenance_auto_checkpoint_trigger_on_500_events() {
    let db_dir = std::env::temp_dir().join(format!("test_auto_500_{}", uuid::Uuid::new_v4()));
    let db_path = db_dir.join("events.db");
    let bus = EventBus::open(&db_path).expect("open EventBus");

    // By default, threshold is 500
    assert_eq!(bus.get_checkpoint_threshold(), 500);

    // Append 499 events in a batch
    let batch: Vec<AppendEventInput> = (1..=499)
        .map(|i| AppendEventInput {
            event_type: "canvas.node.updated".into(),
            target_node_id: "node-counter".into(),
            payload: Some(json!({ "i": i })),
            ..Default::default()
        })
        .collect();
    bus.append_events_batch(batch).expect("append 499");
    assert_eq!(bus.pending_appends_count(), 499);

    // 500th event triggers auto-checkpoint
    bus.append_event(AppendEventInput {
        event_type: "canvas.node.updated".into(),
        target_node_id: "node-counter".into(),
        payload: Some(json!({ "i": 500 })),
        ..Default::default()
    })
    .expect("append 500");

    assert_eq!(bus.pending_appends_count(), 0);

    let wal_path = db_dir.join("events.db-wal");
    if wal_path.exists() {
        let wal_size = std::fs::metadata(&wal_path).map(|m| m.len()).unwrap_or(0);
        assert_eq!(wal_size, 0, "WAL must be truncated after auto-checkpoint");
    }

    drop(bus);
    let _ = std::fs::remove_dir_all(&db_dir);
}

#[test]
fn test_maintenance_crash_lock_and_poison_recovery_on_disk() {
    let db_dir = std::env::temp_dir().join(format!("test_crash_disk_{}", uuid::Uuid::new_v4()));
    let db_path = db_dir.join("events.db");
    let bus = Arc::new(EventBus::open(&db_path).expect("open EventBus"));

    // Write initial record
    bus.append_event(AppendEventInput {
        event_type: "canvas.init".into(),
        target_node_id: "node-root".into(),
        ..Default::default()
    })
    .expect("init append");

    // Crash simulated on disk connection
    let bus_clone = Arc::clone(&bus);
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(move || {
        let guard = bus_clone.conn.lock().unwrap();
        let _ = guard.execute_batch("BEGIN EXCLUSIVE;");
        panic!("Fatal simulated panic during exclusive lock holding!");
    }));

    // In-memory mutex is poisoned; subsequent operation recovers cleanly
    let post_crash = bus
        .append_event(AppendEventInput {
            event_type: "canvas.recovered".into(),
            target_node_id: "node-root".into(),
            payload: Some(json!({ "recovered": true })),
            ..Default::default()
        })
        .expect("subsequent append must recover poisoned mutex");

    assert_eq!(post_crash.seq, 2);

    drop(bus);

    // Reopen from disk; verifies PRAGMA wal_checkpoint(PASSIVE) self-heals any disk state
    let reopened_bus = EventBus::open(&db_path).expect("reopen after crash");
    let latest_seq = reopened_bus.get_latest_seq().expect("get latest seq");
    assert_eq!(latest_seq, 2);

    drop(reopened_bus);
    let _ = std::fs::remove_dir_all(&db_dir);
}

#[test]
fn test_maintenance_deep_prune_and_retention_invariants() {
    let bus = EventBus::open_in_memory().expect("open EventBus");

    // Insert 100 events for 10 distinct nodes
    for i in 1..=100 {
        let node_id = format!("node-{}", (i % 10) + 1);
        bus.append_event(AppendEventInput {
            event_type: "canvas.node.updated".into(),
            target_node_id: node_id,
            payload: Some(json!({ "step": i })),
            ..Default::default()
        })
        .expect("append");
    }

    assert_eq!(bus.get_latest_seq().expect("latest seq"), 100);

    // Verify all 10 nodes exist in node_revisions
    let revs_before = bus.get_all_revisions().expect("revs before");
    assert_eq!(revs_before.len(), 10);
    for r in &revs_before {
        assert_eq!(r.current_rev, 10);
    }

    // Prune keeping newest 25 events (prunes oldest 75 events)
    let prune_res = bus
        .prune(PruneOptions {
            retain_latest: Some(25),
            checkpoint_after: true,
            ..Default::default()
        })
        .expect("prune retain 25");

    assert_eq!(prune_res.deleted_count, 75);
    assert_eq!(prune_res.remaining_count, 25);
    assert_eq!(prune_res.pruned_before_seq, 76);

    // Verify remaining events
    let remaining = bus.query_events(None, None, None).expect("query remaining");
    assert_eq!(remaining.len(), 25);
    assert_eq!(remaining.first().unwrap().seq, 76);
    assert_eq!(remaining.last().unwrap().seq, 100);

    // Node revisions MUST STILL BE INTACT!
    let revs_after = bus.get_all_revisions().expect("revs after");
    assert_eq!(revs_after.len(), 10);
    for r in &revs_after {
        assert_eq!(r.current_rev, 10, "Node revision must be preserved after pruning");
    }

    // Prune again with retain 25 -> 0 deleted, 25 remaining
    let prune_res2 = bus
        .prune(PruneOptions {
            retain_latest: Some(25),
            ..Default::default()
        })
        .expect("prune again");
    assert_eq!(prune_res2.deleted_count, 0);
    assert_eq!(prune_res2.remaining_count, 25);

    // Prune with before_seq = 90 -> deletes seq 76..=89 (14 events)
    let prune_res3 = bus
        .prune(PruneOptions {
            before_seq: Some(90),
            ..Default::default()
        })
        .expect("prune before 90");
    assert_eq!(prune_res3.deleted_count, 14);
    assert_eq!(prune_res3.remaining_count, 11);

    let final_events = bus.query_events(None, None, None).expect("query final");
    assert_eq!(final_events.len(), 11);
    assert_eq!(final_events.first().unwrap().seq, 90);
    assert_eq!(final_events.last().unwrap().seq, 100);
}

#[test]
fn test_maintenance_high_concurrency_stress_appends_checkpoint_prune() {
    let db_dir = std::env::temp_dir().join(format!("test_stress_{}", uuid::Uuid::new_v4()));
    let db_path = db_dir.join("events.db");
    let bus = Arc::new(EventBus::open(&db_path).expect("open EventBus"));
    bus.set_checkpoint_threshold(50);

    let num_appender_threads = 6;
    let events_per_thread = 50;
    let total_expected_events = num_appender_threads * events_per_thread;

    let mut handles = Vec::new();

    // Spawn appender threads
    for t in 0..num_appender_threads {
        let b = Arc::clone(&bus);
        handles.push(thread::spawn(move || {
            for i in 0..events_per_thread {
                b.append_event(AppendEventInput {
                    event_type: "canvas.stress.move".into(),
                    target_node_id: format!("node-worker-{}", t),
                    payload: Some(json!({ "t": t, "i": i })),
                    ..Default::default()
                })
                .expect("stress append");
            }
        }));
    }

    // Spawn maintenance thread concurrently calling checkpoint and prune
    let maint_bus = Arc::clone(&bus);
    let maint_handle = thread::spawn(move || {
        for _ in 0..10 {
            thread::sleep(Duration::from_millis(10));
            let _ = maint_bus.checkpoint();
            let _ = maint_bus.prune(PruneOptions {
                retain_latest: Some(100),
                checkpoint_after: true,
                ..Default::default()
            });
        }
    });

    for h in handles {
        h.join().expect("appender thread panic");
    }
    maint_handle.join().expect("maint thread panic");

    // Verify DB integrity
    let latest_seq = bus.get_latest_seq().expect("latest seq");
    assert_eq!(latest_seq, total_expected_events as i64);

    let revs = bus.get_all_revisions().expect("get revisions");
    assert_eq!(revs.len(), num_appender_threads);
    for r in revs {
        assert_eq!(r.current_rev, events_per_thread as u64);
    }

    drop(bus);
    let _ = std::fs::remove_dir_all(&db_dir);
}

#[test]
fn test_maintenance_cross_connection_lock_contention_and_busy_timeout() {
    let db_dir = std::env::temp_dir().join(format!("test_contention_{}", uuid::Uuid::new_v4()));
    let db_path = db_dir.join("events.db");
    let bus = Arc::new(EventBus::open(&db_path).expect("open EventBus"));

    // Populate initial event
    bus.append_event(AppendEventInput {
        event_type: "canvas.init".into(),
        target_node_id: "node-1".into(),
        ..Default::default()
    })
    .expect("initial append");

    let lock_held = Arc::new(std::sync::atomic::AtomicBool::new(false));
    let lock_held_clone = Arc::clone(&lock_held);
    let db_path_clone = db_path.clone();

    // Spawn thread that opens conn2 and holds an IMMEDIATE write lock for 200ms
    let writer_handle = thread::spawn(move || {
        let mut conn2 = rusqlite::Connection::open(&db_path_clone).expect("open conn2");
        let tx = conn2
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
            .expect("begin tx");
        lock_held_clone.store(true, std::sync::atomic::Ordering::SeqCst);
        thread::sleep(Duration::from_millis(200));
        tx.commit().expect("commit tx");
    });

    while !lock_held.load(std::sync::atomic::Ordering::SeqCst) {
        thread::sleep(Duration::from_millis(5));
    }

    // bus.append_event must not fail with SQLITE_BUSY; its 5000ms busy_timeout waits for conn2
    let append_res = bus.append_event(AppendEventInput {
        event_type: "canvas.waited".into(),
        target_node_id: "node-2".into(),
        ..Default::default()
    });

    writer_handle.join().expect("writer handle join");
    assert!(
        append_res.is_ok(),
        "append_event should succeed after waiting on busy lock: {:?}",
        append_res
    );
    assert_eq!(append_res.unwrap().seq, 2);

    drop(bus);
    let _ = std::fs::remove_dir_all(&db_dir);
}

#[test]
fn test_maintenance_checkpoint_busy_retains_pending_appends_count() {
    let db_dir = std::env::temp_dir().join(format!("test_ckpt_busy_{}", uuid::Uuid::new_v4()));
    let db_path = db_dir.join("events.db");
    let bus = EventBus::open(&db_path).expect("open EventBus");

    for i in 1..=10 {
        bus.append_event(AppendEventInput {
            event_type: "canvas.node.created".into(),
            target_node_id: format!("node-{}", i),
            ..Default::default()
        })
        .expect("append");
    }
    assert_eq!(bus.pending_appends_count(), 10);

    // Open concurrent connection and keep an uncommitted read transaction open
    let conn_reader = rusqlite::Connection::open(&db_path).expect("open conn_reader");
    let tx = conn_reader.unchecked_transaction().expect("begin read tx");
    let _count: i64 = tx
        .query_row("SELECT COUNT(*) FROM events", [], |r| r.get(0))
        .expect("query");

    // Checkpoint(Truncate) cannot truncate the WAL while conn_reader holds a read lock
    let ckpt = bus
        .checkpoint_with_mode(CheckpointMode::Truncate)
        .expect("checkpoint");
    if ckpt.busy {
        // When checkpoint was busy, pending_appends_count must NOT be reset to 0
        assert_eq!(
            bus.pending_appends_count(),
            10,
            "Pending appends count must be retained when checkpoint is busy"
        );
    }

    // Release reader lock
    drop(tx);
    drop(conn_reader);

    // Now checkpoint should succeed and clear pending appends count
    let ckpt2 = bus
        .checkpoint_with_mode(CheckpointMode::Truncate)
        .expect("second checkpoint");
    assert!(!ckpt2.busy);
    assert_eq!(bus.pending_appends_count(), 0);

    drop(bus);
    let _ = std::fs::remove_dir_all(&db_dir);
}

#[test]
fn test_maintenance_open_retry_on_locked_init() {
    let db_dir = std::env::temp_dir().join(format!("test_open_retry_{}", uuid::Uuid::new_v4()));
    let db_path = db_dir.join("events.db");

    // Pre-create database
    {
        let bus = EventBus::open(&db_path).expect("pre-create EventBus");
        bus.append_event(AppendEventInput {
            event_type: "canvas.init".into(),
            target_node_id: "node-init".into(),
            ..Default::default()
        })
        .expect("init append");
    }

    let lock_held = Arc::new(std::sync::atomic::AtomicBool::new(false));
    let lock_held_clone = Arc::clone(&lock_held);
    let db_path_clone = db_path.clone();

    let unlock_handle = thread::spawn(move || {
        let mut conn_blocker = rusqlite::Connection::open(&db_path_clone).expect("open blocker");
        let tx = conn_blocker
            .transaction_with_behavior(rusqlite::TransactionBehavior::Exclusive)
            .expect("begin exclusive");
        lock_held_clone.store(true, std::sync::atomic::Ordering::SeqCst);
        thread::sleep(Duration::from_millis(200));
        tx.commit().expect("commit");
    });

    while !lock_held.load(std::sync::atomic::Ordering::SeqCst) {
        thread::sleep(Duration::from_millis(5));
    }

    // EventBus::open should retry with backoff and succeed once the lock is released
    let reopened = EventBus::open(&db_path);
    unlock_handle.join().expect("unlock handle join");

    assert!(
        reopened.is_ok(),
        "EventBus::open must retry and succeed: {:?}",
        reopened.err()
    );
    let bus = reopened.unwrap();
    assert_eq!(bus.get_latest_seq().expect("latest seq"), 1);

    drop(bus);
    let _ = std::fs::remove_dir_all(&db_dir);
}
