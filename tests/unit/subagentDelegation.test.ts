import assert from "node:assert/strict";
import test from "node:test";
import {
  truncateExecutiveSummary,
  isSubagentFoldbackResult,
  createFoldbackResult,
  MAX_EXECUTIVE_SUMMARY_WORDS,
  MAX_EXECUTIVE_SUMMARY_CHARS,
  type SubagentTaskBrief,
} from "../../src/features/agent/delegation/foldbackContract.ts";
import {
  SubagentSandbox,
  type SubagentToolDefinition,
} from "../../src/features/agent/delegation/subagentSandbox.ts";
import {
  DelegationPipeline,
} from "../../src/features/agent/delegation/delegationPipeline.ts";

test("truncateExecutiveSummary preserves short text and truncates text exceeding word limit", () => {
  const shortText = "Scraped 3 news articles and extracted key headlines.";
  assert.equal(truncateExecutiveSummary(shortText, 50), shortText);

  // Generate 350 words: test word boundary truncation when character limit is large enough
  const words = Array.from({ length: 350 }, (_, i) => `word${i + 1}`);
  const longText = words.join(" ");

  const truncated = truncateExecutiveSummary(longText, 300, 5000);
  const truncatedWords = truncated.split(/\s+/);
  assert.ok(truncated.includes("[summary truncated for context safety]"));
  // 300 words + 6 suffix words = 306 tokens/words
  assert.equal(truncatedWords[0], "word1");
  assert.equal(truncatedWords[299], "word300");

  // Empty / invalid input handling
  assert.equal(truncateExecutiveSummary(""), "");
  assert.equal(truncateExecutiveSummary("   "), "");
});

test("truncateExecutiveSummary clamps unspaced 50,000-character payload to prevent token blowup", () => {
  assert.equal(MAX_EXECUTIVE_SUMMARY_WORDS, 300);
  assert.equal(MAX_EXECUTIVE_SUMMARY_CHARS, 1500);

  // Adversarial unspaced payload: 50,000 chars without whitespace (e.g. minified JSON / base64)
  const unspacedPayload = "A".repeat(50000);

  // 1. Enforced with explicit maxChars (1500)
  const truncatedExplicit = truncateExecutiveSummary(unspacedPayload, 300, 1500);
  assert.ok(
    truncatedExplicit.length <= 1600,
    `Expected length <= 1600, got ${truncatedExplicit.length}`,
  );
  assert.equal(truncatedExplicit.slice(0, 1500), "A".repeat(1500));
  assert.ok(truncatedExplicit.includes("[summary truncated for context safety]"));

  // 2. Enforced with default parameters (maxWords = 300, maxChars = 1500)
  const truncatedDefault = truncateExecutiveSummary(unspacedPayload);
  assert.ok(
    truncatedDefault.length <= 1600,
    `Expected default length <= 1600, got ${truncatedDefault.length}`,
  );
  assert.equal(truncatedDefault.slice(0, 1500), "A".repeat(1500));
  assert.ok(truncatedDefault.includes("[summary truncated for context safety]"));

  // 3. Unspaced base64 payload (> 50,000 chars)
  const base64Data = Buffer.from("subagent_unspaced_raw_token_data".repeat(2000)).toString("base64");
  assert.ok(base64Data.length > 50000);
  const truncatedBase64 = truncateExecutiveSummary(base64Data);
  assert.ok(truncatedBase64.length <= 1600);
  assert.equal(truncatedBase64.slice(0, 1500), base64Data.slice(0, 1500));
  assert.ok(truncatedBase64.includes("[summary truncated for context safety]"));

  // 4. createFoldbackResult with 50,000-char unspaced payload
  const foldback = createFoldbackResult({
    taskId: "task-unspaced-001",
    subagentRole: "data_harvester",
    status: "success",
    executiveSummary: unspacedPayload,
  });
  assert.ok(foldback.executiveSummary.length <= 1600);
  assert.equal(foldback.executiveSummary.slice(0, 1500), "A".repeat(1500));
  assert.ok(foldback.executiveSummary.includes("[summary truncated for context safety]"));
});

test("isSubagentFoldbackResult validates result schema accurately", () => {
  const valid = {
    taskId: "task-001",
    subagentRole: "scraper",
    status: "success",
    executiveSummary: "Scraped successfully.",
    structuredData: { count: 10 },
    artifactRefs: ["doc.md"],
    tokensConsumed: 120,
  };
  assert.equal(isSubagentFoldbackResult(valid), true);

  // Partial status is valid
  assert.equal(isSubagentFoldbackResult({ ...valid, status: "partial" }), true);
  // Failed status is valid
  assert.equal(isSubagentFoldbackResult({ ...valid, status: "failed" }), true);

  // Invalid cases
  assert.equal(isSubagentFoldbackResult(null), false);
  assert.equal(isSubagentFoldbackResult({}), false);
  assert.equal(isSubagentFoldbackResult({ ...valid, status: "unknown" }), false);
  assert.equal(isSubagentFoldbackResult({ ...valid, taskId: "" }), false);
  assert.equal(isSubagentFoldbackResult({ ...valid, executiveSummary: 123 }), false);
  assert.equal(isSubagentFoldbackResult({ ...valid, structuredData: "not-an-object" }), false);
  assert.equal(isSubagentFoldbackResult({ ...valid, artifactRefs: "not-an-array" }), false);
  assert.equal(isSubagentFoldbackResult({ ...valid, tokensConsumed: "invalid" }), false);
});

test("createFoldbackResult normalizes and ensures summary truncation", () => {
  const words = Array.from({ length: 350 }, () => "data").join(" ");
  const result = createFoldbackResult({
    taskId: "task-002",
    subagentRole: "analyst",
    status: "success",
    executiveSummary: words,
    artifactRefs: ["report.pdf"],
    tokensConsumed: 500,
  });

  assert.equal(result.taskId, "task-002");
  assert.equal(result.subagentRole, "analyst");
  assert.equal(result.status, "success");
  assert.ok(result.executiveSummary.includes("[summary truncated for context safety]"));
  assert.deepEqual(result.artifactRefs, ["report.pdf"]);
  assert.equal(result.tokensConsumed, 500);
});

test("SubagentSandbox maintains isolated context with zero inheritance of parent history", () => {
  const brief: SubagentTaskBrief = {
    taskId: "task-isolate-1",
    taskType: "scrape",
    subagentRole: "scraper",
    goal: "Extract table data from URL",
    constraints: ["Do not mutate canvas", "Max 5 pages"],
    inputs: { targetUrl: "https://example.com/data" },
  };

  const sandbox = new SubagentSandbox(brief);

  // Check isolated history
  assert.equal(sandbox.history.length, 2); // 1 system prompt, 1 input turn
  assert.equal(sandbox.history[0].role, "system");
  assert.match(sandbox.history[0].content, /role: scraper/);
  assert.match(sandbox.history[0].content, /task-isolate-1/);
  assert.match(sandbox.history[0].content, /Do not mutate canvas/);
  assert.match(sandbox.history[0].content, /Anti-Pollution Directive/);

  // User turn has inputs
  assert.equal(sandbox.history[1].role, "user");
  assert.match(sandbox.history[1].content, /https:\/\/example.com\/data/);

  // Ensure no random parent history exists
  assert.ok(!sandbox.history.some((t) => t.content.includes("previous conversation")));
});

test("SubagentSandbox enforces tool whitelist and rejects recursive subagent spawning", async () => {
  const brief: SubagentTaskBrief = {
    taskId: "task-tools-1",
    taskType: "scrape",
    subagentRole: "scraper",
    goal: "Scrape safely",
    allowedTools: ["fetch_url", "parse_html"],
  };

  const executedTools: string[] = [];
  const testTool: SubagentToolDefinition = {
    name: "fetch_url",
    description: "Fetches web page",
    execute: (args) => {
      executedTools.push(String(args.url));
      return { html: "<html><body>Hello World</body></html>" };
    },
  };

  const sandbox = new SubagentSandbox(brief, { tools: [testTool] });

  // 1. Allowed tool execution succeeds
  const res = await sandbox.executeTool("fetch_url", { url: "https://example.com" });
  assert.equal(res.error, undefined);
  assert.deepEqual(res.output, { html: "<html><body>Hello World</body></html>" });
  assert.equal(executedTools.length, 1);

  // 2. Unregistered or unallowed tool is rejected
  const unallowed = await sandbox.executeTool("canvas_write_node", { id: "node1" });
  assert.ok(unallowed.error?.includes("ToolNotAllowed"));

  // 3. Recursive subagent spawning is strictly prohibited
  const recursive = await sandbox.executeTool("delegate_task", { goal: "recurse" });
  assert.ok(recursive.error?.includes("PermissionDenied"));

  // 4. Registering a recursive tool directly throws security error
  assert.throws(
    () => {
      sandbox.registerTool({
        name: "spawn_subagent",
        description: "forbidden",
        execute: () => {},
      });
    },
    { message: /Security violation: tool 'spawn_subagent' is prohibited/ },
  );
});

test("SubagentSandbox runs multi-step turns and records context anti-pollution savings", async () => {
  const brief: SubagentTaskBrief = {
    taskId: "task-multistep-1",
    taskType: "scrape",
    subagentRole: "scraper",
    goal: "Scrape pages and compile data",
    allowedTools: ["fetch_page"],
  };

  const fetchPageTool: SubagentToolDefinition = {
    name: "fetch_page",
    description: "Fetch page content",
    execute: () => {
      // Return a large payload (10,000 characters of raw HTML)
      return {
        html: "<div>" + "Raw scraping contents ".repeat(500) + "</div>",
      };
    },
  };

  const sandbox = new SubagentSandbox(brief, { tools: [fetchPageTool] });
  sandbox.addArtifact("extracted_dataset.json");

  let turnIndex = 0;
  const result = await sandbox.run(async (_history) => {
    turnIndex++;
    if (turnIndex === 1) {
      return {
        content: "Step 1: fetching page",
        toolCalls: [{ id: "call_1", name: "fetch_page", args: { page: 1 } }],
      };
    }
    // Step 2: finalize with a compact executive summary
    return {
      done: true,
      finalSummary: "Extracted 500 records from the target website.",
      structuredData: { totalRecords: 500 },
    };
  });

  assert.equal(result.status, "success");
  assert.equal(result.executiveSummary, "Extracted 500 records from the target website.");
  assert.deepEqual(result.artifactRefs, ["extracted_dataset.json"]);
  assert.equal(result.structuredData?.totalRecords, 500);

  // Execution stats verification
  assert.ok(result.executionStats);
  assert.ok(result.executionStats.intermediateTurns >= 4); // system + user + assistant + tool + final
  // Anti-pollution: raw volume should be thousands of tokens, while executive summary is small
  assert.ok(result.executionStats.rawTokensEstimate! > 1000);
  assert.ok(result.executionStats.tokensSaved! > 1000);
  assert.ok(sandbox.tokensConsumed > 0);
  assert.equal(sandbox.status, "completed");
});

test("SubagentSandbox enforces maxTurns limit and returns partial status", async () => {
  const brief: SubagentTaskBrief = {
    taskId: "task-maxturns-1",
    taskType: "deep_analysis",
    subagentRole: "analyst",
    goal: "Never ending loop",
    maxTurns: 3,
  };

  const sandbox = new SubagentSandbox(brief);

  const result = await sandbox.run(async () => {
    // Never sets done: true
    return {
      content: "Thinking more...",
    };
  });

  assert.equal(result.status, "partial");
  assert.match(result.executiveSummary, /reached maximum turn limit of 3/);
});

test("SubagentSandbox handles cancellation via AbortSignal", async () => {
  const brief: SubagentTaskBrief = {
    taskId: "task-abort-1",
    taskType: "deep_analysis",
    subagentRole: "analyst",
    goal: "Long task",
  };

  const controller = new AbortController();
  const sandbox = new SubagentSandbox(brief);

  const runPromise = sandbox.run(
    async () => {
      controller.abort(new Error("User stopped subagent"));
      return { content: "working..." };
    },
    { signal: controller.signal },
  );

  const result = await runPromise;
  assert.equal(result.status, "failed");
  assert.match(result.error || "", /User stopped subagent/);
});

test("DelegationPipeline manages presets, dispatching, and aggregated metrics", async () => {
  const pipeline = new DelegationPipeline();

  // Verify default presets
  assert.ok(pipeline.getPreset("scraper"));
  assert.ok(pipeline.getPreset("deep_analysis"));
  assert.ok(pipeline.getPreset("local_image_edit"));
  assert.ok(pipeline.getPreset("code_verify"));

  // Register a mock tool
  pipeline.registerTool({
    name: "fetch_url",
    description: "fetch url mock",
    execute: (args) => ({ status: 200, url: args.url }),
  });

  // Track events
  const events: string[] = [];
  const unsubscribe = pipeline.subscribe((e) => {
    events.push(e.type);
  });

  // Dispatch task 1
  const brief1: SubagentTaskBrief = {
    taskId: "pipe-task-1",
    taskType: "scrape",
    subagentRole: "scraper",
    goal: "Scrape API documentation",
    inputs: { url: "https://api.example.com" },
  };

  const res1 = await pipeline.dispatchTask(brief1);
  assert.equal(res1.status, "success");
  assert.equal(pipeline.getResult("pipe-task-1")?.taskId, "pipe-task-1");

  // Dispatch batch tasks
  const batchBriefs: SubagentTaskBrief[] = [
    {
      taskId: "pipe-batch-1",
      taskType: "code_verify",
      subagentRole: "code_verify",
      goal: "Verify module A",
    },
    {
      taskId: "pipe-batch-2",
      taskType: "code_verify",
      subagentRole: "code_verify",
      goal: "Verify module B",
    },
  ];

  const batchResults = await pipeline.dispatchBatch(batchBriefs, undefined, { concurrency: 2 });
  assert.equal(batchResults.length, 2);
  assert.equal(batchResults[0].status, "success");
  assert.equal(batchResults[1].status, "success");

  // Metrics check
  const metrics = pipeline.getMetrics();
  assert.equal(metrics.totalTasksDispatched, 3);
  assert.equal(metrics.successfulTasks, 3);
  assert.equal(metrics.failedTasks, 0);

  // Events check
  assert.ok(events.includes("task_started"));
  assert.ok(events.includes("task_completed"));

  unsubscribe();
});

test("DelegationPipeline supports task cancellation", async () => {
  const pipeline = new DelegationPipeline();

  let started = false;
  const dispatchPromise = pipeline.dispatchTask(
    {
      taskId: "cancel-task-1",
      taskType: "deep_analysis",
      subagentRole: "deep_analysis",
      goal: "Slow analysis",
    },
    async (_history, _tools, signal) => {
      started = true;
      // Wait for abort
      while (!signal?.aborted) {
        await new Promise((r) => setTimeout(r, 10));
      }
      return { done: true };
    },
  );

  // Wait until started
  while (!started) {
    await new Promise((r) => setTimeout(r, 5));
  }

  assert.equal(pipeline.getActiveTaskCount(), 1);
  const cancelled = pipeline.cancelTask("cancel-task-1", "Cancelled by user");
  assert.equal(cancelled, true);

  const res = await dispatchPromise;
  assert.equal(res.status, "failed");
  assert.match(res.error || "", /Cancelled by user/);
  assert.equal(pipeline.getActiveTaskCount(), 0);
});
