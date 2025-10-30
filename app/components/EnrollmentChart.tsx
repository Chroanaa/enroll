"use client";
import React from "react";
import { EnrollmentTrend } from "../types";
import { colors } from "../colors";

interface EnrollmentChartProps {
  data: EnrollmentTrend[];
  metric: "enrollments" | "students" | "courses";
}

const EnrollmentChart: React.FC<EnrollmentChartProps> = ({ data, metric }) => {
  const getDataValue = (trend: EnrollmentTrend) => {
    switch (metric) {
      case "enrollments":
        return trend.totalEnrollments;
      case "students":
        return trend.newEnrollments;
      case "courses":
        return trend.courseCompletions;
      default:
        return trend.totalEnrollments;
    }
  };

  const maxValue = Math.max(...data.map(getDataValue));
  const minValue = Math.min(...data.map(getDataValue));
  const range = maxValue - minValue;

  const getColor = () => {
    switch (metric) {
      case "enrollments":
        return colors.primary; // Use primary brown for enrollment data
      case "students":
        return "rgb(16, 185, 129)";
      case "courses":
        return "rgb(139, 92, 246)";
      default:
        return colors.primary;
    }
  };

  const points = data.map((trend, index) => {
    const value = getDataValue(trend);
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - minValue) / range) * 80 - 10;
    return { x, y, value, date: trend.date };
  });

  const pathData = points.reduce((acc, point, index) => {
    const command = index === 0 ? "M" : "L";
    return `${acc} ${command} ${point.x} ${point.y}`;
  }, "");

  const areaPath = `${pathData} L 100 90 L 0 90 Z`;

  return (
    <div className='relative w-full max-w-full overflow-x-auto'>
      <svg
        viewBox='0 0 100 100'
        className='w-full h-48 sm:h-56 md:h-64 lg:h-72 xl:h-80'
        preserveAspectRatio='xMinYMin meet'
      >
        {/* Grid lines */}
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

        {/* Area fill */}
        <path d={areaPath} fill={getColor()} fillOpacity='0.1' />

        {/* Line */}
        <path
          d={pathData}
          fill='none'
          stroke={getColor()}
          strokeWidth='0.8'
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
              stroke={getColor()}
              strokeWidth='0.6'
              className='hover:r-2 transition-all cursor-pointer'
            />
            {/* Tooltip on hover would go here in a real implementation */}
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
      <div className='flex justify-between mt-2 text-xs text-gray-500'>
        {data.map((trend, index) => {
          if (index % 2 === 0 || index === data.length - 1) {
            return (
              <span key={trend.date} className='text-center'>
                {new Date(trend.date + "-01").toLocaleDateString("en-US", {
                  month: "short",
                })}
              </span>
            );
          }
          return <span key={trend.date}></span>;
        })}
      </div>
    </div>
  );
};

export default EnrollmentChart;
