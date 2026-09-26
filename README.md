# Auto Dashboard

Auto Dashboard is an Electron application for monitoring numeric metrics from
local JSONL files or remote Server-Sent Events (SSE) endpoints. Choose data
keys, calculations, x-axes, and chart styles from the CLI.

## Requirements

- A current Node.js LTS release
- npm
- A local JSONL file, stdin JSONL stream, or HTTP(S) SSE endpoint

## Installation

```bash
npm install
```

To use the `dashboard` command directly without installing the package
globally, create a symlink in a directory on your `PATH`:

```bash
mkdir -p "$HOME/.local/bin"
ln -sf "$PWD/scripts/dashboard.mjs" "$HOME/.local/bin/dashboard"
```

The symlink is optional; the `npm run` commands work without it.

## Quick Start

Launch a local file with Vite HMR:

```bash
npm run dashboard:dev -- -d loss -m _ avg rolling_avg -x step -p src/assets/data/example.jsonl
```

Build the renderer and launch the production dashboard:

```bash
npm run dashboard:build -- -d loss -m avg -x step -p src/assets/data/example.jsonl
```

After running `npm run build`, the production command can also be launched
directly through the local `dashboard` symlink:

```bash
dashboard --production -d loss -m avg -x step -p src/assets/data/example.jsonl
```

Show only the latest raw value for a data key:

```bash
npm run dashboard:dev -- -d epoch -p src/assets/data/example.jsonl
```

Render multiple calculations for one data key and x-axis:

```bash
dashboard --production -d loss -m _ avg rolling_avg -x step -p src/assets/data/example.jsonl
```

Add cards and assign different x-axes to their selected calculations:

```bash
dashboard --production -d power_usage_w -m avg rolling_avg -x timestamp -d vram_used_gb -m avg rolling_avg -x timestamp -m dist -x vram_used_gb -p ./run.jsonl
```

Override the default chart style for a metric group:

```bash
dashboard --production -d loss -m avg rolling_avg -x step -s bar -p src/assets/data/example.jsonl
```

Launch a remote Server-Sent Events source:

```bash
dashboard --production -d loss -m avg -x step -p "https://example.com/logs/run-id"
```

Read JSONL records from stdin. The dashboard starts immediately and updates as
records arrive:

```bash
tail -f training.jsonl | dashboard --production -d loss -m avg -x step -p -
```

For a finite stream, pipe a file directly:

```bash
cat src/assets/data/example.jsonl | npm run dashboard:dev -- -d loss -m avg -x step -p -
```

`npm run dashboard:build` builds the renderer before launching. The direct
`dashboard --production` and `npm run dashboard` commands expect `dist/` to
already exist. The development command uses Vite HMR and does not require a
prior build.

## CLI Options

| Option         | Short | Required | Description                                              |
| -------------- | ----- | -------- | -------------------------------------------------------- |
| `--data-key`   | `-d`  | Yes      | Numeric field to chart; starts a dashboard card.         |
| `--metric`     | `-m`  | No       | Calculation(s) to display.                               |
| `--x-axis-key` | `-x`  | No       | X-axis for the preceding metric list.                    |
| `--style`      | `-s`  | No       | Override the metric list's chart style: `bar` or `line`. |
| `--path`       | `-p`  | Yes      | Local JSONL path, `-` for stdin, or HTTP(S) SSE URL.     |
| `--help`       | `-h`  | No       | Print command usage.                                     |

Run `dashboard --help`, `npm run dashboard -- --help`, or
`npm run dashboard:dev -- --help` for the CLI reference.

Local paths are resolved relative to the current directory. Quote paths that
contain spaces:

```bash
dashboard --production -d loss -m avg -x step -p "/path/to/Training Runs/run-01.jsonl"
```

## Data Format

Local files and stdin sources must contain one JSON object per line:

```jsonl
{"event":"train_step","step":1,"loss":1.0001,"epoch":1}
{"event":"train_step","step":2,"loss":0.6574,"epoch":1}
{"event":"train_step","step":3,"loss":1.0764,"epoch":1}
```

Remote sources must emit equivalent JSON objects as SSE message data.

Records may include string metadata and unrelated fields. A record is charted
only when its selected metric and x-axis values are finite JSON numbers.
Missing values, strings, `NaN`, and infinite values are ignored.

## Generated Charts

Each `-d` creates one card. Every `-m ... -x ...` group adds the selected
series to that card:

- A data key without `-m` or `-x` displays its latest finite raw value.
- Metrics without an `-x` display their latest calculated value without a
  chart. For example, `-m avg rolling_avg count` creates three scalar values.
- `_` renders the raw data key as a bar chart.
- `avg` renders its cumulative average as a line chart.
- `rolling_avg` renders its 30-record rolling average as a line chart.
- `sum` renders the cumulative sum.
- `std` and `var` render cumulative population standard deviation and variance.
- `med` renders the cumulative median.
- `min` and `max` render the cumulative minimum and maximum.
- `dist` renders the number of data points in each percentile bucket and labels
  it with only the observed minimum and maximum values.
- `count` displays the number of finite data-key values without a chart.

Use `-s bar` or `-s line` to override a group's default chart style.
For `count`, the `-x` value and any `-s` value are ignored.
`dist` uses its generated percentile axis and always renders as a bar chart.

Chart colors use the active theme variables `--chart-1` through `--chart-5`.

## Log Line Limit

Set `VITE_MAX_LOG_LINES` in `.env` to limit the number of points rendered per metric
card:

```dotenv
VITE_MAX_LOG_LINES=25
```

Records are filtered and sorted by the selected x-axis first. The dashboard
then retains the latest `VITE_MAX_LOG_LINES` records before calculating cumulative
and rolling averages. Missing, non-numeric, zero, and negative values disable
the limit.

Set `VITE_DIST_PERCENTILES` to control the maximum number of percentile bars.
It defaults to `20`; distributions with fewer values render one bar per value.

```dotenv
VITE_DIST_PERCENTILES=20
```

## Streaming Behavior

For local paths, Electron watches the file with `fs.watch`. On every change,
the main process rereads the file and sends a complete snapshot through the
isolated preload bridge. The renderer parses the JSONL and retains at most the
latest 1,000 records by default.

For stdin paths (`-p -`), the launcher writes incoming bytes to a temporary
JSONL file, which Electron watches like any other local source. The temporary
file is removed when the dashboard exits.

For HTTP(S) paths, `useStream` opens an `EventSource` and appends incoming SSE
messages to the same bounded buffer. The endpoint must permit the Electron
renderer origin through its CORS policy when applicable.

When opened in a regular browser, local paths are fetched once because browser
pages cannot access `fs.watch`.

## Scripts

| Command                               | Description                                          |
| ------------------------------------- | ---------------------------------------------------- |
| `dashboard <options>`                 | Launch the CLI directly; add `--production` for `dist`. |
| `npm run dashboard -- <options>`      | Launch production Electron from `dist`.              |
| `npm run dashboard:dev -- <options>`  | Launch Electron with Vite HMR.                       |
| `npm run dashboard:build -- <options>`| Build and launch production Electron.               |
| `npm run dev`                         | Start the browser-only Vite development server.      |
| `npm run build`                       | Type-check and create production renderer artifacts. |
| `npm run preview`                     | Preview production artifacts through Vite.           |
| `npm run lint`                        | Run Oxlint.                                          |
| `npm run electron:dev`                | Run the legacy fixed-port Electron workflow.         |

## Project Structure

```text
electron/
  main.cjs            Electron window and local fs.watch IPC
  preload.cjs         Isolated file-stream bridge
scripts/
  dashboard.mjs       CLI and development/production launcher
src/
  components/         Metric cards, charts, and UI components
  hooks/useStream.ts  Local file and remote SSE handling
  assets/data/        Example JSONL data
  App.tsx             Runtime metric-source configuration
dist/                 Generated production renderer artifacts
```

## Architecture

The CLI validates local files while preserving HTTP(S) URLs, starts the chosen
renderer, and passes configuration to Electron through environment variables.
Electron encodes that configuration in the renderer URL. `App` creates the
metric source, `useStream` supplies updates, and `MetricCard` filters, sorts,
derives, and renders chart series.

The renderer uses context isolation with Node integration disabled. Only the
narrow file-watching API in `preload.cjs` is exposed to web code.

## Troubleshooting

### The card shows zero updates

Confirm the metric and x-axis keys occur on the same records and contain JSON
numbers rather than numeric strings.

### A local file is not found

The CLI prints the absolute path it attempted to open. Check the working
directory or pass an absolute path.

### A remote source does not connect

Confirm that the URL serves SSE (`text/event-stream`), emits JSON message data,
and allows the Electron renderer through CORS.

### Local updates do not appear in a browser tab

Live local updates require Electron. Use `npm run dashboard:dev`,
`npm run dashboard`, or the `dashboard` command; browser-only Vite performs a
one-time fetch.

### Port 5173 is already in use

`npm run dashboard:dev` selects an available port automatically. The legacy
`electron:dev` script expects port 5173 and may require stopping the process
already using it.
