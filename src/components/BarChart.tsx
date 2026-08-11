import { memo } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart } from "recharts";

interface BarsProps {
  data: Record<string, unknown>[];
  config: ChartConfig;
}
const BaseChart = ({ data, config }: BarsProps) => (
  <ChartContainer className="h-64 w-full aspect-auto" config={config}>
    <BarChart data={data}>
      {Object.entries(config).map(([dataKey]) => (
        <Bar
          key={dataKey}
          dataKey={dataKey}
          fill={`var(--color-${dataKey})`}
          radius={4}
        />
      ))}
      <ChartTooltip content={<ChartTooltipContent />} />
    </BarChart>
  </ChartContainer>
);

export const Bars = memo(BaseChart);
