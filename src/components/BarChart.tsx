import { memo } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useChartShift } from "@/hooks/useChartShift";
import { Bar, BarChart, XAxis } from "recharts";

interface BarsProps {
  animateVertically?: boolean;
  data: Record<string, unknown>[];
  config: ChartConfig;
  showXAxis?: boolean;
  xAxisKey: string;
}
const BaseChart = ({
  animateVertically = false,
  data,
  config,
  showXAxis = false,
  xAxisKey,
}: BarsProps) => {
  const containerRef = useChartShift(data.length, data.at(-1)?.[xAxisKey]);

  return (
    <div ref={containerRef} className="overflow-hidden">
      <ChartContainer className="h-64 w-full aspect-auto" config={config}>
        <BarChart data={data}>
          {showXAxis && (
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
          )}
          {Object.entries(config).map(([dataKey]) => (
            <Bar
              key={dataKey}
              dataKey={dataKey}
              fill={`var(--color-${dataKey})`}
              radius={4}
              isAnimationActive={animateVertically}
            />
          ))}
          <ChartTooltip content={<ChartTooltipContent />} />
        </BarChart>
      </ChartContainer>
    </div>
  );
};

export const Bars = memo(BaseChart);
