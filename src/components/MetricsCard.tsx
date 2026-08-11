import { memo } from "react";
import { capitalize, sortByKey } from "@/utils";
import { qualifiedName } from "@/consts";
import { Bars } from "./BarChart";
import { Lines } from "./LineChart";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card";
import type {
  ChartDefinition,
  ChartTemplate,
  DataRow,
  Metric,
} from "@/interfaces";
import type { ChartConfig } from "./ui/chart";
import { Button } from "./ui/button";
import { File } from "lucide-react";

const windowSize = 30;

const templates = [
  { metricAbbreviation: "_", chartType: "bar" },
  { metricAbbreviation: "avg", chartType: "line" },
  { metricAbbreviation: "rolling_avg", chartType: "line" },
] as const satisfies readonly ChartTemplate[];

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

const processMetricData = (metricKey: string, data: DataRow[]) => {
  let total = 0;
  let metricCount = 0;
  const windowValues: number[] = [];

  return data.map((item) => {
    const value = item[metricKey];

    if (typeof value !== "number" || !Number.isFinite(value)) {
      return item;
    }

    total += value;
    metricCount += 1;
    windowValues.push(value);

    if (windowValues.length > windowSize) {
      windowValues.shift();
    }

    const windowTotal = windowValues.reduce((sum, entry) => sum + entry, 0);

    return {
      ...item,
      [`avg_${metricKey}`]: total / metricCount,
      [`rolling_avg_${metricKey}`]: windowTotal / windowValues.length,
    };
  });
};

const generateConfig = (metrics: Metric[]): ChartConfig =>
  metrics.reduce<ChartConfig>((config, metric) => {
    config[metric.key] = {
      label: metric.label,
      color: metric.color,
    };
    return config;
  }, {});

const computeCharts = (
  metricKey: string,
  data: DataRow[],
  xAxisKey: string,
): ChartDefinition[] => {
  const processedData = processMetricData(
    metricKey,
    data
      .filter(
        (item) =>
          typeof item[metricKey] === "number" &&
          Number.isFinite(item[metricKey]) &&
          typeof item[xAxisKey] === "number" &&
          Number.isFinite(item[xAxisKey]),
      )
      .sort(sortByKey(xAxisKey)),
  );
  const metricLabel = capitalize(metricKey);

  return templates.map(({ metricAbbreviation, chartType }, index) => {
    const seriesKey =
      metricAbbreviation === "_"
        ? metricKey
        : `${metricAbbreviation}_${metricKey}`;
    const label =
      metricAbbreviation === "_"
        ? metricLabel
        : `${qualifiedName[metricAbbreviation]} ${metricLabel}`;

    return {
      chartType,
      data: processedData,
      config: generateConfig([
        {
          key: seriesKey,
          label,
          color: chartColors[index % chartColors.length],
        },
      ]),
      seriesKey,
      xAxisKey,
    };
  });
};

interface MetricCardProps {
  metricKey: string;
  data: DataRow[];
  xAxisKey: string;
  source?: string;
}

const BaseMetricCard = ({
  metricKey,
  data,
  xAxisKey,
  source,
}: MetricCardProps) => {
  const charts = computeCharts(metricKey, data, xAxisKey);
  const chartData = charts[0]?.data ?? [];

  return (
    <Card>
      <CardHeader>
        {/* <div className="mb-2 flex flex-wrap">
              <Badge>Vite</Badge>
            <Badge variant="secondary">React</Badge>
              <Badge variant="outline">shadcn/ui</Badge>
            </div> */}
        <CardTitle className="text-2xl">{capitalize(metricKey)}</CardTitle>
        <CardDescription>
          Received{" "}
          <code className="font-mono text-foreground">{chartData.length}</code>{" "}
          updates. Latest {capitalize(xAxisKey)}:{" "}
          {chartData.at(-1)?.[xAxisKey] ?? 0}.
        </CardDescription>
        {/* <CardAction>
              <Button
                aria-label="Reset counter"
                disabled={count === 0}
                onClick={() => setCount(0)}
                size="icon-sm"
                title="Reset counter"
                variant="ghost"
              >
                <RotateCcw />
              </Button>
            </CardAction> */}
      </CardHeader>

      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {charts.map((chart) => (
          <div
            key={chart.seriesKey}
            className="min-w-0 rounded-xl border bg-background/70 p-4 md:col-span-2 lg:col-span-1"
          >
            <h1>
              {chart.config[chart.seriesKey]?.label} v.{" "}
              {capitalize(chart.xAxisKey)}
            </h1>
            <output className="block w-full">
              {chart.chartType === "bar" ? (
                <Bars data={chart.data} config={chart.config} />
              ) : (
                <Lines
                  data={chart.data}
                  config={chart.config}
                  dataKeys={{
                    x: chart.xAxisKey,
                    y: chart.seriesKey,
                    line: chart.seriesKey,
                  }}
                />
              )}
            </output>
          </div>
        ))}
      </CardContent>

      <CardFooter className="flex-wrap gap-2 border-t">
        <Button
          nativeButton={false}
          render={<a href={`${source}`} rel="noreferrer" target="_blank" />}
          variant="outline"
        >
          {`${source}`}
          <File data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export const MetricCard = memo(BaseMetricCard);
