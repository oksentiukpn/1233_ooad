import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ["VITE_", "NEXT_PUBLIC_"]);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Make NEXT_PUBLIC_API_BASE_URL accessible in import.meta.env
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    define: {
      "process.env.NEXT_PUBLIC_API_BASE_URL": JSON.stringify(
        process.env.NEXT_PUBLIC_API_BASE_URL || env.NEXT_PUBLIC_API_BASE_URL || ""
      ),
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api": {
          target: process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
