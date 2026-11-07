import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { UniversalExternalAppBridge } from "../../src/features/capabilities/externalBridge.ts";

const TMP_DIR = os.tmpdir();

test("UniversalExternalAppBridge detects installed software via custom pathExists probe", () => {
  const bridge = new UniversalExternalAppBridge();
  const profile = bridge.detectSoftware("blender", {
    pathExists: (candidate) => candidate.includes("Blender 4.2"),
    mcpAvailabilityMap: { blender: false },
  });

  assert.equal(profile.installed, true);
  assert.ok(profile.executablePath?.includes("Blender 4.2"));
  assert.equal(profile.headlessCliSupported, true);
});

test("UniversalExternalAppBridge prioritizes MCP channel when MCP server and executor are provided", async () => {
  const bridge = new UniversalExternalAppBridge();
  const scenePath = path.join(TMP_DIR, "scene.blend");
  const res = await bridge.executeAction(
    {
      action: "render_3d_scene",
      targetSoftware: "blender",
      inputAssetPath: scenePath,
    },
    {
      mcpAvailabilityMap: { blender: true },
      mcpExecutor: async (req) => ({
        ok: true,
        outputPath: `${req.inputAssetPath}.mcp_out.png`,
      }),
    },
  );

  assert.equal(res.ok, true);
  assert.equal(res.channelUsed, "mcp");
  assert.equal(res.softwareUsed, "blender");
  assert.equal(res.outputAssetPath, `${scenePath}.mcp_out.png`);
});

test("UniversalExternalAppBridge rejects fake pass when MCP is flagged available without mcpExecutor", async () => {
  const bridge = new UniversalExternalAppBridge();
  const res = await bridge.executeAction(
    {
      action: "render_3d_scene",
      targetSoftware: "blender",
      inputAssetPath: path.join(TMP_DIR, "scene.blend"),
    },
    {
      mcpAvailabilityMap: { blender: true },
    },
  );

  assert.equal(res.ok, false);
  assert.equal(res.channelUsed, "mcp");
  assert.equal(res.error, "MCP_EXECUTOR_NOT_CONFIGURED");
});

test("UniversalExternalAppBridge uses headless CLI sidecar when MCP is unavailable but binary and cliRunner exist", async () => {
  const bridge = new UniversalExternalAppBridge();
  let capturedArgs: string[] = [];
  const modelPath = path.join(TMP_DIR, "model.blend");
  const outPath = path.join(TMP_DIR, "out.png");

  const res = await bridge.executeAction(
    {
      action: "render_3d_scene",
      targetSoftware: "blender",
      inputAssetPath: modelPath,
      outputAssetPath: outPath,
    },
    {
      pathExists: (p) => p.includes("Blender 4.2"),
      cliRunner: async (_exe, args) => {
        capturedArgs = args;
        return { ok: true, outputPath: outPath };
      },
    },
  );

  assert.equal(res.ok, true);
  assert.equal(res.channelUsed, "cli-sidecar");
  assert.equal(res.outputAssetPath, outPath);
  assert.ok(capturedArgs.includes("-b"));
});

test("UniversalExternalAppBridge falls back to neuralFallbackExecutor when external software is not installed", async () => {
  const bridge = new UniversalExternalAppBridge();
  const portraitPath = path.join(TMP_DIR, "portrait.png");
  const res = await bridge.executeAction(
    {
      action: "smart_cutout",
      targetSoftware: "photoshop",
      inputAssetPath: portraitPath,
    },
    {
      pathExists: () => false,
      neuralFallbackExecutor: async (req) => ({
        ok: true,
        outputPath: `${req.inputAssetPath}.neural_cutout.png`,
      }),
    },
  );

  assert.equal(res.ok, true);
  assert.equal(res.channelUsed, "neural-fallback");
  assert.equal(res.softwareUsed, "neural-engine");
  assert.equal(res.outputAssetPath, `${portraitPath}.neural_cutout.png`);
});

test("UniversalExternalAppBridge returns honest failure when neither external software nor neuralFallbackExecutor is available", async () => {
  const bridge = new UniversalExternalAppBridge();
  const res = await bridge.executeAction(
    {
      action: "smart_cutout",
      targetSoftware: "photoshop",
      inputAssetPath: path.join(TMP_DIR, "portrait.png"),
    },
    {
      pathExists: () => false,
    },
  );

  assert.equal(res.ok, false);
  assert.equal(res.channelUsed, "neural-fallback");
  assert.equal(res.error, "EXTERNAL_BRIDGE_EXECUTOR_UNAVAILABLE");
  assert.equal(res.outputAssetPath, undefined);
});
