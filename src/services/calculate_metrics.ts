export interface RunningStatistics {
  avg: number;
  sum: number;
  std: number;
  var: number;
  med: number;
  min: number;
  max: number;
}

const insertSorted = (values: number[], value: number) => {
  let low = 0;
  let high = values.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if (values[middle] <= value) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  values.splice(low, 0, value);
};

export const calculateRunningStatistics = (
  values: number[],
): RunningStatistics[] => {
  let mean = 0;
  let sum = 0;
  let squaredDifferenceTotal = 0;
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  const sortedValues: number[] = [];

  return values.map((value, index) => {
    const count = index + 1;
    const difference = value - mean;
    sum += value;
    mean += difference / count;
    squaredDifferenceTotal += difference * (value - mean);
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
    insertSorted(sortedValues, value);

    const middle = Math.floor(count / 2);
    const median =
      count % 2 === 0
        ? (sortedValues[middle - 1] + sortedValues[middle]) / 2
        : sortedValues[middle];
    const variance = Math.max(0, squaredDifferenceTotal / count);

    return {
      avg: mean,
      sum,
      std: Math.sqrt(variance),
      var: variance,
      med: median,
      min: minimum,
      max: maximum,
    };
  });
};
