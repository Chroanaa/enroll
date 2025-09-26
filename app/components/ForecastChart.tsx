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
    const y = 100 - ((item.value - minValue) / range) * 80 - 10;
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
    <div className='relative'>
      <svg viewBox='0 0 100 100' className='w-full h-64'>
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

        <path
          d={historicalPath}
          fill='none'
          stroke='#3b82f6'
          strokeWidth='0.8'
          strokeLinecap='round'
          strokeLinejoin='round'
        />

        <path
          d={forecastPath}
          fill='none'
          stroke='#8b5cf6'
          strokeWidth='0.8'
          strokeDasharray='2,2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />

        {historicalPoints.map((point, index) => (
          <circle
            key={`historical-${index}`}
            cx={point.x}
            cy={point.y}
            r='1.2'
            fill='white'
            stroke='#3b82f6'
            strokeWidth='0.6'
          />
        ))}

        {forecastPoints.map((point, index) => (
          <circle
            key={`forecast-${index}`}
            cx={point.x}
            cy={point.y}
            r='1.2'
            fill='white'
            stroke='#8b5cf6'
            strokeWidth='0.6'
            opacity={point.confidence ? point.confidence / 100 : 1}
          />
        ))}

        {forecastPoints.map((point, index) => {
          if (!point.confidence) return null;
          const confidenceRange = ((100 - point.confidence) / 100) * 10;
          return (
            <g key={`confidence-${index}`}>
              <ellipse
                cx={point.x}
                cy={point.y}
                rx='2'
                ry={confidenceRange}
                fill='#8b5cf6'
                opacity='0.1'
              />
            </g>
          );
        })}

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

      <div className='flex justify-center gap-4 mt-4 text-xs'>
        <div className='flex items-center gap-1'>
          <div className='w-3 h-0.5 bg-blue-500'></div>
          <span className='text-gray-600'>Historical</span>
        </div>
        <div className='flex items-center gap-1'>
          <div
            className='w-3 h-0.5 bg-purple-500'
            style={{ borderTop: "1px dashed" }}
          ></div>
          <span className='text-gray-600'>Forecast</span>
        </div>
      </div>

      {/* X-axis labels */}
      <div className='flex justify-between mt-2 text-xs text-gray-500'>
        {allData.map((item, index) => {
          if (index % 2 === 0 || index === allData.length - 1) {
            return (
              <span key={item.date} className='text-center'>
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
