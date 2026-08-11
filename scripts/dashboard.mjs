#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import electron from "electron";
import { createServer } from "vite";

const usage = `Usage:
  npm run dashboard -- --metric-key <key> --x-axis-key <key> --path <file>
  npm run dashboard:prod -- --metric-key <key> --x-axis-key <key> --path <file>

Options:
  -m, --metric-key   Numeric metric field to chart
  -x, --x-axis-key   Numeric field used for the x-axis and sorting
  -p, --path         Path to a JSONL file
      --production   Load the built dist artifacts without a Vite server
  -h, --help         Show this help message`;

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

let values;

try {
  ({ values } = parseArgs({
    options: {
      "metric-key": { type: "string", short: "m" },
      "x-axis-key": { type: "string", short: "x" },
      path: { type: "string", short: "p" },
      production: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
  }));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(`\n${usage}`);
  process.exit(1);
}

if (values.help) {
  console.log(usage);
  process.exit(0);
}

const metricKey = values["metric-key"];
const xAxisKey = values["x-axis-key"];
const inputPath = values.path;
const production = values.production ?? false;

if (!metricKey || !xAxisKey || !inputPath) {
  console.error(`Missing required arguments.\n\n${usage}`);
  process.exit(1);
}

const filePath = path.resolve(inputPath);

try {
  await access(filePath);
} catch {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

let server;
let devServerUrl;

if (production) {
  const distIndex = path.join(projectRoot, "dist", "index.html");

  try {
    await access(distIndex);
  } catch {
    console.error(`Production artifact not found: ${distIndex}`);
    console.error("Run npm run build before using --production.");
    process.exit(1);
  }
} else {
  server = await createServer({
    root: projectRoot,
    server: {
      host: "127.0.0.1",
      port: 0,
    },
  });

  await server.listen();

  const address = server.httpServer?.address();

  if (!address || typeof address === "string") {
    await server.close();
    throw new Error("Vite did not expose a local TCP port.");
  }

  devServerUrl = `http://127.0.0.1:${address.port}`;
}

const electronProcess = spawn(
  electron,
  ["."],
  {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      ...(devServerUrl ? { VITE_DEV_SERVER_URL: devServerUrl } : {}),
      AUTO_DASHBOARD_RENDERER: production ? "production" : "development",
      AUTO_DASHBOARD_CONFIG: JSON.stringify({
        metricKey,
        xAxisKey,
        path: filePath,
      }),
    },
  },
);

console.log(`Dashboard: ${metricKey} by ${xAxisKey}`);
console.log(`Source: ${filePath}`);
console.log(`Renderer: ${devServerUrl ?? "dist/index.html"}`);

let closing = false;

const close = async (exitCode = 0) => {
  if (closing) return;
  closing = true;
  await server?.close();
  process.exitCode = exitCode;
};

electronProcess.once("error", async (error) => {
  console.error(`Failed to launch Electron: ${error.message}`);
  await close(1);
});

electronProcess.once("exit", (code, signal) => {
  if (code !== 0) {
    console.error(
      `Electron exited with ${signal ? `signal ${signal}` : `code ${code}`}.`,
    );
  }
  void close(code ?? (signal ? 1 : 0));
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    electronProcess.kill();
    void close();
  });
}
