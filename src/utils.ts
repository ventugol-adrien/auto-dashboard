export const rotateColor = (color: string, index: number, total: number) => {
  const hex = color.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const lightness = (maximum + minimum) / 2;
  const delta = maximum - minimum;
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  const baseHue =
    delta === 0
      ? 0
      : 60 *
        (((maximum === red
          ? (green - blue) / delta
          : maximum === green
            ? (blue - red) / delta + 2
            : (red - green) / delta + 4) +
          6) %
          6);
  if (index === 0 || total <= 1) {
    return color;
  }

  const paletteHueRange = 100;
  const hue = (baseHue - (paletteHueRange * index) / (total - 1) + 360) % 360;

  return `hsl(${hue.toFixed(0)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%)`;
};

import type { DataRow } from "./interfaces";

export const toAxisNumber = (value: number | string) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const formatAxisValue = (value: number | string) => {
  if (typeof value === "number") {
    return String(value);
  }

  const timestamp = toAxisNumber(value);
  return timestamp === null ? value : new Date(timestamp).toLocaleString();
};

export const formatAxisTick = (value: number | string) => {
  if (typeof value === "number") {
    return String(value);
  }

  const timestamp = toAxisNumber(value);

  if (timestamp === null) {
    return value;
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const sortByKey = (key: string) => (left: DataRow, right: DataRow) => {
  const leftValue = toAxisNumber(left[key]);
  const rightValue = toAxisNumber(right[key]);

  if (leftValue === null) return 1;
  if (rightValue === null) return -1;

  return leftValue - rightValue;
};

export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);
