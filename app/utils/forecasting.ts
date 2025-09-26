import { EnrollmentTrend, ForecastData } from "../types";

export function calculateMovingAverage(
  data: number[],
  window: number
): number[] {
  const result: number[] = [];
  for (let i = window - 1; i < data.length; i++) {
    const sum = data
      .slice(i - window + 1, i + 1)
      .reduce((acc, val) => acc + val, 0);
    result.push(sum / window);
  }
  return result;
}

export function linearRegression(
  x: number[],
  y: number[]
): { slope: number; intercept: number } {
  const n = x.length;
  const sumX = x.reduce((acc, val) => acc + val, 0);
  const sumY = y.reduce((acc, val) => acc + val, 0);
  const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
  const sumXX = x.reduce((acc, val) => acc + val * val, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export function generateForecast(
  trends: EnrollmentTrend[],
  periods: number
): ForecastData[] {
  const enrollmentData = trends.map((t) => t.totalEnrollments);
  const timePoints = trends.map((_, index) => index);

  const { slope, intercept } = linearRegression(timePoints, enrollmentData);
  const movingAvg = calculateMovingAverage(enrollmentData, 3);

  const forecast: ForecastData[] = [];
  const lastIndex = trends.length - 1;

  for (let i = 1; i <= periods; i++) {
    const nextIndex = lastIndex + i;
    const predicted = Math.round(slope * nextIndex + intercept);

    // Calculate confidence based on recent trend stability
    const recentTrend = enrollmentData.slice(-3);
    const variance =
      recentTrend.reduce((acc, val) => {
        const mean =
          recentTrend.reduce((sum, v) => sum + v, 0) / recentTrend.length;
        return acc + Math.pow(val - mean, 2);
      }, 0) / recentTrend.length;

    const confidence = Math.max(
      60,
      Math.min(95, 95 - (variance / 10000) * 100)
    );

    // Determine trend direction
    let trend: "increasing" | "decreasing" | "stable" = "stable";
    if (slope > 10) trend = "increasing";
    else if (slope < -10) trend = "decreasing";

    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() + i);
    const period = currentDate.toISOString().slice(0, 7);

    forecast.push({
      period,
      predicted: Math.max(0, predicted),
      confidence: Math.round(confidence),
      trend,
    });
  }

  return forecast;
}

export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function getSeasonalPattern(trends: EnrollmentTrend[]): string {
  const monthlyAvg: { [key: string]: number[] } = {};

  trends.forEach((trend) => {
    const month = trend.date.split("-")[1];
    if (!monthlyAvg[month]) monthlyAvg[month] = [];
    monthlyAvg[month].push(trend.newEnrollments);
  });

  let peakMonth = "";
  let maxAvg = 0;

  Object.entries(monthlyAvg).forEach(([month, values]) => {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    if (avg > maxAvg) {
      maxAvg = avg;
      peakMonth = month;
    }
  });

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return monthNames[parseInt(peakMonth) - 1] || "Unknown";
}
