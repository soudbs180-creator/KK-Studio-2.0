import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 1421,
    host: "127.0.0.1",
    strictPort: true,
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
