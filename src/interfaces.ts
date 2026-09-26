import type { ChartConfig } from "./components/ui/chart";

export type DataRow = Record<string, number | string>;

export interface Metric {
  label: string;
  key: string;
  color: string;
}

export type ChartType = "line" | "bar" | "count" | "value";

export interface ChartRequest {
  metric: string;
  xAxisKey?: string;
  chartType?: ChartType;
}

export interface ChartDefinition {
  chartType: ChartType;
  data: DataRow[];
  config: ChartConfig;
  seriesKey: string;
  xAxisKey: string;
}
