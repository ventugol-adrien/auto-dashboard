import { useLayoutEffect, useRef } from "react";

type ChartSnapshot = {
  itemCount: number;
  latestValue: unknown;
};

const animatedSelectors = [
  ".recharts-line-curve",
  ".recharts-bar",
  ".recharts-xAxis",
].join(", ");

export const useChartShift = (itemCount: number, latestValue: unknown) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousSnapshot = useRef<ChartSnapshot | undefined>(undefined);

  useLayoutEffect(() => {
    const previous = previousSnapshot.current;
    previousSnapshot.current = { itemCount, latestValue };

    if (
      !previous ||
      itemCount < 2 ||
      previous.itemCount !== itemCount ||
      Object.is(previous.latestValue, latestValue) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const offset = 100 / (itemCount - 1);
    const animations = Array.from(
      containerRef.current?.querySelectorAll(animatedSelectors) ?? [],
    ).map((element) =>
      element.animate(
        [
          { transform: `translateX(${offset}%)` },
          { transform: "translateX(0)" },
        ],
        {
          duration: 350,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      ),
    );

    return () => {
      animations.forEach((animation) => animation.cancel());
    };
  }, [itemCount, latestValue]);

  return containerRef;
};
