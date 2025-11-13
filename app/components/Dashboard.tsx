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
  mockStudents,
  mockCourses,
  mockEnrollments,
  mockEnrollmentTrends,
} from "../data/mockData";
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

  const stats = useMemo(() => {
    const activeStudents = mockStudents.filter(
      (s) => s.status === "active"
    ).length;
    const totalCourses = mockCourses.length;
    const totalEnrollments = mockEnrollments.filter(
      (e) => e.status === "enrolled"
    ).length;
    const completedCourses = mockEnrollments.filter(
      (e) => e.status === "completed"
    ).length;

    const currentTrend = mockEnrollmentTrends[mockEnrollmentTrends.length - 1];
    const previousTrend = mockEnrollmentTrends[mockEnrollmentTrends.length - 2];
    const growthRate = calculateGrowthRate(
      currentTrend.totalEnrollments,
      previousTrend.totalEnrollments
    );

    return {
      activeStudents,
      totalCourses,
      totalEnrollments,
      completedCourses,
      growthRate,
      averageCapacity: Math.round(
        (mockCourses.reduce(
          (sum, course) => sum + course.currentEnrollment / course.maxCapacity,
          0
        ) /
          mockCourses.length) *
          100
      ),
    };
  }, []);

  const forecast = useMemo(() => generateForecast(mockEnrollmentTrends, 6), []);
  const peakEnrollmentMonth = useMemo(
    () => getSeasonalPattern(mockEnrollmentTrends),
    []
  );

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
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
          <StatCard
            title='Active Students'
            value={stats.activeStudents}
            icon={<Users className='w-6 h-6 text-white' />}
            color={colors.secondary}
          />
          <StatCard
            title='Total Courses'
            value={stats.totalCourses}
            icon={<BookOpen className='w-6 h-6 text-white' />}
            color='bg-emerald-500'
          />
          <StatCard
            title='Current Enrollments'
            value={stats.totalEnrollments}
            icon={<GraduationCap className='w-6 h-6 text-white' />}
            trend={stats.growthRate}
            color='bg-purple-500'
          />
          <StatCard
            title='Average Capacity'
            value={`${stats.averageCapacity}%`}
            icon={<TrendingUp className='w-6 h-6 text-white' />}
            color='bg-orange-500'
          />
        </div>

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
            <EnrollmentChart
              data={mockEnrollmentTrends}
              metric={selectedMetric}
            />
          </div>

          {/* Forecast */}
          <div className='bg-white rounded-xl shadow-sm border border-gray-100 p-6'>
            <h2
              className='text-xl font-bold mb-6'
              style={{ color: colors.primary }}
            >
              6-Month Forecast
            </h2>
            <ForecastChart
              historicalData={mockEnrollmentTrends}
              forecastData={forecast}
            />
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
                    Historical data shows {peakEnrollmentMonth} has the highest
                    enrollment rates
                  </p>
                </div>
              </div>
              <div className='flex items-start gap-3'>
                <TrendingUp className='w-5 h-5 text-blue-500 mt-0.5' />
                <div>
                  <p className='font-medium' style={{ color: colors.primary }}>
                    Growth Trajectory
                  </p>
                  <p className='text-sm' style={{ color: colors.primary }}>
                    {stats.growthRate > 0 ? "Positive" : "Negative"} growth of{" "}
                    {Math.abs(stats.growthRate).toFixed(1)}% this period
                  </p>
                </div>
              </div>
              <div className='flex items-start gap-3'>
                <Calendar className='w-5 h-5 text-purple-500 mt-0.5' />
                <div>
                  <p className='font-medium' style={{ color: colors.primary }}>
                    Forecast Confidence
                  </p>
                  <p className='text-sm' style={{ color: colors.primary }}>
                    Next month prediction: {forecast[0]?.predicted} enrollments
                    ({forecast[0]?.confidence}% confidence)
                  </p>
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
            <div className='space-y-3'>
              {mockCourses
                .filter(
                  (course) =>
                    course.currentEnrollment / course.maxCapacity > 0.9
                )
                .map((course) => (
                  <div
                    key={course.id}
                    className='flex items-start gap-3 p-3 bg-orange-50 rounded-lg'
                  >
                    <AlertTriangle className='w-4 h-4 text-orange-500 mt-0.5' />
                    <div>
                      <p className='text-sm font-medium text-orange-900'>
                        {course.code} Near Capacity
                      </p>
                      <p className='text-xs text-orange-700'>
                        {course.currentEnrollment}/{course.maxCapacity} enrolled
                      </p>
                    </div>
                  </div>
                ))}

              {mockEnrollments.filter((e) => e.status === "pending").length >
                0 && (
                <div className='flex items-start gap-3 p-3 bg-blue-50 rounded-lg'>
                  <Clock className='w-4 h-4 text-blue-500 mt-0.5' />
                  <div>
                    <p className='text-sm font-medium text-blue-900'>
                      Pending Enrollments
                    </p>
                    <p className='text-xs text-blue-700'>
                      {
                        mockEnrollments.filter((e) => e.status === "pending")
                          .length
                      }{" "}
                      awaiting approval
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
