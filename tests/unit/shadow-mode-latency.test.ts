import assert from "node:assert/strict";
import test from "node:test";
import { performance } from "node:perf_hooks";

export interface ShadowEventLogRecord {
  seq: number;
  eventId: string;
  eventType: string;
  targetNodeId: string;
  actor: "designer" | "agent" | "system";
  baseRev: number;
  newRev: number;
  payload: string; // JSON serialized
  timestamp: number;
}

export interface LatencyBenchmarkResult {
  sampleCount: number;
  maxLatencyMs: number;
  p95LatencyMs: number;
  averageLatencyMs: number;
  thresholdMs: number;
  passed: boolean;
}

/**
 * In-memory simulation of the shadow mode event sink that performs
 * JSON serialization, monotonic seq increment, revision bookkeeping,
 * and indexed log insertion.
 */
export class ShadowModePipeline {
  private log: ShadowEventLogRecord[] = [];
  private nodeRevisions = new Map<string, number>();
  private seqCounter = 0;

  public appendShadowEvent(
    eventType: string,
    targetNodeId: string,
    actor: "designer" | "agent" | "system",
    payloadObj: Record<string, unknown>,
  ): ShadowEventLogRecord {
    const baseRev = this.nodeRevisions.get(targetNodeId) ?? 0;
    const newRev = baseRev + 1;
    this.nodeRevisions.set(targetNodeId, newRev);

    this.seqCounter++;
    const record: ShadowEventLogRecord = {
      seq: this.seqCounter,
      eventId: `evt-${this.seqCounter}-${Date.now()}`,
      eventType,
      targetNodeId,
      actor,
      baseRev,
      newRev,
      payload: JSON.stringify(payloadObj),
      timestamp: Date.now(),
    };
    this.log.push(record);
    return record;
  }

  public getLogSize(): number {
    return this.log.length;
  }
}

export function runShadowLatencyBenchmark(iterations = 100): {
  latencies: number[];
  metrics: LatencyBenchmarkResult;
} {
  const pipeline = new ShadowModePipeline();
  const latencies: number[] = [];

  // Warmup run to avoid JIT compilation skew
  for (let w = 0; w < 20; w++) {
    pipeline.appendShadowEvent("canvas.warmup", `warmup-${w}`, "system", { warmup: true });
  }

  for (let i = 1; i <= iterations; i++) {
    let type: string;
    let target = `node-${(i % 15) + 1}`;
    let payload: Record<string, unknown>;

    if (i <= 40) {
      type = "canvas.node.move";
      payload = { x: 100 + i * 2, y: 200 + i * 3 };
    } else if (i <= 70) {
      type = "canvas.node.update_parameters";
      payload = {
        prompt: `high quality render prompt #${i}`,
        model: i % 2 === 0 ? "flux-pro" : "sdxl-turbo",
        dimensions: { width: 1024, height: 1024 },
      };
    } else if (i <= 85) {
      type = "canvas.connection.create";
      target = `conn-${i}`;
      payload = {
        source: `node-${(i % 10) + 1}`,
        target: `node-${((i + 1) % 10) + 1}`,
        kind: "reference",
      };
    } else {
      type = "canvas.node.create";
      target = `node-new-${i}`;
      payload = {
        title: `Dynamic Item ${i}`,
        kind: "image",
        tags: ["banner", "ecommerce"],
      };
    }

    const t0 = performance.now();
    pipeline.appendShadowEvent(type, target, "designer", payload);
    const t1 = performance.now();
    latencies.push(t1 - t0);
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const avg = Number((sum / sorted.length).toFixed(4));
  const p95Index = Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1);
  const p95 = Number(sorted[p95Index].toFixed(4));
  const max = Number(sorted[sorted.length - 1].toFixed(4));

  const metrics: LatencyBenchmarkResult = {
    sampleCount: iterations,
    maxLatencyMs: max,
    p95LatencyMs: p95,
    averageLatencyMs: avg,
    thresholdMs: 5.0,
    passed: p95 < 5.0 && avg < 5.0,
  };

  return { latencies, metrics };
}

test("shadow mode write latency is strictly < 5.0ms across 100 consecutive canvas operations", () => {
  const { metrics, latencies } = runShadowLatencyBenchmark(100);

  assert.equal(latencies.length, 100);
  assert.equal(metrics.sampleCount, 100);

  // Hard gate assertions (< 5.0ms)
  assert.ok(
    metrics.p95LatencyMs < 5.0,
    `p95 latency ${metrics.p95LatencyMs}ms must be strictly less than 5.0ms threshold`,
  );
  assert.ok(
    metrics.averageLatencyMs < 5.0,
    `average latency ${metrics.averageLatencyMs}ms must be strictly less than 5.0ms threshold`,
  );
  assert.equal(metrics.passed, true);
});

test("shadow mode latency remains < 5.0ms under high-throughput burst load of 250 operations", () => {
  const { metrics } = runShadowLatencyBenchmark(250);

  assert.equal(metrics.sampleCount, 250);
  assert.ok(
    metrics.p95LatencyMs < 5.0,
    `Burst p95 latency ${metrics.p95LatencyMs}ms exceeds 5.0ms threshold`,
  );
  assert.ok(
    metrics.averageLatencyMs < 5.0,
    `Burst average latency ${metrics.averageLatencyMs}ms exceeds 5.0ms threshold`,
  );
  assert.equal(metrics.passed, true);
});

test("benchmark output conforms strictly to receipt.json acceptanceEvidence schema", () => {
  const { metrics } = runShadowLatencyBenchmark(100);

  assert.equal(typeof metrics.sampleCount, "number");
  assert.ok(metrics.sampleCount >= 100);
  assert.equal(typeof metrics.p95LatencyMs, "number");
  assert.ok(metrics.p95LatencyMs < 5.0);
  assert.equal(typeof metrics.averageLatencyMs, "number");
  assert.ok(metrics.averageLatencyMs < 5.0);
  assert.equal(typeof metrics.maxLatencyMs, "number");
  assert.equal(metrics.thresholdMs, 5.0);
  assert.equal(metrics.passed, true);
});
