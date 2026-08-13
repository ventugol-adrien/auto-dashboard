import { memo, useRef } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatAxisTick } from "@/utils";
import { useChartShift } from "@/hooks/useChartShift";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

type DataKey = "x" | "y" | "line";

export const generateConfig = (): ChartConfig => ({
  // Add your chart configuration here
});

const getPaddedDomain = (
  data: Record<string, unknown>[],
  dataKey: string,
): [number, number] | undefined => {
  const values = data
    .map((item) => item[dataKey])
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value),
    );

  if (values.length === 0) return undefined;

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum;
  const padding =
    range > 0 ? range * 0.15 : Math.max(Math.abs(maximum) * 0.1, 1);

  return [minimum - padding, maximum + padding];
};

const useStableDomain = (data: Record<string, unknown>[], dataKey: string) => {
  const candidate = getPaddedDomain(data, dataKey);
  const snapshot = useRef<{
    dataKey: string;
    domain: [number, number] | undefined;
  }>({ dataKey, domain: candidate });

  if (snapshot.current.dataKey !== dataKey) {
    snapshot.current = { dataKey, domain: candidate };
  } else if (candidate && snapshot.current.domain) {
    snapshot.current.domain = [
      Math.min(snapshot.current.domain[0], candidate[0]),
      Math.max(snapshot.current.domain[1], candidate[1]),
    ];
  } else if (candidate) {
    snapshot.current.domain = candidate;
  }

  return snapshot.current.domain;
};

const BaseChart = ({
  data,
  config,
  dataKeys,
}: {
  data: Record<string, unknown>[];
  config: ChartConfig;
  dataKeys: Record<DataKey, string>;
}) => {
  const containerRef = useChartShift(data.length, data.at(-1)?.[dataKeys.x]);
  const yDomain = useStableDomain(data, dataKeys.y);

  return (
    <div ref={containerRef} className="overflow-hidden">
      <ChartContainer className="h-64 w-full aspect-auto" config={config}>
        <LineChart
          accessibilityLayer
          data={data}
          margin={{
            left: 12,
            right: 12,
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey={dataKeys.x}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => formatAxisTick(value as number | string)}
          />
          <YAxis
            dataKey={dataKeys.y}
            domain={yDomain}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => Number(value).toFixed(2)}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Line
            dataKey={dataKeys.line}
            type="natural"
            stroke={`var(--color-${dataKeys.line})`}
            strokeWidth={2}
            dot={false}
            animationDuration={350}
            animationEasing="ease-out"
            isAnimationActive
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
};

export const Lines = memo(BaseChart);
