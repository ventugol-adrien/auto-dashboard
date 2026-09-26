import { memo } from "react";
import { capitalize, formatAxisValue, sortByKey, toAxisNumber } from "@/utils";
import { qualifiedName } from "@/consts";
import { calculateRunningStatistics } from "@/services/calculate_metrics";
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
  ChartRequest,
  ChartType,
  DataRow,
  Metric,
} from "@/interfaces";
import type { ChartConfig } from "./ui/chart";
import { Button } from "./ui/button";
import { File } from "lucide-react";

const windowSize = 30;
const configuredMaxLogLines = Number.parseInt(
  import.meta.env.VITE_MAX_LOG_LINES ?? "",
  10,
);
const maxLogLines =
  Number.isFinite(configuredMaxLogLines) && configuredMaxLogLines > 0
    ? configuredMaxLogLines
    : Number.POSITIVE_INFINITY;
const configuredDistPercentiles = Number.parseInt(
  import.meta.env.VITE_DIST_PERCENTILES ?? "",
  10,
);
const distPercentiles =
  Number.isFinite(configuredDistPercentiles) && configuredDistPercentiles > 0
    ? configuredDistPercentiles
    : 20;

const defaultChartTypes: Record<string, ChartType> = {
  _: "bar",
  avg: "line",
  rolling_avg: "line",
  sum: "line",
  std: "line",
  var: "line",
  med: "line",
  min: "line",
  max: "line",
  dist: "bar",
};

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

const processMetricData = (metricKey: string, data: DataRow[]) => {
  const windowValues: number[] = [];
  const runningStatistics = calculateRunningStatistics(
    data.map((item) => item[metricKey] as number),
  );

  return data.map((item, index) => {
    const value = item[metricKey];

    if (typeof value !== "number" || !Number.isFinite(value)) {
      return item;
    }

    windowValues.push(value);

    if (windowValues.length > windowSize) {
      windowValues.shift();
    }

    const windowTotal = windowValues.reduce((sum, entry) => sum + entry, 0);
    const statistics = runningStatistics[index];

    return {
      ...item,
      [`avg_${metricKey}`]: statistics.avg,
      [`rolling_avg_${metricKey}`]: windowTotal / windowValues.length,
      [`sum_${metricKey}`]: statistics.sum,
      [`std_${metricKey}`]: statistics.std,
      [`var_${metricKey}`]: statistics.var,
      [`med_${metricKey}`]: statistics.med,
      [`min_${metricKey}`]: statistics.min,
      [`max_${metricKey}`]: statistics.max,
    };
  });
};

const processDistributionData = (dataKey: string, data: DataRow[]) => {
  const valueFormatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 3,
  });
  const values = data
    .map((item) => item[dataKey])
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    )
    .sort((left, right) => left - right);
  const percentileCount = Math.min(distPercentiles, values.length);

  return Array.from({ length: percentileCount }, (_, index) => {
    const startIndex = Math.floor((index * values.length) / percentileCount);
    const endIndex = Math.floor(
      ((index + 1) * values.length) / percentileCount,
    );
    const minimum = values[startIndex];
    const maximum = values[endIndex - 1];
    const valueRange =
      minimum === maximum
        ? valueFormatter.format(minimum)
        : `${valueFormatter.format(minimum)}-${valueFormatter.format(maximum)}`;

    return {
      percentile: valueRange,
      [`dist_${dataKey}`]: endIndex - startIndex,
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
  dataKey: string,
  data: DataRow[],
  requests: ChartRequest[],
): ChartDefinition[] => {
  const metricLabel = capitalize(dataKey);

  return requests.map(({ metric, xAxisKey, chartType }, index) => {
    const isScalar = !xAxisKey;
    const isCount = metric === "count";
    const isDistribution = metric === "dist";
    const validData = data.filter(
      (item) =>
        typeof item[dataKey] === "number" && Number.isFinite(item[dataKey]),
    );
    const processedData = isDistribution
      ? processDistributionData(dataKey, validData)
      : processMetricData(
          dataKey,
          validData
            .filter(
              (item) =>
                isScalar || isCount || toAxisNumber(item[xAxisKey]) !== null,
            )
            .sort(isScalar || isCount ? () => 0 : sortByKey(xAxisKey))
            .slice(isScalar || isCount ? undefined : -maxLogLines),
        );
    const seriesKey = metric === "_" ? dataKey : `${metric}_${dataKey}`;
    const label =
      metric === "_"
        ? metricLabel
        : `${qualifiedName[metric] ?? capitalize(metric)} ${metricLabel}`;

    return {
      chartType: isCount
        ? "count"
        : isDistribution
          ? "bar"
          : isScalar
            ? "value"
            : (chartType ?? defaultChartTypes[metric] ?? "line"),
      data: processedData,
      config: generateConfig([
        {
          key: seriesKey,
          label,
          color: chartColors[index % chartColors.length],
        },
      ]),
      seriesKey,
      xAxisKey: isDistribution ? "percentile" : (xAxisKey ?? ""),
    };
  });
};

interface MetricCardProps {
  dataKey: string;
  data: DataRow[];
  charts: ChartRequest[];
  source?: string;
}

const BaseMetricCard = ({
  dataKey,
  data,
  charts: chartRequests,
  source,
}: MetricCardProps) => {
  const charts = computeCharts(dataKey, data, chartRequests);
  const validDataCount = data.filter(
    (item) =>
      typeof item[dataKey] === "number" && Number.isFinite(item[dataKey]),
  ).length;
  const timelineChart = charts.find(
    (chart) =>
      chart.xAxisKey &&
      chart.chartType !== "count" &&
      chart.xAxisKey !== "percentile",
  );

  return (
    <Card>
      <CardHeader>
        {/* <div className="mb-2 flex flex-wrap">
              <Badge>Vite</Badge>
            <Badge variant="secondary">React</Badge>
              <Badge variant="outline">shadcn/ui</Badge>
            </div> */}
        <CardTitle className="text-2xl">{capitalize(dataKey)}</CardTitle>
        <CardDescription>
          Received{" "}
          <code className="font-mono text-foreground">{validDataCount}</code>{" "}
          updates.
          {timelineChart && (
            <>
              {" "}
              Latest {capitalize(timelineChart.xAxisKey)}:{" "}
              {formatAxisValue(
                timelineChart.data.at(-1)?.[timelineChart.xAxisKey] ?? 0,
              )}
              .
            </>
          )}
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
        {charts.map((chart, index) => (
          <div
            key={`${chart.seriesKey}:${chart.xAxisKey}:${index}`}
            className="min-w-0 rounded-xl border bg-background/70 p-4 md:col-span-2 lg:col-span-1"
          >
            <h1>
              {chart.config[chart.seriesKey]?.label}
              {chart.chartType !== "count" && chart.chartType !== "value" && (
                <> v. {capitalize(chart.xAxisKey)}</>
              )}
            </h1>
            <output className="block w-full">
              {chart.chartType === "value" ? (
                <span className="flex h-64 w-full items-center justify-center overflow-hidden text-center font-mono text-7xl font-semibold tabular-nums">
                  {chart.data.at(-1)?.[chart.seriesKey] ?? ""}
                </span>
              ) : chart.chartType === "count" ? (
                <span className="flex h-64 w-full items-center justify-center overflow-hidden text-center font-mono text-7xl font-semibold tabular-nums">
                  {chart.data.length}
                </span>
              ) : chart.chartType === "bar" ? (
                <Bars
                  animateVertically={chart.xAxisKey === "percentile"}
                  data={chart.data}
                  config={chart.config}
                  showXAxis={chart.xAxisKey === "percentile"}
                  xAxisKey={chart.xAxisKey}
                />
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
