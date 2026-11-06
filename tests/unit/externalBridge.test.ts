import assert from "node:assert/strict";
import test from "node:test";
import {
  UniversalExternalAppBridge,
  type ExternalActionRequest,
} from "../../src/features/capabilities/externalBridge.ts";

test("UniversalExternalAppBridge detects active MCP server channel", async () => {
  const bridge = new UniversalExternalAppBridge({
    activeMcpServers: ["topaz-gigapixel", "photoshop-uxp"],
  });

  const topazProfile = bridge.detectSoftware("topaz-gigapixel");
  assert.equal(topazProfile.isInstalled, true);
  assert.equal(topazProfile.mcpAvailable, true);
  assert.equal(topazProfile.displayName, "Topaz Gigapixel AI");

  const req: ExternalActionRequest = {
    software: "topaz-gigapixel",
    action: "upscale_image",
    inputPath: "C:/assets/sample.png",
    parameters: { scaleFactor: 4 },
  };

  const res = await bridge.execute(req);
  assert.equal(res.ok, true);
  assert.equal(res.channelUsed, "mcp");
  assert.equal(res.outputPath, "C:/assets/sample_upscale_image_result.png");
  assert.ok(res.message.includes("通过标准 MCP 协议"));
});

test("UniversalExternalAppBridge executes via CLI runner when MCP is absent", async () => {
  let invoked = false;
  const bridge = new UniversalExternalAppBridge({
    simulatedCliRunner: async (_software, req) => {
      invoked = true;
      return req.outputPath || "C:/assets/cli_output.png";
    },
  });

  const req: ExternalActionRequest = {
    software: "photoshop-uxp",
    action: "outpaint_image",
    inputPath: "C:/assets/canvas.png",
    outputPath: "C:/assets/expanded_canvas.png",
  };

  const res = await bridge.execute(req);
  assert.equal(invoked, true);
  assert.equal(res.ok, true);
  assert.equal(res.channelUsed, "cli-sidecar");
  assert.equal(res.outputPath, "C:/assets/expanded_canvas.png");
  assert.ok(res.message.includes("侧车通道"));
});

test("UniversalExternalAppBridge gracefully falls back to built-in pipeline when software not installed", async () => {
  const bridge = new UniversalExternalAppBridge();

  const req: ExternalActionRequest = {
    software: "topaz-gigapixel",
    action: "upscale_image",
    inputPath: "C:/assets/photo.jpg",
  };

  const res = await bridge.execute(req);
  assert.equal(res.ok, true);
  assert.equal(res.channelUsed, "neural-fallback");
  assert.equal(res.softwareName, "KK-Studio Built-in Neural Pipeline");
  assert.ok(res.message.includes("平滑降级至内置超分/重绘算法"));
});
