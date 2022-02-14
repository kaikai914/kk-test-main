import { defineConfig } from "vite";
import { dependencies } from "./package.json";
import { vuePlugin } from "@nebula/vite";

export default defineConfig({
  plugins: [vuePlugin()],
  optimizeDeps: { include: Object.keys(dependencies) },
});
