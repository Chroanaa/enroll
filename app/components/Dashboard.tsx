"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  BookOpen,
  TrendingUp,
  Calendar,
  GraduationCap,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import {
  generateForecast,
  calculateGrowthRate,
  getSeasonalPattern,
} from "../utils/forecasting";
import EnrollmentChart from "./EnrollmentChart";
import ForecastChart from "./ForecastChart";
import { colors } from "../colors";

const Dashboard: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<
    "enrollments" | "students" | "courses"
  >("enrollments");

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: number;
    color: string;
  }> = ({ title, value, icon, trend, color }) => {
    // Check if color is a hex value (starts with #) or a className (like "bg-blue-500")
    const isHexColor = color.startsWith("#");

    return (
      <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200'>
        <div className='flex items-center justify-between'>
          <div>
            <p
              className='text-sm font-medium mb-1'
              style={{ color: colors.primary }}
            >
              {title}
            </p>
            <p className='text-2xl font-bold' style={{ color: colors.primary }}>
              {value}
            </p>
            {trend !== undefined && (
              <div
                className='flex items-center mt-2'
                style={{ color: trend >= 0 ? "#10B981" : "#EF4444" }}
              >
                <TrendingUp
                  className={`w-4 h-4 mr-1 ${trend < 0 ? "rotate-180" : ""}`}
                />
                <span className='text-sm font-medium'>
                  {Math.abs(trend).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div
            className={`p-3 rounded-lg ${!isHexColor ? color : ""}`}
            style={isHexColor ? { backgroundColor: color } : {}}
          >
            {icon}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className='p-4 sm:p-6 bg-gray-50 min-h-screen'>
      <div className='max-w-7xl mx-auto w-full'>
        {/* Header */}
        <div className='mb-8'>
          <h1
            className='text-3xl font-bold mb-2'
            style={{ color: colors.primary }}
          >
            Enrollment Analytics Dashboard
          </h1>
          <p style={{ color: colors.primary }}>
            Monitor enrollment trends and forecast future patterns
          </p>
        </div>

        {/* Stats Grid */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'></div>

        {/* Charts Section */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 mb-8'>
          {/* Enrollment Trends */}
          <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
            <div className='flex items-center justify-between mb-6'>
              <h2
                className='text-xl font-bold'
                style={{ color: colors.primary }}
              >
                Enrollment Trends
              </h2>
              <div className='flex gap-2'>
                {["enrollments", "students", "courses"].map((metric) => (
                  <button
                    key={metric}
                    onClick={() => setSelectedMetric(metric as any)}
                    className='px-3 py-1 rounded-lg text-sm font-medium transition-colors'
                    style={
                      selectedMetric === metric
                        ? {
                            backgroundColor: `${colors.primary}10`,
                            color: colors.primary,
                          }
                        : { color: "#6B7280", backgroundColor: "transparent" }
                    }
                    onMouseEnter={(e) => {
                      if (selectedMetric !== metric) {
                        e.currentTarget.style.backgroundColor = "#F3F4F6";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedMetric !== metric) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {metric.charAt(0).toUpperCase() + metric.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Forecast */}
          <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
            <h2
              className='text-xl font-bold mb-6'
              style={{ color: colors.primary }}
            >
              6-Month Forecast
            </h2>
          </div>
        </div>

        {/* Insights & Alerts */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
          {/* Key Insights */}
          <div className='lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
            <h2
              className='text-xl font-bold mb-4'
              style={{ color: colors.primary }}
            >
              Key Insights
            </h2>
            <div className='space-y-4'>
              <div className='flex items-start gap-3'>
                <CheckCircle className='w-5 h-5 text-emerald-500 mt-0.5' />
                <div>
                  <p className='font-medium' style={{ color: colors.primary }}>
                    Peak Enrollment Period
                  </p>
                  <p className='text-sm' style={{ color: colors.primary }}>
                    Historical data shows has the highest enrollment rates
                  </p>
                </div>
              </div>
              <div className='flex items-start gap-3'>
                <TrendingUp className='w-5 h-5 text-blue-500 mt-0.5' />
                <div>
                  <p className='font-medium' style={{ color: colors.primary }}>
                    Growth Trajectory
                  </p>
                  <p className='text-sm' style={{ color: colors.primary }}></p>
                </div>
              </div>
              <div className='flex items-start gap-3'>
                <Calendar className='w-5 h-5 text-purple-500 mt-0.5' />
                <div>
                  <p className='font-medium' style={{ color: colors.primary }}>
                    Forecast Confidence
                  </p>
                  <p className='text-sm' style={{ color: colors.primary }}></p>
                </div>
              </div>
            </div>
          </div>
          {/* Alerts */}
          <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
            <h2
              className='text-xl font-bold mb-4'
              style={{ color: colors.primary }}
            >
              Alerts
            </h2>
            <div className='space-y-3'></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
