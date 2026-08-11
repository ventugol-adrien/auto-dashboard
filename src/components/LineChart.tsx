import { memo } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

type DataKey = "x" | "y" | "line";

export const generateConfig = (): ChartConfig => ({
  // Add your chart configuration here
});
const BaseChart = ({
  data,
  config,
  dataKeys,
}: {
  data: unknown[];
  config: ChartConfig;
  dataKeys: Record<DataKey, string>;
}) => {
  return (
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
          tickFormatter={(value) => String(value)}
        />
        <YAxis
          dataKey={dataKeys.y}
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
        />
      </LineChart>
    </ChartContainer>
  );
};

export const Lines = memo(BaseChart);
