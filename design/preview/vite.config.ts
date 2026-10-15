import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL("./", import.meta.url));
const repository = fileURLToPath(new URL("../../", import.meta.url));

export default defineConfig({
  root,
  plugins: [react()],
  publicDir: false,
  server: {
    host: "127.0.0.1",
    port: 1421,
    strictPort: true,
    fs: { allow: [repository] },
  },
  preview: { host: "127.0.0.1", port: 1423, strictPort: true },
  build: {
    outDir: fileURLToPath(
      new URL("../../.tmp/design-md-preview", import.meta.url),
    ),
    emptyOutDir: false,
  },
});
