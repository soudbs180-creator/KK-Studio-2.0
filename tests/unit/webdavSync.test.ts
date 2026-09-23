import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";

import {
  WEBDAV_MANIFEST_FILE_NAME,
  downloadWebdavSyncFile,
  testWebdavConnection,
  uploadWebdavSyncFile,
  type WebdavSyncConfig,
} from "../../src/features/sync/webdav.ts";

/**
 * WebDAV 同步服务（src/features/sync/webdav.ts）单元测试：
 * 本地模拟 WebDAV 服务器，覆盖连接测试、目录自动创建、上传/下载 manifest。
 */

type StubFile = { path: string; content: string; contentType?: string };

function memoryWebdavServer() {
  const files = new Map<string, StubFile>();
  const directories = new Set<string>();
  const requests: Array<{ method: string; path: string }> = [];
  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const key = decodeURIComponent(url.pathname.replace(/^\//, ""));
    requests.push({ method: req.method || "", path: key });
    if (req.method === "MKCOL") {
      directories.add(key);
      res.writeHead(201);
      res.end();
      return;
    }
    if (req.method === "PROPFIND") {
      res.writeHead(207, { "content-type": "application/xml" });
      res.end(
        "<multistatus xmlns='DAV:'><response><href>/</href></response></multistatus>",
      );
      return;
    }
    if (req.method === "PUT") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk as Buffer));
      req.on("end", () => {
        files.set(key, {
          path: key,
          content: Buffer.concat(chunks).toString("utf8"),
          contentType: req.headers["content-type"],
        });
        res.writeHead(201);
        res.end();
      });
      return;
    }
    if (req.method === "GET") {
      const file = files.get(key);
      if (!file) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, {
        "content-type": file.contentType ?? "application/octet-stream",
      });
      res.end(file.content);
      return;
    }
    res.writeHead(405);
    res.end();
  });
  return { server, files, directories, requests };
}

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

async function startStub() {
  const stub = memoryWebdavServer();
  const port = await listen(stub.server);
  return {
    ...stub,
    port,
    config: (overrides?: Partial<WebdavSyncConfig>): WebdavSyncConfig => ({
      url: `http://127.0.0.1:${port}`,
      directory: "kk-studio/sync",
      username: "user",
      password: "pass",
      ...overrides,
    }),
  };
}

test("上传 manifest 自动创建目录层级并落盘", async () => {
  const stub = await startStub();
  try {
    const config = stub.config();
    const file = new Blob([JSON.stringify({ projects: [] })], {
      type: "application/json",
    });
    await uploadWebdavSyncFile(config, file);
    const key = `kk-studio/sync/${WEBDAV_MANIFEST_FILE_NAME}`;
    const saved = stub.files.get(key);
    assert.ok(saved, "manifest 应已上传");
    assert.deepEqual(JSON.parse(saved.content), { projects: [] });
    assert.ok(stub.directories.has("kk-studio"));
    assert.ok(stub.directories.has("kk-studio/sync"));
  } finally {
    stub.server.close();
  }
});

test("下载不存在的 manifest 返回 null 而非报错", async () => {
  const stub = await startStub();
  try {
    const file = await downloadWebdavSyncFile(stub.config());
    assert.equal(file, null);
  } finally {
    stub.server.close();
  }
});

test("上传后能按原内容下载", async () => {
  const stub = await startStub();
  try {
    const config = stub.config();
    const payload = { projects: [{ id: "p1", name: "示例" }] };
    await uploadWebdavSyncFile(
      config,
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
    );
    const downloaded = await downloadWebdavSyncFile(config);
    assert.ok(downloaded);
    assert.deepEqual(JSON.parse(await downloaded.text()), payload);
  } finally {
    stub.server.close();
  }
});

test("连接测试会发送 PROPFIND 到根目录", async () => {
  const stub = await startStub();
  try {
    await testWebdavConnection(stub.config());
    assert.ok(
      stub.requests.some((request) => request.method === "PROPFIND"),
      "应发起 PROPFIND 探测",
    );
  } finally {
    stub.server.close();
  }
});

test("认证信息以 Basic 头透传", async () => {
  const stub = await startStub();
  const seen = new Map<string, string>();
  try {
    const server = createServer((req, res) => {
      seen.set("authorization", req.headers.authorization ?? "");
      res.writeHead(207);
      res.end("<multistatus xmlns='DAV:'/>");
    });
    const port = await listen(server);
    await testWebdavConnection(
      stub.config({
        url: `http://127.0.0.1:${port}`,
        username: "alice",
        password: "s3cret",
      }),
    );
    assert.equal(
      seen.get("authorization"),
      `Basic ${Buffer.from("alice:s3cret").toString("base64")}`,
    );
    server.close();
  } finally {
    stub.server.close();
  }
});

test("缺少服务器地址时报错", async () => {
  await assert.rejects(
    () =>
      testWebdavConnection({
        url: "",
        directory: "",
        username: "",
        password: "",
      }),
    /服务器地址/,
  );
});
