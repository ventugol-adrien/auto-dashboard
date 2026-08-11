import type { ChartConfig } from "./components/ui/chart";

export type DataRow = Record<string, number | string>;

export interface Metric {
  label: string;
  key: string;
  color: string;
}

type ChartType = "line" | "bar";

export interface ChartTemplate {
  metricAbbreviation: string;
  chartType: ChartType;
}

export interface ChartDefinition {
  chartType: ChartType;
  data: DataRow[];
  config: ChartConfig;
  seriesKey: string;
  xAxisKey: string;
}
