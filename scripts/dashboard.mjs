#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import electron from "electron";
import { createServer } from "vite";

const usage = `Usage:
  dashboard [--production] -d <key> [-m <metric...> [-x <key>] [-s <style>]...] [-d ...] -p <source>
  npm run dashboard -- -d <key> [-m <metric...> [-x <key>] [-s <style>]...] [-d ...] -p <source>
  npm run dashboard:dev -- -d <key> [-m <metric...> [-x <key>] [-s <style>]...] [-d ...] -p <source>

Options:
  -d, --data-key     Numeric data field; starts a new dashboard card
  -m, --metric       Metric(s): _, avg, rolling_avg, sum, std, var, med, min, max, dist, or count
  -x, --x-axis-key   Optional X-axis field for the preceding metric list
  -s, --style        Chart style for the preceding metric list: bar or line
  -p, --path         Local JSONL path, - for stdin, or HTTP(S) SSE URL
      --production   Load the built dist artifacts without a Vite server
  -h, --help         Show this help message`;

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

let values;
let tokens;

try {
  ({ values, tokens } = parseArgs({
    options: {
      "data-key": { type: "string", short: "d", multiple: true },
      metric: { type: "string", short: "m", multiple: true },
      "x-axis-key": { type: "string", short: "x", multiple: true },
      style: { type: "string", short: "s", multiple: true },
      path: { type: "string", short: "p" },
      production: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
    strict: true,
    tokens: true,
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

const inputPath = values.path;
const production = values.production ?? false;
const cards = [];
let currentCard;
let currentChartGroup;
let collectingMetrics = false;

const finishChartGroup = () => {
  if (!currentChartGroup) return;

  for (const metric of currentChartGroup.metrics) {
    currentCard.charts.push({
      metric,
      ...(currentChartGroup.xAxisKey
        ? { xAxisKey: currentChartGroup.xAxisKey }
        : {}),
      ...(currentChartGroup.style
        ? { chartType: currentChartGroup.style }
        : {}),
    });
  }

  currentChartGroup = undefined;
};

const finishCard = () => {
  finishChartGroup();

  if (currentCard && currentCard.charts.length === 0) {
    currentCard.charts.push({ metric: "_" });
  }
};

try {
  for (const token of tokens) {
    if (token.kind === "positional") {
      if (!collectingMetrics || !currentChartGroup) {
        throw new Error(`Unexpected argument: ${token.value}`);
      }
      currentChartGroup.metrics.push(token.value);
      continue;
    }

    collectingMetrics = false;

    if (token.kind !== "option" || token.value === undefined) continue;

    if (token.name === "data-key") {
      finishCard();
      currentCard = { dataKey: token.value, charts: [] };
      cards.push(currentCard);
    } else if (token.name === "metric") {
      if (!currentCard) throw new Error("Provide -d before -m.");
      finishChartGroup();
      currentChartGroup = { metrics: [token.value] };
      collectingMetrics = true;
    } else if (token.name === "x-axis-key") {
      if (!currentChartGroup) throw new Error("Provide -m before -x.");
      currentChartGroup.xAxisKey = token.value;
    } else if (token.name === "style") {
      if (!currentChartGroup) throw new Error("Provide -m before -s.");
      if (token.value !== "bar" && token.value !== "line") {
        throw new Error(`Unsupported chart style: ${token.value}`);
      }
      currentChartGroup.style = token.value;
    }
  }

  finishCard();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(`\n${usage}`);
  process.exit(1);
}

if (!inputPath || cards.length === 0 || cards.some(({ charts }) => charts.length === 0)) {
  console.error(`Missing required arguments.\n\n${usage}`);
  process.exit(1);
}

const isStdinSource = inputPath === "-";
const isRemoteSource = /^https?:\/\//i.test(inputPath);
let stdinTempDir;
let stdinStream;
let source;

if (isStdinSource) {
  stdinTempDir = await mkdtemp(path.join(os.tmpdir(), "auto-dashboard-"));
  source = path.join(stdinTempDir, "stdin.jsonl");
  await writeFile(source, "");
  stdinStream = createWriteStream(source, { flags: "a" });
  process.stdin.pipe(stdinStream);
} else {
  source = isRemoteSource ? inputPath : path.resolve(inputPath);
}

if (!isRemoteSource && !isStdinSource) {
  try {
    await access(source);
  } catch {
    console.error(`File not found: ${source}`);
    process.exit(1);
  }
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
  process.platform === "linux"
    ? ["--gtk-version=3", "--ozone-platform=x11", "."]
    : ["."],
  {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      ...(devServerUrl ? { VITE_DEV_SERVER_URL: devServerUrl } : {}),
      AUTO_DASHBOARD_RENDERER: production ? "production" : "development",
      AUTO_DASHBOARD_CONFIG: JSON.stringify({
        cards,
        path: source,
      }),
    },
  },
);

console.log(
  `Dashboard: ${cards.map(({ dataKey, charts }) => `${dataKey} (${charts.map(({ metric, xAxisKey }) => xAxisKey ? `${metric} by ${xAxisKey}` : metric === "_" ? "raw value" : `${metric} value`).join(", ")})`).join("; ")}`,
);
console.log(`Source: ${isStdinSource ? "stdin" : source}`);
console.log(`Renderer: ${devServerUrl ?? "dist/index.html"}`);

let closing = false;

const close = async (exitCode = 0) => {
  if (closing) return;
  closing = true;
  await server?.close();
  stdinStream?.destroy();
  if (stdinTempDir) {
    await rm(stdinTempDir, { recursive: true, force: true });
  }
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
