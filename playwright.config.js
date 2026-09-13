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
  webServer: [
    { command: "node scripts/serve.mjs", url: "http://localhost:4180/packages/ivolt/package.json", reuseExistingServer: true, timeout: 20_000 },
    { command: "npm run build -w docs && npm run preview -w docs -- --port 4321 --host 127.0.0.1", url: "http://127.0.0.1:4321/", reuseExistingServer: true, timeout: 120_000 },
  ],
  projects,
});
