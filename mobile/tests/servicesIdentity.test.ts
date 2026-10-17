import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { createIdentityClient } from "../src/services/identityClient.ts";
import { IdentityRepository } from "./support/identity-server/repository.ts";
import { createIdentityServer } from "./support/identity-server/server.ts";

test("phone identity client logs into actual local server and revokes rotated device session", async () => {
  const dir = await mkdtemp(join(tmpdir(), "kk-phone-auth-"));
  const repository = new IdentityRepository(join(dir, "store.json"));
  await repository.provision({
    email: "fixture@example.test",
    password: "private-fixture-password",
    displayName: "Fixture",
  });
  const server = createIdentityServer({ repository, allowLoopbackHttp: true });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const client = createIdentityClient({
      baseUrl: `http://127.0.0.1:${address.port}`,
      allowLoopbackHttp: true,
    });
    const session = await client.login({
      email: "fixture@example.test",
      password: "private-fixture-password",
      deviceId: "phone-fixture",
    });
    assert.equal(session.user.email, "fixture@example.test");
    assert.equal(
      (await client.me(session.accessToken, session.deviceId)).user.id,
      session.user.id,
    );
    const next = await client.refresh({
      refreshToken: session.refreshToken,
      deviceId: session.deviceId,
    });
    await assert.rejects(
      client.me(session.accessToken, session.deviceId),
      /AUTH_REQUIRED/,
    );
    assert.equal(
      (await client.logout(next.accessToken, next.deviceId)).revoked,
      true,
    );
    await assert.rejects(
      client.refresh({
        refreshToken: next.refreshToken,
        deviceId: next.deviceId,
      }),
      /AUTH_REQUIRED/,
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(dir, { recursive: true, force: true });
  }
});

test("identity HTTPS protection rejects insecure transport and malformed sessions", async () => {
  assert.throws(
    () => createIdentityClient({ baseUrl: "http://remote.example.test" }),
    /HTTPS_REQUIRED/,
  );
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end('{"accessToken":"fake"}');
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const client = createIdentityClient({
      baseUrl: `http://127.0.0.1:${address.port}`,
      allowLoopbackHttp: true,
    });
    await assert.rejects(
      client.login({
        email: "x@example.test",
        password: "x",
        deviceId: "phone",
      }),
      /INVALID_IDENTITY_RESPONSE/,
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("identity timeout is bounded and pre-abort performs no network login", async () => {
  let requests = 0;
  const server = createServer(() => {
    requests++;
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const client = createIdentityClient({
      baseUrl: `http://127.0.0.1:${address.port}`,
      allowLoopbackHttp: true,
      timeoutMs: 30,
    });
    await assert.rejects(
      client.login({
        email: "fixture@example.test",
        password: "private-fixture-password",
        deviceId: "phone",
      }),
      /REQUEST_TIMEOUT/,
    );
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      client.login(
        {
          email: "fixture@example.test",
          password: "private-fixture-password",
          deviceId: "phone",
        },
        controller.signal,
      ),
      /CANCELLED_BEFORE_SUBMISSION/,
    );
    assert.equal(requests, 1);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("E4-R2 final refresh window issues usable rotated credentials without extending absolute expiry", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kk-final-refresh-window-"));
  let time = Date.now();
  const repository = new IdentityRepository(join(directory, "identity.json"), {
    now: () => time,
    accessTtlMs: 5000,
    refreshTtlMs: 20_000,
  });
  await repository.provision({
    email: "fixture@example.test",
    password: "private-fixture-password",
    displayName: "Fixture",
  });
  const server = createIdentityServer({ repository, allowLoopbackHttp: true });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const client = createIdentityClient({
      baseUrl: `http://127.0.0.1:${address.port}`,
      allowLoopbackHttp: true,
    });
    const initial = await client.login({
      email: "fixture@example.test",
      password: "private-fixture-password",
      deviceId: "phone",
    });
    const absoluteExpiry = initial.refreshExpiresAt;
    time += 16_000;
    const refreshed = await client.refresh({
      refreshToken: initial.refreshToken,
      deviceId: "phone",
    });
    assert.equal(refreshed.accessExpiresAt, absoluteExpiry);
    assert.equal(refreshed.refreshExpiresAt, absoluteExpiry);
    assert.notEqual(refreshed.refreshToken, initial.refreshToken);
    assert.equal(
      (await client.me(refreshed.accessToken, "phone")).user.id,
      initial.user.id,
    );
    await assert.rejects(
      client.refresh({ refreshToken: initial.refreshToken, deviceId: "phone" }),
      /AUTH_REQUIRED/,
    );
    time = absoluteExpiry - 1;
    const final = await client.refresh({
      refreshToken: refreshed.refreshToken,
      deviceId: "phone",
    });
    assert.equal(final.accessExpiresAt, absoluteExpiry);
    assert.equal(final.refreshExpiresAt, absoluteExpiry);
    await assert.rejects(
      client.refresh({
        refreshToken: refreshed.refreshToken,
        deviceId: "phone",
      }),
      /AUTH_REQUIRED/,
    );
    time = absoluteExpiry;
    await assert.rejects(
      client.me(final.accessToken, "phone"),
      /AUTH_REQUIRED/,
    );
    await assert.rejects(
      client.refresh({ refreshToken: final.refreshToken, deviceId: "phone" }),
      /AUTH_REQUIRED/,
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
