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
  predicted_year?: number | null;
  predicted_academic_year?: string | null;
  predicted_count: number;
  confidence_score?: number;
  confidence_label?: "High" | "Medium" | "Low";
  confidence_reason?: string;
}

interface CapacityItem {
  program: string;
  predicted_year?: number | null;
  predicted_academic_year?: string | null;
  predicted_students: number;
  confidence_score?: number;
  confidence_label?: "High" | "Medium" | "Low";
  confidence_reason?: string;
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
  predicted_school_year?: string | null;
  forecast_confidence?: {
    score: number;
    label: "High" | "Medium" | "Low";
    reason: string;
  };
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

type PredictionStatus =
  | "Overpredicted"
  | "Underpredicted"
  | "Accurately predicted";

type ActionPriority = "High" | "Moderate" | "Low";

interface ProgramAccuracyAnalysis {
  program: string;
  schoolYear: string;
  actual: number;
  predicted: number;
  difference: number;
  absoluteDifference: number;
  percentageError: number;
  accuracy: number;
  status: PredictionStatus;
  latestChangeRate: number | null;
  dataPoints: number;
  method: "Linear regression" | "Previous-year fallback";
}

interface ForecastActionPlan {
  program: string;
  status: PredictionStatus;
  priority: ActionPriority;
  studentsVariance: number;
  sectionUnits: number;
  sectionAction: string;
  facultyAction: string;
  roomAction: string;
  marketingAction: string;
  modelAction: string;
}

interface PostEnrollmentReport {
  schoolYear: string;
  programRows: ProgramAccuracyAnalysis[];
  actionPlanRows: ForecastActionPlan[];
  predictionHitExampleRows: ForecastActionPlan[];
  trendRows: {
    year: number;
    schoolYear: string;
    totalStudents: number;
    change: number | null;
    changeRate: number | null;
  }[];
  totals: {
    actual: number;
    predicted: number;
    difference: number;
    absoluteDifference: number;
    percentageError: number;
    accuracy: number;
    status: PredictionStatus;
  };
  highestErrors: ProgramAccuracyAnalysis[];
  accuratelyPredictedCount: number;
  overpredictedCount: number;
  underpredictedCount: number;
  insufficientHistoricalCount: number;
  unusualTrendRows: ProgramAccuracyAnalysis[];
  assumptions: string[];
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

function getSchoolYearStartFromDate(date: Date): number {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return month >= 8 ? year : year - 1;
}

function parseAcademicYearStart(academicYear?: string | null): number | null {
  if (!academicYear) return null;

  const match = String(academicYear)
    .trim()
    .match(/^(\d{4})-(\d{4})$/);

  if (!match) return null;

  const start = Number(match[1]);
  const end = Number(match[2]);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end !== start + 1) {
    return null;
  }

  return start;
}

function formatSchoolYear(startYear?: number | null): string {
  if (startYear === undefined || startYear === null) return "";
  return `${startYear}-${startYear + 1}`;
}

function runLinearRegression(
  rows: { year: number; total_students: number }[],
  targetYear: number,
): number {
  const n = rows.length;
  const sumX = rows.reduce((sum, row) => sum + row.year, 0);
  const sumY = rows.reduce((sum, row) => sum + row.total_students, 0);
  const sumXY = rows.reduce(
    (sum, row) => sum + row.year * row.total_students,
    0,
  );
  const sumXX = rows.reduce((sum, row) => sum + row.year * row.year, 0);
  const denominator = n * sumXX - sumX * sumX;

  if (denominator === 0) {
    return sumY / Math.max(n, 1);
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return slope * targetYear + intercept;
}

function calculateAccuracyStatus(
  predicted: number,
  actual: number,
  percentageError: number,
): PredictionStatus {
  if (percentageError <= 5) return "Accurately predicted";
  if (predicted > actual) return "Overpredicted";
  return "Underpredicted";
}

function calculatePercentageError(predicted: number, actual: number): number {
  if (actual === 0) return predicted === 0 ? 0 : 100;
  return (Math.abs(predicted - actual) / actual) * 100;
}

function clampAccuracy(percentageError: number): number {
  return Math.max(0, 100 - percentageError);
}

function formatSignedNumber(value: number): string {
  if (value > 0) return `+${value.toLocaleString()}`;
  return value.toLocaleString();
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function getStatusBadgeStyle(status: PredictionStatus) {
  if (status === "Accurately predicted") {
    return { backgroundColor: "#D1FAE5", color: "#065F46" };
  }

  if (status === "Underpredicted") {
    return { backgroundColor: "#FEF3C7", color: "#92400E" };
  }

  return { backgroundColor: "#FEE2E2", color: "#991B1B" };
}

function getActionPriorityStyle(priority: ActionPriority) {
  if (priority === "High") {
    return { backgroundColor: "#FEE2E2", color: "#991B1B" };
  }

  if (priority === "Moderate") {
    return { backgroundColor: "#FEF3C7", color: "#92400E" };
  }

  return { backgroundColor: "#D1FAE5", color: "#065F46" };
}

function resolveActionPriority(row: ProgramAccuracyAnalysis): ActionPriority {
  if (row.percentageError >= 15 || row.absoluteDifference >= 40) {
    return "High";
  }

  if (row.percentageError >= 8 || row.absoluteDifference >= 15) {
    return "Moderate";
  }

  return "Low";
}

function buildForecastActionPlan(
  row: ProgramAccuracyAnalysis,
): ForecastActionPlan {
  const sectionCapacityAssumption = 40;
  const sectionUnits =
    row.status === "Accurately predicted"
      ? 0
      : Math.max(
          1,
          Math.ceil(row.absoluteDifference / sectionCapacityAssumption),
        );
  const priority = resolveActionPriority(row);

  if (row.status === "Underpredicted") {
    return {
      program: row.program,
      status: row.status,
      priority,
      studentsVariance: row.absoluteDifference,
      sectionUnits,
      sectionAction: `Open ${sectionUnits} additional section${
        sectionUnits > 1 ? "s" : ""
      } or increase approved capacity.`,
      facultyAction: `Assign ${sectionUnits} additional faculty load${
        sectionUnits > 1 ? "s" : ""
      } or overload coverage.`,
      roomAction: `Reserve ${sectionUnits} room slot${
        sectionUnits > 1 ? "s" : ""
      } for the excess demand.`,
      marketingAction:
        "Keep successful recruitment channels active and document why demand increased.",
      modelAction:
        "Retrain with the latest actual count and add demand indicators so the model recognizes growth earlier.",
    };
  }

  if (row.status === "Overpredicted") {
    return {
      program: row.program,
      status: row.status,
      priority,
      studentsVariance: row.absoluteDifference,
      sectionUnits,
      sectionAction: `Merge or hold ${sectionUnits} underfilled section${
        sectionUnits > 1 ? "s" : ""
      } until demand improves.`,
      facultyAction:
        "Reassign excess faculty load to other subjects, advisories, or high-demand programs.",
      roomAction:
        "Release unused room slots and prioritize rooms for programs with higher actual demand.",
      marketingAction:
        "Review campaign reach, tuition sensitivity, and program appeal for this course.",
      modelAction:
        "Retrain with the lower actual count and add variables for tuition, marketing, and program demand changes.",
    };
  }

  return {
    program: row.program,
    status: row.status,
    priority,
    studentsVariance: row.absoluteDifference,
    sectionUnits,
    sectionAction:
      "Maintain planned section allocation and continue monitoring.",
    facultyAction:
      "Keep faculty assignments as planned unless late enrollees change demand.",
    roomAction: "Keep room reservations stable for the next scheduling cycle.",
    marketingAction:
      "Maintain current marketing approach and preserve campaign records.",
    modelAction:
      "Keep the result as a reliable training point for the next forecast cycle.",
  };
}

function buildPredictionHitExampleActionPlan(
  row: ProgramAccuracyAnalysis,
): ForecastActionPlan {
  return {
    program: row.program,
    status: "Accurately predicted",
    priority: "Low",
    studentsVariance: 0,
    sectionUnits: 0,
    sectionAction: "Maintain the planned number of sections.",
    facultyAction: "Keep the assigned faculty load as scheduled.",
    roomAction: "Keep existing room reservations and scheduling assignments.",
    marketingAction:
      "Maintain the current recruitment approach and document it as an effective campaign reference.",
    modelAction:
      "Save this as a successful forecast result and use it as reliable training evidence for the next cycle.",
  };
}

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
        year:
          item.year ??
          parseAcademicYearStart(item.academic_year) ??
          getSchoolYearStartFromDate(new Date()),
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

  const forecastLineChartData = useMemo(() => {
    if (!studentData?.programData) return [];

    const grouped: Record<string, Record<number, number>> = {};
    const historicalYearStarts = new Set<number>();

    studentData.programData.forEach((item) => {
      if (!grouped[item.program]) grouped[item.program] = {};

      const yearStart =
        item.year ?? parseAcademicYearStart(item.academic_year) ?? null;

      if (yearStart === null) return;

      grouped[item.program][yearStart] = item.total_students;
      historicalYearStarts.add(yearStart);
    });

    const sortedYearStarts = Array.from(historicalYearStarts).sort(
      (a, b) => a - b,
    );
    const lastYearStart = sortedYearStarts[sortedYearStarts.length - 1];

    let nextYearStart: number | null = null;

    const forecastYear = forecastResult?.forecast?.find(
      (f) => typeof f.predicted_year === "number",
    )?.predicted_year;

    if (typeof forecastYear === "number") {
      nextYearStart = forecastYear;
    } else {
      const capacityYear = forecastResult?.capacity?.find(
        (c) => typeof c.predicted_year === "number",
      )?.predicted_year;

      if (typeof capacityYear === "number") {
        nextYearStart = capacityYear;
      }
    }

    const predMap: Record<string, number> = {};

    forecastResult?.forecast?.forEach((f) => {
      predMap[f.course] = f.predicted_count;
    });

    if (Object.keys(predMap).length === 0 && forecastResult?.capacity?.length) {
      forecastResult.capacity.forEach((c) => {
        predMap[c.program] = c.predicted_students;
      });
    }

    const allYearStarts = [...sortedYearStarts];

    if (nextYearStart !== null && !allYearStarts.includes(nextYearStart)) {
      allYearStarts.push(nextYearStart);
      allYearStarts.sort((a, b) => a - b);
    }

    return allYearStarts.map((yearStart) => {
      const entry: Record<string, any> = {
        year: formatSchoolYear(yearStart),
        schoolYearStart: yearStart,
      };

      Object.keys(grouped).forEach((program) => {
        if (nextYearStart !== null && yearStart === nextYearStart) {
          entry[program] = null;
          entry[`${program}_forecast`] = predMap[program] ?? null;
        } else if (
          nextYearStart !== null &&
          lastYearStart !== undefined &&
          yearStart === lastYearStart
        ) {
          entry[program] = grouped[program][yearStart] ?? null;
          entry[`${program}_forecast`] = grouped[program][yearStart] ?? null;
        } else {
          entry[program] = grouped[program][yearStart] ?? null;
          entry[`${program}_forecast`] = null;
        }
      });

      return entry;
    });
  }, [studentData, forecastResult]);

  const predictedYearStart = useMemo(() => {
    const forecastYear = forecastResult?.forecast?.find(
      (f) => typeof f.predicted_year === "number",
    )?.predicted_year;

    if (typeof forecastYear === "number") {
      return forecastYear;
    }

    const capacityYear = forecastResult?.capacity?.find(
      (c) => typeof c.predicted_year === "number",
    )?.predicted_year;

    if (typeof capacityYear === "number") {
      return capacityYear;
    }

    return null;
  }, [forecastResult]);

  const predictedSchoolYear = useMemo(() => {
    if (forecastResult?.predicted_school_year) {
      return forecastResult.predicted_school_year;
    }

    const forecastAcademicYear = forecastResult?.forecast?.find(
      (item) => item.predicted_academic_year,
    )?.predicted_academic_year;

    if (forecastAcademicYear) {
      return forecastAcademicYear;
    }

    const capacityAcademicYear = forecastResult?.capacity?.find(
      (item) => item.predicted_academic_year,
    )?.predicted_academic_year;

    if (capacityAcademicYear) {
      return capacityAcademicYear;
    }

    return formatSchoolYear(predictedYearStart);
  }, [forecastResult, predictedYearStart]);

  const totalPredicted = useMemo(() => {
    if (forecastResult?.forecast?.length) {
      return forecastResult.forecast.reduce((s, f) => s + f.predicted_count, 0);
    }

    if (forecastResult?.capacity?.length) {
      return forecastResult.capacity.reduce(
        (s, c) => s + c.predicted_students,
        0,
      );
    }

    return 0;
  }, [forecastResult]);

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
  const overallConfidence = forecastResult?.forecast_confidence;

  const postEnrollmentReport = useMemo<PostEnrollmentReport | null>(() => {
    if (!forecastResult?.historical) return null;

    const programRows: ProgramAccuracyAnalysis[] = [];
    const yearlyTotals = new Map<number, number>();
    let insufficientHistoricalCount = 0;

    Object.entries(forecastResult.historical).forEach(([program, rows]) => {
      const sortedRows = [...rows].sort((a, b) => a.year - b.year);
      const latest = sortedRows[sortedRows.length - 1];

      if (!latest) return;

      sortedRows.forEach((row) => {
        yearlyTotals.set(
          row.year,
          (yearlyTotals.get(row.year) ?? 0) + row.total_students,
        );
      });

      const priorRows = sortedRows.slice(0, -1);

      if (priorRows.length === 0) {
        insufficientHistoricalCount += 1;
        return;
      }

      const rawPrediction =
        priorRows.length >= 2
          ? runLinearRegression(priorRows, latest.year)
          : priorRows[0].total_students;

      const predicted = Math.max(0, Math.round(rawPrediction));
      const actual = latest.total_students;
      const difference = predicted - actual;
      const percentageError = calculatePercentageError(predicted, actual);
      const accuracy = clampAccuracy(percentageError);
      const previousActual = priorRows[priorRows.length - 1]?.total_students;
      const latestChangeRate =
        previousActual && previousActual > 0
          ? ((actual - previousActual) / previousActual) * 100
          : null;

      if (priorRows.length < 2) {
        insufficientHistoricalCount += 1;
      }

      programRows.push({
        program,
        schoolYear: formatSchoolYear(latest.year),
        actual,
        predicted,
        difference,
        absoluteDifference: Math.abs(difference),
        percentageError,
        accuracy,
        status: calculateAccuracyStatus(predicted, actual, percentageError),
        latestChangeRate,
        dataPoints: sortedRows.length,
        method:
          priorRows.length >= 2
            ? "Linear regression"
            : "Previous-year fallback",
      });
    });

    if (programRows.length === 0) return null;

    const actualTotal = programRows.reduce((sum, row) => sum + row.actual, 0);
    const predictedTotal = programRows.reduce(
      (sum, row) => sum + row.predicted,
      0,
    );
    const totalDifference = predictedTotal - actualTotal;
    const totalPercentageError = calculatePercentageError(
      predictedTotal,
      actualTotal,
    );

    const trendRows = Array.from(yearlyTotals.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, totalStudents], index, source) => {
        const previousTotal = index > 0 ? source[index - 1][1] : null;
        const change =
          previousTotal !== null ? totalStudents - previousTotal : null;
        const changeRate =
          previousTotal && previousTotal > 0
            ? ((totalStudents - previousTotal) / previousTotal) * 100
            : null;

        return {
          year,
          schoolYear: formatSchoolYear(year),
          totalStudents,
          change,
          changeRate,
        };
      });

    const latestSchoolYear =
      trendRows[trendRows.length - 1]?.schoolYear ??
      programRows[0]?.schoolYear ??
      "latest completed school year";

    const highestErrors = [...programRows]
      .sort(
        (a, b) =>
          b.percentageError - a.percentageError ||
          b.absoluteDifference - a.absoluteDifference,
      )
      .slice(0, 5);

    const unusualTrendRows = programRows
      .filter(
        (row) =>
          row.latestChangeRate !== null && Math.abs(row.latestChangeRate) >= 20,
      )
      .sort(
        (a, b) =>
          Math.abs(b.latestChangeRate ?? 0) - Math.abs(a.latestChangeRate ?? 0),
      )
      .slice(0, 5);

    const actionPlanRows = programRows
      .map(buildForecastActionPlan)
      .sort((a, b) => {
        const priorityRank: Record<ActionPriority, number> = {
          High: 3,
          Moderate: 2,
          Low: 1,
        };

        return (
          priorityRank[b.priority] - priorityRank[a.priority] ||
          b.studentsVariance - a.studentsVariance
        );
      });
    const predictionHitExampleRows = programRows.map(
      buildPredictionHitExampleActionPlan,
    );

    const assumptions = [
      "The system does not show a stored historical prediction for the completed period, so this report uses a linear-regression backtest: prior school-year data predicts the latest completed school year, then that prediction is compared with actual enrollment.",
      "Percentage error is computed as absolute difference divided by actual enrollment. Accuracy is computed as 100% minus percentage error, floored at 0%.",
      "Programs with fewer than two prior historical data points use the previous observed enrollment as a fallback and are marked as limited-data cases.",
      "Forecast Action Plan section estimates one section or room slot per 40-student variance when exact section capacity is not available in the completed-period data.",
    ];

    return {
      schoolYear: latestSchoolYear,
      programRows,
      actionPlanRows,
      predictionHitExampleRows,
      trendRows,
      totals: {
        actual: actualTotal,
        predicted: predictedTotal,
        difference: totalDifference,
        absoluteDifference: Math.abs(totalDifference),
        percentageError: totalPercentageError,
        accuracy: clampAccuracy(totalPercentageError),
        status: calculateAccuracyStatus(
          predictedTotal,
          actualTotal,
          totalPercentageError,
        ),
      },
      highestErrors,
      accuratelyPredictedCount: programRows.filter(
        (row) => row.status === "Accurately predicted",
      ).length,
      overpredictedCount: programRows.filter(
        (row) => row.status === "Overpredicted",
      ).length,
      underpredictedCount: programRows.filter(
        (row) => row.status === "Underpredicted",
      ).length,
      insufficientHistoricalCount,
      unusualTrendRows,
      assumptions,
    };
  }, [forecastResult]);

  /* ── Render ── */

  return (
    <div
      className='w-full overflow-x-hidden px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4'
      style={{ backgroundColor: colors.paper }}
    >
      <div className='max-w-7xl mx-auto'>
        {/* ─── Header ─── */}
        <div className='mb-6'>
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
              className='inline-flex w-fit shrink-0 items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90 disabled:opacity-60'
              style={{ backgroundColor: colors.secondary }}
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  loading || forecastLoading ? "animate-spin" : ""
                }`}
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
          <div className='flex flex-col items-center justify-center py-24'>
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
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6'>
                <SummaryCard
                  icon={<Layers className='w-5 h-5' />}
                  label='Total Programs'
                  value={forecastResult.totalPrograms}
                  color={colors.info}
                />

                <SummaryCard
                  icon={<Users className='w-5 h-5' />}
                  label='Current Students'
                  value={totalCurrent}
                  color={colors.secondary}
                />

                <SummaryCard
                  icon={<Target className='w-5 h-5' />}
                  label={`Predicted ${predictedSchoolYear || "School Year"}`}
                  value={totalPredicted}
                  color={colors.success}
                  badge={
                    totalCurrent > 0
                      ? `${totalPredicted >= totalCurrent ? "+" : ""}${(
                          ((totalPredicted - totalCurrent) / totalCurrent) *
                          100
                        ).toFixed(1)}%`
                      : undefined
                  }
                  badgePositive={totalPredicted >= totalCurrent}
                />

                <SummaryCard
                  icon={<BarChart3 className='w-5 h-5' />}
                  label='Forecast Confidence'
                  value={
                    overallConfidence
                      ? `${overallConfidence.score}%`
                      : "Not available"
                  }
                  color={colors.primary}
                  badge={overallConfidence?.label}
                  badgeTone={
                    overallConfidence?.label === "High"
                      ? "positive"
                      : overallConfidence?.label === "Medium"
                        ? "warning"
                        : overallConfidence?.label === "Low"
                          ? "negative"
                          : undefined
                  }
                  sub={overallConfidence?.reason}
                />

                <SummaryCard
                  icon={<Building2 className='w-5 h-5' />}
                  label='Available Rooms'
                  value={`${forecastResult.room_summary?.available_rooms ?? "—"} / ${
                    forecastResult.room_summary?.total_rooms ?? "—"
                  }`}
                  color={colors.warning}
                  sub={`${
                    forecastResult.room_summary?.total_available_capacity ?? 0
                  } seat capacity`}
                />
              </div>
            )}

            {forecastResult?.room_recommendation && (
              <div
                className='mb-6 rounded-xl border p-4 sm:p-5'
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

            {postEnrollmentReport && (
              <PostEnrollmentAnalyticalReport report={postEnrollmentReport} />
            )}

            {/* ─── Per-Program Mini Charts ─── */}
            <div className='mb-6'>
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
                      {predictedSchoolYear && (
                        <strong style={{ color: colors.secondary }}>
                          {" "}
                          ({predictedSchoolYear})
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

                    const predictedCount =
                      fcItem?.predicted_count ??
                      capItem?.predicted_students ??
                      null;

                    const programChartData = forecastLineChartData.map(
                      (entry) => ({
                        year: entry.year,
                        schoolYearStart: entry.schoolYearStart as number,
                        students: entry[program] as number | null,
                        forecast: entry[`${program}_forecast`] as number | null,
                      }),
                    );

                    const historicalPoints = programChartData.filter(
                      (d) =>
                        d.students !== null &&
                        d.schoolYearStart !== predictedYearStart,
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

                        <div className='flex items-end justify-between mb-4'>
                          <div>
                            <p
                              className='text-xs mb-0.5'
                              style={{ color: colors.neutral }}
                            >
                              {lastPoint
                                ? formatSchoolYear(lastPoint.schoolYearStart)
                                : "Last known"}
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
                                {predictedSchoolYear || "Next School Year"}{" "}
                                (predicted)
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

                        <ResponsiveContainer width='100%' height={120}>
                          <LineChart
                            data={programChartData}
                            margin={{
                              top: 8,
                              right: 8,
                              left: -28,
                              bottom: 0,
                            }}
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
                              labelFormatter={(l) => `School Year: ${l}`}
                            />
                            <Line
                              type='monotone'
                              dataKey='students'
                              stroke={color}
                              strokeWidth={2.5}
                              dot={{
                                r: 3.5,
                                fill: color,
                                strokeWidth: 0,
                              }}
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
                                  payload.schoolYearStart ===
                                    predictedYearStart &&
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
                                ? `+${capItem.additional_sections_needed} section${
                                    capItem.additional_sections_needed > 1
                                      ? "s"
                                      : ""
                                  } needed`
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
              <div className='mb-6'>
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
                      Based on predicted enrollment for{" "}
                      {predictedSchoolYear || "the next school year"}
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
                            : `Add ${
                                roomRecommendation.additional_rooms_needed
                              } room${
                                roomRecommendation.additional_rooms_needed > 1
                                  ? "s"
                                  : ""
                              }`}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

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
              <div className='mb-6'>
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
                    How full each program&apos;s sections will be in{" "}
                    {predictedSchoolYear || "the next school year"} after
                    applying recommendations
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
                        {forecastResult.capacity.map((cap) => (
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
                    className='flex items-center gap-6 mt-2 text-xs flex-wrap'
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
              className='bg-white rounded-xl shadow-sm border p-6 mb-0'
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
                Historical student counts per program across all school years,
                with the predicted count for{" "}
                {predictedSchoolYear || "the next school year"}.
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
                              {formatSchoolYear(h.year)}
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
                        {predictedSchoolYear
                          ? `${predictedSchoolYear} (Predicted)`
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

                      const confidenceScore =
                        fcItem?.confidence_score ?? capItem?.confidence_score;

                      const confidenceLabel =
                        fcItem?.confidence_label ?? capItem?.confidence_label;

                      const confidenceReason =
                        fcItem?.confidence_reason ?? capItem?.confidence_reason;

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
                              <div className='flex flex-col items-end gap-1'>
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

                                {confidenceLabel &&
                                  confidenceScore !== undefined && (
                                    <div
                                      className='inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold'
                                      style={getConfidenceBadgeStyle(
                                        confidenceLabel,
                                      )}
                                      title={confidenceReason}
                                    >
                                      <span>{confidenceLabel}</span>
                                      <span>{confidenceScore}%</span>
                                    </div>
                                  )}
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

              {forecastResult && predictedSchoolYear && (
                <p className='mt-3 text-xs' style={{ color: colors.neutral }}>
                  {forecastResult.totalPrograms} program
                  {forecastResult.totalPrograms !== 1 ? "s" : ""} · Predicted
                  school year:{" "}
                  <strong style={{ color: colors.secondary }}>
                    {predictedSchoolYear}
                  </strong>{" "}
                  · Growth rate vs. previous school year
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
  badgeTone,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  badge?: string;
  badgePositive?: boolean;
  badgeTone?: "positive" | "warning" | "negative" | "neutral";
  sub?: string;
}) {
  const resolvedBadgeTone =
    badgeTone ?? (badgePositive ? "positive" : "negative");

  const badgeStyle =
    resolvedBadgeTone === "positive"
      ? { backgroundColor: "#D1FAE5", color: "#065F46" }
      : resolvedBadgeTone === "warning"
        ? { backgroundColor: "#FEF3C7", color: "#92400E" }
        : resolvedBadgeTone === "neutral"
          ? { backgroundColor: "#E5E7EB", color: "#374151" }
          : { backgroundColor: "#FEE2E2", color: "#991B1B" };

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
              style={badgeStyle}
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

function PostEnrollmentAnalyticalReport({
  report,
}: {
  report: PostEnrollmentReport;
}) {
  const [showPredictionHitExample, setShowPredictionHitExample] =
    useState(false);

  const successfulReport = useMemo<PostEnrollmentReport>(() => {
    const programRows = report.programRows.map((row) => ({
      ...row,
      predicted: row.actual,
      difference: 0,
      absoluteDifference: 0,
      percentageError: 0,
      accuracy: 100,
      status: "Accurately predicted" as PredictionStatus,
    }));
    const actionRows = programRows.map(buildPredictionHitExampleActionPlan);

    return {
      ...report,
      programRows,
      actionPlanRows: actionRows,
      predictionHitExampleRows: actionRows,
      totals: {
        ...report.totals,
        predicted: report.totals.actual,
        difference: 0,
        absoluteDifference: 0,
        percentageError: 0,
        accuracy: 100,
        status: "Accurately predicted" as PredictionStatus,
      },
      highestErrors: programRows.slice(0, 5),
      accuratelyPredictedCount: programRows.length,
      overpredictedCount: 0,
      underpredictedCount: 0,
      insufficientHistoricalCount: 0,
      unusualTrendRows: [],
      assumptions: [
        "This is a sample successful forecast view. It assumes predicted enrollment matched actual enrollment for every program.",
        "Because the prediction hit the actual count, percentage error is 0% and accuracy is 100%.",
        "No corrective section, faculty, room, or marketing adjustment is required in this sample scenario.",
      ],
    };
  }, [report]);

  const displayedReport = showPredictionHitExample ? successfulReport : report;

  const reliabilityLabel =
    displayedReport.totals.accuracy >= 90
      ? "reliable"
      : displayedReport.totals.accuracy >= 80
        ? "generally usable with monitoring"
        : "not yet reliable without recalibration";

  const statusPhrase =
    displayedReport.totals.status === "Accurately predicted"
      ? "accurate within the accepted 5% tolerance"
      : displayedReport.totals.status === "Overpredicted"
        ? "overestimated actual enrollment"
        : "underestimated actual enrollment";

  const topAffected = displayedReport.highestErrors[0];
  const latestTrend =
    displayedReport.trendRows[displayedReport.trendRows.length - 1];
  const previousTrend =
    displayedReport.trendRows[displayedReport.trendRows.length - 2];

  const displayedActionPlanRows =
    (showPredictionHitExample
      ? displayedReport.predictionHitExampleRows
      : displayedReport.actionPlanRows) ?? [];

  const actionPlanModeText = showPredictionHitExample
    ? "Prediction Hit Example"
    : "Actual Variance Actions";
  const failureAnalysisPrimary = showPredictionHitExample
    ? "The sample successful forecast shows no model failure because predicted enrollment matched actual enrollment. No unusual variance, sudden demand shift, or corrective operational response is required in this scenario."
    : "The main causes of prediction error are likely related to changes that a single-variable linear regression model cannot fully see. These include sudden changes in enrollment demand, tuition fee or payment policy adjustments, local economic conditions, program popularity shifts, admission policy changes, and unexpected external events during the enrollment period.";
  const affectedProgramsIntro = showPredictionHitExample
    ? "In this successful sample, every listed program is classified as accurately predicted with zero student variance."
    : "The highest prediction errors are shown below. These programs should receive priority review before the next forecasting cycle.";
  const operationalRecommendationItems = showPredictionHitExample
    ? [
        "Maintain planned sections because actual enrollment matched the forecast.",
        "Keep faculty assignments and room reservations as scheduled.",
        "Continue monitoring late enrollment changes, but no immediate corrective action is needed.",
        "Store the successful result as evidence of model reliability for future planning.",
      ]
    : [
        topAffected
          ? `Review section planning for ${topAffected.program}, the program with the highest current prediction error.`
          : "Review section planning for programs with the largest enrollment variance.",
        displayedReport.totals.status === "Underpredicted"
          ? "Prepare additional sections, rooms, and faculty assignments earlier for programs where actual demand exceeded prediction."
          : "Avoid opening excess sections too early for programs where projected demand exceeded actual enrollment.",
        "Improve marketing campaigns for programs with declining actual enrollment or repeated underperformance.",
        "Use final enrollment counts to adjust faculty loading, room allocation, and section merging decisions.",
      ];

  return (
    <section
      className='mb-6 bg-white rounded-xl shadow-sm border p-6 overflow-hidden'
      style={{ borderColor: colors.neutralBorder }}
    >
      <div className='flex items-start justify-between gap-4 flex-wrap mb-6'>
        <div>
          <div className='flex items-center gap-3 mb-1'>
            <BarChart3
              className='w-5 h-5'
              style={{ color: colors.secondary }}
            />
            <h2 className='text-xl font-bold' style={{ color: colors.primary }}>
              Post-Enrollment Analytical Report
            </h2>
          </div>
          <p className='text-xs ml-8' style={{ color: colors.neutral }}>
            Completed-period model performance analysis for{" "}
            {displayedReport.schoolYear}.
          </p>
        </div>

        <span
          className='text-xs font-bold px-3 py-1 rounded-full'
          style={getStatusBadgeStyle(displayedReport.totals.status)}
        >
          {displayedReport.totals.status}
        </span>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-4 gap-3 mb-6'>
        <ReportMetric
          label='Predicted Enrollment'
          value={displayedReport.totals.predicted.toLocaleString()}
        />
        <ReportMetric
          label='Actual Enrollment'
          value={displayedReport.totals.actual.toLocaleString()}
        />
        <ReportMetric
          label='Percentage Error'
          value={`${displayedReport.totals.percentageError.toFixed(1)}%`}
        />
        <ReportMetric
          label='Accuracy'
          value={`${displayedReport.totals.accuracy.toFixed(1)}%`}
        />
      </div>

      <div className='space-y-7'>
        <ReportSection title='1. Executive Summary'>
          <p
            className='text-sm leading-relaxed'
            style={{ color: colors.neutralDark }}
          >
            The enrollment prediction model {statusPhrase}. The overall
            prediction for {displayedReport.schoolYear} was{" "}
            <strong>{displayedReport.totals.predicted.toLocaleString()}</strong> students
            compared with{" "}
            <strong>{displayedReport.totals.actual.toLocaleString()}</strong> actual
            students, producing an absolute variance of{" "}
            <strong>{displayedReport.totals.absoluteDifference.toLocaleString()}</strong>{" "}
            students. Overall accuracy is{" "}
            <strong>{displayedReport.totals.accuracy.toFixed(1)}%</strong>, so the model
            is currently {reliabilityLabel} for administrative planning.
          </p>
        </ReportSection>

        <ReportSection title='2. Prediction Accuracy Analysis'>
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse text-sm'>
              <thead>
                <tr style={{ backgroundColor: colors.neutralLight }}>
                  {["Metric", "Value", "Interpretation"].map((heading) => (
                    <th
                      key={heading}
                      className='text-left py-3 px-4 text-xs font-semibold uppercase'
                      style={{ color: colors.primary }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ReportTableRow
                  label='Difference (Predicted - Actual)'
                  value={formatSignedNumber(displayedReport.totals.difference)}
                  note={
                    displayedReport.totals.difference > 0
                      ? "The model overestimated enrollment."
                      : displayedReport.totals.difference < 0
                        ? "The model underestimated enrollment."
                        : "The model matched actual enrollment."
                  }
                />
                <ReportTableRow
                  label='Percentage Error'
                  value={`${displayedReport.totals.percentageError.toFixed(1)}%`}
                  note='Lower error means the prediction was closer to actual enrollment.'
                />
                <ReportTableRow
                  label='Accuracy Percentage'
                  value={`${displayedReport.totals.accuracy.toFixed(1)}%`}
                  note='Accuracy is calculated as 100% minus percentage error.'
                />
              </tbody>
            </table>
          </div>

          <div className='overflow-x-auto mt-4'>
            <table className='w-full border-collapse text-sm'>
              <thead>
                <tr style={{ backgroundColor: colors.neutralLight }}>
                  {[
                    "Program",
                    "Predicted",
                    "Actual",
                    "Difference",
                    "Error",
                    "Accuracy",
                    "Status",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className='text-left py-3 px-4 text-xs font-semibold uppercase'
                      style={{ color: colors.primary }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {displayedReport.programRows.map((row, index) => (
                  <tr
                    key={row.program}
                    style={{
                      borderBottom: `1px solid ${colors.neutralBorder}`,
                      backgroundColor:
                        index % 2 === 0 ? "white" : colors.neutralLight,
                    }}
                  >
                    <td
                      className='py-3 px-4 font-medium'
                      style={{ color: colors.primary }}
                    >
                      {row.program}
                    </td>
                    <td className='py-3 px-4 tabular-nums'>
                      {row.predicted.toLocaleString()}
                    </td>
                    <td className='py-3 px-4 tabular-nums'>
                      {row.actual.toLocaleString()}
                    </td>
                    <td className='py-3 px-4 tabular-nums'>
                      {formatSignedNumber(row.difference)}
                    </td>
                    <td className='py-3 px-4 tabular-nums'>
                      {row.percentageError.toFixed(1)}%
                    </td>
                    <td className='py-3 px-4 tabular-nums'>
                      {row.accuracy.toFixed(1)}%
                    </td>
                    <td className='py-3 px-4'>
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>

        <ReportSection title='3. Failure Analysis'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
            <ReportParagraph>
              {failureAnalysisPrimary}
            </ReportParagraph>

            <ReportParagraph>
              {displayedReport.insufficientHistoricalCount > 0
                ? `${displayedReport.insufficientHistoricalCount} program(s) have limited historical records, which weakens regression reliability and increases the chance of unstable predictions.`
                : "All analyzed programs had enough prior data for a linear-regression backtest, but sharp demand changes can still reduce accuracy."}
              {displayedReport.unusualTrendRows.length > 0
                ? ` Unusual movement was detected in ${displayedReport.unusualTrendRows.length} program(s), led by ${displayedReport.unusualTrendRows[0].program}.`
                : " No major program-level spike or decline above the 20% review threshold was detected."}
            </ReportParagraph>
          </div>
        </ReportSection>

        <ReportSection title='4. Affected Courses or Programs'>
          <p className='text-sm mb-3' style={{ color: colors.neutralDark }}>
            {affectedProgramsIntro}
          </p>

          <div className='overflow-x-auto'>
            <table className='w-full border-collapse text-sm'>
              <thead>
                <tr style={{ backgroundColor: colors.neutralLight }}>
                  {[
                    "Program",
                    "Classification",
                    "Students Off",
                    "Error",
                    "Data Basis",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className='text-left py-3 px-4 text-xs font-semibold uppercase'
                      style={{ color: colors.primary }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {displayedReport.highestErrors.map((row, index) => (
                  <tr
                    key={row.program}
                    style={{
                      borderBottom: `1px solid ${colors.neutralBorder}`,
                      backgroundColor:
                        index % 2 === 0 ? "white" : colors.neutralLight,
                    }}
                  >
                    <td
                      className='py-3 px-4 font-medium'
                      style={{ color: colors.primary }}
                    >
                      {row.program}
                    </td>
                    <td className='py-3 px-4'>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className='py-3 px-4 tabular-nums'>
                      {row.absoluteDifference.toLocaleString()}
                    </td>
                    <td className='py-3 px-4 tabular-nums'>
                      {row.percentageError.toFixed(1)}%
                    </td>
                    <td className='py-3 px-4' style={{ color: colors.neutral }}>
                      {row.method}, {row.dataPoints} point
                      {row.dataPoints !== 1 ? "s" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>

        <ReportSection title='5. Forecast Action Plan'>
          <div className='flex items-start justify-between gap-4 flex-wrap mb-3'>
            <p
              className='text-sm max-w-3xl'
              style={{ color: colors.neutralDark }}
            >
              This converts the post-enrollment variance into specific
              administrative actions. Use the toggle to show how the system
              responds when predictions hit the actual enrollment count.
            </p>

            <button
              type='button'
              onClick={() =>
                setShowPredictionHitExample((currentValue) => !currentValue)
              }
              className='inline-flex items-center gap-3 cursor-pointer select-none'
              title='Switch between actual variance actions and a prediction-hit example.'
            >
              <span
                className='text-xs font-semibold'
                style={{ color: colors.neutralDark }}
              >
                {actionPlanModeText}
              </span>

              <span
                className='relative inline-flex h-6 w-11 items-center rounded-full transition-colors'
                style={{
                  backgroundColor: showPredictionHitExample
                    ? colors.success
                    : colors.neutralBorder,
                }}
              >
                <span
                  className='inline-block h-5 w-5 rounded-full bg-white shadow transition-transform'
                  style={{
                    transform: showPredictionHitExample
                      ? "translateX(22px)"
                      : "translateX(2px)",
                  }}
                />
              </span>
            </button>
          </div>

          {showPredictionHitExample && (
            <div
              className='mb-4 rounded-lg border px-4 py-3 text-sm'
              style={{
                borderColor: "#86EFAC",
                backgroundColor: "#ECFDF5",
                color: "#065F46",
              }}
            >
              Example mode: the system treats each program as accurately
              predicted, so no corrective section, faculty, or room adjustment
              is required.
            </div>
          )}

          <div className='grid grid-cols-1 md:grid-cols-3 gap-3 mb-4'>
            <ReportMetric
              label='Expansion Actions'
              value={displayedActionPlanRows
                .filter((row) => row.status === "Underpredicted")
                .length.toLocaleString()}
            />
            <ReportMetric
              label='Consolidation Actions'
              value={displayedActionPlanRows
                .filter((row) => row.status === "Overpredicted")
                .length.toLocaleString()}
            />
            <ReportMetric
              label='Monitor Only'
              value={displayedActionPlanRows
                .filter((row) => row.status === "Accurately predicted")
                .length.toLocaleString()}
            />
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full border-collapse text-sm'>
              <thead>
                <tr style={{ backgroundColor: colors.neutralLight }}>
                  {[
                    "Program",
                    "Priority",
                    "Variance",
                    "Section Action",
                    "Faculty Action",
                    "Room Action",
                    "Marketing / Model Handling",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className='text-left py-3 px-4 text-xs font-semibold uppercase'
                      style={{ color: colors.primary }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {displayedActionPlanRows.map((row, index) => (
                  <tr
                    key={`${row.program}-${row.sectionAction}`}
                    style={{
                      borderBottom: `1px solid ${colors.neutralBorder}`,
                      backgroundColor:
                        index % 2 === 0 ? "white" : colors.neutralLight,
                    }}
                  >
                    <td className='py-3 px-4 align-top'>
                      <p
                        className='font-medium'
                        style={{ color: colors.primary }}
                      >
                        {row.program}
                      </p>
                      <div className='mt-1'>
                        <StatusBadge status={row.status} />
                      </div>
                    </td>

                    <td className='py-3 px-4 align-top'>
                      <ActionPriorityBadge priority={row.priority} />
                    </td>

                    <td className='py-3 px-4 align-top tabular-nums'>
                      {row.studentsVariance.toLocaleString()} student
                      {row.studentsVariance !== 1 ? "s" : ""}
                    </td>

                    <td className='py-3 px-4 align-top min-w-[220px]'>
                      {row.sectionAction}
                    </td>

                    <td className='py-3 px-4 align-top min-w-[220px]'>
                      {row.facultyAction}
                    </td>

                    <td className='py-3 px-4 align-top min-w-[220px]'>
                      {row.roomAction}
                    </td>

                    <td className='py-3 px-4 align-top min-w-[260px]'>
                      <p>{row.marketingAction}</p>
                      <p className='mt-2' style={{ color: colors.neutral }}>
                        {row.modelAction}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>

        <ReportSection title='6. Trend and Pattern Analysis'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            <div className='overflow-x-auto'>
              <table className='w-full border-collapse text-sm'>
                <thead>
                  <tr style={{ backgroundColor: colors.neutralLight }}>
                    {["School Year", "Actual Enrollment", "Change"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className='text-left py-3 px-4 text-xs font-semibold uppercase'
                          style={{ color: colors.primary }}
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody>
                  {displayedReport.trendRows.slice(-6).map((row, index) => (
                    <tr
                      key={row.year}
                      style={{
                        borderBottom: `1px solid ${colors.neutralBorder}`,
                        backgroundColor:
                          index % 2 === 0 ? "white" : colors.neutralLight,
                      }}
                    >
                      <td className='py-3 px-4'>{row.schoolYear}</td>
                      <td className='py-3 px-4 tabular-nums'>
                        {row.totalStudents.toLocaleString()}
                      </td>
                      <td className='py-3 px-4 tabular-nums'>
                        {row.change === null
                          ? "Baseline"
                          : `${formatSignedNumber(row.change)} (${formatPercent(
                              row.changeRate,
                            )})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              className='rounded-lg border p-4'
              style={{ borderColor: colors.neutralBorder }}
            >
              <p
                className='text-sm leading-relaxed'
                style={{ color: colors.neutralDark }}
              >
                {latestTrend && previousTrend
                  ? `Latest enrollment changed from ${previousTrend.totalStudents.toLocaleString()} to ${latestTrend.totalStudents.toLocaleString()} students, a ${formatPercent(
                      latestTrend.changeRate,
                    )} movement.`
                  : "Trend movement is limited because only one completed school-year total is available."}
              </p>

              <p
                className='text-sm leading-relaxed mt-3'
                style={{ color: colors.neutralDark }}
              >
                {displayedReport.unusualTrendRows.length > 0
                  ? `Unusual spikes or declines were detected in ${displayedReport.unusualTrendRows
                      .map((row) => row.program)
                      .join(
                        ", ",
                      )}. These programs should be reviewed for marketing, tuition, admission, or policy changes.`
                  : "No unusual program-level spike or decline above 20% was detected in the latest completed period."}
              </p>
            </div>
          </div>
        </ReportSection>

        <ReportSection title='7. Recommendations and Improvements'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <RecommendationList
              title='Operational Recommendations'
              items={operationalRecommendationItems}
            />

            <RecommendationList
              title='Machine Learning Improvements'
              items={[
                "Retrain the forecasting model after every completed enrollment period using the newest actual enrollment dataset.",
                "Add independent variables such as tuition changes, scholarship availability, marketing activity, admission policy changes, economic indicators, and program capacity.",
                "Move from simple linear regression to multiple linear regression when enough feature data is available.",
                "Store each generated forecast with school year, program, model version, and confidence score so future post-enrollment reports can compare against the exact original prediction.",
              ]}
            />
          </div>
        </ReportSection>

        <ReportSection title='8. Conclusion'>
          <p
            className='text-sm leading-relaxed'
            style={{ color: colors.neutralDark }}
          >
            Based on the completed enrollment comparison, the forecasting model
            produced an overall accuracy of{" "}
            <strong>{displayedReport.totals.accuracy.toFixed(1)}%</strong>. It remains{" "}
            {reliabilityLabel} for future enrollment planning, provided that
            administrators continue validating predictions after each enrollment
            cycle and improve the model with more explanatory variables.
          </p>
        </ReportSection>

        <ReportSection title='Analytical Assumptions'>
          <ul
            className='space-y-2 text-sm'
            style={{ color: colors.neutralDark }}
          >
            {displayedReport.assumptions.map((assumption) => (
              <li key={assumption} className='flex gap-2'>
                <span style={{ color: colors.secondary }}>-</span>
                <span>{assumption}</span>
              </li>
            ))}
          </ul>
        </ReportSection>
      </div>
    </section>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div
      className='rounded-lg border p-4'
      style={{
        borderColor: colors.neutralBorder,
        backgroundColor: colors.neutralLight,
      }}
    >
      <p
        className='text-xs font-semibold mb-1'
        style={{ color: colors.neutral }}
      >
        {label}
      </p>
      <p
        className='text-xl font-bold tabular-nums'
        style={{ color: colors.primary }}
      >
        {value}
      </p>
    </div>
  );
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3
        className='text-base font-bold mb-3'
        style={{ color: colors.primary }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function ReportParagraph({ children }: { children: React.ReactNode }) {
  return (
    <div
      className='rounded-lg border p-4 leading-relaxed'
      style={{ borderColor: colors.neutralBorder, color: colors.neutralDark }}
    >
      {children}
    </div>
  );
}

function ReportTableRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <tr style={{ borderBottom: `1px solid ${colors.neutralBorder}` }}>
      <td className='py-3 px-4 font-medium' style={{ color: colors.primary }}>
        {label}
      </td>
      <td className='py-3 px-4 tabular-nums'>{value}</td>
      <td className='py-3 px-4' style={{ color: colors.neutral }}>
        {note}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: PredictionStatus }) {
  return (
    <span
      className='inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold'
      style={getStatusBadgeStyle(status)}
    >
      {status}
    </span>
  );
}

function ActionPriorityBadge({ priority }: { priority: ActionPriority }) {
  return (
    <span
      className='inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold'
      style={getActionPriorityStyle(priority)}
    >
      {priority}
    </span>
  );
}

function RecommendationList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div
      className='rounded-lg border p-4'
      style={{ borderColor: colors.neutralBorder }}
    >
      <p className='text-sm font-bold mb-3' style={{ color: colors.primary }}>
        {title}
      </p>
      <ul className='space-y-2 text-sm' style={{ color: colors.neutralDark }}>
        {items.map((item) => (
          <li key={item} className='flex gap-2'>
            <CheckCircle2
              className='w-4 h-4 flex-shrink-0 mt-0.5'
              style={{ color: colors.success }}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function getConfidenceBadgeStyle(label: "High" | "Medium" | "Low") {
  if (label === "High") {
    return {
      backgroundColor: "#D1FAE5",
      color: "#065F46",
    };
  }

  if (label === "Medium") {
    return {
      backgroundColor: "#FEF3C7",
      color: "#92400E",
    };
  }

  return {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
  };
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

  const skip = new Set(["of", "in", "and", "the", "for"]);

  const abbr = words
    .filter((word) => !skip.has(word.toLowerCase()))
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return abbr.length >= 2 ? abbr : words.slice(-2).join(" ");
}

export default StudentForecastDashboard;
