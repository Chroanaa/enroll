"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  FileText,
  Filter,
  GraduationCap,
  Loader2,
  Printer,
  RefreshCw,
} from "lucide-react";
import { colors } from "../../colors";
import { useAcademicTerm } from "../../hooks/useAcademicTerm";
import { useProgramsWithMajors } from "../../hooks/useProgramsWithMajors";
import { parseProgramFilter } from "../../utils/programUtils";
import Pagination from "../common/Pagination";
import ErrorModal from "../common/ErrorModal";
import SubjectDropReportViewer, {
  SubjectDropReportRow,
} from "../subjectDropping/SubjectDropReportViewer";

interface DepartmentOption {
  id: number;
  name: string;
}

interface SubjectDropAnalyticsItem {
  courseCode: string;
  descriptiveTitle: string;
  dropCount: number;
  uniqueStudents: number;
  totalUnits: number;
}

type ReportTab = "report" | "analytics";

const surfaceShadow = `0 14px 32px ${colors.neutralBorder}55`;

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  border: `1px solid ${colors.neutralBorder}`,
  boxShadow: surfaceShadow,
};

const SubjectDropReports: React.FC = () => {
  const { currentTerm } = useAcademicTerm();
  const { programs, loading: programsLoading } = useProgramsWithMajors();
  const [activeTab, setActiveTab] = useState<ReportTab>("report");
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [programMajorFilter, setProgramMajorFilter] = useState("");
  const [yearLevelFilter, setYearLevelFilter] = useState("");
  const [reportRows, setReportRows] = useState<SubjectDropReportRow[]>([]);
  const [reportAnalytics, setReportAnalytics] = useState<
    SubjectDropAnalyticsItem[]
  >([]);
  const [reportSummary, setReportSummary] = useState({
    totalDropRequests: 0,
    uniqueStudents: 0,
    totalUnitsDropped: 0,
    refundableCount: 0,
    pendingCount: 0,
    completedCount: 0,
  });
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportCurrentPage, setReportCurrentPage] = useState(1);
  const [reportItemsPerPage, setReportItemsPerPage] = useState(10);
  const [isReportViewerOpen, setIsReportViewerOpen] = useState(false);
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
    details: "",
  });

  const currentTermLabel = useMemo(() => {
    if (!currentTerm) return "Loading current term...";
    return `${currentTerm.semester} Semester, ${currentTerm.academicYear}`;
  }, [currentTerm]);

  const selectedDepartmentLabel = useMemo(() => {
    if (!departmentFilter) return "All Departments";
    return (
      departments.find((item) => String(item.id) === departmentFilter)?.name ||
      "Selected Department"
    );
  }, [departmentFilter, departments]);

  const selectedProgramMajorLabel = useMemo(() => {
    if (!programMajorFilter) return "All Programs / Majors";
    return (
      programs.find((item) => item.value === programMajorFilter)?.label ||
      "Selected Program / Major"
    );
  }, [programMajorFilter, programs]);

  const selectedYearLevelLabel = useMemo(() => {
    if (!yearLevelFilter) return "All Year Levels";
    return `Year ${yearLevelFilter}`;
  }, [yearLevelFilter]);

  const paginatedReportRows = useMemo(() => {
    const startIndex = (reportCurrentPage - 1) * reportItemsPerPage;
    return reportRows.slice(startIndex, startIndex + reportItemsPerPage);
  }, [reportCurrentPage, reportItemsPerPage, reportRows]);

  const reportTotalPages = Math.max(
    1,
    Math.ceil(reportRows.length / reportItemsPerPage),
  );

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch("/api/auth/department");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load departments.");
        }

        setDepartments(
          Array.isArray(result)
            ? result.map((item: any) => ({
                id: Number(item.id),
                name: String(item.name || item.code || "Department"),
              }))
            : [],
        );
      } catch (error) {
        console.error("Failed to load departments:", error);
      }
    };

    fetchDepartments();
  }, []);

  const fetchReport = async () => {
    if (!currentTerm) return;

    setIsLoadingReport(true);
    try {
      const params = new URLSearchParams({
        academicYear: currentTerm.academicYear,
        semester: currentTerm.semester === "First" ? "1" : "2",
      });

      if (departmentFilter) {
        params.set("departmentId", departmentFilter);
      }

      if (programMajorFilter) {
        const parsed = parseProgramFilter(programMajorFilter);
        if (parsed.programId) {
          params.set("programId", String(parsed.programId));
        }
        if (parsed.majorId) {
          params.set("majorId", String(parsed.majorId));
        }
      }

      if (yearLevelFilter) {
        params.set("yearLevel", yearLevelFilter);
      }

      const response = await fetch(
        `/api/auth/subject-drop-history/report?${params.toString()}`,
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load subject drop report.");
      }

      setReportRows(Array.isArray(result.rows) ? result.rows : []);
      setReportAnalytics(
        Array.isArray(result.analytics?.mostDroppedSubjects)
          ? result.analytics.mostDroppedSubjects
          : [],
      );
      setReportSummary(
        result.summary || {
          totalDropRequests: 0,
          uniqueStudents: 0,
          totalUnitsDropped: 0,
          refundableCount: 0,
          pendingCount: 0,
          completedCount: 0,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load subject drop report.";
      setReportRows([]);
      setReportAnalytics([]);
      setReportSummary({
        totalDropRequests: 0,
        uniqueStudents: 0,
        totalUnitsDropped: 0,
        refundableCount: 0,
        pendingCount: 0,
        completedCount: 0,
      });
      setErrorModal({
        isOpen: true,
        message,
        details: "",
      });
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [currentTerm, departmentFilter, programMajorFilter, yearLevelFilter]);

  useEffect(() => {
    setReportCurrentPage(1);
  }, [departmentFilter, programMajorFilter, yearLevelFilter, reportRows.length]);

  const tabs: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "report",
      label: "Subject Drop Report",
      icon: <FileText className='h-4 w-4' />,
    },
    {
      id: "analytics",
      label: "Most Dropped Subjects",
      icon: <BarChart3 className='h-4 w-4' />,
    },
  ];

  return (
    <div className='min-h-screen p-6' style={{ backgroundColor: colors.paper }}>
      <div className='mx-auto flex w-full max-w-7xl flex-col gap-6'>
        <section
          className='overflow-hidden rounded-3xl px-6 py-6'
          style={cardStyle}
        >
          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div>
              <div className='flex items-center gap-3'>
                <div
                  className='flex h-12 w-12 items-center justify-center rounded-2xl'
                  style={{
                    backgroundColor: `${colors.secondary}12`,
                    color: colors.secondary,
                  }}
                >
                  <GraduationCap className='h-6 w-6' />
                </div>
                <div>
                  <h1
                    className='text-3xl font-bold tracking-tight'
                    style={{ color: colors.primary }}
                  >
                    Subject Dropping Reports
                  </h1>
                  <p className='mt-1 text-sm leading-6' style={{ color: colors.tertiary }}>
                    Review subject drop records, filter by academic scope, and open a PDF-ready report viewer.
                  </p>
                </div>
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-3'>
              <button
                type='button'
                onClick={() => fetchReport()}
                disabled={isLoadingReport}
                className='inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition'
                style={{
                  border: `1px solid ${colors.neutralBorder}`,
                  backgroundColor: "white",
                  color: colors.primary,
                }}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoadingReport ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <button
                type='button'
                onClick={() => setIsReportViewerOpen(true)}
                disabled={isLoadingReport || reportRows.length === 0}
                className='inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60'
                style={{ backgroundColor: colors.secondary }}
              >
                <Printer className='h-4 w-4' />
                Open PDF Viewer
              </button>
            </div>
          </div>
        </section>

        <section className='overflow-hidden rounded-3xl' style={cardStyle}>
          <div
            className='border-b px-6 py-6'
            style={{ borderColor: colors.neutralBorder }}
          >
            <div className='flex items-center gap-2'>
              <Filter className='h-4 w-4' style={{ color: colors.secondary }} />
              <h2 className='text-lg font-semibold' style={{ color: colors.primary }}>
                Report Filters
              </h2>
            </div>

            <div className='mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                className='h-11 rounded-xl px-3 text-sm outline-none'
                style={{
                  border: `1px solid ${colors.neutralBorder}`,
                  backgroundColor: "white",
                  color: colors.primary,
                }}
              >
                <option value=''>All Departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>

              <select
                value={programMajorFilter}
                onChange={(event) => setProgramMajorFilter(event.target.value)}
                disabled={programsLoading}
                className='h-11 rounded-xl px-3 text-sm outline-none disabled:opacity-60'
                style={{
                  border: `1px solid ${colors.neutralBorder}`,
                  backgroundColor: "white",
                  color: colors.primary,
                }}
              >
                <option value=''>All Programs / Majors</option>
                {programs.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={yearLevelFilter}
                onChange={(event) => setYearLevelFilter(event.target.value)}
                className='h-11 rounded-xl px-3 text-sm outline-none'
                style={{
                  border: `1px solid ${colors.neutralBorder}`,
                  backgroundColor: "white",
                  color: colors.primary,
                }}
              >
                <option value=''>All Year Levels</option>
                <option value='1'>1st Year</option>
                <option value='2'>2nd Year</option>
                <option value='3'>3rd Year</option>
                <option value='4'>4th Year</option>
              </select>

              <div
                className='flex items-center rounded-xl px-4 py-3 text-sm font-medium'
                style={{
                  backgroundColor: `${colors.secondary}08`,
                  border: `1px solid ${colors.secondary}22`,
                  color: colors.primary,
                }}
              >
                Current Term: {currentTermLabel}
              </div>
            </div>
          </div>

          <div className='border-b px-6 py-4' style={{ borderColor: colors.neutralBorder }}>
            <div className='flex flex-wrap gap-3'>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type='button'
                    onClick={() => setActiveTab(tab.id)}
                    className='inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition'
                    style={
                      isActive
                        ? {
                            backgroundColor: colors.secondary,
                            color: colors.paper,
                          }
                        : {
                            backgroundColor: `${colors.secondary}12`,
                            color: colors.primary,
                          }
                    }
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className='grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-4'>
            {[
              { label: "Drop Requests", value: reportSummary.totalDropRequests },
              { label: "Students", value: reportSummary.uniqueStudents },
              { label: "Units Dropped", value: reportSummary.totalUnitsDropped },
              { label: "Refundable", value: reportSummary.refundableCount },
            ].map((item) => (
              <div
                key={item.label}
                className='rounded-2xl px-5 py-4'
                style={{
                  backgroundColor: "white",
                  border: `1px solid ${colors.neutralBorder}`,
                }}
              >
                <div
                  className='text-[11px] font-semibold uppercase tracking-[0.18em]'
                  style={{ color: colors.neutral }}
                >
                  {item.label}
                </div>
                <div className='mt-2 text-2xl font-bold' style={{ color: colors.primary }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {isLoadingReport ? (
            <div className='flex flex-col items-center justify-center gap-3 px-6 py-20'>
              <Loader2 className='h-8 w-8 animate-spin' style={{ color: colors.secondary }} />
              <p className='text-sm font-medium' style={{ color: colors.tertiary }}>
                Loading subject drop report...
              </p>
            </div>
          ) : activeTab === "report" ? (
            reportRows.length === 0 ? (
              <div className='flex flex-col items-center justify-center gap-3 px-6 py-20'>
                <FileText className='h-8 w-8' style={{ color: colors.neutral }} />
                <p className='text-sm font-medium' style={{ color: colors.primary }}>
                  No subject drop records found for the selected filters.
                </p>
              </div>
            ) : (
              <>
                <div className='overflow-x-auto px-6 py-6'>
                  <table className='min-w-full'>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.neutralBorder}` }}>
                        <th className='px-4 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]' style={{ color: colors.neutral }}>
                          Student
                        </th>
                        <th className='px-4 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]' style={{ color: colors.neutral }}>
                          Department
                        </th>
                        <th className='px-4 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]' style={{ color: colors.neutral }}>
                          Program / Major
                        </th>
                        <th className='px-4 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]' style={{ color: colors.neutral }}>
                          Subject
                        </th>
                        <th className='px-4 py-4 text-center text-[12px] font-semibold uppercase tracking-[0.18em]' style={{ color: colors.neutral }}>
                          Units
                        </th>
                        <th className='px-4 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]' style={{ color: colors.neutral }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReportRows.map((row) => (
                        <tr key={row.id} style={{ borderBottom: `1px solid ${colors.neutralBorder}` }}>
                          <td className='px-4 py-4 text-sm' style={{ color: colors.primary }}>
                            <div className='font-semibold'>{row.studentName}</div>
                            <div className='text-xs' style={{ color: colors.tertiary }}>
                              {row.studentNumber}
                            </div>
                          </td>
                          <td className='px-4 py-4 text-sm' style={{ color: colors.neutralDark }}>
                            {row.departmentName || "N/A"}
                          </td>
                          <td className='px-4 py-4 text-sm' style={{ color: colors.neutralDark }}>
                            {[row.programCode, row.majorName || row.programName]
                              .filter(Boolean)
                              .join(" - ") || "N/A"}
                          </td>
                          <td className='px-4 py-4 text-sm' style={{ color: colors.primary }}>
                            <div className='font-semibold'>{row.courseCode}</div>
                            <div className='text-xs' style={{ color: colors.tertiary }}>
                              {row.descriptiveTitle}
                            </div>
                          </td>
                          <td className='px-4 py-4 text-center text-sm' style={{ color: colors.neutralDark }}>
                            {row.unitsTotal}
                          </td>
                          <td className='px-4 py-4 text-sm'>
                            <span
                              className='inline-flex rounded-full px-3 py-1 text-xs font-semibold'
                              style={{
                                backgroundColor:
                                  row.status === "Dropped"
                                    ? `${colors.success}16`
                                    : `${colors.warning}16`,
                                color:
                                  row.status === "Dropped"
                                    ? colors.success
                                    : colors.warning,
                              }}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    borderTop: `1px solid ${colors.neutralBorder}`,
                    backgroundColor: `${colors.neutralLight}66`,
                  }}
                >
                  <Pagination
                    currentPage={reportCurrentPage}
                    totalPages={reportTotalPages}
                    itemsPerPage={reportItemsPerPage}
                    totalItems={reportRows.length}
                    itemName='drop records'
                    onPageChange={setReportCurrentPage}
                    onItemsPerPageChange={setReportItemsPerPage}
                  />
                </div>
              </>
            )
          ) : reportAnalytics.length === 0 ? (
            <div className='flex flex-col items-center justify-center gap-3 px-6 py-20'>
              <BarChart3 className='h-8 w-8' style={{ color: colors.neutral }} />
              <p className='text-sm font-medium' style={{ color: colors.primary }}>
                No subject dropping analytics are available for this term.
              </p>
            </div>
          ) : (
            <>
              <div className='grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-3'>
                {[
                  {
                    label: "Completed Drops",
                    value: reportSummary.completedCount,
                    tone: colors.success,
                  },
                  {
                    label: "Pending Approval",
                    value: reportSummary.pendingCount,
                    tone: colors.warning,
                  },
                  {
                    label: "Refundable Drops",
                    value: reportSummary.refundableCount,
                    tone: colors.secondary,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className='rounded-2xl px-5 py-4'
                    style={{
                      backgroundColor: `${item.tone}10`,
                      border: `1px solid ${item.tone}22`,
                    }}
                  >
                    <div
                      className='text-[11px] font-semibold uppercase tracking-[0.18em]'
                      style={{ color: item.tone }}
                    >
                      {item.label}
                    </div>
                    <div className='mt-2 text-2xl font-bold' style={{ color: colors.primary }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className='px-6 pb-6'>
                <div
                  className='overflow-hidden rounded-2xl border'
                  style={{ borderColor: colors.neutralBorder }}
                >
                  <table className='min-w-full'>
                    <thead>
                      <tr style={{ backgroundColor: `${colors.secondary}12` }}>
                        <th className='px-4 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]' style={{ color: colors.neutral }}>
                          Subject
                        </th>
                        <th className='px-4 py-4 text-center text-[12px] font-semibold uppercase tracking-[0.18em]' style={{ color: colors.neutral }}>
                          Drop Count
                        </th>
                        <th className='px-4 py-4 text-center text-[12px] font-semibold uppercase tracking-[0.18em]' style={{ color: colors.neutral }}>
                          Students
                        </th>
                        <th className='px-4 py-4 text-center text-[12px] font-semibold uppercase tracking-[0.18em]' style={{ color: colors.neutral }}>
                          Units
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportAnalytics.map((item, index) => (
                        <tr
                          key={`${item.courseCode}-${index}`}
                          style={{ borderTop: `1px solid ${colors.neutralBorder}` }}
                        >
                          <td className='px-4 py-4 text-sm' style={{ color: colors.primary }}>
                            <div className='font-semibold'>{item.courseCode}</div>
                            <div className='text-xs' style={{ color: colors.tertiary }}>
                              {item.descriptiveTitle}
                            </div>
                          </td>
                          <td className='px-4 py-4 text-center text-sm font-semibold' style={{ color: colors.secondary }}>
                            {item.dropCount}
                          </td>
                          <td className='px-4 py-4 text-center text-sm' style={{ color: colors.neutralDark }}>
                            {item.uniqueStudents}
                          </td>
                          <td className='px-4 py-4 text-center text-sm' style={{ color: colors.neutralDark }}>
                            {item.totalUnits}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: "", details: "" })}
        message={errorModal.message}
        details={errorModal.details}
      />

      {isReportViewerOpen && (
        <SubjectDropReportViewer
          rows={reportRows}
          onClose={() => setIsReportViewerOpen(false)}
          academicYear={currentTerm?.academicYear || "Current Academic Year"}
          semesterLabel={
            currentTerm?.semester
              ? `${currentTerm.semester} Semester`
              : "Current Semester"
          }
          selectedDepartmentLabel={selectedDepartmentLabel}
          selectedMajorLabel={selectedProgramMajorLabel}
          selectedYearLevelLabel={selectedYearLevelLabel}
        />
      )}
    </div>
  );
};

export default SubjectDropReports;
