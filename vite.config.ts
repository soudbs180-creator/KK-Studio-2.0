import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "kk-agent-local-bridge",
      configureServer(server) {
        if (!process.env.KK_AGENT_TOKEN) return;
        server.middlewares.use((req, res, next) => {
          if (!req.url?.startsWith("/kk-agent")) return next();
          if (
            req.headers["sec-fetch-site"] !== "same-origin" ||
            (req.headers.origin &&
              req.headers.origin !== "http://127.0.0.1:1421")
          ) {
            res.statusCode = 403;
            res.end("Agent bridge requires same-origin requests");
            return;
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 1421,
    host: "127.0.0.1",
    strictPort: true,
    proxy: process.env.KK_AGENT_TOKEN
      ? {
          "/kk-agent": {
            target: process.env.KK_AGENT_URL,
            rewrite: (url) => url.replace(/^\/kk-agent/, ""),
            headers: { "x-canvas-agent-token": process.env.KK_AGENT_TOKEN },
          },
        }
      : undefined,
    watch: {
      ignored: [
        "**/.tmp/**",
        "**/node_modules/**",
        "**/src-tauri/**",
        "**/*.agent_infra_tmp_*",
        "**/*~",
      ],
    },
  },
});
