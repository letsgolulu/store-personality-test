import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { readFileSync } from "node:fs";
export default defineConfig({
  base: "/store-personality-test/",
  plugins: [react(), {
    name: "embedded-store-illustrations",
    resolveId(id) { if (/^virtual:store-illustration\/[a-z-]+$/.test(id)) return `\0${id}`; },
    load(id) {
      if (!id.startsWith("\0virtual:store-illustration/")) return;
      const name = id.slice("\0virtual:store-illustration/".length);
      const bytes = readFileSync(fileURLToPath(new URL(`./public/illustrations/${name}.jpg`, import.meta.url)));
      return `export default ${JSON.stringify(`data:image/jpeg;base64,${bytes.toString("base64")}`)}`;
    },
  }],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  build: { outDir: "docs", sourcemap: false }
});
