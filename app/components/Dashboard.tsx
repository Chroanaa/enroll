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
  topDepartments: Array<{ id: number; name: string; code: string; count: number }>;
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
      summer: "Summer Term",
      First: "1st Semester",
      Second: "2nd Semester",
      Summer: "Summer Term",
    };
    return labels[semester] || semester;
  };

  const getSemesterColor = (semester: string) => {
    const semesterColors: Record<string, { bg: string; text: string; border: string }> = {
      first: { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
      second: { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
      summer: { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A" },
      First: { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
      Second: { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
      Summer: { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A" },
    };
    return semesterColors[semester] || { bg: "#F3F4F6", text: "#374151", border: "#D1D5DB" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
            <GraduationCap className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-blue-600" />
          </div>
          <p className="text-slate-600 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  const semesterColors = getSemesterColor(stats?.currentSemester || "first");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, ${colors.primary} 0%, transparent 50%), 
                             radial-gradient(circle at 80% 50%, ${colors.secondary} 0%, transparent 50%)`,
          }}
        />
        <div className="relative px-6 py-8 sm:px-8 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left Side - Welcome & Time */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: `${colors.primary}10` }}
                  >
                    <Sparkles className="w-6 h-6" style={{ color: colors.primary }} />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: colors.primary }}>
                    Dashboard
                  </h1>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-slate-600">
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(currentTime)}
                  </p>
                  <p className="flex items-center gap-2 font-mono text-lg font-semibold" style={{ color: colors.primary }}>
                    <Clock className="w-4 h-4" />
                    {formatTime(currentTime)}
                  </p>
                </div>
              </div>

              {/* Right Side - Current Semester Card */}
              <div 
                className="flex items-center gap-4 px-6 py-4 rounded-2xl border-2 shadow-lg backdrop-blur-sm"
                style={{ 
                  backgroundColor: semesterColors.bg,
                  borderColor: semesterColors.border,
                }}
              >
                <div 
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `${semesterColors.text}20` }}
                >
                  <GraduationCap className="w-8 h-8" style={{ color: semesterColors.text }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Current Academic Period</p>
                  <p className="text-xl font-bold" style={{ color: semesterColors.text }}>
                    {getSemesterLabel(stats?.currentSemester || "")}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: semesterColors.text }}>
                    A.Y. {stats?.currentAcademicYear}
                  </p>
                </div>
                <button
                  onClick={fetchStats}
                  disabled={refreshing}
                  className="ml-4 p-2 rounded-lg hover:bg-white/50 transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} style={{ color: semesterColors.text }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-12 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Enrollments */}
            <div className="group relative bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-xl hover:border-blue-200 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full transform translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  {stats?.stats.enrollmentTrend !== undefined && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                      stats.stats.enrollmentTrend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    }`}>
                      {stats.stats.enrollmentTrend >= 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {Math.abs(stats.stats.enrollmentTrend)}%
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Enrollments</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.stats.totalEnrollments.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-2">
                  +{stats?.stats.recentEnrollments} this week
                </p>
              </div>
            </div>

            {/* Pending Enrollments */}
            <div className="group relative bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-xl hover:border-amber-200 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full transform translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-amber-50 group-hover:bg-amber-100 transition-colors">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                  {stats?.stats.pendingEnrollments && stats.stats.pendingEnrollments > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">
                      <AlertCircle className="w-3 h-3" />
                      Needs Review
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-500 mb-1">Pending Approval</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.stats.pendingEnrollments.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-2">
                  Awaiting review
                </p>
              </div>
            </div>

            {/* Approved Enrollments */}
            <div className="group relative bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-xl hover:border-emerald-200 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full transform translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-500 mb-1">Approved</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.stats.approvedEnrollments.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-2">
                  Successfully enrolled
                </p>
              </div>
            </div>

            {/* Total Students */}
            <div className="group relative bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-xl hover:border-purple-200 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full transform translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-purple-50 group-hover:bg-purple-100 transition-colors">
                    <GraduationCap className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Students</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.stats.totalStudents.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-2">
                  Registered in system
                </p>
              </div>
            </div>
          </div>

          {/* Second Row - Programs & Departments */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-slate-100">
                  <BarChart3 className="w-5 h-5 text-slate-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Quick Stats</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-slate-700">Active Programs</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">{stats?.stats.totalPrograms}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-slate-700">Departments</span>
                  </div>
                  <span className="text-xl font-bold text-emerald-600">{stats?.stats.totalDepartments}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-amber-600" />
                    <span className="font-medium text-slate-700">This Week</span>
                  </div>
                  <span className="text-xl font-bold text-amber-600">+{stats?.stats.recentEnrollments}</span>
                </div>
              </div>
            </div>

            {/* Enrollment Status Distribution */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-slate-100">
                  <PieChart className="w-5 h-5 text-slate-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">By Admission Type</h2>
              </div>
              <div className="space-y-3">
                {stats?.enrollmentsByStatus.map((item, index) => {
                  const statusColors = [
                    { bg: "bg-blue-500", light: "bg-blue-50" },
                    { bg: "bg-emerald-500", light: "bg-emerald-50" },
                    { bg: "bg-purple-500", light: "bg-purple-50" },
                    { bg: "bg-amber-500", light: "bg-amber-50" },
                  ];
                  const color = statusColors[index % statusColors.length];
                  const total = stats.stats.totalEnrollments || 1;
                  const percentage = Math.round((item.count / total) * 100);
                  
                  return (
                    <div key={item.status} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600 capitalize">
                          {item.status === "new" ? "New Student" : item.status === "transferee" ? "Transferee" : item.status}
                        </span>
                        <span className="text-sm font-bold text-slate-900">{item.count}</span>
                      </div>
                      <div className={`h-2 rounded-full ${color.light}`}>
                        <div 
                          className={`h-2 rounded-full ${color.bg} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {(!stats?.enrollmentsByStatus || stats.enrollmentsByStatus.length === 0) && (
                  <p className="text-sm text-slate-400 text-center py-4">No enrollment data available</p>
                )}
              </div>
            </div>

            {/* Top Departments */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-slate-100">
                  <TrendingUp className="w-5 h-5 text-slate-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Top Departments</h2>
              </div>
              <div className="space-y-3">
                {stats?.topDepartments.map((dept, index) => (
                  <div 
                    key={dept.id}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm
                      ${index === 0 ? "bg-amber-100 text-amber-600" : 
                        index === 1 ? "bg-slate-200 text-slate-600" :
                        index === 2 ? "bg-orange-100 text-orange-600" :
                        "bg-slate-100 text-slate-500"}
                    `}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{dept.code}</p>
                      <p className="text-xs text-slate-500 truncate">{dept.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{dept.count}</p>
                      <p className="text-xs text-slate-400">enrollees</p>
                    </div>
                  </div>
                ))}
                {(!stats?.topDepartments || stats.topDepartments.length === 0) && (
                  <p className="text-sm text-slate-400 text-center py-4">No department data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300">
              <div className="p-3 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-900">New Enrollment</p>
                <p className="text-xs text-slate-500">Add a new student</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 ml-auto group-hover:text-blue-600 transition-colors" />
            </button>
            
            <button className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-300">
              <div className="p-3 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-900">Review Pending</p>
                <p className="text-xs text-slate-500">{stats?.stats.pendingEnrollments} awaiting</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 ml-auto group-hover:text-emerald-600 transition-colors" />
            </button>
            
            <button className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300">
              <div className="p-3 rounded-xl bg-purple-50 group-hover:bg-purple-100 transition-colors">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-900">View Reports</p>
                <p className="text-xs text-slate-500">Analytics & insights</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 ml-auto group-hover:text-purple-600 transition-colors" />
            </button>
            
            <button className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300">
              <div className="p-3 rounded-xl bg-slate-100 group-hover:bg-slate-200 transition-colors">
                <Settings className="w-5 h-5 text-slate-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-900">Settings</p>
                <p className="text-xs text-slate-500">Configure system</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 ml-auto group-hover:text-slate-600 transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
