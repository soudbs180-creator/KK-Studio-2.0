#!/usr/bin/env node

const url = process.argv[2];
if (!url) {
  console.error("usage: node deploy/health-check.mjs <https-url>");
  process.exit(2);
}

try {
  const response = await fetch(new URL(url));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();
  if (!body.includes("<html") && !contentType.includes("text/html")) {
    throw new Error("response is not an HTML static entrypoint");
  }
  console.log(JSON.stringify({ url, status: response.status, contentType }));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
