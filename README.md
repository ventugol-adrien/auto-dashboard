# Auto Dashboard

Launch a live dashboard for a JSONL file from the command line:

```powershell
npm run dashboard -- --metric-key loss --x-axis-key step --path .\src\assets\data\example.jsonl
```

Launch from freshly built production artifacts:

```powershell
npm run dashboard:prod -- --metric-key loss --x-axis-key step --path .\src\assets\data\example.jsonl
```

Both commands validate the file, open Electron, and watch it for changes. The
development command starts Vite with HMR; the production command builds and
loads `dist/index.html` directly. The selected metric and x-axis fields must
contain finite numbers.

Options: `--metric-key` (`-m`), `--x-axis-key` (`-x`), `--path` (`-p`), and
`--help` (`-h`).

## Development

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

````json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    # Auto Dashboard

    Auto Dashboard is an Electron application for monitoring numeric metrics in a
    JSONL file. Select a metric field and an x-axis field from the command line;
    the app watches the file and renders the raw metric, cumulative average, and
    rolling average.

    ## Requirements

    - A current Node.js LTS release
    - npm
    - A JSONL input file with numeric metric and x-axis fields

    ## Installation

    ```powershell
    npm install
    ```

    ## Quick Start

    Launch the development renderer with Vite HMR:

    ```powershell
    npm run dashboard -- --metric-key loss --x-axis-key step --path .\src\assets\data\example.jsonl
    ```

    Launch from freshly built production artifacts:

    ```powershell
    npm run dashboard:prod -- --metric-key loss --x-axis-key step --path .\src\assets\data\example.jsonl
    ```

    The production command runs the TypeScript and Vite build, then loads
    `dist/index.html` directly in Electron. It does not keep a Vite server running.
    This produces a production renderer, not an installable Electron package.

    Paths are resolved relative to the directory where the command is run. Quote
    paths containing spaces:

    ```powershell
    npm run dashboard:prod -- -m loss -x step -p "C:\Training Runs\run-01.jsonl"
    ```

    ## CLI Options

    | Option | Short | Required | Description |
    | --- | --- | --- | --- |
    | `--metric-key` | `-m` | Yes | Numeric field to chart. |
    | `--x-axis-key` | `-x` | Yes | Numeric field used for sorting and the x-axis. |
    | `--path` | `-p` | Yes | Path to the JSONL source file. |
    | `--production` | | Internal | Load existing `dist` artifacts without Vite. |
    | `--help` | `-h` | No | Print command usage. |

    Run `npm run dashboard -- --help` to show the CLI reference.

    ## Data Format

    The source must contain one JSON object per line:

    ```jsonl
    {"event":"train_step","step":1,"loss":1.0001,"epoch":1}
    {"event":"train_step","step":2,"loss":0.6574,"epoch":1}
    {"event":"train_step","step":3,"loss":1.0764,"epoch":1}
    ```

    Records may contain string metadata and unrelated fields. A record is included
    in a card only when both the selected metric and x-axis values are finite
    numbers. Missing values, strings, `NaN`, and infinite values are ignored.

    The local stream keeps the latest 1,000 parsed records by default. On each file
    change, Electron rereads the file and refreshes the dashboard.

    ## Generated Charts

    Each metric card creates three views from the filtered, x-axis-sorted records:

    - Raw metric as a bar chart
    - Cumulative average as a line chart
    - Rolling average as a line chart using a 30-record window

    Chart colors come from the active theme variables `--chart-1` through
    `--chart-5`.

    ## File Watching

    Electron watches local files with `fs.watch` in the main process. A preload
    bridge forwards complete file snapshots to the renderer, where `useStream`
    parses the JSONL content. Closing the Electron window stops the watcher and any
    development Vite server started by the CLI.

    When the renderer is opened directly in a regular browser, Node file watching
    is unavailable. In that mode, `useStream` performs a one-time fetch for local
    paths instead.

    ## Scripts

    | Command | Description |
    | --- | --- |
    | `npm run dashboard -- <options>` | Launch Electron with Vite HMR and live file watching. |
    | `npm run dashboard:prod -- <options>` | Build and launch Electron from `dist`. |
    | `npm run dev` | Start the browser-only Vite development server. |
    | `npm run build` | Type-check and create production renderer artifacts. |
    | `npm run preview` | Preview the production renderer through Vite. |
    | `npm run lint` | Run Oxlint. |
    | `npm run electron:dev` | Start the legacy fixed-port Electron development workflow. |

    ## Project Structure

    ```text
    electron/
      main.cjs          Electron window, CLI configuration, and fs.watch IPC
      preload.cjs       Isolated renderer bridge for local file streams
    scripts/
      dashboard.mjs     CLI parser and development/production launcher
    src/
      components/       Metric cards, charts, and UI components
      hooks/useStream.ts  Local file and remote SSE stream handling
      assets/data/      Example JSONL data
      App.tsx           Metric source definitions and card rendering
    dist/               Generated production renderer artifacts
    ```

    ## Architecture

    The CLI validates arguments and resolves the source path before launching
    Electron. Configuration is passed to the main process through environment
    variables, then encoded into the renderer URL. `App` creates a metric source,
    `useStream` supplies data updates, and `MetricCard` filters, sorts, derives, and
    renders the chart series.

    The Electron renderer uses context isolation with Node integration disabled.
    Only the narrow file-watching API defined in `preload.cjs` is exposed to the
    web application.

    ## Troubleshooting

    ### The card shows zero updates

    Confirm that the metric and x-axis keys exist on the same records and contain
    JSON numbers rather than numeric strings.

    ### The file is not found

    The CLI prints the absolute path it attempted to open. Check the working
    directory or pass an absolute path.

    ### Local updates do not appear in a browser tab

    Live local file updates require Electron. Use `npm run dashboard` or
    `npm run dashboard:prod`; browser-only Vite performs only an initial fetch.

    ### Port 5173 is already in use

    The `dashboard` command selects an available port automatically. The legacy
    `electron:dev` script expects port 5173 and may need the existing process to be
    stopped first.
````
