"use client";
import React from "react";
import { EnrollmentTrend, ForecastData } from "../types";

interface ForecastChartProps {
  historicalData: EnrollmentTrend[];
  forecastData: ForecastData[];
}

const ForecastChart: React.FC<ForecastChartProps> = ({
  historicalData,
  forecastData,
}) => {
  // Prepare data for chart
  const recentHistorical = historicalData.slice(-4);
  const allData = [
    ...recentHistorical.map((h) => ({
      date: h.date,
      value: h.totalEnrollments,
      type: "historical" as const,
    })),
    ...forecastData.map((f) => ({
      date: f.period,
      value: f.predicted,
      type: "forecast" as const,
      confidence: f.confidence,
    })),
  ];

  const maxValue = Math.max(...allData.map((d) => d.value));
  const minValue = Math.min(...allData.map((d) => d.value));
  const range = maxValue - minValue;

  const points = allData.map((item, index) => {
    const x = (index / (allData.length - 1)) * 100;
    const y = 100 - ((item.value - minValue) / (range || 1)) * 80 - 10;
    return { x, y, ...item };
  });

  const historicalPoints = points.filter((p) => p.type === "historical");
  const forecastPoints = points.filter((p) => p.type === "forecast");

  const historicalPath = historicalPoints.reduce((acc, point, index) => {
    const command = index === 0 ? "M" : "L";
    return `${acc} ${command} ${point.x} ${point.y}`;
  }, "");

  const forecastPath = [
    ...historicalPoints.slice(-1),
    ...forecastPoints,
  ].reduce((acc, point, index) => {
    const command = index === 0 ? "M" : "L";
    return `${acc} ${command} ${point.x} ${point.y}`;
  }, "");

  return (
    <div className='relative w-full max-w-full overflow-x-auto'>
      <svg
        viewBox='0 0 100 100'
        className='w-full h-48 sm:h-56 md:h-64 lg:h-72 xl:h-80'
        preserveAspectRatio='xMinYMin meet'
      >
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1='0'
            y1={10 + (80 * y) / 100}
            x2='100'
            y2={10 + (80 * y) / 100}
            stroke='#f3f4f6'
            strokeWidth='0.2'
          />
        ))}

        {/* Historical Line */}
        <path
          d={historicalPath}
          fill='none'
          stroke='rgb(59, 130, 246)'
          strokeWidth='0.8'
          strokeLinecap='round'
          strokeLinejoin='round'
        />

        {/* Forecast Line */}
        <path
          d={forecastPath}
          fill='none'
          stroke='rgb(251, 191, 36)'
          strokeWidth='0.8'
          strokeDasharray='2,2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />

        {/* Data points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r='1.2'
              fill='white'
              stroke={
                point.type === "historical"
                  ? "rgb(59, 130, 246)"
                  : "rgb(251, 191, 36)"
              }
              strokeWidth='0.6'
              className='hover:r-2 transition-all cursor-pointer'
            />
          </g>
        ))}

        {/* Y-axis labels */}
        <text x='-2' y='14' fontSize='3' fill='#6b7280' textAnchor='end'>
          {maxValue}
        </text>
        <text x='-2' y='54' fontSize='3' fill='#6b7280' textAnchor='end'>
          {Math.round((maxValue + minValue) / 2)}
        </text>
        <text x='-2' y='94' fontSize='3' fill='#6b7280' textAnchor='end'>
          {minValue}
        </text>
      </svg>

      {/* X-axis labels */}
      <div className='flex flex-wrap justify-between mt-2 text-xs text-gray-500 w-full'>
        {allData.map((item, index) => {
          if (index % 2 === 0 || index === allData.length - 1) {
            return (
              <span key={item.date} className='text-center min-w-[32px]'>
                {new Date(item.date + "-01").toLocaleDateString("en-US", {
                  month: "short",
                })}
              </span>
            );
          }
          return <span key={item.date}></span>;
        })}
      </div>
    </div>
  );
};

export default ForecastChart;
