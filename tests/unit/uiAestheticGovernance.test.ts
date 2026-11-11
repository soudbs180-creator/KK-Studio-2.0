import assert from "node:assert/strict";
import test from "node:test";
import {
  validateSpacingValue,
  validateColorStyle,
  calculateContrastRatio,
  validateIconCopy,
  validateCopyText,
  validateTypographyWeight,
  getDarkThemeCompensatedWeight,
  validateViewportLayout,
  validateConcentricRadius,
  validateVisualAsset,
  validateMotionProperty,
  validateAnimationName,
  evaluateStyleDeclaration,
} from "../../src/domain/uiAestheticGovernance.ts";

test("Pass 1: Spacing checks strictly enforce 4px grid rhythm", () => {
  // Valid multiples of 4
  assert.equal(validateSpacingValue("16px"), null);
  assert.equal(validateSpacingValue("24px"), null);
  assert.equal(validateSpacingValue(32), null);
  assert.equal(validateSpacingValue("0px"), null);

  // 2px micro-nudge warning
  const nudge = validateSpacingValue("6px");
  assert.ok(nudge);
  assert.equal(nudge.severity, "warning");
  assert.equal(nudge.recommendedValue, "8px");

  // Odd or non-grid violation
  const violation = validateSpacingValue("13px");
  assert.ok(violation);
  assert.equal(violation.severity, "violation");
  assert.equal(violation.recommendedValue, "12px");
});

test("Pass 2: Color checks detect AI slop gradients and compute WCAG contrast", () => {
  // AI slop gradient
  const grad = validateColorStyle(
    "background",
    "linear-gradient(to right, #8b5cf6, #3b82f6)",
  );
  assert.ok(grad);
  assert.equal(grad.ruleId, "COL-01");

  // Gaussian glow shadow
  const glow = validateColorStyle(
    "boxShadow",
    "0 0 20px rgba(139, 92, 246, 0.5)",
  );
  assert.ok(glow);
  assert.equal(glow.severity, "violation");

  // WCAG contrast calculation
  const blackOnWhite = calculateContrastRatio("#000000", "#ffffff");
  assert.ok(
    blackOnWhite >= 20.0,
    `Black on white must be ~21:1, got ${blackOnWhite}`,
  );

  const tagContrast = calculateContrastRatio("#1458a5", "#f2f2f2");
  assert.ok(
    tagContrast >= 4.5,
    `Character tag contrast must be AA, got ${tagContrast}`,
  );
});

test("Pass 3: Icons detect emoji used as UI decorations", () => {
  const emoji = validateIconCopy("生成分镜 ✨");
  assert.ok(emoji);
  assert.equal(emoji.severity, "violation");
  assert.equal(emoji.recommendedValue, "生成分镜");

  const clean = validateIconCopy("创建新项目");
  assert.equal(clean, null);
});

test("Pass 4: Copy rules ban shouting, greetings, hype words, and trailing periods", () => {
  // Exclamation
  const shout = validateCopyText("立即体验极致效率！");
  assert.ok(shout.some((f) => f.ruleId === "CPY-01"));

  // Greeting
  const greeting = validateCopyText("欢迎回来，KK Studio 创作者");
  assert.ok(greeting.some((f) => f.ruleId === "CPY-02"));

  // AI Hype buzzword
  const hype = validateCopyText("AI-powered 极速黑科技流水线");
  assert.ok(hype.some((f) => f.ruleId === "CPY-03"));

  // Trailing period on action label
  const period = validateCopyText("保存草稿。", true);
  assert.ok(period.some((f) => f.ruleId === "CPY-04"));
  assert.equal(
    period.find((f) => f.ruleId === "CPY-04")?.recommendedValue,
    "保存草稿",
  );
});

test("Pass 5: Typography limits heavy weights and applies dark mode optical compensation", () => {
  // Heavy weight in chrome
  const heavy = validateTypographyWeight(800);
  assert.ok(heavy);
  assert.equal(heavy.severity, "violation");

  const normal = validateTypographyWeight(500);
  assert.equal(normal, null);

  // Dark mode -40 wght compensation
  assert.equal(getDarkThemeCompensatedWeight(700), 660);
  assert.equal(getDarkThemeCompensatedWeight(500), 460);
  assert.equal(getDarkThemeCompensatedWeight(400), 360);
});

test("Pass 6: Layout enforces mobile (<=767px) chat-only viewport parity", () => {
  // Mobile rendering infinite canvas is a critical violation
  const mobileViolations = validateViewportLayout(390, [
    "ChatScreen",
    "CanvasScreen",
    "CanvasNodeEditor",
  ]);
  assert.equal(mobileViolations.length, 2);
  assert.equal(mobileViolations[0].ruleId, "LAY-01");

  // Mobile rendering only chat screen is valid
  const mobileValid = validateViewportLayout(390, [
    "ChatScreen",
    "ComposerDock",
  ]);
  assert.equal(mobileValid.length, 0);

  // Desktop (1440px) rendering canvas is allowed
  const desktop = validateViewportLayout(1440, [
    "CanvasScreen",
    "InfiniteCanvas",
  ]);
  assert.equal(desktop.length, 0);
});

test("Pass 7: Details checks concentric radius law", () => {
  // Outer 16px, Padding 8px, Inner should be 8px
  assert.equal(validateConcentricRadius(16, 8, 8), null);

  // Mismatch: Outer 16px, Padding 8px, Inner 14px -> Warning
  const mismatch = validateConcentricRadius(16, 14, 8);
  assert.ok(mismatch);
  assert.equal(mismatch.severity, "warning");
  assert.equal(mismatch.recommendedValue, "8px");
});

test("Pass 8: Visuals checks flag gimmick stock slop", () => {
  const slop = validateVisualAsset("holographic-orb-banner.png");
  assert.ok(slop);
  assert.equal(slop.severity, "violation");

  const clean = validateVisualAsset("project-shot-preview-01.jpg");
  assert.equal(clean, null);
});

test("Pass 9: Motion prevents layout property transitions and looping slop", () => {
  // Unsafe transition
  const unsafe = validateMotionProperty("height");
  assert.ok(unsafe);
  assert.equal(unsafe.ruleId, "MOT-04");

  // Safe transition
  assert.equal(validateMotionProperty("opacity"), null);
  assert.equal(validateMotionProperty("transform"), null);

  // Looping animation
  const loop = validateAnimationName("card-animate-pulse");
  assert.ok(loop);
  assert.equal(loop.ruleId, "MOT-03");
});

test("Aggregate Evaluator validates style declarations and computes scores", () => {
  // Compliant clean styles
  const cleanResult = evaluateStyleDeclaration({
    padding: "16px",
    margin: "8px",
    fontWeight: "500",
    transition: "transform 150ms ease-out",
  });
  assert.equal(cleanResult.valid, true);
  assert.equal(cleanResult.score, 100);
  assert.equal(cleanResult.findings.length, 0);

  // Violating styles
  const dirtyResult = evaluateStyleDeclaration({
    padding: "13px",
    boxShadow: "0 0 25px rgba(255, 0, 128, 0.8)",
    fontWeight: 800,
    transition: "width 300ms ease",
  });
  assert.equal(dirtyResult.valid, false);
  assert.ok(dirtyResult.score < 50);
  assert.ok(dirtyResult.findings.length >= 3);
});
