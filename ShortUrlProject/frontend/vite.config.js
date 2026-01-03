/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    // dacă undeva în cod/bundle apare SyncedNavigator, îl înlocuiește cu navigator
    SyncedNavigator: "navigator",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
  },
});
