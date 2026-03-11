"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  BarChart3,
  Users,
  GraduationCap,
  AlertTriangle,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { colors } from "../colors";

interface ProgramData {
  program: string;
  total_students: number;
  academic_year?: string;
  year?: number;
}

interface PredictionData {
  program: string;
  predicted_students: number;
  trend: "increasing" | "decreasing" | "stable";
  growth_rate: number;
}

interface ForecastAPIResponse {
  predictions?: Array<{
    program: string;
    predicted_students: number;
    trend?: string;
    growth_rate?: number;
  }>;
  [key: string]: any;
}

interface StudentData {
  programData: ProgramData[];
  summary: {
    totalStudents: number;
    totalPrograms: number;
  };
  studentsByTerm: { term: string; total_students: number }[];
  studentsByDepartment: { department_name: string; total_students: number }[];
}

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

const StudentForecastDashboard: React.FC = () => {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch student data on mount
  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/student/forecast");
      if (!response.ok) {
        throw new Error("Failed to fetch student data");
      }
      const data = await response.json();
      setStudentData(data);

      // Generate predictions using FORECAST_API_URL
      if (data.programData && data.programData.length > 0) {
        await fetchForecastPredictions(data.programData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch predictions from FORECAST_API_URL
  const fetchForecastPredictions = async (programData: ProgramData[]) => {
    setForecastLoading(true);
    try {
      // Transform data for the forecast API
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

      const result = await response.json();

      // Process the forecast result
      if (result.forecast) {
        const processedPredictions = processForecastResponse(
          result.forecast,
          programData,
        );
        setPredictions(processedPredictions);
      }
    } catch (err: any) {
      console.error("Forecast API error:", err.message);
      // Set empty predictions on error
      setPredictions([]);
    } finally {
      setForecastLoading(false);
    }
  };

  // Process the forecast API response
  const processForecastResponse = (
    forecastResponse: ForecastAPIResponse,
    programData: ProgramData[],
  ): PredictionData[] => {
    // If the API returns predictions directly
    if (
      forecastResponse.predictions &&
      Array.isArray(forecastResponse.predictions)
    ) {
      return forecastResponse.predictions.map((pred) => ({
        program: pred.program,
        predicted_students: pred.predicted_students || 0,
        trend:
          (pred.trend as "increasing" | "decreasing" | "stable") || "stable",
        growth_rate: pred.growth_rate || 0,
      }));
    }

    // If the API returns data in a different format, try to extract predictions
    // This handles various possible response formats
    const predictions: PredictionData[] = [];

    // Group historical data by program to get the latest values
    const programGroups: Record<string, { year: number; students: number }[]> =
      {};
    programData.forEach((item) => {
      const program = item.program;
      const year = item.academic_year
        ? parseInt(item.academic_year.split("-")[0])
        : item.year || new Date().getFullYear();

      if (!programGroups[program]) {
        programGroups[program] = [];
      }
      programGroups[program].push({ year, students: item.total_students });
    });

    // Check if forecast response has program-specific predictions
    Object.keys(programGroups).forEach((program) => {
      const programPrediction = forecastResponse[program];
      const historicalData = programGroups[program].sort(
        (a, b) => a.year - b.year,
      );
      const lastStudents =
        historicalData[historicalData.length - 1]?.students || 0;

      if (programPrediction && typeof programPrediction === "object") {
        const predicted =
          programPrediction.predicted_students ||
          programPrediction.prediction ||
          programPrediction.forecast ||
          lastStudents;

        const growthRate =
          lastStudents > 0
            ? ((predicted - lastStudents) / lastStudents) * 100
            : 0;

        let trend: "increasing" | "decreasing" | "stable" = "stable";
        if (growthRate > 5) trend = "increasing";
        else if (growthRate < -5) trend = "decreasing";

        predictions.push({
          program,
          predicted_students: Math.round(predicted),
          trend: programPrediction.trend || trend,
          growth_rate: programPrediction.growth_rate || growthRate,
        });
      } else {
        // Use the raw value if it's a number
        const predicted =
          typeof programPrediction === "number"
            ? programPrediction
            : lastStudents;
        const growthRate =
          lastStudents > 0
            ? ((predicted - lastStudents) / lastStudents) * 100
            : 0;

        let trend: "increasing" | "decreasing" | "stable" = "stable";
        if (growthRate > 5) trend = "increasing";
        else if (growthRate < -5) trend = "decreasing";

        predictions.push({
          program,
          predicted_students: Math.round(predicted),
          trend,
          growth_rate: growthRate,
        });
      }
    });

    return predictions.sort(
      (a, b) => b.predicted_students - a.predicted_students,
    );
  };

  // Prepare chart data for enrollment by program (pandas-style)
  const enrollmentChartData = useMemo(() => {
    if (!studentData?.programData) return [];

    const grouped: Record<string, Record<string, number>> = {};
    const years = new Set<string>();

    studentData.programData.forEach((item) => {
      if (!grouped[item.program]) {
        grouped[item.program] = {};
      }
      const year = item.academic_year || String(item.year);
      grouped[item.program][year] = item.total_students;
      years.add(year);
    });

    const sortedYears = Array.from(years).sort();
    return sortedYears.map((year) => {
      const entry: Record<string, any> = { year };
      Object.keys(grouped).forEach((program) => {
        entry[program] = grouped[program][year] || 0;
      });
      return entry;
    });
  }, [studentData]);

  // Combined historical + predicted line chart data
  const forecastLineChartData = useMemo(() => {
    if (!studentData?.programData) return [];

    const grouped: Record<string, Record<string, number>> = {};
    const years = new Set<string>();

    studentData.programData.forEach((item) => {
      const program = item.program;
      if (!grouped[program]) grouped[program] = {};
      const year = item.academic_year || String(item.year);
      grouped[program][year] = item.total_students;
      years.add(year);
    });

    // Add the predicted year
    if (predictions.length > 0) {
      const sortedYears = Array.from(years).sort();
      const lastYear = sortedYears[sortedYears.length - 1];
      let nextYear: string;
      if (lastYear.includes("-")) {
        const startYr = parseInt(lastYear.split("-")[0]);
        nextYear = `${startYr + 1}-${startYr + 2}`;
      } else {
        nextYear = String(parseInt(lastYear) + 1);
      }
      years.add(nextYear);

      predictions.forEach((pred) => {
        if (!grouped[pred.program]) grouped[pred.program] = {};
        grouped[pred.program][nextYear] = pred.predicted_students;
      });
    }

    const sortedYears = Array.from(years).sort();
    return sortedYears.map((year) => {
      const entry: Record<string, any> = { year };
      Object.keys(grouped).forEach((program) => {
        entry[program] = grouped[program][year] ?? null;
      });
      return entry;
    });
  }, [studentData, predictions]);

  // Prepare pandas-style table data (Year | Program | Students)
  const pandasTableData = useMemo(() => {
    if (!studentData?.programData) return [];

    return studentData.programData
      .map((item) => ({
        year: item.academic_year || String(item.year) || "N/A",
        program: item.program,
        students: item.total_students,
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return a.year.localeCompare(b.year);
        return a.program.localeCompare(b.program);
      });
  }, [studentData]);

  // Get unique programs for chart
  const uniquePrograms = useMemo(() => {
    if (!studentData?.programData) return [];
    return [...new Set(studentData.programData.map((p) => p.program))];
  }, [studentData]);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    trend?: number;
    color: string;
  }> = ({ title, value, subtitle, icon, trend, color }) => (
    <div
      className='bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-all duration-200'
      style={{ borderColor: colors.neutralBorder }}
    >
      <div className='flex items-center justify-between mb-4'>
        <div
          className={`p-3 rounded-lg`}
          style={{ backgroundColor: color + "20" }}
        >
          {icon}
        </div>
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
        <p
          className='text-sm font-medium mb-1'
          style={{ color: colors.neutral }}
        >
          {title}
        </p>
        <p className='text-2xl font-bold' style={{ color: colors.primary }}>
          {value}
        </p>
        {subtitle && (
          <p className='text-sm mt-1' style={{ color: colors.neutral }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div
      className='p-4 sm:p-6 min-h-screen'
      style={{ backgroundColor: colors.paper }}
    >
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center justify-between'>
            <div>
              <h1
                className='text-3xl font-bold mb-2'
                style={{ color: colors.primary }}
              >
                Student Enrollment Forecast
              </h1>
              <p style={{ color: colors.neutral }}>
                Analyze enrollment trends and forecast future student numbers by
                program
              </p>
            </div>
            <button
              onClick={fetchStudentData}
              disabled={loading}
              className='flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-colors'
              style={{ backgroundColor: colors.secondary }}
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh Data
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
            <AlertTriangle className='w-5 h-5' />
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
              Fetching enrollment data and generating predictions...
            </p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
              <StatCard
                title='Total Enrolled Students'
                value={
                  studentData?.summary?.totalStudents?.toLocaleString() || 0
                }
                icon={
                  <Users
                    className='w-5 h-5'
                    style={{ color: colors.secondary }}
                  />
                }
                color={colors.secondary}
              />
              <StatCard
                title='Programs Offered'
                value={studentData?.summary?.totalPrograms || 0}
                icon={
                  <BookOpen
                    className='w-5 h-5'
                    style={{ color: colors.success }}
                  />
                }
                color={colors.success}
              />
              <StatCard
                title='Terms'
                value={studentData?.studentsByTerm?.length || 0}
                icon={
                  <Calendar
                    className='w-5 h-5'
                    style={{ color: colors.info }}
                  />
                }
                color={colors.info}
              />
              <StatCard
                title='Departments'
                value={studentData?.studentsByDepartment?.length || 0}
                icon={
                  <GraduationCap
                    className='w-5 h-5'
                    style={{ color: colors.warning }}
                  />
                }
                color={colors.warning}
              />
            </div>

            {/* Charts Grid */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
              {/* Enrollment Trend Line Chart (Pandas-style) */}
              <div
                className='bg-white rounded-xl shadow-sm border p-6 lg:col-span-2'
                style={{ borderColor: colors.neutralBorder }}
              >
                <h2
                  className='text-xl font-bold mb-6'
                  style={{ color: colors.primary }}
                >
                  Enrollment Trend by Program and Year
                </h2>
                <ResponsiveContainer width='100%' height={350}>
                  <LineChart data={enrollmentChartData}>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      stroke={colors.neutralBorder}
                    />
                    <XAxis
                      dataKey='year'
                      tick={{ fill: colors.neutral }}
                      label={{
                        value: "Academic Year",
                        position: "bottom",
                        fill: colors.neutral,
                      }}
                    />
                    <YAxis
                      tick={{ fill: colors.neutral }}
                      label={{
                        value: "Number of Students",
                        angle: -90,
                        position: "insideLeft",
                        fill: colors.neutral,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: `1px solid ${colors.neutralBorder}`,
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    {uniquePrograms.map((program, index) => (
                      <Line
                        key={program}
                        type='monotone'
                        dataKey={program}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{
                          r: 5,
                          fill: CHART_COLORS[index % CHART_COLORS.length],
                        }}
                        name={program}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Bar Chart - Students by Program & Year */}
              <div
                className='bg-white rounded-xl shadow-sm border p-6'
                style={{ borderColor: colors.neutralBorder }}
              >
                <h2
                  className='text-xl font-bold mb-6'
                  style={{ color: colors.primary }}
                >
                  Students by Program & Academic Year
                </h2>
                <ResponsiveContainer width='100%' height={300}>
                  <BarChart data={enrollmentChartData}>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      stroke={colors.neutralBorder}
                    />
                    <XAxis dataKey='year' tick={{ fill: colors.neutral }} />
                    <YAxis tick={{ fill: colors.neutral }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: `1px solid ${colors.neutralBorder}`,
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    {uniquePrograms.map((program, index) => (
                      <Bar
                        key={program}
                        dataKey={program}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Students by Term */}
              <div
                className='bg-white rounded-xl shadow-sm border p-6'
                style={{ borderColor: colors.neutralBorder }}
              >
                <h2
                  className='text-xl font-bold mb-6'
                  style={{ color: colors.primary }}
                >
                  Students by Term
                </h2>
                <ResponsiveContainer width='100%' height={300}>
                  <PieChart>
                    <Pie
                      data={studentData?.studentsByTerm || []}
                      cx='50%'
                      cy='50%'
                      labelLine={false}
                      outerRadius={100}
                      fill='#8884d8'
                      dataKey='total_students'
                      nameKey='term'
                      label={({ name, percent }: any) =>
                        `${name || "N/A"} (${((percent || 0) * 100).toFixed(0)}%)`
                      }
                    >
                      {studentData?.studentsByTerm?.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [value, "Students"]}
                      contentStyle={{
                        backgroundColor: "white",
                        border: `1px solid ${colors.neutralBorder}`,
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pandas-style Data Table */}
            <div
              className='bg-white rounded-xl shadow-sm border p-6 mb-8'
              style={{ borderColor: colors.neutralBorder }}
            >
              <h2
                className='text-xl font-bold mb-6'
                style={{ color: colors.primary }}
              >
                Enrollment Data (Year | Program | Students)
              </h2>
              <div className='overflow-x-auto max-h-96'>
                <table className='w-full border-collapse'>
                  <thead className='sticky top-0 bg-white'>
                    <tr
                      style={{
                        borderBottom: `2px solid ${colors.neutralBorder}`,
                      }}
                    >
                      <th
                        className='text-left py-3 px-4 font-semibold'
                        style={{
                          color: colors.primary,
                          backgroundColor: colors.neutralLight,
                        }}
                      >
                        #
                      </th>
                      <th
                        className='text-left py-3 px-4 font-semibold'
                        style={{
                          color: colors.primary,
                          backgroundColor: colors.neutralLight,
                        }}
                      >
                        Year
                      </th>
                      <th
                        className='text-left py-3 px-4 font-semibold'
                        style={{
                          color: colors.primary,
                          backgroundColor: colors.neutralLight,
                        }}
                      >
                        Program
                      </th>
                      <th
                        className='text-right py-3 px-4 font-semibold'
                        style={{
                          color: colors.primary,
                          backgroundColor: colors.neutralLight,
                        }}
                      >
                        Students
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pandasTableData.map((row, index) => (
                      <tr
                        key={`${row.year}-${row.program}`}
                        style={{
                          borderBottom: `1px solid ${colors.neutralBorder}`,
                          backgroundColor:
                            index % 2 === 0 ? "white" : colors.neutralLight,
                        }}
                      >
                        <td
                          className='py-2 px-4 text-sm'
                          style={{ color: colors.neutral }}
                        >
                          {index}
                        </td>
                        <td
                          className='py-2 px-4 font-medium'
                          style={{ color: colors.primary }}
                        >
                          {row.year}
                        </td>
                        <td
                          className='py-2 px-4'
                          style={{ color: colors.primary }}
                        >
                          {row.program}
                        </td>
                        <td
                          className='py-2 px-4 text-right font-semibold'
                          style={{ color: colors.secondary }}
                        >
                          {row.students.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {pandasTableData.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className='py-8 text-center'
                          style={{ color: colors.neutral }}
                        >
                          No enrollment data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Predicted Students Per Program — combined matplotlib-style line chart */}
            <div
              className='bg-white rounded-xl shadow-sm border p-6 mb-8'
              style={{ borderColor: colors.neutralBorder }}
            >
              <div className='flex items-center gap-3 mb-6'>
                <Target
                  className='w-6 h-6'
                  style={{ color: colors.secondary }}
                />
                <h2
                  className='text-xl font-bold'
                  style={{ color: colors.primary }}
                >
                  Predicted Students Per Program (All Years)
                </h2>
                {forecastLoading && (
                  <RefreshCw
                    className='w-4 h-4 animate-spin'
                    style={{ color: colors.neutral }}
                  />
                )}
              </div>

              {forecastLineChartData.length > 0 ? (
                <div>
                  {/* Single combined line chart with all programs */}
                  <div
                    className='rounded-lg p-4 mb-6'
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: `1px solid ${colors.neutralBorder}`,
                    }}
                  >
                    <ResponsiveContainer width='100%' height={420}>
                      <LineChart
                        data={forecastLineChartData}
                        margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
                      >
                        <CartesianGrid
                          strokeDasharray='3 3'
                          stroke='#E5E7EB'
                          strokeOpacity={0.7}
                        />
                        <XAxis
                          dataKey='year'
                          tick={{ fill: "#555", fontSize: 12 }}
                          tickLine={{ stroke: "#ccc" }}
                          axisLine={{ stroke: "#ccc" }}
                          angle={-30}
                          textAnchor='end'
                          height={60}
                          label={{
                            value: "academic_year",
                            position: "insideBottom",
                            offset: -5,
                            fill: "#666",
                            fontSize: 13,
                            fontStyle: "italic",
                          }}
                        />
                        <YAxis
                          tick={{ fill: "#555", fontSize: 12 }}
                          tickLine={{ stroke: "#ccc" }}
                          axisLine={{ stroke: "#ccc" }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: 13,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          }}
                          formatter={(value: any, name: string) => [
                            value != null
                              ? Number(value).toLocaleString()
                              : "—",
                            name,
                          ]}
                          labelFormatter={(label) => `Year: ${label}`}
                        />
                        <Legend
                          verticalAlign='top'
                          align='right'
                          iconType='plainline'
                          wrapperStyle={{
                            fontSize: 13,
                            paddingBottom: 10,
                            border: "1px solid #E5E7EB",
                            borderRadius: 4,
                            padding: "8px 12px",
                            backgroundColor: "#FAFAFA",
                          }}
                        />
                        {uniquePrograms.map((program, index) => (
                          <Line
                            key={program}
                            type='monotone'
                            dataKey={program}
                            stroke={CHART_COLORS[index % CHART_COLORS.length]}
                            strokeWidth={2}
                            dot={{
                              r: 3,
                              fill: CHART_COLORS[index % CHART_COLORS.length],
                              strokeWidth: 0,
                            }}
                            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                            connectNulls
                            name={program}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                    {predictions.length > 0 && (
                      <p
                        className='text-xs text-right mt-2 mr-4'
                        style={{ color: "#888" }}
                      >
                        * Last data point (
                        {
                          forecastLineChartData[
                            forecastLineChartData.length - 1
                          ]?.year
                        }
                        ) represents predicted values
                      </p>
                    )}
                  </div>

                  {/* Pandas-style DataFrame Table */}
                  <div
                    className='overflow-x-auto'
                    style={{ fontFamily: "'Courier New', Consolas, monospace" }}
                  >
                    <table className='w-full border-collapse text-sm'>
                      <thead>
                        <tr
                          style={{
                            borderBottom: `2px solid ${colors.neutralBorder}`,
                          }}
                        >
                          <th
                            className='text-left py-2 px-3'
                            style={{
                              color: colors.neutral,
                              backgroundColor: colors.neutralLight,
                              fontWeight: 600,
                            }}
                          >
                            &nbsp;
                          </th>
                          <th
                            className='text-left py-2 px-3'
                            style={{
                              color: colors.primary,
                              backgroundColor: colors.neutralLight,
                              fontWeight: 700,
                            }}
                          >
                            program
                          </th>
                          <th
                            className='text-right py-2 px-3'
                            style={{
                              color: colors.primary,
                              backgroundColor: colors.neutralLight,
                              fontWeight: 700,
                            }}
                          >
                            predicted_students
                          </th>
                          <th
                            className='text-center py-2 px-3'
                            style={{
                              color: colors.primary,
                              backgroundColor: colors.neutralLight,
                              fontWeight: 700,
                            }}
                          >
                            trend
                          </th>
                          <th
                            className='text-right py-2 px-3'
                            style={{
                              color: colors.primary,
                              backgroundColor: colors.neutralLight,
                              fontWeight: 700,
                            }}
                          >
                            growth_rate
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {predictions.map((prediction, index) => (
                          <tr
                            key={prediction.program}
                            style={{
                              borderBottom: `1px solid ${colors.neutralBorder}`,
                              backgroundColor:
                                index % 2 === 0 ? "white" : colors.neutralLight,
                            }}
                          >
                            <td
                              className='py-2 px-3 font-bold'
                              style={{ color: colors.neutral }}
                            >
                              {index}
                            </td>
                            <td
                              className='py-2 px-3'
                              style={{ color: colors.primary }}
                            >
                              {prediction.program}
                            </td>
                            <td
                              className='py-2 px-3 text-right font-semibold'
                              style={{ color: colors.secondary }}
                            >
                              {prediction.predicted_students.toLocaleString()}
                            </td>
                            <td className='py-2 px-3 text-center'>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                  prediction.trend === "increasing"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : prediction.trend === "decreasing"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {prediction.trend === "increasing" ? (
                                  <TrendingUp className='w-3 h-3' />
                                ) : prediction.trend === "decreasing" ? (
                                  <TrendingDown className='w-3 h-3' />
                                ) : null}
                                {prediction.trend}
                              </span>
                            </td>
                            <td
                              className='py-2 px-3 text-right'
                              style={{
                                color:
                                  prediction.growth_rate >= 0
                                    ? "#10B981"
                                    : "#EF4444",
                              }}
                            >
                              {prediction.growth_rate >= 0 ? "+" : ""}
                              {prediction.growth_rate.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p
                      className='mt-1 text-xs'
                      style={{ color: colors.neutral }}
                    >
                      [{predictions.length} rows x 4 columns]
                    </p>
                  </div>
                </div>
              ) : (
                !forecastLoading && (
                  <div
                    className='py-8 text-center'
                    style={{ color: colors.neutral }}
                  >
                    No prediction data available. Ensure FORECAST_API_URL is
                    configured.
                  </div>
                )
              )}
            </div>

            {/* Students by Department */}
            <div
              className='bg-white rounded-xl shadow-sm border p-6'
              style={{ borderColor: colors.neutralBorder }}
            >
              <h2
                className='text-xl font-bold mb-6'
                style={{ color: colors.primary }}
              >
                Students by Department
              </h2>
              <ResponsiveContainer width='100%' height={300}>
                <BarChart
                  data={studentData?.studentsByDepartment || []}
                  layout='vertical'
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke={colors.neutralBorder}
                  />
                  <XAxis type='number' tick={{ fill: colors.neutral }} />
                  <YAxis
                    dataKey='department_name'
                    type='category'
                    tick={{ fill: colors.neutral, fontSize: 12 }}
                    width={120}
                  />
                  <Tooltip
                    formatter={(value: any) => [value, "Students"]}
                    contentStyle={{
                      backgroundColor: "white",
                      border: `1px solid ${colors.neutralBorder}`,
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey='total_students'
                    fill={colors.secondary}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentForecastDashboard;
