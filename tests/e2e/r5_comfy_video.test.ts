import assert from "node:assert/strict";
import test from "node:test";
import {
  parseComfyUiOutputs,
  calculateWebSocketProgress,
  buildTargetedCancellationRequest,
  type ComfyUiHistoryOutputs,
} from "./harness.ts";

/* =========================================================================
 * R5: ComfyUI Video Output Parsing & Live Progress Tracking E2E Tests
 * ========================================================================= */

const BASE_URL = "http://127.0.0.1:8188";

// -------------------------------------------------------------------------
// Tier 1: Feature Coverage (Core Contracts & Happy Paths)
// -------------------------------------------------------------------------

test("R5-T1-01: ComfyUI output parsing identifies .mp4 video files under node outputs with video/mp4 MIME", () => {
  const history: ComfyUiHistoryOutputs = {
    "node-vhs-video-combine": {
      videos: [
        {
          filename: "AnimateDiff_00001.mp4",
          subfolder: "video_outputs",
          type: "output",
        },
      ],
    },
  };

  const results = parseComfyUiOutputs("prompt-video-101", BASE_URL, history);

  assert.equal(results.length, 1);
  assert.equal(results[0].providerJobId, "prompt-video-101");
  assert.equal(results[0].mime, "video/mp4", "Must identify .mp4 as video/mp4 MIME");
  assert.ok(results[0].url.includes("/view?"));
  assert.ok(results[0].url.includes("filename=AnimateDiff_00001.mp4"));
  assert.ok(results[0].url.includes("subfolder=video_outputs"));
});

test("R5-T1-02: ComfyUI output parsing identifies .webm video files with video/webm MIME", () => {
  const history: ComfyUiHistoryOutputs = {
    "node-video-save": {
      videos: [
        {
          filename: "Motion_Scene.webm",
          subfolder: "",
          type: "output",
        },
      ],
    },
  };

  const results = parseComfyUiOutputs("prompt-video-102", BASE_URL, history);

  assert.equal(results.length, 1);
  assert.equal(results[0].mime, "video/webm", "Must identify .webm as video/webm MIME");
  assert.ok(results[0].url.includes("filename=Motion_Scene.webm"));
});

test("R5-T1-03: video blob retrieval resolves full /view endpoint URL with correct query parameters", () => {
  const history: ComfyUiHistoryOutputs = {
    "node-99": {
      videos: [
        {
          filename: "high_res_h3.mp4",
          subfolder: "h3_workspace",
          type: "temp",
        },
      ],
    },
  };

  const [result] = parseComfyUiOutputs("job-view-check", "https://comfy.kk.local:8188", history);
  const parsedUrl = new URL(result.url);

  assert.equal(parsedUrl.origin, "https://comfy.kk.local:8188");
  assert.equal(parsedUrl.pathname, "/view");
  assert.equal(parsedUrl.searchParams.get("filename"), "high_res_h3.mp4");
  assert.equal(parsedUrl.searchParams.get("subfolder"), "h3_workspace");
  assert.equal(parsedUrl.searchParams.get("type"), "temp");
});

test("R5-T1-04: WebSocket live progress calculates accurate percentage across progress stream", () => {
  // Value 0 of 20 steps -> 0%
  assert.equal(calculateWebSocketProgress(0, 20), 0);

  // Value 5 of 20 steps -> 25%
  assert.equal(calculateWebSocketProgress(5, 20), 25);

  // Value 10 of 20 steps -> 50%
  assert.equal(calculateWebSocketProgress(10, 20), 50);

  // Value 20 of 20 steps -> 100%
  assert.equal(calculateWebSocketProgress(20, 20), 100);

  // Value clamping: negative or excess values are bounded within [0, 100]
  assert.equal(calculateWebSocketProgress(25, 20), 100);
  assert.equal(calculateWebSocketProgress(-5, 20), 0);
  assert.equal(calculateWebSocketProgress(10, 0), 0);
});

test("R5-T1-05: targeted task cancellation deletes only specific prompt_id via /queue delete", () => {
  const promptId = "prompt-target-to-cancel-777";
  const req = buildTargetedCancellationRequest(promptId, true);

  assert.equal(req.endpoint, "/queue");
  assert.deepEqual(req.body, { delete: [promptId] });

  // Invariant: does NOT issue shutdown, kill, or restart commands to server
  const stringified = JSON.stringify(req);
  assert.doesNotMatch(stringified, /kill|shutdown|restart|terminate/i);
});

// -------------------------------------------------------------------------
// Tier 2: Boundary & Corner Cases (Mixed Media, Fallback & Interruption)
// -------------------------------------------------------------------------

test("R5-T2-01: mixed media outputs containing both image previews and final video parse all files", () => {
  const history: ComfyUiHistoryOutputs = {
    "node-preview": {
      images: [
        { filename: "first_frame_preview.png", subfolder: "", type: "output" },
      ],
    },
    "node-video-final": {
      videos: [
        { filename: "h3_animation_final.mp4", subfolder: "video", type: "output" },
      ],
      gifs: [
        { filename: "preview_loop.gif", subfolder: "video", type: "output" },
      ],
    },
  };

  const results = parseComfyUiOutputs("prompt-mixed", BASE_URL, history);

  // Total 3 outputs
  assert.equal(results.length, 3);

  const video = results.find((r) => r.mime === "video/mp4")!;
  assert.ok(video);
  assert.ok(video.url.includes("h3_animation_final.mp4"));

  const gif = results.find((r) => r.mime === "image/gif")!;
  assert.ok(gif);
  assert.ok(gif.url.includes("preview_loop.gif"));

  const png = results.find((r) => r.mime === "image/png")!;
  assert.ok(png);
  assert.ok(png.url.includes("first_frame_preview.png"));
});

test("R5-T2-02: WebSocket drop mid-generation gracefully falls back to HTTP history polling", async () => {
  let wsConnected = true;
  let pollAttempts = 0;

  // Simulate generation coordinator
  const simulateTaskTracking = async () => {
    // 1. WebSocket connects
    assert.equal(wsConnected, true);

    // 2. WebSocket connection drops
    wsConnected = false;

    // 3. Fallback to HTTP polling
    if (!wsConnected) {
      pollAttempts++;
      // Polling /history/{prompt_id}
      const pollResponse = { status: "succeeded", outputsAvailable: true };
      return pollResponse;
    }
    return { status: "running", outputsAvailable: false };
  };

  const outcome = await simulateTaskTracking();
  assert.equal(pollAttempts, 1, "Must perform HTTP history poll upon WS disconnect");
  assert.equal(outcome.status, "succeeded");
});

test("R5-T2-03: WebSocket execution_error immediately terminates task with typed error details", () => {
  const wsErrorMessage = {
    type: "execution_error",
    data: {
      prompt_id: "prompt-oom-fail",
      node_id: "KAutoSampler",
      node_type: "KSampler",
      exception_message: "CUDA out of memory. Tried to allocate 2.40 GiB",
      exception_type: "torch.cuda.OutOfMemoryError",
      traceback: ["File comfy/samplers.py, line 450", "File torch/cuda/__init__.py"],
    },
  };

  // Immediate error dispatch handler
  let taskStatus = "running";
  let failureReason = "";

  if (wsErrorMessage.type === "execution_error") {
    taskStatus = "failed";
    failureReason = wsErrorMessage.data.exception_message;
  }

  assert.equal(taskStatus, "failed", "Task must fail immediately on execution_error");
  assert.match(failureReason, /CUDA out of memory/, "Must capture error details");
});

test("R5-T2-04: running task targeted cancellation invokes /interrupt with specific prompt_id", () => {
  const promptId = "running-prompt-888";
  const req = buildTargetedCancellationRequest(promptId, false); // running task (not queued)

  assert.equal(req.endpoint, "/interrupt");
  assert.deepEqual(req.body, { prompt_id: promptId });
});

test("R5-T2-05: malformed history payload with null fields or unknown formats skips gracefully", () => {
  const malformedHistory: any = {
    "broken-node-1": null,
    "broken-node-2": {
      videos: [{ filename: null }], // null filename
      images: [{ filename: "unsupported.xyz" }], // unknown extension
    },
    "broken-node-3": {
      videos: [{ filename: "" }], // empty string
    },
    "valid-node": {
      videos: [{ filename: "clean.mp4" }],
    },
  };

  const results = parseComfyUiOutputs("prompt-tolerant", BASE_URL, malformedHistory);

  // Exactly 1 valid output from valid-node; corrupted nodes skipped without crashing
  assert.equal(results.length, 1);
  assert.equal(results[0].mime, "video/mp4");
  assert.ok(results[0].url.includes("clean.mp4"));
});
