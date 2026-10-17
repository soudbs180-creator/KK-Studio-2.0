import { createServer } from "node:http";
import { createReadStream, realpathSync, statSync } from "node:fs";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = realpathSync(
  fileURLToPath(new URL("../../dist", import.meta.url)),
);
const withinRoot = (file) => {
  const name = relative(root, file);
  return name !== ".." && !name.startsWith(`..${sep}`) && !isAbsolute(name);
};
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
function notFound(response, status = 404) {
  response.writeHead(status, {
    "content-type": "text/plain",
    "cache-control": "no-store",
  });
  response.end("Not found");
}
const server = createServer((request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) return notFound(response, 405);
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(request.url, "http://127.0.0.1:1423").pathname,
    );
  } catch {
    return notFound(response, 400);
  }
  if (pathname.includes("\\") || pathname.includes("\0"))
    return notFound(response, 400);
  let file = resolve(root, `.${pathname}`);
  if (!withinRoot(file)) return notFound(response, 403);
  try {
    if (statSync(file).isDirectory()) file = resolve(file, "index.html");
    file = realpathSync(file);
    if (!withinRoot(file) || !statSync(file).isFile())
      return notFound(response);
  } catch {
    if (
      extname(pathname) ||
      /^\/(?:mobile\/(?:_expo|assets)|assets)(?:\/|$)/.test(pathname)
    )
      return notFound(response);
    file = resolve(
      root,
      pathname === "/mobile" || pathname.startsWith("/mobile/")
        ? "mobile/index.html"
        : "index.html",
    );
    try {
      file = realpathSync(file);
      if (!withinRoot(file) || !statSync(file).isFile())
        return notFound(response);
    } catch {
      return notFound(response);
    }
  }
  response.writeHead(200, {
    "content-type": mime[extname(file)] ?? "application/octet-stream",
    "cache-control": "no-cache",
    "x-content-type-options": "nosniff",
    "content-length": statSync(file).size,
  });
  if (request.method === "HEAD") return response.end();
  const stream = createReadStream(file);
  stream.on("error", () => response.destroy());
  stream.pipe(response);
});
server.on("error", (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
server.listen(1423, "127.0.0.1");
const close = () => server.close();
process.once("SIGTERM", close);
process.once("SIGINT", close);
