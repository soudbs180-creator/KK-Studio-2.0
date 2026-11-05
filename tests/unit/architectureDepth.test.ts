import assert from "node:assert/strict";
import { test } from "node:test";
import { PrivacyMask } from "../../src/domain/privacyMask.ts";
import {
  fromWireEvent,
  toWireBody,
} from "../../src/domain/gatewayTranslate.ts";
import { rankAccounts, routeIntent } from "../../src/domain/routingGroups.ts";
import {
  SuperagentEngine,
  ticketPhase,
} from "../../src/domain/superagent/engine.ts";
import {
  blueprintHealth,
  toggleModule,
  visibleModules,
} from "../../src/domain/blueprintHealth.ts";
import {
  certifyAttribute,
  discoverConcepts,
  validateCertified,
} from "../../src/domain/ontologyCertification.ts";

const accounts = [
  {
    id: "soon",
    priority: 2,
    remaining: 10,
    used: 5,
    resetAt: 100,
    healthy: true,
    periodHours: 1,
  },
  {
    id: "later",
    priority: 1,
    remaining: 40,
    used: 1,
    resetAt: 500,
    healthy: true,
    periodHours: 4,
  },
];

test("routing groups order accounts by the selected policy", () => {
  assert.deepEqual(rankAccounts("smart", accounts, 0), ["soon", "later"]);
  assert.deepEqual(rankAccounts("order", accounts, 0), ["later", "soon"]);
  assert.deepEqual(rankAccounts("usage", accounts, 0), ["later", "soon"]);
  assert.deepEqual(rankAccounts("rotate", accounts, 0, 1), ["later", "soon"]);
  assert.equal(routeIntent("你好"), "simple");
  assert.equal(routeIntent("把小说排成分镜并生图"), "complex");
});

test("privacy mask is stable and reverses only in memory", () => {
  const mask = new PrivacyMask();
  const first = mask.mask("mail ada@studio.test key sk-abcdef1234567890");
  const second = mask.mask("sk-abcdef1234567890");
  assert.match(first, /\{\{EMAIL_/);
  assert.match(first, /\{\{API_KEY_/);
  assert.equal(first.includes("sk-abcdef1234567890"), false);
  assert.equal(second, first.match(/\{\{API_KEY_[a-z0-9]+\}\}/)?.[0]);
  assert.match(mask.unmask(first), /ada@studio\.test/);
  assert.equal(mask.audit().replacements, 2);
});

test("four protocol wires share one canonical turn", () => {
  const request = {
    model: "m",
    turns: [
      { role: "system" as const, content: "规则" },
      { role: "user" as const, content: "画一张" },
    ],
  };
  assert.equal(
    (toWireBody("openai-chat", request).messages as unknown[]).length,
    2,
  );
  assert.equal(toWireBody("anthropic", request).system as string, "规则");
  assert.ok(toWireBody("gemini", request).contents);
  assert.ok(toWireBody("openai-responses", request).input);
  assert.deepEqual(
    fromWireEvent("openai-chat", {
      choices: [{ delta: { reasoning_content: "想", content: "好" } }],
    }),
    { text: "好", reasoning: "想" },
  );
});

test("ticket phase follows the fixed seven-step order", () => {
  assert.equal(
    ticketPhase({ deliveryFailed: true, attention: true }),
    "person/delivery",
  );
  assert.equal(
    ticketPhase({ attention: true, report: "ready" }),
    "person/answer",
  );
  assert.equal(ticketPhase({ report: "ready" }), "person/review");
  assert.equal(ticketPhase({ report: "failed" }), "person/blocked");
  assert.equal(
    ticketPhase({ assignment: "pending", report: "waiting" }),
    "working/queued",
  );
  assert.equal(ticketPhase({ report: "waiting" }), "idle");
  assert.equal(ticketPhase({}), "working");
  const engine = new SuperagentEngine({
    policy: { version: 1, mode: "auto" },
    slots: 2,
  });
  const first = engine.intake({
    id: "t1",
    threadId: "thread",
    text: "做分镜",
    source: "conversation",
    explicit: true,
  });
  assert.equal(first.decision, "accept");
  const follow = engine.intake({
    id: "t2",
    threadId: "thread",
    text: "再改第二镜",
    source: "conversation",
  });
  assert.equal(follow.ticketId, first.ticketId);
  assert.equal(engine.drain("launch").length, 1);
});

test("blueprint drill-down hides children and health names the risk", () => {
  const modules = [
    {
      id: "root",
      title: "网关",
      summary: "统一入口",
      developer: "src/features/ai-gateway",
      collapsed: true,
    },
    {
      id: "child",
      title: "密钥",
      summary: "sk-live-secret",
      developer: "secret.ts",
      parentId: "root",
      exposesSecret: true,
      connected: false,
    },
  ];
  assert.deepEqual(
    visibleModules(modules).map((item) => item.id),
    ["root"],
  );
  assert.equal(toggleModule(modules, "root")[0]?.collapsed, false);
  assert.equal(
    blueprintHealth(modules).some((item) => item.kind === "secret"),
    true,
  );
});

test("uncertified ontology attributes ask instead of generating", () => {
  const [concept] = discoverConcepts({ titles: ["小林"] });
  assert.ok(concept);
  const blocked = validateCertified("画出小林", [concept]);
  assert.equal(blocked.ok, false);
  const certified = certifyAttribute(concept, "外观", "红衣");
  assert.equal(validateCertified("画出小林", [certified]).ok, true);
});
