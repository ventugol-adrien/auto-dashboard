import { useStream } from "./hooks/useStream";
import { MetricCard } from "./components/MetricsCard";
import type { DataRow } from "./interfaces";

const cleanData = (data: DataRow[]) => data;

type MetricCardDefinition = {
  metricKey: string;
  xAxisKey: string;
  path: string;
  clean: (data: DataRow[]) => DataRow[];
};

const MetricCardFromSource = ({
  definition,
}: {
  definition: MetricCardDefinition;
}) => {
  const { data: streamData } = useStream<DataRow>(definition.path);
  const data = definition.clean(streamData);

  return (
    <MetricCard
      metricKey={definition.metricKey}
      data={data}
      xAxisKey={definition.xAxisKey}
      source={definition.path}
    />
  );
};

export function App() {
  const desktopUri = import.meta.env.VITE_DESKTOP_URI;
  const streamId = import.meta.env.VITE_ID;
  const streamUrl = desktopUri && streamId ? `${desktopUri}/${streamId}` : "";
  const launchParameters = new URLSearchParams(window.location.search);
  const metricKey = launchParameters.get("metricKey");
  const xAxisKey = launchParameters.get("xAxisKey");
  const filePath = launchParameters.get("path");
  const metrics: MetricCardDefinition[] =
    metricKey && xAxisKey && filePath
      ? [{ metricKey, xAxisKey, path: filePath, clean: cleanData }]
      : [
          {
            metricKey: "loss",
            xAxisKey: "step",
            path: "src/assets/data/example.jsonl",
            clean: cleanData,
          },
          {
            metricKey: "epoch",
            xAxisKey: "step",
            path: streamUrl,
            clean: cleanData,
          },
        ];

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-muted/30 p-6">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:36px_36px] opacity-35 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />

      <div className="relative grid w-full max-w-7xl gap-6">
        {metrics.map((metric) => (
          <MetricCardFromSource
            key={`${metric.path}:${metric.metricKey}`}
            definition={metric}
          />
        ))}

        {/* <p className="mt-4 text-center text-xs text-muted-foreground">
          Press{" "}
          <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono">
            d
          </kbd>{" "}
          to toggle the theme.
        </p> */}
      </div>
    </main>
  );
}

export default App;
