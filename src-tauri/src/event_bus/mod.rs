pub mod db;
pub mod types;

#[allow(unused_imports)]
pub use db::{is_locked_error, is_locked_error_str, EventBus, DEFAULT_CHECKPOINT_THRESHOLD};
#[allow(unused_imports)]
pub use types::{
    AppendEventInput, CheckpointMode, CheckpointResult, EventQuery, EventRecord,
    NodeRevisionRecord, PruneOptions, PruneResult,
};

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Instant;

    #[test]
    fn test_event_bus_open_in_memory_and_pragmas() {
        let bus = EventBus::open_in_memory().expect("in-memory db open failed");
        // Verify node revision starts at 0
        let rev = bus.get_node_revision("node-unknown").expect("get_node_revision failed");
        assert_eq!(rev, 0);

        let seq = bus.get_latest_seq().expect("get_latest_seq failed");
        assert_eq!(seq, 0);
    }

    #[test]
    fn test_append_event_and_node_revisions() {
        let bus = EventBus::open_in_memory().expect("open failed");

        let event1 = bus
            .append_event(AppendEventInput {
                event_type: "canvas.node.created".into(),
                target_node_id: "node-1".into(),
                actor: Some("designer".into()),
                base_rev: Some(0),
                new_rev: Some(1),
                payload: Some(serde_json::json!({ "title": "First Node" })),
                ..Default::default()
            })
            .expect("append event1 failed");

        assert_eq!(event1.seq, 1);
        assert_eq!(event1.base_rev, 0);
        assert_eq!(event1.new_rev, 1);
        assert_eq!(event1.target_node_id, "node-1");

        let rev = bus.get_node_revision("node-1").expect("rev lookup");
        assert_eq!(rev, 1);

        // Append second event on same node without explicit rev -> auto-bumps to 2
        let event2 = bus
            .append_event(AppendEventInput {
                event_type: "canvas.node.moved".into(),
                target_node_id: "node-1".into(),
                actor: Some("designer".into()),
                payload: Some(serde_json::json!({ "x": 100, "y": 200 })),
                ..Default::default()
            })
            .expect("append event2 failed");

        assert_eq!(event2.seq, 2);
        assert_eq!(event2.base_rev, 1);
        assert_eq!(event2.new_rev, 2);

        let rev2 = bus.get_node_revision("node-1").expect("rev lookup");
        assert_eq!(rev2, 2);

        let latest_seq = bus.get_latest_seq().expect("latest seq");
        assert_eq!(latest_seq, 2);
    }

    #[test]
    fn test_append_events_batch() {
        let bus = EventBus::open_in_memory().expect("open failed");

        let batch: Vec<AppendEventInput> = (1..=20)
            .map(|i| AppendEventInput {
                event_type: "canvas.node.created".into(),
                target_node_id: format!("node-{}", i),
                actor: Some("designer".into()),
                base_rev: Some(0),
                new_rev: Some(1),
                payload: Some(serde_json::json!({ "index": i })),
                ..Default::default()
            })
            .collect();

        let results = bus.append_events_batch(batch).expect("batch append failed");
        assert_eq!(results.len(), 20);

        for (idx, record) in results.iter().enumerate() {
            assert_eq!(record.seq, (idx + 1) as i64);
            assert_eq!(record.target_node_id, format!("node-{}", idx + 1));
        }

        let all_revs = bus.get_all_revisions().expect("get all revisions");
        assert_eq!(all_revs.len(), 20);
    }

    #[test]
    fn test_idempotency_key_deduplication() {
        let bus = EventBus::open_in_memory().expect("open failed");

        let key = "idempotent-tx-999";
        let event1 = bus
            .append_event(AppendEventInput {
                event_type: "canvas.node.created".into(),
                target_node_id: "node-idem".into(),
                idempotency_key: Some(key.into()),
                payload: Some(serde_json::json!({ "initial": true })),
                ..Default::default()
            })
            .expect("first append");

        let event2 = bus
            .append_event(AppendEventInput {
                event_type: "canvas.node.created".into(),
                target_node_id: "node-idem".into(),
                idempotency_key: Some(key.into()),
                payload: Some(serde_json::json!({ "initial": false })), // different payload ignored
                ..Default::default()
            })
            .expect("second append with same key");

        assert_eq!(event1.seq, event2.seq);
        assert_eq!(event1.event_id, event2.event_id);
        assert_eq!(event2.payload, serde_json::json!({ "initial": true }));
    }

    #[test]
    fn test_query_events_filtering() {
        let bus = EventBus::open_in_memory().expect("open failed");

        // Insert events across multiple targets
        for i in 1..=10 {
            let target = if i % 2 == 0 { "node-even" } else { "node-odd" };
            bus.append_event(AppendEventInput {
                event_type: "canvas.node.updated".into(),
                target_node_id: target.into(),
                payload: Some(serde_json::json!({ "step": i })),
                ..Default::default()
            })
            .expect("append");
        }

        // Query all
        let all = bus.query_events(None, None, None).expect("query all");
        assert_eq!(all.len(), 10);

        // Query by target
        let even = bus.query_events(Some("node-even"), None, None).expect("query even");
        assert_eq!(even.len(), 5);
        for e in even {
            assert_eq!(e.target_node_id, "node-even");
        }

        // Query with since_seq
        let since_seq_7 = bus.query_events(None, Some(7), None).expect("query since 7");
        assert_eq!(since_seq_7.len(), 4); // 7, 8, 9, 10
        assert_eq!(since_seq_7[0].seq, 7);

        // Query with limit
        let limited = bus.query_events(None, None, Some(3)).expect("query limit 3");
        assert_eq!(limited.len(), 3);
        assert_eq!(limited[0].seq, 1);
        assert_eq!(limited[2].seq, 3);
    }

    #[test]
    fn test_sub_5ms_append_latency_guarantee() {
        let db_path = std::env::temp_dir().join(format!("bench_events_{}.db", uuid::Uuid::new_v4()));
        let bus = EventBus::open(&db_path).expect("open file db");

        let iterations = 100;
        let mut latencies_ms = Vec::with_capacity(iterations);

        for i in 1..=iterations {
            let start = Instant::now();
            let record = bus
                .append_event(AppendEventInput {
                    event_type: "canvas.node.moved".into(),
                    target_node_id: format!("node-{}", i % 10),
                    actor: Some("designer".into()),
                    payload: Some(serde_json::json!({ "x": i * 10, "y": i * 20 })),
                    ..Default::default()
                })
                .expect("append");
            let elapsed_ms = start.elapsed().as_secs_f64() * 1000.0;
            latencies_ms.push(elapsed_ms);
            assert_eq!(record.seq, i as i64);
        }

        let avg_latency = latencies_ms.iter().sum::<f64>() / (iterations as f64);
        let max_latency = latencies_ms.iter().copied().fold(0.0f64, f64::max);

        println!(
            "SQLite EventBus Latency Benchmark: {} appends, avg: {:.3} ms, max: {:.3} ms",
            iterations, avg_latency, max_latency
        );

        // Strict criteria from prompt: sub-5ms latency
        assert!(
            avg_latency < 5.0,
            "Average append latency ({:.3} ms) exceeded 5.0 ms threshold",
            avg_latency
        );

        let _ = std::fs::remove_file(&db_path);
        let _ = std::fs::remove_file(format!("{}-wal", db_path.display()));
        let _ = std::fs::remove_file(format!("{}-shm", db_path.display()));
    }

    #[test]
    fn test_checkpoint_explicit_modes_and_results() {
        let bus = EventBus::open_in_memory().expect("open in-memory");

        // Write events
        for i in 1..=10 {
            bus.append_event(AppendEventInput {
                event_type: "canvas.node.created".into(),
                target_node_id: format!("node-{}", i),
                ..Default::default()
            })
            .expect("append");
        }

        // Test each checkpoint mode
        let cp_passive = bus
            .checkpoint_with_mode(CheckpointMode::Passive)
            .expect("passive checkpoint failed");
        assert!(!cp_passive.busy);

        let cp_full = bus
            .checkpoint_with_mode(CheckpointMode::Full)
            .expect("full checkpoint failed");
        assert!(!cp_full.busy);

        let cp_restart = bus
            .checkpoint_with_mode(CheckpointMode::Restart)
            .expect("restart checkpoint failed");
        assert!(!cp_restart.busy);

        let cp_truncate = bus.checkpoint().expect("truncate checkpoint failed");
        assert!(!cp_truncate.busy);
    }

    #[test]
    fn test_wal_checkpoint_truncates_file() {
        let db_dir = std::env::temp_dir().join(format!("test_wal_{}", uuid::Uuid::new_v4()));
        let db_path = db_dir.join("events.db");
        let bus = EventBus::open(&db_path).expect("open file db");

        // Write 100 events to accumulate WAL pages
        for i in 1..=100 {
            bus.append_event(AppendEventInput {
                event_type: "canvas.node.created".into(),
                target_node_id: format!("node-{}", i),
                payload: Some(serde_json::json!({ "chunk": "x".repeat(512) })),
                ..Default::default()
            })
            .expect("append");
        }

        let wal_path = db_dir.join("events.db-wal");
        assert!(wal_path.exists(), "WAL file must exist after appends");
        let wal_size_before = std::fs::metadata(&wal_path).map(|m| m.len()).unwrap_or(0);
        assert!(
            wal_size_before > 0,
            "WAL file should have non-zero size before checkpoint, got: {}",
            wal_size_before
        );

        // Execute TRUNCATE checkpoint
        let result = bus.checkpoint().expect("checkpoint truncate failed");
        assert!(!result.busy, "Checkpoint should not be busy");

        let wal_size_after = std::fs::metadata(&wal_path).map(|m| m.len()).unwrap_or(0);
        assert_eq!(
            wal_size_after, 0,
            "WAL file must be truncated to 0 bytes after checkpoint(TRUNCATE)"
        );

        drop(bus);
        let _ = std::fs::remove_dir_all(&db_dir);
    }

    #[test]
    fn test_automatic_checkpoint_threshold() {
        let bus = EventBus::open_in_memory().expect("open in-memory");
        bus.set_checkpoint_threshold(10);
        assert_eq!(bus.get_checkpoint_threshold(), 10);
        assert_eq!(bus.pending_appends_count(), 0);

        // Append 9 events -> pending should be 9
        for i in 1..=9 {
            bus.append_event(AppendEventInput {
                event_type: "canvas.node.created".into(),
                target_node_id: format!("node-{}", i),
                ..Default::default()
            })
            .expect("append");
        }
        assert_eq!(bus.pending_appends_count(), 9);

        // 10th event triggers automatic checkpoint -> pending resets to 0
        bus.append_event(AppendEventInput {
            event_type: "canvas.node.created".into(),
            target_node_id: "node-10".into(),
            ..Default::default()
        })
        .expect("append 10");
        assert_eq!(bus.pending_appends_count(), 0);

        // Batch of 15 events (> threshold of 10) triggers checkpoint -> pending resets to 0
        let batch: Vec<AppendEventInput> = (11..=25)
            .map(|i| AppendEventInput {
                event_type: "canvas.node.created".into(),
                target_node_id: format!("node-{}", i),
                ..Default::default()
            })
            .collect();
        bus.append_events_batch(batch).expect("append batch");
        assert_eq!(bus.pending_appends_count(), 0);
    }

    #[test]
    fn test_crash_lock_poisoned_mutex_self_healing() {
        let bus = std::sync::Arc::new(EventBus::open_in_memory().expect("open in-memory"));

        // Append initial event
        bus.append_event(AppendEventInput {
            event_type: "canvas.node.created".into(),
            target_node_id: "node-heal-init".into(),
            ..Default::default()
        })
        .expect("initial append");

        // Spawn a thread that acquires connection lock and intentionally panics to poison the mutex
        let bus_clone = std::sync::Arc::clone(&bus);
        let panic_result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(move || {
            let guard = bus_clone.conn.lock().unwrap();
            // Start a transaction without committing to simulate crash mid-transaction
            let _ = guard.execute_batch("BEGIN IMMEDIATE; INSERT INTO events (event_id, event_type, target_node_id, actor, base_rev, new_rev, payload, created_at) VALUES ('crash-evt', 'crash.type', 'node-crash', 'system', 0, 1, '{}', 0);");
            panic!("Simulated worker thread crash holding SQLite lock!");
        }));
        assert!(panic_result.is_err(), "Worker thread should have panicked");

        // Verify the mutex is now poisoned
        assert!(
            bus.conn.is_poisoned(),
            "Connection mutex must be poisoned by panic"
        );

        // EventBus should self-heal: get_connection recovers guard and executes ROLLBACK
        let recovered_event = bus
            .append_event(AppendEventInput {
                event_type: "canvas.node.created".into(),
                target_node_id: "node-heal-after-crash".into(),
                payload: Some(serde_json::json!({ "healed": true })),
                ..Default::default()
            })
            .expect("append_event should self-heal and succeed after mutex poisoning");

        assert_eq!(recovered_event.target_node_id, "node-heal-after-crash");
        assert_eq!(recovered_event.seq, 2);

        // Verify crashed dirty event was rolled back
        let all_events = bus.query_events(None, None, None).expect("query events");
        assert_eq!(all_events.len(), 2);
        assert!(!all_events.iter().any(|e| e.event_id == "crash-evt"));
    }

    #[test]
    fn test_prune_by_retain_latest() {
        let bus = EventBus::open_in_memory().expect("open in-memory");

        for i in 1..=20 {
            bus.append_event(AppendEventInput {
                event_type: "canvas.node.updated".into(),
                target_node_id: format!("node-{}", (i % 3) + 1),
                payload: Some(serde_json::json!({ "index": i })),
                ..Default::default()
            })
            .expect("append");
        }

        assert_eq!(bus.get_latest_seq().expect("latest seq"), 20);

        // Prune keeping only the latest 5 events
        let prune_res = bus
            .prune(PruneOptions {
                retain_latest: Some(5),
                checkpoint_after: true,
                ..Default::default()
            })
            .expect("prune retain latest 5");

        assert_eq!(prune_res.deleted_count, 15);
        assert_eq!(prune_res.remaining_count, 5);
        assert_eq!(prune_res.pruned_before_seq, 16);

        // Verify remaining events are exactly seq 16..=20
        let remaining = bus.query_events(None, None, None).expect("query remaining");
        assert_eq!(remaining.len(), 5);
        for (idx, r) in remaining.iter().enumerate() {
            assert_eq!(r.seq, (16 + idx) as i64);
        }

        // Verify node_revisions table is intact and holds latest state
        let revs = bus.get_all_revisions().expect("get revisions");
        assert_eq!(revs.len(), 3);
        for r in revs {
            assert!(r.current_rev > 0);
            assert!(r.last_seq >= 16);
        }
    }

    #[test]
    fn test_prune_by_before_seq() {
        let bus = EventBus::open_in_memory().expect("open in-memory");

        for _i in 1..=10 {
            bus.append_event(AppendEventInput {
                event_type: "canvas.node.updated".into(),
                target_node_id: "node-x".into(),
                ..Default::default()
            })
            .expect("append");
        }

        let prune_res = bus
            .prune(PruneOptions {
                before_seq: Some(6),
                checkpoint_after: false,
                ..Default::default()
            })
            .expect("prune before seq 6");

        assert_eq!(prune_res.deleted_count, 5);
        assert_eq!(prune_res.remaining_count, 5);
        assert_eq!(prune_res.pruned_before_seq, 6);
        assert!(prune_res.checkpoint.is_none());

        let remaining = bus.query_events(None, None, None).expect("query");
        assert_eq!(remaining.len(), 5);
        assert_eq!(remaining[0].seq, 6);
        assert_eq!(remaining[4].seq, 10);
    }

    #[test]
    fn test_prune_by_timestamp() {
        let bus = EventBus::open_in_memory().expect("open in-memory");

        for i in 1..=5 {
            bus.append_event(AppendEventInput {
                event_type: "canvas.node.updated".into(),
                target_node_id: "node-ts".into(),
                created_at: Some(i * 1000),
                ..Default::default()
            })
            .expect("append");
        }

        // Prune before timestamp 3000 -> events at 1000 and 2000 are deleted (seq 1, 2)
        let prune_res = bus
            .prune(PruneOptions {
                before_timestamp: Some(3000),
                checkpoint_after: false,
                ..Default::default()
            })
            .expect("prune timestamp");

        assert_eq!(prune_res.deleted_count, 2);
        assert_eq!(prune_res.remaining_count, 3);

        let remaining = bus.query_events(None, None, None).expect("query");
        assert_eq!(remaining.len(), 3);
        assert_eq!(remaining[0].created_at, 3000);
        assert_eq!(remaining[1].created_at, 4000);
        assert_eq!(remaining[2].created_at, 5000);
    }

    #[test]
    fn test_prune_boundary_and_no_op() {
        let bus = EventBus::open_in_memory().expect("open in-memory");

        // 1. Prune on empty database
        let empty_res = bus.prune(PruneOptions::default()).expect("prune empty");
        assert_eq!(empty_res.deleted_count, 0);
        assert_eq!(empty_res.remaining_count, 0);

        // Insert 3 events
        for i in 1..=3 {
            bus.append_event(AppendEventInput {
                event_type: "canvas.node.created".into(),
                target_node_id: format!("node-{}", i),
                ..Default::default()
            })
            .expect("append");
        }

        // 2. Prune with retain_latest greater than total count (retain 10 when 3 exist)
        let retain_res = bus
            .prune(PruneOptions {
                retain_latest: Some(10),
                ..Default::default()
            })
            .expect("prune retain 10");
        assert_eq!(retain_res.deleted_count, 0);
        assert_eq!(retain_res.remaining_count, 3);

        // 3. Prune with before_seq <= 0
        let zero_res = bus
            .prune(PruneOptions {
                before_seq: Some(0),
                ..Default::default()
            })
            .expect("prune zero");
        assert_eq!(zero_res.deleted_count, 0);
        assert_eq!(zero_res.remaining_count, 3);
    }

    #[test]
    fn test_concurrent_checkpoint_prune_and_appends_stress() {
        let bus = std::sync::Arc::new(EventBus::open_in_memory().expect("open in-memory"));
        bus.set_checkpoint_threshold(20);

        let num_threads = 4;
        let appends_per_thread = 50;

        let mut handles = Vec::new();

        // Worker threads continuously appending
        for t in 0..num_threads {
            let b = std::sync::Arc::clone(&bus);
            handles.push(std::thread::spawn(move || {
                for i in 0..appends_per_thread {
                    b.append_event(AppendEventInput {
                        event_type: "canvas.node.moved".into(),
                        target_node_id: format!("node-t{}", t),
                        payload: Some(serde_json::json!({ "t": t, "i": i })),
                        ..Default::default()
                    })
                    .expect("concurrent append");
                }
            }));
        }

        // Maintenance thread periodically running checkpoint and prune
        let maint_bus = std::sync::Arc::clone(&bus);
        let maint_handle = std::thread::spawn(move || {
            for _ in 0..5 {
                std::thread::sleep(std::time::Duration::from_millis(5));
                let _ = maint_bus.checkpoint();
                let _ = maint_bus.prune(PruneOptions {
                    retain_latest: Some(50),
                    checkpoint_after: true,
                    ..Default::default()
                });
            }
        });

        for h in handles {
            h.join().expect("worker thread failed");
        }
        maint_handle.join().expect("maint thread failed");

        // Verify DB is healthy and accessible after stress
        let final_count = bus.query_events(None, None, None).expect("final query");
        assert!(!final_count.is_empty());
        let final_seq = bus.get_latest_seq().expect("final seq");
        assert_eq!(final_seq, (num_threads * appends_per_thread) as i64);
    }

    #[test]
    fn test_prune_retain_latest_boundary_when_fewer_events_than_limit() {
        let bus = EventBus::open_in_memory().expect("open in-memory");

        for i in 1..=5 {
            bus.append_event(AppendEventInput {
                event_type: "canvas.node.created".into(),
                target_node_id: format!("node-{}", i),
                ..Default::default()
            })
            .expect("append");
        }

        // Database only has 5 events. User requests retain_latest = 10, with before_seq = 4.
        // Since total events (5) <= retain_latest (10), retain_latest guard must prevent deleting!
        let res = bus
            .prune(PruneOptions {
                before_seq: Some(4),
                retain_latest: Some(10),
                checkpoint_after: false,
                ..Default::default()
            })
            .expect("prune");

        assert_eq!(res.deleted_count, 0, "No events should be deleted when total <= retain_latest");
        assert_eq!(res.remaining_count, 5);
    }

    #[test]
    fn test_prune_non_monotonic_timestamps_safety() {
        let bus = EventBus::open_in_memory().expect("open in-memory");

        // Out of order timestamps due to client clock or concurrent emits
        bus.append_event(AppendEventInput {
            event_type: "canvas.node.created".into(),
            target_node_id: "node-1".into(),
            created_at: Some(1000),
            ..Default::default()
        })
        .expect("append 1");

        bus.append_event(AppendEventInput {
            event_type: "canvas.node.created".into(),
            target_node_id: "node-2".into(),
            created_at: Some(2000),
            ..Default::default()
        })
        .expect("append 2");

        bus.append_event(AppendEventInput {
            event_type: "canvas.node.created".into(),
            target_node_id: "node-3".into(),
            created_at: Some(1500),
            ..Default::default()
        })
        .expect("append 3");

        // Pruning before 1800 must NEVER delete node-2 whose created_at is 2000 >= 1800!
        let _res = bus
            .prune(PruneOptions {
                before_timestamp: Some(1800),
                checkpoint_after: false,
                ..Default::default()
            })
            .expect("prune");

        let remaining = bus.query_events(None, None, None).expect("query");
        let has_node_2 = remaining.iter().any(|e| e.target_node_id == "node-2");
        assert!(has_node_2, "Event with created_at 2000 must NOT be deleted when pruning before 1800");
    }

    #[test]
    fn test_get_latest_seq_after_prune_all() {
        let bus = EventBus::open_in_memory().expect("open in-memory");

        for i in 1..=5 {
            bus.append_event(AppendEventInput {
                event_type: "canvas.node.created".into(),
                target_node_id: format!("node-{}", i),
                ..Default::default()
            })
            .expect("append");
        }

        assert_eq!(bus.get_latest_seq().expect("seq before prune"), 5);

        // Prune all events
        let res = bus
            .prune(PruneOptions {
                before_seq: Some(10),
                checkpoint_after: false,
                ..Default::default()
            })
            .expect("prune all");
        assert_eq!(res.deleted_count, 5);
        assert_eq!(res.remaining_count, 0);

        // Even though events table is empty, monotonic latest seq must NOT reset to 0!
        let seq = bus.get_latest_seq().expect("seq after prune");
        assert_eq!(seq, 5, "Latest seq must preserve watermark even after all events are pruned");

        // Next appended event must be seq 6
        let next_evt = bus
            .append_event(AppendEventInput {
                event_type: "canvas.node.created".into(),
                target_node_id: "node-new".into(),
                ..Default::default()
            })
            .expect("append next");
        assert_eq!(next_evt.seq, 6);
        assert_eq!(bus.get_latest_seq().expect("latest seq"), 6);
    }
}
