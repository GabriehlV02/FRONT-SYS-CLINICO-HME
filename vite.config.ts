import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ["VITE_", "CLINICO_"]);

  return {
    plugins: [react()],
    resolve: { dedupe: ["react", "react-dom"], alias: { events: "events/" } },
    server: {
      host: "0.0.0.0",
      https: env.CLINICO_HTTPS === "1" ? {
        pfx: readFileSync(join(homedir(), ".clinico-https", "clinico.pfx")),
        passphrase: readFileSync(join(homedir(), ".clinico-https", "clave.txt"), "utf8").trim(),
      } : undefined,
      port: 5000,
      strictPort: true,
      proxy: {
        "/api-contable": {
          target:
            process.env.VITE_API_CONTABLE_TARGET ||
            env.VITE_API_CONTABLE_TARGET ||
            "http://127.0.0.1:5055",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-contable/, "/api"),
        },
        "/api": {
          target:
            process.env.VITE_API_TARGET ||
            env.VITE_API_TARGET ||
            "http://127.0.0.1:5005",
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: "0.0.0.0",
      port: 5000,
      strictPort: true,
    },
  };
});
