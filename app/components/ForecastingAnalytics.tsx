"use client";
import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  BarChart3,
  PieChart,
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  Settings,
  Download,
} from "lucide-react";
import {
  generateForecast,
  calculateGrowthRate,
  getSeasonalPattern,
} from "../utils/forecasting";
import ForecastChart from "./ForecastChart";
import EnrollmentChart from "./EnrollmentChart";

const ForecastingAnalytics: React.FC = () => {
  const getInsightColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-emerald-50 border-emerald-200 text-emerald-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "alert":
        return "bg-red-50 border-red-200 text-red-800";
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const getInsightIconColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-emerald-600";
      case "warning":
        return "text-yellow-600";
      case "alert":
        return "text-red-600";
      case "info":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    trend?: number;
  }> = ({ title, value, subtitle, icon, color, trend }) => (
    <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200'>
      <div className='flex items-center justify-between mb-4'>
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
        {trend !== undefined && (
          <div
            className={`flex items-center ${
              trend >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {trend >= 0 ? (
              <TrendingUp className='w-4 h-4 mr-1' />
            ) : (
              <TrendingDown className='w-4 h-4 mr-1' />
            )}
            <span className='text-sm font-medium'>
              {Math.abs(trend).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      <div>
        <p className='text-sm font-medium text-gray-600 mb-1'>{title}</p>
        <p className='text-2xl font-bold text-gray-900'>{value}</p>
        {subtitle && <p className='text-sm text-gray-500 mt-1'>{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className='p-4 sm:p-6 bg-gray-50 min-h-screen'>
      <div className='max-w-7xl mx-auto w-full'>
        <div className='mb-8'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                Forecasting & Analytics
              </h1>
              <p className='text-gray-600'>
                Advanced predictive analytics and enrollment forecasting
              </p>
            </div>
            <div className='flex gap-3'>
              <button className='flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>
                <Download className='w-4 h-4' />
                Export Report
              </button>
              <button className='flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>
                <Settings className='w-4 h-4' />
                Settings
              </button>
            </div>
          </div>
        </div>

        <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>
            Forecast Parameters
          </h2>
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Forecast Periods (Months)
              </label>
              <select className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'>
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months</option>
                <option value={24}>24 Months</option>
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Confidence Threshold (%)
              </label>
              <input type='range' min='50' max='95' className='w-full' />
              <div className='text-sm text-gray-600 mt-1'></div>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Analysis Metric
              </label>
              <select className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'>
                <option value='enrollments'>Total Enrollments</option>
                <option value='students'>New Students</option>
                <option value='courses'>Course Completions</option>
              </select>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'></div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
          <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-xl font-bold text-gray-900'>
                Historical Trends
              </h2>
              <div className='flex gap-2'></div>
            </div>
          </div>

          <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
            <h2 className='text-xl font-bold text-gray-900 mb-6'>
              Month Forecast Projection
            </h2>
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
          <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
            <h2 className='text-xl font-bold text-gray-900 mb-4'>
              Detailed Forecast
            </h2>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-gray-200'>
                    <th className='text-left py-2 text-sm font-medium text-gray-600'>
                      Period
                    </th>
                    <th className='text-right py-2 text-sm font-medium text-gray-600'>
                      Predicted
                    </th>
                    <th className='text-right py-2 text-sm font-medium text-gray-600'>
                      Confidence
                    </th>
                    <th className='text-center py-2 text-sm font-medium text-gray-600'>
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className='border-b border-gray-100'>
                    <td className='py-3 text-sm text-gray-900'></td>
                    <td className='py-3 text-sm font-medium text-gray-900 text-right'></td>
                    <td className='py-3 text-right'>
                      <span></span>
                    </td>
                    <td className='py-3 text-center'>
                      <div className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium'></div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
            <h2 className='text-xl font-bold text-gray-900 mb-4'>
              Model Performance
            </h2>
            <div className='space-y-4'>
              <div className='flex justify-between items-center p-3 bg-gray-50 rounded-lg'>
                <span className='text-sm font-medium text-gray-700'>
                  Average Confidence
                </span>
                <span className='text-sm font-bold text-gray-900'>%</span>
              </div>
              <div className='flex justify-between items-center p-3 bg-gray-50 rounded-lg'>
                <span className='text-sm font-medium text-gray-700'>
                  Trend Direction
                </span>
                <span></span>
              </div>
              <div className='flex justify-between items-center p-3 bg-gray-50 rounded-lg'>
                <span className='text-sm font-medium text-gray-700'>
                  Peak Season
                </span>
                <span className='text-sm font-bold text-gray-900'></span>
              </div>
              <div className='flex justify-between items-center p-3 bg-gray-50 rounded-lg'>
                <span className='text-sm font-medium text-gray-700'>
                  Data Points
                </span>
                <span className='text-sm font-bold text-gray-900'></span>
              </div>
            </div>
          </div>
        </div>

        <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
          <h2 className='text-xl font-bold text-gray-900 mb-6'>
            AI-Powered Insights & Recommendations
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='flex items-start gap-3'></div>
            <div>
              <h3 className='font-semibold text-sm mb-1'></h3>
              <p className='text-sm opacity-90'></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForecastingAnalytics;
