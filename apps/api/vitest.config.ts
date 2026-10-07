import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Les tests partagent une base PostgreSQL : exécution séquentielle.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
