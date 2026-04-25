import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@quest/shared": path.resolve(__dirname, "../../shared/protocol.ts"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        play: path.resolve(__dirname, "play.html"),
        admin: path.resolve(__dirname, "admin.html"),
      },
    },
  },
});
