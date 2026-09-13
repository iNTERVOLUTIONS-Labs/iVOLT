import { defineConfig, devices } from "@playwright/test";

const projects = [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }];
if (process.env.IVOLT_ALL_BROWSERS) {
  projects.push({ name: "firefox", use: { ...devices["Desktop Firefox"] } }, { name: "webkit", use: { ...devices["Desktop Safari"] } });
}

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:4180", trace: "retain-on-failure" },
  // IVOLT_SKIP_DOCS_SERVER=1 runs only fixture-based specs without rebuilding the docs site.
  webServer: [
    { command: "node scripts/serve.mjs", url: "http://localhost:4180/packages/ivolt/package.json", reuseExistingServer: true, timeout: 20_000 },
    ...(process.env.IVOLT_SKIP_DOCS_SERVER ? [] : [{ command: "node scripts/docs-server.mjs", url: "http://127.0.0.1:4321/", reuseExistingServer: false, timeout: 180_000 }]),
  ],
  snapshotPathTemplate: "{testDir}/__snapshots__/{testFileName}/{arg}{ext}",
  projects,
});
