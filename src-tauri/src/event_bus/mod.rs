pub mod db;
pub mod types;

pub use db::EventBus;
#[allow(unused_imports)]
pub use types::{AppendEventInput, EventQuery, EventRecord, NodeRevisionRecord};

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
    }
}
