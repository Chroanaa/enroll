"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Calendar,
  GraduationCap,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BarChart3,
  PieChart,
  Activity,
  Settings,
  RefreshCw,
} from "lucide-react";
import { colors } from "../colors";

interface DashboardStats {
  currentSemester: string;
  currentAcademicYear: string;
  stats: {
    totalEnrollments: number;
    pendingEnrollments: number;
    approvedEnrollments: number;
    totalStudents: number;
    totalPrograms: number;
    totalDepartments: number;
    recentEnrollments: number;
    enrollmentTrend: number;
  };
  enrollmentsByStatus: Array<{ status: string; count: number }>;
  topDepartments: Array<{
    id: number;
    name: string;
    code: string;
    count: number;
  }>;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchStats();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const response = await fetch("/api/auth/dashboard/stats");
      const data = await response.json();
      if (data.data) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getSemesterLabel = (semester: string) => {
    const labels: Record<string, string> = {
      first: "1st Semester",
      second: "2nd Semester",
      First: "1st Semester",
      Second: "2nd Semester",
    };
    return labels[semester] || semester;
  };

  if (loading) {
    return (
      <div
        className='flex items-center justify-center min-h-screen'
        style={{ background: colors.paper }}
      >
        <div className='flex flex-col items-center gap-4'>
          <div className='relative'>
            <div
              className='w-16 h-16 border-4 rounded-full animate-spin'
              style={{
                borderColor: colors.neutralBorder,
                borderTopColor: colors.primary,
              }}
            ></div>
            <GraduationCap
              className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6'
              style={{ color: colors.primary }}
            />
          </div>
          <p className='font-medium' style={{ color: colors.neutral }}>
            Loading Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen' style={{ backgroundColor: colors.paper }}>
      {/* Header Section */}
      <div
        className='relative overflow-hidden border-b'
        style={{
          backgroundColor: colors.paper,
          borderColor: "rgba(58, 35, 19, 0.2)",
        }}
      >
        <div className='relative px-6 py-8 sm:px-8 lg:px-12'>
          <div className='max-w-7xl mx-auto'>
            <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6'>
              {/* Left Side - Welcome & Time */}
              <div className='space-y-2'>
                <div className='flex items-center gap-3'>
                  <div
                    className='p-2 rounded-xl'
                    style={{ backgroundColor: colors.primary + "10" }}
                  >
                    <Sparkles
                      className='w-6 h-6'
                      style={{ color: colors.primary }}
                    />
                  </div>
                  <h1
                    className='text-3xl sm:text-4xl font-bold tracking-tight'
                    style={{ color: colors.primary }}
                  >
                    Dashboard
                  </h1>
                </div>
                <div className='flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4'>
                  <p
                    className='flex items-center gap-2'
                    style={{ color: colors.secondary }}
                  >
                    <Calendar
                      className='w-4 h-4'
                      style={{ color: colors.secondary }}
                    />
                    {formatDate(currentTime)}
                  </p>
                  <p
                    className='flex items-center gap-2 font-mono text-lg font-semibold'
                    style={{ color: colors.neutralDark }}
                  >
                    <Clock className='w-4 h-4' />
                    {formatTime(currentTime)}
                  </p>
                </div>
              </div>

              {/* Right Side - Current Semester Card */}
              <div
                className='flex items-center gap-4 px-6 py-4 rounded-xl bg-white'
                style={{
                  boxShadow:
                    "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
                }}
              >
                <div
                  className='p-3 rounded-lg'
                  style={{
                    backgroundColor: colors.neutralLight,
                    border: `1px solid ${colors.neutralBorder}`,
                  }}
                >
                  <GraduationCap
                    className='w-8 h-8'
                    style={{ color: colors.primary }}
                  />
                </div>
                <div>
                  <p
                    className='text-sm font-medium'
                    style={{ color: colors.neutral }}
                  >
                    Current Academic Period
                  </p>
                  <p
                    className='text-xl font-bold'
                    style={{ color: colors.primary }}
                  >
                    {getSemesterLabel(stats?.currentSemester || "")}
                  </p>
                  <p
                    className='text-sm font-semibold'
                    style={{ color: colors.secondary }}
                  >
                    A.Y. {stats?.currentAcademicYear}
                  </p>
                </div>
                <button
                  onClick={fetchStats}
                  disabled={refreshing}
                  className='ml-4 p-2 rounded-lg hover:bg-gray-50 transition-colors'
                  style={{ color: colors.neutral }}
                >
                  <RefreshCw
                    className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='px-6 pb-12 sm:px-8 lg:px-12 pt-8'>
        <div className='max-w-7xl mx-auto space-y-8'>
          {/* Stats Grid */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
            {/* Total Enrollments */}
            <div
              className='rounded-2xl p-6 hover:shadow-lg transition-all duration-200 bg-white'
              style={{
                boxShadow:
                  "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
              }}
            >
              <div className='flex items-center justify-between mb-4'>
                <div
                  className='p-3 rounded-xl shadow-sm'
                  style={{
                    backgroundColor: colors.primary + "10",
                    border: `1px solid ${colors.primary}20`,
                  }}
                >
                  <Users
                    className='w-6 h-6'
                    style={{ color: colors.primary }}
                  />
                </div>
                {stats?.stats.enrollmentTrend !== undefined && (
                  <div
                    className='flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold'
                    style={{
                      backgroundColor:
                        stats.stats.enrollmentTrend >= 0
                          ? colors.primary + "15"
                          : colors.danger + "15",
                      color:
                        stats.stats.enrollmentTrend >= 0
                          ? colors.primary
                          : colors.danger,
                    }}
                  >
                    {stats.stats.enrollmentTrend >= 0 ? (
                      <ArrowUpRight className='w-3 h-3' />
                    ) : (
                      <ArrowDownRight className='w-3 h-3' />
                    )}
                    {Math.abs(stats.stats.enrollmentTrend)}%
                  </div>
                )}
              </div>
              <p
                className='text-sm font-medium mb-1'
                style={{ color: colors.secondary }}
              >
                Total Enrollments
              </p>
              <p
                className='text-3xl font-bold'
                style={{ color: colors.neutralDark }}
              >
                {stats?.stats.totalEnrollments.toLocaleString()}
              </p>
              <p className='text-xs mt-2' style={{ color: colors.neutral }}>
                +{stats?.stats.recentEnrollments} this week
              </p>
            </div>

            {/* Pending Enrollments */}
            <div
              className='rounded-2xl p-6 hover:shadow-lg transition-all duration-200 bg-white'
              style={{
                boxShadow:
                  "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
              }}
            >
              <div className='flex items-center justify-between mb-4'>
                <div
                  className='p-3 rounded-xl shadow-sm'
                  style={{
                    backgroundColor: colors.warning + "10",
                    border: `1px solid ${colors.warning}20`,
                  }}
                >
                  <Clock
                    className='w-6 h-6'
                    style={{ color: colors.warning }}
                  />
                </div>
                {stats?.stats.pendingEnrollments &&
                  stats.stats.pendingEnrollments > 0 && (
                    <div
                      className='flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold'
                      style={{
                        backgroundColor: colors.warning + "15",
                        color: colors.warning,
                      }}
                    >
                      <AlertCircle className='w-3 h-3' />
                      Needs Review
                    </div>
                  )}
              </div>
              <p
                className='text-sm font-medium mb-1'
                style={{ color: colors.secondary }}
              >
                Pending Approval
              </p>
              <p
                className='text-3xl font-bold'
                style={{ color: colors.neutralDark }}
              >
                {stats?.stats.pendingEnrollments.toLocaleString()}
              </p>
              <p className='text-xs mt-2' style={{ color: colors.neutral }}>
                Awaiting review
              </p>
            </div>

            {/* Approved Enrollments */}
            <div
              className='rounded-2xl p-6 hover:shadow-lg transition-all duration-200 bg-white'
              style={{
                boxShadow:
                  "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
              }}
            >
              <div className='flex items-center justify-between mb-4'>
                <div
                  className='p-3 rounded-xl shadow-sm'
                  style={{
                    backgroundColor: colors.success + "10",
                    border: `1px solid ${colors.success}20`,
                  }}
                >
                  <CheckCircle2
                    className='w-6 h-6'
                    style={{ color: colors.success }}
                  />
                </div>
              </div>
              <p
                className='text-sm font-medium mb-1'
                style={{ color: colors.secondary }}
              >
                Approved
              </p>
              <p
                className='text-3xl font-bold'
                style={{ color: colors.neutralDark }}
              >
                {stats?.stats.approvedEnrollments.toLocaleString()}
              </p>
              <p className='text-xs mt-2' style={{ color: colors.neutral }}>
                Successfully enrolled
              </p>
            </div>

            {/* Total Students */}
            <div
              className='rounded-2xl p-6 hover:shadow-lg transition-all duration-200 bg-white'
              style={{
                boxShadow:
                  "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
              }}
            >
              <div className='flex items-center justify-between mb-4'>
                <div
                  className='p-3 rounded-xl shadow-sm'
                  style={{
                    backgroundColor: colors.primary + "10",
                    border: `1px solid ${colors.primary}20`,
                  }}
                >
                  <GraduationCap
                    className='w-6 h-6'
                    style={{ color: colors.primary }}
                  />
                </div>
              </div>
              <p
                className='text-sm font-medium mb-1'
                style={{ color: colors.secondary }}
              >
                Total Students
              </p>
              <p
                className='text-3xl font-bold'
                style={{ color: colors.neutralDark }}
              >
                {stats?.stats.totalStudents.toLocaleString()}
              </p>
              <p className='text-xs mt-2' style={{ color: colors.neutral }}>
                Registered in system
              </p>
            </div>
          </div>

          {/* Second Row - Programs & Departments */}
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            {/* Quick Stats */}
            <div
              className='rounded-2xl p-6 bg-white'
              style={{
                boxShadow:
                  "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
              }}
            >
              <div
                className='flex items-center gap-3 mb-6 pb-4 border-b'
                style={{ borderColor: "rgba(58, 35, 19, 0.2)" }}
              >
                <div
                  className='p-2 rounded-xl shadow-sm'
                  style={{
                    backgroundColor: colors.paper,
                    border: `1px solid ${colors.tertiary}30`,
                  }}
                >
                  <BarChart3
                    className='w-5 h-5'
                    style={{ color: colors.primary }}
                  />
                </div>
                <h2
                  className='text-lg font-bold'
                  style={{ color: colors.primary }}
                >
                  Quick Stats
                </h2>
              </div>
              <div className='space-y-3'>
                <div
                  className='flex items-center justify-between p-4 rounded-xl border'
                  style={{
                    backgroundColor: colors.paper,
                    borderColor: colors.tertiary + "30",
                  }}
                >
                  <div className='flex items-center gap-3'>
                    <BookOpen
                      className='w-5 h-5'
                      style={{ color: colors.primary }}
                    />
                    <span
                      className='font-medium'
                      style={{ color: colors.primary }}
                    >
                      Active Programs
                    </span>
                  </div>
                  <span
                    className='text-xl font-bold'
                    style={{ color: colors.primary }}
                  >
                    {stats?.stats.totalPrograms}
                  </span>
                </div>
                <div
                  className='flex items-center justify-between p-4 rounded-xl border'
                  style={{
                    backgroundColor: colors.paper,
                    borderColor: colors.tertiary + "30",
                  }}
                >
                  <div className='flex items-center gap-3'>
                    <Building2
                      className='w-5 h-5'
                      style={{ color: colors.primary }}
                    />
                    <span
                      className='font-medium'
                      style={{ color: colors.primary }}
                    >
                      Departments
                    </span>
                  </div>
                  <span
                    className='text-xl font-bold'
                    style={{ color: colors.primary }}
                  >
                    {stats?.stats.totalDepartments}
                  </span>
                </div>
                <div
                  className='flex items-center justify-between p-4 rounded-xl border'
                  style={{
                    backgroundColor: colors.paper,
                    borderColor: colors.tertiary + "30",
                  }}
                >
                  <div className='flex items-center gap-3'>
                    <Activity
                      className='w-5 h-5'
                      style={{ color: colors.primary }}
                    />
                    <span
                      className='font-medium'
                      style={{ color: colors.primary }}
                    >
                      This Week
                    </span>
                  </div>
                  <span
                    className='text-xl font-bold'
                    style={{ color: colors.primary }}
                  >
                    +{stats?.stats.recentEnrollments}
                  </span>
                </div>
              </div>
            </div>

            {/* Enrollment Status Distribution */}
            <div
              className='rounded-2xl p-6 bg-white'
              style={{
                boxShadow:
                  "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
              }}
            >
              <div
                className='flex items-center gap-3 mb-6 pb-4 border-b'
                style={{ borderColor: "rgba(58, 35, 19, 0.2)" }}
              >
                <div
                  className='p-2 rounded-xl shadow-sm'
                  style={{
                    backgroundColor: colors.paper,
                    border: `1px solid ${colors.tertiary}30`,
                  }}
                >
                  <PieChart
                    className='w-5 h-5'
                    style={{ color: colors.primary }}
                  />
                </div>
                <h2
                  className='text-lg font-bold'
                  style={{ color: colors.primary }}
                >
                  By Admission Type
                </h2>
              </div>
              <div className='space-y-3'>
                {stats?.enrollmentsByStatus.map((item, index) => {
                  const progressColors = [
                    colors.primary,
                    colors.secondary,
                    colors.tertiary,
                    colors.accent,
                  ];
                  const progressColor =
                    progressColors[index % progressColors.length];
                  const total = stats.stats.totalEnrollments || 1;
                  const percentage = Math.round((item.count / total) * 100);

                  return (
                    <div key={item.status} className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <span
                          className='text-sm font-medium capitalize'
                          style={{ color: colors.neutral }}
                        >
                          {item.status === "new"
                            ? "New Student"
                            : item.status === "transferee"
                              ? "Transferee"
                              : item.status}
                        </span>
                        <span
                          className='text-sm font-bold'
                          style={{ color: colors.primary }}
                        >
                          {item.count}
                        </span>
                      </div>
                      <div
                        className='h-2 rounded-full'
                        style={{ backgroundColor: colors.neutralLight }}
                      >
                        <div
                          className='h-2 rounded-full transition-all duration-500'
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: progressColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {(!stats?.enrollmentsByStatus ||
                  stats.enrollmentsByStatus.length === 0) && (
                  <p
                    className='text-sm text-center py-4'
                    style={{ color: colors.neutral }}
                  >
                    No enrollment data available
                  </p>
                )}
              </div>
            </div>

            {/* Top Departments */}
            <div
              className='rounded-2xl p-6 bg-white'
              style={{
                boxShadow:
                  "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
              }}
            >
              <div
                className='flex items-center gap-3 mb-6 pb-4 border-b'
                style={{ borderColor: "rgba(58, 35, 19, 0.2)" }}
              >
                <div
                  className='p-2 rounded-xl shadow-sm'
                  style={{
                    backgroundColor: colors.paper,
                    border: `1px solid ${colors.tertiary}30`,
                  }}
                >
                  <TrendingUp
                    className='w-5 h-5'
                    style={{ color: colors.primary }}
                  />
                </div>
                <h2
                  className='text-lg font-bold'
                  style={{ color: colors.primary }}
                >
                  Top Departments
                </h2>
              </div>
              <div className='space-y-2'>
                {stats?.topDepartments.map((dept, index) => {
                  return (
                    <div
                      key={dept.id}
                      className='flex items-center gap-4 p-3 rounded-xl transition-colors'
                      style={{ backgroundColor: colors.paper }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          colors.accent + "10";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = colors.paper;
                      }}
                    >
                      <div
                        className='w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm'
                        style={{
                          backgroundColor: colors.primary + "10",
                          color: colors.primary,
                          border: `1px solid ${colors.primary}20`,
                        }}
                      >
                        {index + 1}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p
                          className='text-sm font-semibold truncate'
                          style={{ color: colors.primary }}
                        >
                          {dept.code}
                        </p>
                        <p
                          className='text-xs truncate'
                          style={{ color: colors.neutral }}
                        >
                          {dept.name}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p
                          className='text-lg font-bold'
                          style={{ color: colors.primary }}
                        >
                          {dept.count}
                        </p>
                        <p
                          className='text-xs'
                          style={{ color: colors.neutral }}
                        >
                          enrollees
                        </p>
                      </div>
                    </div>
                  );
                })}
                {(!stats?.topDepartments ||
                  stats.topDepartments.length === 0) && (
                  <p
                    className='text-sm text-center py-4'
                    style={{ color: colors.neutral }}
                  >
                    No department data available
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
