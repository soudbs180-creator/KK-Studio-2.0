import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import { createProxyServer } from "../../vendor/canvas-proxy/index.js";

/**
 * canvas-proxy（vendor/canvas-proxy）转发冒烟测试：
 * 用本地回显服务器模拟第三方接口，验证代理按“代理地址 + 完整目标地址”转发、
 * CORS 头补全、POST body 透传与根路径版本探测。
 */
function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") resolve(address.port);
      else reject(new Error("无法获取监听端口"));
    });
  });
}

async function startEchoServer() {
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk as Buffer));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      res.writeHead(200, {
        "content-type": "application/json",
        "x-echo-target": `${req.method} ${req.url}`,
        connection: "close",
      });
      res.end(
        JSON.stringify({
          method: req.method,
          url: req.url,
          body: body.toString("utf8"),
        }),
      );
    });
  });
  const port = await listen(server);
  return { server, port };
}

async function startProxy() {
  const server = createProxyServer();
  const port = await listen(server);
  return { server, port };
}

function closeServer(server: Server) {
  server.close();
  server.closeAllConnections?.();
}

test("proxy 根路径返回版本探测信息", async () => {
  const proxy = await startProxy();
  try {
    const response = await fetch(`http://127.0.0.1:${proxy.port}/`);
    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      proxy?: string;
      version?: string;
    };
    assert.ok(payload.proxy?.includes("canvas-proxy"));
    assert.ok(payload.version);
  } finally {
    closeServer(proxy.server);
  }
});

test("proxy OPTIONS 预检返回宽松 CORS 头", async () => {
  const proxy = await startProxy();
  try {
    const response = await fetch(
      `http://127.0.0.1:${proxy.port}/http://example.com/v1/models`,
      {
        method: "OPTIONS",
      },
    );
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.equal(response.headers.get("access-control-allow-methods"), "*");
  } finally {
    closeServer(proxy.server);
  }
});

test("proxy GET 转发到目标地址并透传响应头", async () => {
  const echo = await startEchoServer();
  const proxy = await startProxy();
  try {
    const response = await fetch(
      `http://127.0.0.1:${proxy.port}/http://127.0.0.1:${echo.port}/v1/models?limit=2`,
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.equal(
      response.headers.get("x-echo-target"),
      "GET /v1/models?limit=2",
    );
    const payload = (await response.json()) as {
      method: string;
      url: string;
      body: string;
    };
    assert.equal(payload.method, "GET");
    assert.equal(payload.url, "/v1/models?limit=2");
    assert.equal(payload.body, "");
  } finally {
    closeServer(proxy.server);
    closeServer(echo.server);
  }
});

test("proxy POST 透传 JSON body", async () => {
  const echo = await startEchoServer();
  const proxy = await startProxy();
  try {
    const response = await fetch(
      `http://127.0.0.1:${proxy.port}/http://127.0.0.1:${echo.port}/v1/images/generations`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer test-key",
        },
        body: JSON.stringify({ prompt: "一只猫", n: 1 }),
      },
    );
    assert.equal(response.status, 200);
    const payload = (await response.json()) as { method: string; body: string };
    assert.equal(payload.method, "POST");
    assert.deepEqual(JSON.parse(payload.body), { prompt: "一只猫", n: 1 });
  } finally {
    closeServer(proxy.server);
    closeServer(echo.server);
  }
});

test("proxy 目标不可达时返回 502", async () => {
  const proxy = await startProxy();
  try {
    const response = await fetch(
      `http://127.0.0.1:${proxy.port}/http://127.0.0.1:1/nothing`,
    );
    assert.equal(response.status, 502);
    const payload = (await response.json()) as { error?: string };
    assert.ok(payload.error);
  } finally {
    closeServer(proxy.server);
  }
});
