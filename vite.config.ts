import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Settings load this dependency lazily; prebundle it before the first dialog opens.
  optimizeDeps: { include: ["@tauri-apps/api/path"] },
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
  build: {
    // 明确目标以确保 Tauri WebView2 兼容性并获得最优输出
    target: "es2020",
    rollupOptions: {
      output: {
        /**
         * 手动分块策略：
         * - vendor-react: React 运行时（不常更新，利用浏览器长期缓存）
         * - vendor-icons: 图标库（体积较大，独立缓存）
         * - 其余 feature chunks 由 Vite 自动按动态导入分割
         */
        manualChunks(id) {
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/")
          ) {
            return "vendor-react";
          }
          if (
            id.includes("node_modules/lucide-react/") ||
            id.includes("node_modules/iconsax-react/")
          ) {
            return "vendor-icons";
          }
          if (id.includes("node_modules/zod/")) {
            return "vendor-zod";
          }
          if (id.includes("node_modules/@tauri-apps/")) {
            return "vendor-tauri";
          }
        },
      },
    },
  },
  server: {
    fs: {
      // Linked dependencies must load without exposing their parent checkout.
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        realpathSync("node_modules"),
      ],
    },
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
        resolve(".worktrees").replaceAll("\\", "/") + "/**",
        "**/node_modules/**",
        "**/src-tauri/**",
        "**/*.agent_infra_tmp_*",
        "**/*~",
      ],
    },
  },
});
