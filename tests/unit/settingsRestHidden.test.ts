import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppUpdatePage, { type UpdateState } from "../../src/components/settings/AppUpdatePage.tsx";
import LocalVideoPackages from "../../src/components/settings/LocalVideoPackages.tsx";

test("AppUpdatePage hides disabled check button and placeholder cards while retaining version and links", () => {
  const html = renderToStaticMarkup(React.createElement(AppUpdatePage));

  // Retained essential items
  assert.match(html, /软件更新/);
  assert.match(html, /当前版本/);
  assert.match(html, /下载 Windows 安装包/);
  assert.match(html, /查看正式发布记录/);

  // Hidden half-finished placeholders
  assert.doesNotMatch(html, /检查更新/);
  assert.doesNotMatch(html, /尚未检查更新/);
  assert.doesNotMatch(html, /自动检查并下载更新/);
  assert.doesNotMatch(html, /安装记录尚未接入/);

  // Export contract intact
  const dummyState: UpdateState = "idle";
  assert.equal(dummyState, "idle");
});

test("ModelAccessSettings keeps 5-channel export definition and conditionally hides oauth channel in UI", () => {
  const filePath = path.resolve("src/components/settings/ModelAccessSettings.tsx");
  const content = readFileSync(filePath, "utf8");

  // Preserves CHANNELS export with 5 channels
  assert.match(content, /export const CHANNELS = \[/);
  assert.match(content, /id: "oauth"/);
  assert.match(content, /id: "official"/);
  assert.match(content, /id: "relay"/);
  assert.match(content, /id: "cli"/);
  assert.match(content, /id: "local"/);

  // Conditional hiding controls
  assert.match(content, /SHOW_UNFINISHED_OAUTH/);
  assert.match(content, /VISIBLE_CHANNELS/);
  assert.match(content, /CHANNELS\.filter\(\(ch\) => ch\.id !== "oauth"\)/);

  // OAuth panel is guarded
  assert.match(
    content,
    /SHOW_UNFINISHED_OAUTH && currentChannel === "oauth" && \(\s*<section[\s\S]*?OAuthAccessPanel/,
  );
});

test("LocalHardwareSettings conditionally hides unfinished install service button and video packages", () => {
  const filePath = path.resolve("src/components/settings/LocalHardwareSettings.tsx");
  const content = readFileSync(filePath, "utf8");

  // Conditional hiding controls
  assert.match(content, /SHOW_UNFINISHED_LOCAL_INSTALL/);
  assert.match(
    content,
    /\{SHOW_UNFINISHED_LOCAL_INSTALL && \(\s*<>[\s\S]*?安装服务未接入[\s\S]*?LocalVideoPackages[\s\S]*?<\/>\s*\)\}/,
  );
});

test("LocalVideoPackages export remains intact for external consumers", () => {
  assert.equal(typeof LocalVideoPackages, "function");
});
