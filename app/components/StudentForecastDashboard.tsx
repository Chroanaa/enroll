"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Users,
  Building2,
  PlusCircle,
  CheckCircle2,
  Layers,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { colors } from "../colors";

/* ───────────────────── Types ───────────────────── */

interface ProgramData {
  program: string;
  total_students: number;
  academic_year?: string;
  year?: number;
}

interface ForecastItem {
  course: string;
  predicted_year: number;
  predicted_count: number;
}

interface CapacityItem {
  program: string;
  predicted_year?: number | null;
  predicted_students: number;
  current_sections: number;
  current_capacity: number;
  avg_section_capacity: number;
  recommended_sections: number;
  additional_sections_needed: number;
  add_section: boolean;
  new_total_capacity: number;
  utilization_rate: number;
  status: string;
}

interface RoomSummary {
  total_rooms: number;
  available_rooms: number;
  total_available_capacity: number;
}

interface RoomRecommendation {
  rooms_are_sufficient: boolean;
  recommendation: "ROOMS_SUFFICIENT" | "ADD_ROOMS";
  total_recommended_capacity: number;
  total_available_capacity: number;
  capacity_gap: number;
  additional_sections_needed: number;
  additional_rooms_needed: number;
  average_available_room_capacity: number;
  message: string;
  notes: string;
}

interface ForecastResult {
  success: boolean;
  programs: string[];
  historical: Record<string, { year: number; total_students: number }[]>;
  forecast: ForecastItem[];
  capacity: CapacityItem[];
  totalPrograms: number;
  room_summary?: RoomSummary;
  room_recommendation?: RoomRecommendation;
}

interface StudentData {
  programData: ProgramData[];
  summary: { totalStudents: number; totalPrograms: number };
  studentsByTerm: { term: string; total_students: number }[];
  studentsByDepartment: { department_name: string; total_students: number }[];
}

/* ───────────────────── Constants ───────────────────── */

const CHART_COLORS = [
  "#955A27",
  "#B3744A",
  "#D4A574",
  "#3A2313",
  "#10B981",
  "#0EA5E9",
  "#F59E0B",
  "#EF4444",
];

/* ───────────────────── Component ───────────────────── */

const StudentForecastDashboard: React.FC = () => {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/student/forecast");
      if (!response.ok) throw new Error("Failed to fetch student data");
      const data = await response.json();
      setStudentData(data);

      if (data.programData && data.programData.length > 0) {
        await fetchForecastPredictions(data.programData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchForecastPredictions = async (programData: ProgramData[]) => {
    setForecastLoading(true);
    try {
      const forecastData = programData.map((item) => ({
        program: item.program,
        total_students: item.total_students,
        year: item.academic_year
          ? parseInt(item.academic_year.split("-")[0])
          : item.year || new Date().getFullYear(),
      }));

      const response = await fetch("/api/auth/student/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: forecastData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch forecast");
      }

      const result: ForecastResult = await response.json();
      setForecastResult(result);
    } catch (err: any) {
      console.error("Forecast API error:", err.message);
      setForecastResult(null);
    } finally {
      setForecastLoading(false);
    }
  };

  /* ── Derived data ── */

  const uniquePrograms = useMemo(() => {
    if (!studentData?.programData) return [];
    return [...new Set(studentData.programData.map((p) => p.program))];
  }, [studentData]);

  // Build forecast line chart data (historical + predicted per program)
  const forecastLineChartData = useMemo(() => {
    if (!studentData?.programData) return [];

    const grouped: Record<string, Record<string, number>> = {};
    const historicalYears = new Set<string>();

    studentData.programData.forEach((item) => {
      if (!grouped[item.program]) grouped[item.program] = {};
      const year = item.academic_year || String(item.year);
      grouped[item.program][year] = item.total_students;
      historicalYears.add(year);
    });

    const sortedYears = Array.from(historicalYears).sort();
    const lastYear = sortedYears[sortedYears.length - 1];

    // Determine next year from forecast or capacity
    let nextYear = "";
    if (forecastResult?.forecast?.length && lastYear) {
      const predictedYr = forecastResult.forecast[0].predicted_year;
      nextYear = String(predictedYr);
    } else if (forecastResult?.capacity?.length && lastYear) {
      const predictedYr = forecastResult.capacity[0].predicted_year;
      if (predictedYr) nextYear = String(predictedYr);
    }

    const predMap: Record<string, number> = {};
    forecastResult?.forecast?.forEach((f) => {
      predMap[f.course] = f.predicted_count;
    });
    // Fall back to capacity if forecast is empty
    if (Object.keys(predMap).length === 0 && forecastResult?.capacity?.length) {
      forecastResult.capacity.forEach((c) => {
        predMap[c.program] = c.predicted_students;
      });
    }

    const allYears = [...sortedYears, ...(nextYear ? [nextYear] : [])];

    return allYears.map((year) => {
      const entry: Record<string, any> = { year };
      Object.keys(grouped).forEach((program) => {
        if (year === nextYear) {
          entry[program] = null;
          entry[`${program}_forecast`] = predMap[program] ?? null;
        } else if (year === lastYear && nextYear) {
          entry[program] = grouped[program][year] ?? null;
          entry[`${program}_forecast`] = grouped[program][year] ?? null;
        } else {
          entry[program] = grouped[program][year] ?? null;
          entry[`${program}_forecast`] = null;
        }
      });
      return entry;
    });
  }, [studentData, forecastResult]);

  const predictedYear = useMemo(() => {
    if (forecastResult?.forecast?.length) {
      return String(forecastResult.forecast[0].predicted_year);
    }
    // Fall back to capacity predicted_year
    if (forecastResult?.capacity?.length) {
      const yr = forecastResult.capacity[0].predicted_year;
      if (yr) return String(yr);
    }
    return "";
  }, [forecastResult]);

  // Total predicted students
  const totalPredicted = useMemo(() => {
    if (forecastResult?.forecast?.length) {
      return forecastResult.forecast.reduce((s, f) => s + f.predicted_count, 0);
    }
    // Fall back to capacity predicted_students
    if (forecastResult?.capacity?.length) {
      return forecastResult.capacity.reduce(
        (s, c) => s + c.predicted_students,
        0,
      );
    }
    return 0;
  }, [forecastResult]);

  // Total current students (latest year)
  const totalCurrent = useMemo(() => {
    if (!forecastResult?.historical) return 0;
    return Object.values(forecastResult.historical).reduce((sum, arr) => {
      const latest = arr[arr.length - 1];
      return sum + (latest?.total_students ?? 0);
    }, 0);
  }, [forecastResult]);

  const totalSectionsNeeded = useMemo(() => {
    return (
      forecastResult?.capacity?.reduce(
        (s, c) => s + c.additional_sections_needed,
        0,
      ) ?? 0
    );
  }, [forecastResult]);

  const roomRecommendation = forecastResult?.room_recommendation;

  /* ── Render ── */

  return (
    <div
      className='p-4 sm:p-6 min-h-screen'
      style={{ backgroundColor: colors.paper }}
    >
      <div className='max-w-7xl mx-auto'>
        {/* ─── Header ─── */}
        <div className='mb-8'>
          <div className='flex items-center justify-between flex-wrap gap-4'>
            <div>
              <h1
                className='text-3xl font-bold mb-1'
                style={{ color: colors.primary }}
              >
                Enrollment Forecast
              </h1>
              <p className='text-sm' style={{ color: colors.neutral }}>
                Historical enrollment trends, predicted student counts &amp;
                section capacity recommendations
              </p>
            </div>
            <button
              onClick={fetchStudentData}
              disabled={loading || forecastLoading}
              className='flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90 disabled:opacity-60'
              style={{ backgroundColor: colors.secondary }}
            >
              <RefreshCw
                className={`w-4 h-4 ${loading || forecastLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div
            className='mb-6 p-4 rounded-lg border flex items-center gap-3'
            style={{
              backgroundColor: "#FEF2F2",
              borderColor: "#FECACA",
              color: "#DC2626",
            }}
          >
            <AlertTriangle className='w-5 h-5 flex-shrink-0' />
            <span>{error}</span>
          </div>
        )}

        {loading && !studentData ? (
          <div className='flex flex-col items-center justify-center py-32'>
            <RefreshCw
              className='w-10 h-10 animate-spin mb-4'
              style={{ color: colors.secondary }}
            />
            <p
              className='text-lg font-medium mb-1'
              style={{ color: colors.primary }}
            >
              Loading Forecast Data
            </p>
            <p className='text-sm' style={{ color: colors.neutral }}>
              Fetching enrollment data and generating predictions…
            </p>
          </div>
        ) : (
          <>
            {/* ─── Summary Cards ─── */}
            {forecastResult && (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
                {/* Total Programs */}
                <SummaryCard
                  icon={<Layers className='w-5 h-5' />}
                  label='Total Programs'
                  value={forecastResult.totalPrograms}
                  color={colors.info}
                />
                {/* Current Students */}
                <SummaryCard
                  icon={<Users className='w-5 h-5' />}
                  label='Current Students'
                  value={totalCurrent}
                  color={colors.secondary}
                />
                {/* Predicted Students */}
                <SummaryCard
                  icon={<Target className='w-5 h-5' />}
                  label={`Predicted ${predictedYear}`}
                  value={totalPredicted}
                  color={colors.success}
                  badge={
                    totalCurrent > 0
                      ? `${totalPredicted >= totalCurrent ? "+" : ""}${(((totalPredicted - totalCurrent) / totalCurrent) * 100).toFixed(1)}%`
                      : undefined
                  }
                  badgePositive={totalPredicted >= totalCurrent}
                />
                {/* Rooms */}
                <SummaryCard
                  icon={<Building2 className='w-5 h-5' />}
                  label='Available Rooms'
                  value={`${forecastResult.room_summary?.available_rooms ?? "—"} / ${forecastResult.room_summary?.total_rooms ?? "—"}`}
                  color={colors.warning}
                  sub={`${forecastResult.room_summary?.total_available_capacity ?? 0} seat capacity`}
                />
              </div>
            )}

            {forecastResult?.room_recommendation && (
              <div
                className='mb-8 rounded-xl border p-4 sm:p-5'
                style={{
                  borderColor: forecastResult.room_recommendation
                    .rooms_are_sufficient
                    ? "#86EFAC"
                    : "#FCA5A5",
                  backgroundColor: forecastResult.room_recommendation
                    .rooms_are_sufficient
                    ? "#ECFDF5"
                    : "#FEF2F2",
                }}
              >
                <div className='flex items-start justify-between gap-3 flex-wrap'>
                  <div>
                    <p
                      className='text-sm font-bold'
                      style={{
                        color: forecastResult.room_recommendation
                          .rooms_are_sufficient
                          ? "#065F46"
                          : "#991B1B",
                      }}
                    >
                      Room Recommendation:{" "}
                      {forecastResult.room_recommendation.rooms_are_sufficient
                        ? "Rooms are sufficient"
                        : "Add rooms recommended"}
                    </p>
                    <p
                      className='text-xs mt-1'
                      style={{
                        color: forecastResult.room_recommendation
                          .rooms_are_sufficient
                          ? "#047857"
                          : "#B91C1C",
                      }}
                    >
                      {forecastResult.room_recommendation.message}
                    </p>
                  </div>
                  <div
                    className='text-xs font-semibold px-2.5 py-1 rounded-full'
                    style={{
                      backgroundColor: forecastResult.room_recommendation
                        .rooms_are_sufficient
                        ? "#D1FAE5"
                        : "#FECACA",
                      color: forecastResult.room_recommendation
                        .rooms_are_sufficient
                        ? "#065F46"
                        : "#991B1B",
                    }}
                  >
                    {forecastResult.room_recommendation
                      .additional_rooms_needed > 0
                      ? `${forecastResult.room_recommendation.additional_rooms_needed} room(s) needed`
                      : "0 additional rooms needed"}
                  </div>
                </div>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs'>
                  <div>
                    <p className='text-gray-500'>Projected seat demand</p>
                    <p className='font-semibold text-gray-900'>
                      {forecastResult.room_recommendation.total_recommended_capacity.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className='text-gray-500'>Available seat capacity</p>
                    <p className='font-semibold text-gray-900'>
                      {forecastResult.room_recommendation.total_available_capacity.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className='text-gray-500'>Capacity gap</p>
                    <p className='font-semibold text-gray-900'>
                      {forecastResult.room_recommendation.capacity_gap.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className='text-gray-500'>Additional sections</p>
                    <p className='font-semibold text-gray-900'>
                      {forecastResult.room_recommendation.additional_sections_needed.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Per-Program Mini Charts ─── */}
            <div className='mb-8'>
              <div className='flex items-center justify-between mb-4 flex-wrap gap-2'>
                <div className='flex items-center gap-3'>
                  <BarChart3
                    className='w-5 h-5'
                    style={{ color: colors.secondary }}
                  />
                  <div>
                    <h2
                      className='text-xl font-bold'
                      style={{ color: colors.primary }}
                    >
                      Students Per Program
                    </h2>
                    <p
                      className='text-xs mt-0.5'
                      style={{ color: colors.neutral }}
                    >
                      Solid line = historical · Dashed line = predicted
                      {predictedYear && (
                        <strong style={{ color: colors.secondary }}>
                          {" "}
                          ({predictedYear})
                        </strong>
                      )}
                    </p>
                  </div>
                </div>
                {forecastLoading ? (
                  <span
                    className='flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium'
                    style={{
                      backgroundColor: colors.secondary + "18",
                      color: colors.secondary,
                    }}
                  >
                    <RefreshCw className='w-3 h-3 animate-spin' />
                    Calculating forecast…
                  </span>
                ) : forecastResult ? (
                  <span
                    className='flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium'
                    style={{ backgroundColor: "#D1FAE5", color: "#065F46" }}
                  >
                    <Target className='w-3 h-3' />
                    Forecast ready
                  </span>
                ) : null}
              </div>

              {uniquePrograms.length > 0 ? (
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {uniquePrograms.map((program, index) => {
                    const color = CHART_COLORS[index % CHART_COLORS.length];
                    const fcItem = forecastResult?.forecast?.find(
                      (f) => f.course === program,
                    );
                    const capItem = forecastResult?.capacity?.find(
                      (c) => c.program === program,
                    );
                    // Use forecast item or derive from capacity
                    const predictedCount =
                      fcItem?.predicted_count ??
                      capItem?.predicted_students ??
                      null;

                    const programChartData = forecastLineChartData.map(
                      (entry) => ({
                        year: entry.year,
                        students: entry[program] as number | null,
                        forecast: entry[`${program}_forecast`] as number | null,
                      }),
                    );

                    const historicalPoints = programChartData.filter(
                      (d) => d.students !== null && d.year !== predictedYear,
                    );
                    const lastPoint =
                      historicalPoints[historicalPoints.length - 1];
                    const growthRate =
                      lastPoint && predictedCount !== null
                        ? ((predictedCount - (lastPoint.students ?? 0)) /
                            (lastPoint.students || 1)) *
                          100
                        : 0;

                    return (
                      <div
                        key={program}
                        className='bg-white rounded-xl shadow-sm border p-5 transition-shadow hover:shadow-md'
                        style={{ borderColor: colors.neutralBorder }}
                      >
                        {/* Card header */}
                        <div className='flex items-start justify-between mb-4'>
                          <div className='flex items-center gap-2 flex-1 min-w-0'>
                            <span
                              className='w-3 h-3 rounded-full flex-shrink-0 mt-0.5'
                              style={{ backgroundColor: color }}
                            />
                            <span
                              className='font-semibold text-sm leading-tight'
                              style={{ color: colors.primary }}
                            >
                              {program}
                            </span>
                          </div>
                          {predictedCount !== null && (
                            <span
                              className={`flex-shrink-0 ml-2 text-xs font-semibold px-1.5 py-0.5 rounded ${
                                growthRate > 0
                                  ? "bg-emerald-100 text-emerald-700"
                                  : growthRate < 0
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {growthRate > 0
                                ? "↑"
                                : growthRate < 0
                                  ? "↓"
                                  : "→"}{" "}
                              {growthRate >= 0 ? "+" : ""}
                              {growthRate.toFixed(1)}%
                            </span>
                          )}
                        </div>

                        {/* Key numbers */}
                        <div className='flex items-end justify-between mb-4'>
                          <div>
                            <p
                              className='text-xs mb-0.5'
                              style={{ color: colors.neutral }}
                            >
                              {lastPoint?.year ?? "Last known"}
                            </p>
                            <p
                              className='text-2xl font-bold tabular-nums'
                              style={{ color: colors.primary }}
                            >
                              {lastPoint?.students != null
                                ? lastPoint.students.toLocaleString()
                                : "—"}
                            </p>
                          </div>
                          {predictedCount !== null && (
                            <div className='text-right'>
                              <p
                                className='text-xs mb-0.5'
                                style={{ color: colors.secondary }}
                              >
                                {predictedYear} (predicted)
                              </p>
                              <p
                                className='text-2xl font-bold tabular-nums'
                                style={{ color: color }}
                              >
                                {predictedCount.toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Mini line chart */}
                        <ResponsiveContainer width='100%' height={120}>
                          <LineChart
                            data={programChartData}
                            margin={{ top: 8, right: 8, left: -28, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray='3 3'
                              stroke='#F3F4F6'
                              vertical={false}
                            />
                            <XAxis
                              dataKey='year'
                              tick={{ fontSize: 10, fill: "#999" }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: "#999" }}
                              tickLine={false}
                              axisLine={false}
                              allowDecimals={false}
                              width={40}
                            />
                            <Tooltip
                              contentStyle={{
                                background: "white",
                                border: "1px solid #eee",
                                borderRadius: 6,
                                fontSize: 12,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                              }}
                              formatter={(value: any, key: string) => [
                                value != null
                                  ? Number(value).toLocaleString()
                                  : "—",
                                key === "forecast"
                                  ? `${program} (predicted)`
                                  : program,
                              ]}
                              labelFormatter={(l) => `Year: ${l}`}
                            />
                            <Line
                              type='monotone'
                              dataKey='students'
                              stroke={color}
                              strokeWidth={2.5}
                              dot={{ r: 3.5, fill: color, strokeWidth: 0 }}
                              activeDot={{
                                r: 5,
                                stroke: "#fff",
                                strokeWidth: 2,
                                fill: color,
                              }}
                              connectNulls={false}
                              name={program}
                            />
                            <Line
                              type='monotone'
                              dataKey='forecast'
                              stroke={color}
                              strokeWidth={2.5}
                              strokeDasharray='6 4'
                              dot={(dotProps: any) => {
                                const { cx, cy, payload, key } = dotProps;
                                if (
                                  payload.year === predictedYear &&
                                  payload.forecast != null
                                ) {
                                  return (
                                    <circle
                                      key={key}
                                      cx={cx}
                                      cy={cy}
                                      r={5}
                                      fill='white'
                                      stroke={color}
                                      strokeWidth={2.5}
                                    />
                                  );
                                }
                                return <g key={key} />;
                              }}
                              connectNulls={false}
                              legendType='none'
                              name='forecast'
                            />
                          </LineChart>
                        </ResponsiveContainer>

                        {/* Section recommendation pill */}
                        {capItem && (
                          <div
                            className='mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg'
                            style={{
                              backgroundColor: capItem.add_section
                                ? "#FEF3C7"
                                : "#ECFDF5",
                              color: capItem.add_section
                                ? "#92400E"
                                : "#065F46",
                            }}
                          >
                            {capItem.add_section ? (
                              <PlusCircle className='w-3.5 h-3.5 flex-shrink-0' />
                            ) : (
                              <CheckCircle2 className='w-3.5 h-3.5 flex-shrink-0' />
                            )}
                            <span className='font-medium'>
                              {capItem.add_section
                                ? `+${capItem.additional_sections_needed} section${capItem.additional_sections_needed > 1 ? "s" : ""} needed`
                                : "Sections sufficient"}
                            </span>
                            <span className='ml-auto opacity-70'>
                              {capItem.utilization_rate}% util.
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  className='bg-white rounded-xl shadow-sm border p-16 text-center'
                  style={{
                    borderColor: colors.neutralBorder,
                    color: colors.neutral,
                  }}
                >
                  No enrollment data available.
                </div>
              )}
            </div>

            {/* ─── Capacity & Section Recommendations ─── */}
            {forecastResult?.capacity && forecastResult.capacity.length > 0 && (
              <div className='mb-8'>
                <div className='flex items-center gap-3 mb-4'>
                  <Building2
                    className='w-5 h-5'
                    style={{ color: colors.secondary }}
                  />
                  <div>
                    <h2
                      className='text-xl font-bold'
                      style={{ color: colors.primary }}
                    >
                      Section &amp; Capacity Recommendations
                    </h2>
                    <p
                      className='text-xs mt-0.5'
                      style={{ color: colors.neutral }}
                    >
                      Based on predicted enrollment for {predictedYear}
                      {totalSectionsNeeded > 0 && (
                        <span
                          className='ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold'
                          style={{
                            backgroundColor: "#FEF3C7",
                            color: "#92400E",
                          }}
                        >
                          <PlusCircle className='w-3 h-3' />
                          {totalSectionsNeeded} new section
                          {totalSectionsNeeded > 1 ? "s" : ""} needed overall
                        </span>
                      )}
                      {roomRecommendation && (
                        <span
                          className='ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold'
                          style={{
                            backgroundColor:
                              roomRecommendation.rooms_are_sufficient
                                ? "#D1FAE5"
                                : "#FEE2E2",
                            color: roomRecommendation.rooms_are_sufficient
                              ? "#065F46"
                              : "#991B1B",
                          }}
                        >
                          <Building2 className='w-3 h-3' />
                          {roomRecommendation.rooms_are_sufficient
                            ? "Rooms sufficient"
                            : `Add ${roomRecommendation.additional_rooms_needed} room${roomRecommendation.additional_rooms_needed > 1 ? "s" : ""}`}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Capacity Table */}
                <div
                  className='bg-white rounded-xl shadow-sm border overflow-hidden'
                  style={{ borderColor: colors.neutralBorder }}
                >
                  <div className='overflow-x-auto'>
                    <table className='w-full border-collapse text-sm'>
                      <thead>
                        <tr style={{ backgroundColor: colors.neutralLight }}>
                          <th
                            className='text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider'
                            style={{ color: colors.primary }}
                          >
                            Program
                          </th>
                          <th
                            className='text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider'
                            style={{ color: colors.neutral }}
                          >
                            Predicted Students
                          </th>
                          <th
                            className='text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider'
                            style={{ color: colors.neutral }}
                          >
                            Current Sections
                          </th>
                          <th
                            className='text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider'
                            style={{ color: colors.neutral }}
                          >
                            Current Capacity
                          </th>
                          <th
                            className='text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider'
                            style={{ color: colors.neutral }}
                          >
                            Recommended Sections
                          </th>
                          <th
                            className='text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider'
                            style={{ color: colors.neutral }}
                          >
                            Utilization
                          </th>
                          <th
                            className='text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider'
                            style={{ color: colors.neutral }}
                          >
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecastResult.capacity.map((cap, idx) => (
                          <tr
                            key={cap.program}
                            style={{
                              borderBottom: `1px solid ${colors.neutralBorder}`,
                              backgroundColor:
                                idx % 2 === 0 ? "white" : colors.neutralLight,
                            }}
                          >
                            <td className='py-3 px-4'>
                              <div className='flex items-center gap-2'>
                                <span
                                  className='w-2.5 h-2.5 rounded-full flex-shrink-0'
                                  style={{
                                    backgroundColor:
                                      CHART_COLORS[
                                        uniquePrograms.indexOf(cap.program) %
                                          CHART_COLORS.length
                                      ] || colors.secondary,
                                  }}
                                />
                                <span
                                  className='font-medium'
                                  style={{ color: colors.primary }}
                                >
                                  {cap.program}
                                </span>
                              </div>
                            </td>
                            <td
                              className='py-3 px-4 text-center font-semibold tabular-nums'
                              style={{ color: colors.primary }}
                            >
                              {cap.predicted_students.toLocaleString()}
                            </td>
                            <td
                              className='py-3 px-4 text-center tabular-nums'
                              style={{ color: colors.neutral }}
                            >
                              {cap.current_sections}
                            </td>
                            <td
                              className='py-3 px-4 text-center tabular-nums'
                              style={{ color: colors.neutral }}
                            >
                              {cap.current_capacity}
                            </td>
                            <td className='py-3 px-4 text-center'>
                              <span
                                className='inline-flex items-center gap-1 font-bold tabular-nums px-2 py-0.5 rounded-md'
                                style={{
                                  backgroundColor: cap.add_section
                                    ? "#FEF3C7"
                                    : "#ECFDF5",
                                  color: cap.add_section
                                    ? "#92400E"
                                    : "#065F46",
                                }}
                              >
                                {cap.recommended_sections}
                                {cap.add_section && (
                                  <span className='text-xs font-normal'>
                                    (+{cap.additional_sections_needed})
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className='py-3 px-4 text-center'>
                              <UtilizationBadge rate={cap.utilization_rate} />
                            </td>
                            <td className='py-3 px-4 text-center'>
                              <div className='flex flex-col items-center gap-1'>
                                {cap.add_section ? (
                                  <span className='inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800'>
                                    <PlusCircle className='w-3 h-3' />
                                    Add {cap.additional_sections_needed} Section
                                    {cap.additional_sections_needed > 1
                                      ? "s"
                                      : ""}
                                  </span>
                                ) : (
                                  <span className='inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700'>
                                    <CheckCircle2 className='w-3 h-3' />
                                    Sufficient
                                  </span>
                                )}
                                {roomRecommendation && (
                                  <span
                                    className='text-[11px] font-medium'
                                    style={{
                                      color:
                                        roomRecommendation.rooms_are_sufficient
                                          ? "#065F46"
                                          : "#991B1B",
                                    }}
                                  >
                                    {roomRecommendation.rooms_are_sufficient
                                      ? "Rooms: Sufficient"
                                      : `Rooms: Add ${roomRecommendation.additional_rooms_needed}`}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Utilization Bar Chart ─── */}
            {forecastResult?.capacity && forecastResult.capacity.length > 0 && (
              <div className='mb-8'>
                <div
                  className='bg-white rounded-xl shadow-sm border p-6'
                  style={{ borderColor: colors.neutralBorder }}
                >
                  <h3
                    className='text-lg font-bold mb-1'
                    style={{ color: colors.primary }}
                  >
                    Projected Utilization Rate
                  </h3>
                  <p className='text-xs mb-4' style={{ color: colors.neutral }}>
                    How full each program's sections will be in {predictedYear}{" "}
                    after applying recommendations
                  </p>
                  <ResponsiveContainer width='100%' height={240}>
                    <BarChart
                      data={forecastResult.capacity.map((c) => ({
                        name: shortenProgram(c.program),
                        fullName: c.program,
                        utilization: c.utilization_rate,
                        addSection: c.add_section,
                      }))}
                      margin={{ top: 8, right: 16, left: -8, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray='3 3'
                        stroke='#F3F4F6'
                        vertical={false}
                      />
                      <XAxis
                        dataKey='name'
                        tick={{ fontSize: 11, fill: colors.neutral }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: colors.neutral }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "white",
                          border: "1px solid #eee",
                          borderRadius: 6,
                          fontSize: 12,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        }}
                        formatter={(value: any) => [`${value}%`, "Utilization"]}
                        labelFormatter={(_label: any, payload: any[]) =>
                          payload?.[0]?.payload?.fullName ?? _label
                        }
                      />
                      <Bar dataKey='utilization' radius={[6, 6, 0, 0]}>
                        {forecastResult.capacity.map((cap, i) => (
                          <Cell
                            key={cap.program}
                            fill={
                              cap.utilization_rate >= 90
                                ? colors.danger
                                : cap.utilization_rate >= 75
                                  ? colors.warning
                                  : colors.success
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div
                    className='flex items-center gap-6 mt-2 text-xs'
                    style={{ color: colors.neutral }}
                  >
                    <span className='flex items-center gap-1.5'>
                      <span
                        className='w-2.5 h-2.5 rounded-sm'
                        style={{ backgroundColor: colors.success }}
                      />{" "}
                      &lt; 75% (Comfortable)
                    </span>
                    <span className='flex items-center gap-1.5'>
                      <span
                        className='w-2.5 h-2.5 rounded-sm'
                        style={{ backgroundColor: colors.warning }}
                      />{" "}
                      75–89% (Moderate)
                    </span>
                    <span className='flex items-center gap-1.5'>
                      <span
                        className='w-2.5 h-2.5 rounded-sm'
                        style={{ backgroundColor: colors.danger }}
                      />{" "}
                      &ge; 90% (Near Full)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Enrollment Forecast Table ─── */}
            <div
              className='bg-white rounded-xl shadow-sm border p-6'
              style={{ borderColor: colors.neutralBorder }}
            >
              <div className='flex items-center gap-3 mb-1'>
                <Target
                  className='w-5 h-5'
                  style={{ color: colors.secondary }}
                />
                <h2
                  className='text-xl font-bold'
                  style={{ color: colors.primary }}
                >
                  Enrollment Forecast by Program
                </h2>
                {forecastLoading && (
                  <RefreshCw
                    className='w-4 h-4 animate-spin'
                    style={{ color: colors.neutral }}
                  />
                )}
              </div>
              <p
                className='text-xs mb-6 ml-8'
                style={{ color: colors.neutral }}
              >
                Historical student counts per program across all years, with the
                predicted count for {predictedYear || "the next academic year"}.
              </p>

              <div className='overflow-x-auto'>
                <table className='w-full border-collapse text-sm'>
                  <thead>
                    <tr
                      style={{
                        borderBottom: `2px solid ${colors.neutralBorder}`,
                      }}
                    >
                      <th
                        className='text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider sticky left-0 z-10'
                        style={{
                          color: colors.primary,
                          backgroundColor: colors.neutralLight,
                          minWidth: 200,
                        }}
                      >
                        Program
                      </th>
                      {forecastResult?.historical &&
                        Object.values(forecastResult.historical)[0]?.map(
                          (h) => (
                            <th
                              key={h.year}
                              className='text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider'
                              style={{
                                color: colors.neutral,
                                backgroundColor: colors.neutralLight,
                                minWidth: 90,
                              }}
                            >
                              {h.year}
                            </th>
                          ),
                        )}
                      <th
                        className='text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider'
                        style={{
                          color: colors.secondary,
                          backgroundColor: colors.secondary + "12",
                          minWidth: 150,
                          borderLeft: `2px dashed ${colors.secondary}50`,
                        }}
                      >
                        {predictedYear
                          ? `${predictedYear} (Predicted)`
                          : "Predicted"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastResult?.programs?.map((program, index) => {
                      const historicalArr =
                        forecastResult.historical?.[program] ?? [];
                      const fcItem = forecastResult.forecast?.find(
                        (f) => f.course === program,
                      );
                      const capItem = forecastResult.capacity?.find(
                        (c) => c.program === program,
                      );
                      const predictedCount =
                        fcItem?.predicted_count ??
                        capItem?.predicted_students ??
                        null;
                      const lastCount =
                        historicalArr[historicalArr.length - 1]
                          ?.total_students ?? 0;
                      const growthRate =
                        lastCount > 0 && predictedCount !== null
                          ? ((predictedCount - lastCount) / lastCount) * 100
                          : 0;
                      const color = CHART_COLORS[index % CHART_COLORS.length];

                      return (
                        <tr
                          key={program}
                          style={{
                            borderBottom: `1px solid ${colors.neutralBorder}`,
                            backgroundColor:
                              index % 2 === 0 ? "white" : colors.neutralLight,
                          }}
                        >
                          <td
                            className='py-3 px-4 sticky left-0 z-10'
                            style={{
                              backgroundColor:
                                index % 2 === 0 ? "white" : colors.neutralLight,
                            }}
                          >
                            <div className='flex items-center gap-2'>
                              <span
                                className='w-2.5 h-2.5 rounded-full flex-shrink-0'
                                style={{ backgroundColor: color }}
                              />
                              <span
                                className='font-medium'
                                style={{ color: colors.primary }}
                              >
                                {program}
                              </span>
                            </div>
                          </td>
                          {historicalArr.map((h) => (
                            <td
                              key={h.year}
                              className='py-3 px-4 text-right tabular-nums'
                              style={{ color: colors.primary }}
                            >
                              {h.total_students.toLocaleString()}
                            </td>
                          ))}
                          <td
                            className='py-3 px-4 text-right'
                            style={{
                              backgroundColor: colors.secondary + "07",
                              borderLeft: `2px dashed ${colors.secondary}50`,
                            }}
                          >
                            {predictedCount !== null ? (
                              <div className='flex items-center justify-end gap-2'>
                                {growthRate > 0 ? (
                                  <TrendingUp className='w-3.5 h-3.5 text-emerald-500' />
                                ) : growthRate < 0 ? (
                                  <TrendingDown className='w-3.5 h-3.5 text-red-500' />
                                ) : null}
                                <span
                                  className='inline-block font-bold px-2.5 py-0.5 rounded-lg tabular-nums'
                                  style={{
                                    color: colors.secondary,
                                    backgroundColor: colors.secondary + "18",
                                  }}
                                >
                                  {predictedCount.toLocaleString()}
                                </span>
                                <span
                                  className='text-xs font-semibold'
                                  style={{
                                    color:
                                      growthRate > 0
                                        ? "#10B981"
                                        : growthRate < 0
                                          ? "#EF4444"
                                          : colors.neutral,
                                  }}
                                >
                                  {growthRate >= 0 ? "+" : ""}
                                  {growthRate.toFixed(1)}%
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: colors.neutral }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    }) ?? (
                      <tr>
                        <td
                          colSpan={99}
                          className='py-12 text-center'
                          style={{ color: colors.neutral }}
                        >
                          No prediction data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {forecastResult && predictedYear && (
                <p className='mt-3 text-xs' style={{ color: colors.neutral }}>
                  {forecastResult.totalPrograms} program
                  {forecastResult.totalPrograms !== 1 ? "s" : ""} · Predicted
                  year:{" "}
                  <strong style={{ color: colors.secondary }}>
                    {predictedYear}
                  </strong>{" "}
                  · Growth rate vs. previous year
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ───────────────────── Sub-components ───────────────────── */

function SummaryCard({
  icon,
  label,
  value,
  color,
  badge,
  badgePositive,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  badge?: string;
  badgePositive?: boolean;
  sub?: string;
}) {
  return (
    <div
      className='bg-white rounded-xl shadow-sm border p-5 flex items-start gap-4 transition-shadow hover:shadow-md'
      style={{ borderColor: colors.neutralBorder }}
    >
      <div
        className='w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0'
        style={{ backgroundColor: color + "18", color }}
      >
        {icon}
      </div>
      <div className='min-w-0'>
        <p
          className='text-xs font-medium mb-1'
          style={{ color: colors.neutral }}
        >
          {label}
        </p>
        <div className='flex items-baseline gap-2 flex-wrap'>
          <p
            className='text-2xl font-bold tabular-nums leading-none'
            style={{ color: colors.primary }}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {badge && (
            <span
              className='text-xs font-semibold px-1.5 py-0.5 rounded'
              style={{
                backgroundColor: badgePositive ? "#D1FAE5" : "#FEE2E2",
                color: badgePositive ? "#065F46" : "#991B1B",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {sub && (
          <p className='text-xs mt-1' style={{ color: colors.neutral }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function UtilizationBadge({ rate }: { rate: number }) {
  const bg = rate >= 90 ? "#FEE2E2" : rate >= 75 ? "#FEF3C7" : "#D1FAE5";
  const fg = rate >= 90 ? "#991B1B" : rate >= 75 ? "#92400E" : "#065F46";
  return (
    <span
      className='inline-block text-xs font-bold px-2 py-0.5 rounded-full tabular-nums'
      style={{ backgroundColor: bg, color: fg }}
    >
      {rate}%
    </span>
  );
}

function shortenProgram(name: string): string {
  const words = name.split(" ");
  if (words.length <= 3) return name;
  // Try to extract abbreviation like "BSIT" from "Bachelor of Science in Information Technology"
  const skip = new Set(["of", "in", "and", "the", "for"]);
  const abbr = words
    .filter((w) => !skip.has(w.toLowerCase()))
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return abbr.length >= 2 ? abbr : words.slice(-2).join(" ");
}

export default StudentForecastDashboard;
