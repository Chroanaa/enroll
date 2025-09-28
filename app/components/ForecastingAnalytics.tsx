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
import { mockEnrollmentTrends, mockCourses } from "../data/mockData";
import {
  generateForecast,
  calculateGrowthRate,
  getSeasonalPattern,
} from "../utils/forecasting";
import ForecastChart from "./ForecastChart";
import EnrollmentChart from "./EnrollmentChart";

const ForecastingAnalytics: React.FC = () => {
  const [forecastPeriods, setForecastPeriods] = useState(6);
  const [selectedMetric, setSelectedMetric] = useState<
    "enrollments" | "students" | "courses"
  >("enrollments");
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);

  const forecast = useMemo(
    () => generateForecast(mockEnrollmentTrends, forecastPeriods),
    [forecastPeriods]
  );
  const peakEnrollmentMonth = useMemo(
    () => getSeasonalPattern(mockEnrollmentTrends),
    []
  );

  const analytics = useMemo(() => {
    const currentTrend = mockEnrollmentTrends[mockEnrollmentTrends.length - 1];
    const previousTrend = mockEnrollmentTrends[mockEnrollmentTrends.length - 2];
    const growthRate = calculateGrowthRate(
      currentTrend.totalEnrollments,
      previousTrend.totalEnrollments
    );

    // Calculate trend direction over last 3 months
    const recentTrends = mockEnrollmentTrends.slice(-3);
    const trendDirection =
      recentTrends[2].totalEnrollments > recentTrends[0].totalEnrollments
        ? "increasing"
        : "decreasing";

    // Calculate average monthly growth
    const monthlyGrowthRates = mockEnrollmentTrends
      .slice(1)
      .map((trend, index) =>
        calculateGrowthRate(
          trend.totalEnrollments,
          mockEnrollmentTrends[index].totalEnrollments
        )
      );
    const avgMonthlyGrowth =
      monthlyGrowthRates.reduce((sum, rate) => sum + rate, 0) /
      monthlyGrowthRates.length;

    // Predict next semester enrollment
    const nextSemesterPrediction = Math.round(
      currentTrend.totalEnrollments * (1 + (avgMonthlyGrowth / 100) * 4)
    );

    // Calculate capacity utilization forecast
    const totalCapacity = mockCourses.reduce(
      (sum, course) => sum + course.maxCapacity,
      0
    );
    const currentUtilization =
      (currentTrend.totalEnrollments / totalCapacity) * 100;
    const forecastUtilization = (nextSemesterPrediction / totalCapacity) * 100;

    return {
      growthRate,
      trendDirection,
      avgMonthlyGrowth,
      nextSemesterPrediction,
      currentUtilization,
      forecastUtilization,
      totalCapacity,
    };
  }, []);

  const insights = useMemo(() => {
    const insights = [];

    // Growth trend insights
    if (analytics.growthRate > 5) {
      insights.push({
        type: "success",
        title: "Strong Growth Detected",
        description: `Enrollment is growing at ${analytics.growthRate.toFixed(
          1
        )}% this period, indicating healthy demand.`,
        icon: <TrendingUp className='w-5 h-5' />,
      });
    } else if (analytics.growthRate < -5) {
      insights.push({
        type: "warning",
        title: "Declining Enrollment",
        description: `Enrollment has decreased by ${Math.abs(
          analytics.growthRate
        ).toFixed(1)}% this period. Consider intervention strategies.`,
        icon: <TrendingDown className='w-5 h-5' />,
      });
    }

    // Capacity insights
    if (analytics.forecastUtilization > 90) {
      insights.push({
        type: "alert",
        title: "Capacity Constraint Risk",
        description: `Forecasted utilization of ${analytics.forecastUtilization.toFixed(
          1
        )}% may exceed capacity limits.`,
        icon: <AlertTriangle className='w-5 h-5' />,
      });
    }

    // Seasonal insights
    insights.push({
      type: "info",
      title: "Seasonal Pattern",
      description: `Historical data shows ${peakEnrollmentMonth} typically has the highest enrollment rates.`,
      icon: <Calendar className='w-5 h-5' />,
    });

    // Forecast confidence
    const avgConfidence =
      forecast.reduce((sum, f) => sum + f.confidence, 0) / forecast.length;
    if (avgConfidence < confidenceThreshold) {
      insights.push({
        type: "warning",
        title: "Low Forecast Confidence",
        description: `Average forecast confidence is ${avgConfidence.toFixed(
          1
        )}%, below the ${confidenceThreshold}% threshold.`,
        icon: <Info className='w-5 h-5' />,
      });
    }

    return insights;
  }, [analytics, forecast, peakEnrollmentMonth, confidenceThreshold]);

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
              <select
                value={forecastPeriods}
                onChange={(e) => setForecastPeriods(parseInt(e.target.value))}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
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
              <input
                type='range'
                min='50'
                max='95'
                value={confidenceThreshold}
                onChange={(e) =>
                  setConfidenceThreshold(parseInt(e.target.value))
                }
                className='w-full'
              />
              <div className='text-sm text-gray-600 mt-1'>
                {confidenceThreshold}%
              </div>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Analysis Metric
              </label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as any)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                <option value='enrollments'>Total Enrollments</option>
                <option value='students'>New Students</option>
                <option value='courses'>Course Completions</option>
              </select>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
          <StatCard
            title='Current Growth Rate'
            value={`${analytics.growthRate.toFixed(1)}%`}
            subtitle='vs. previous period'
            icon={<TrendingUp className='w-6 h-6 text-white' />}
            color='bg-blue-500'
            trend={analytics.growthRate}
          />
          <StatCard
            title='Avg Monthly Growth'
            value={`${analytics.avgMonthlyGrowth.toFixed(1)}%`}
            subtitle='historical average'
            icon={<BarChart3 className='w-6 h-6 text-white' />}
            color='bg-emerald-500'
          />
          <StatCard
            title='Next Semester Forecast'
            value={analytics.nextSemesterPrediction.toLocaleString()}
            subtitle='predicted enrollments'
            icon={<Target className='w-6 h-6 text-white' />}
            color='bg-purple-500'
          />
          <StatCard
            title='Capacity Utilization'
            value={`${analytics.currentUtilization.toFixed(1)}%`}
            subtitle={`forecast: ${analytics.forecastUtilization.toFixed(1)}%`}
            icon={<PieChart className='w-6 h-6 text-white' />}
            color='bg-orange-500'
          />
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
          <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-xl font-bold text-gray-900'>
                Historical Trends
              </h2>
              <div className='flex gap-2'>
                {["enrollments", "students", "courses"].map((metric) => (
                  <button
                    key={metric}
                    onClick={() => setSelectedMetric(metric as any)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedMetric === metric
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {metric.charAt(0).toUpperCase() + metric.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <EnrollmentChart
              data={mockEnrollmentTrends}
              metric={selectedMetric}
            />
          </div>

          <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
            <h2 className='text-xl font-bold text-gray-900 mb-6'>
              {forecastPeriods}-Month Forecast Projection
            </h2>
            <ForecastChart
              historicalData={mockEnrollmentTrends}
              forecastData={forecast}
            />
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
                  {forecast.map((item, index) => (
                    <tr key={index} className='border-b border-gray-100'>
                      <td className='py-3 text-sm text-gray-900'>
                        {new Date(item.period + "-01").toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </td>
                      <td className='py-3 text-sm font-medium text-gray-900 text-right'>
                        {item.predicted.toLocaleString()}
                      </td>
                      <td className='py-3 text-right'>
                        <span
                          className={`text-sm font-medium ${
                            item.confidence >= confidenceThreshold
                              ? "text-emerald-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {item.confidence}%
                        </span>
                      </td>
                      <td className='py-3 text-center'>
                        <div
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.trend === "increasing"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.trend === "decreasing"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {item.trend === "increasing" && (
                            <TrendingUp className='w-3 h-3 mr-1' />
                          )}
                          {item.trend === "decreasing" && (
                            <TrendingDown className='w-3 h-3 mr-1' />
                          )}
                          {item.trend === "stable" && (
                            <Activity className='w-3 h-3 mr-1' />
                          )}
                          {item.trend}
                        </div>
                      </td>
                    </tr>
                  ))}
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
                <span className='text-sm font-bold text-gray-900'>
                  {(
                    forecast.reduce((sum, f) => sum + f.confidence, 0) /
                    forecast.length
                  ).toFixed(1)}
                  %
                </span>
              </div>
              <div className='flex justify-between items-center p-3 bg-gray-50 rounded-lg'>
                <span className='text-sm font-medium text-gray-700'>
                  Trend Direction
                </span>
                <span
                  className={`text-sm font-bold ${
                    analytics.trendDirection === "increasing"
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {analytics.trendDirection}
                </span>
              </div>
              <div className='flex justify-between items-center p-3 bg-gray-50 rounded-lg'>
                <span className='text-sm font-medium text-gray-700'>
                  Peak Season
                </span>
                <span className='text-sm font-bold text-gray-900'>
                  {peakEnrollmentMonth}
                </span>
              </div>
              <div className='flex justify-between items-center p-3 bg-gray-50 rounded-lg'>
                <span className='text-sm font-medium text-gray-700'>
                  Data Points
                </span>
                <span className='text-sm font-bold text-gray-900'>
                  {mockEnrollmentTrends.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
          <h2 className='text-xl font-bold text-gray-900 mb-6'>
            AI-Powered Insights & Recommendations
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getInsightColor(
                  insight.type
                )}`}
              >
                <div className='flex items-start gap-3'>
                  <div className={getInsightIconColor(insight.type)}>
                    {insight.icon}
                  </div>
                  <div>
                    <h3 className='font-semibold text-sm mb-1'>
                      {insight.title}
                    </h3>
                    <p className='text-sm opacity-90'>{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForecastingAnalytics;
