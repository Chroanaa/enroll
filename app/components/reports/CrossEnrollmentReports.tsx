"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  FileText,
  Filter,
  Loader2,
  Printer,
  RefreshCw,
} from "lucide-react";
import { colors } from "../../colors";
import { useAcademicTerm } from "../../hooks/useAcademicTerm";
import { useProgramsWithMajors } from "../../hooks/useProgramsWithMajors";
import { parseProgramFilter } from "../../utils/programUtils";
import ErrorModal from "../common/ErrorModal";
import Pagination from "../common/Pagination";
import TransactionReportPDFViewer, {
  TransactionReportColumn,
  TransactionReportRow,
} from "./TransactionReportPDFViewer";

type CrossEnrollmentRow = TransactionReportRow & {
  studentNumber: string;
  studentName: string;
  departmentName: string | null;
  homeProgramCode: string | null;
  homeMajorName: string | null;
  hostProgramCode: string | null;
  hostMajorName: string | null;
  courseCode: string | null;
  descriptiveTitle: string | null;
  unitsTotal: number;
  status: string;
  yearLevel: number | null;
  requestedAt: string | null;
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  border: `1px solid ${colors.neutralBorder}`,
  boxShadow: `0 14px 32px ${colors.neutralBorder}55`,
};

function formatStatus(status: string | null | undefined) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "pending_approval") return "Pending Approval";
  if (normalized === "approved") return "Approved";
  if (normalized === "rejected") return "Rejected";
  return normalized
    ? normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    : "Unknown";
}

export default function CrossEnrollmentReports() {
  const { currentTerm } = useAcademicTerm();
  const { programs, loading: programsLoading } = useProgramsWithMajors();
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [programMajorFilter, setProgramMajorFilter] = useState("");
  const [yearLevelFilter, setYearLevelFilter] = useState("");
  const [rows, setRows] = useState<CrossEnrollmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
    details: "",
  });

  const currentTermLabel = useMemo(() => {
    if (!currentTerm) return "Loading current term...";
    return `${currentTerm.semester} Semester, ${currentTerm.academicYear}`;
  }, [currentTerm]);

  const fetchReport = async () => {
    if (!currentTerm) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        academicYear: currentTerm.academicYear,
        semester: currentTerm.semester === "First" ? "1" : "2",
        status: "all",
      });
      const response = await fetch(`/api/auth/cross-enrollment?${params.toString()}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to load inter-program subject report.");
      }

      const nextRows = Array.isArray(result.data)
        ? result.data.map((item: any) => ({
            id: item.id,
            studentNumber: item.studentNumber,
            studentName: item.studentName,
            departmentName: item.departmentName || null,
            homeProgramCode: item.homeProgramCode || null,
            homeMajorName: item.homeMajorName || null,
            hostProgramCode: item.hostProgramCode || null,
            hostMajorName: item.hostMajorName || null,
            courseCode: item.courseCode || null,
            descriptiveTitle: item.descriptiveTitle || null,
            unitsTotal: Number(item.unitsTotal || 0),
            status: formatStatus(item.status),
            yearLevel: item.yearLevel ?? null,
            requestedAt: item.requestedAt
              ? new Date(item.requestedAt).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                })
              : null,
            homeProgram: [item.homeProgramCode, item.homeMajorName]
              .filter(Boolean)
              .join(" - "),
            hostProgram: [item.hostProgramCode, item.hostMajorName]
              .filter(Boolean)
              .join(" - "),
            subject: [item.courseCode, item.descriptiveTitle]
              .filter(Boolean)
              .join(" - "),
            yearLevelLabel: item.yearLevel ? `Year ${item.yearLevel}` : "N/A",
          }))
        : [];

      setRows(nextRows);
    } catch (error) {
      setRows([]);
      setErrorModal({
        isOpen: true,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load inter-program subject report.",
        details: "",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [currentTerm]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const departmentMatch = !departmentFilter || row.departmentName === departmentFilter;
      const yearMatch = !yearLevelFilter || String(row.yearLevel || "") === yearLevelFilter;

      let programMatch = true;
      if (programMajorFilter) {
        const option = programs.find((item) => item.value === programMajorFilter);
        const label = String(option?.label || "").toLowerCase();
        const parsed = parseProgramFilter(programMajorFilter);
        const home = `${row.homeProgramCode || ""} ${row.homeMajorName || ""}`.toLowerCase();
        const host = `${row.hostProgramCode || ""} ${row.hostMajorName || ""}`.toLowerCase();
        programMatch =
          home.includes(label) ||
          host.includes(label) ||
          (parsed.programId ? label.length > 0 : true);
      }

      return departmentMatch && yearMatch && programMatch;
    });
  }, [departmentFilter, programMajorFilter, yearLevelFilter, programs, rows]);

  useEffect(() => {
    setCurrentPage(1);
  }, [departmentFilter, programMajorFilter, yearLevelFilter, filteredRows.length]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [currentPage, filteredRows, itemsPerPage]);

  const summary = useMemo(() => {
    return {
      totalRequests: filteredRows.length,
      uniqueStudents: new Set(filteredRows.map((row) => row.studentNumber)).size,
      totalUnits: filteredRows.reduce((sum, row) => sum + Number(row.unitsTotal || 0), 0),
      approvedCount: filteredRows.filter((row) => row.status === "Approved").length,
      pendingCount: filteredRows.filter((row) => row.status === "Pending Approval").length,
    };
  }, [filteredRows]);

  const departmentOptions = useMemo(() => {
    return Array.from(
      new Set(rows.map((row) => row.departmentName).filter(Boolean)),
    ) as string[];
  }, [rows]);

  const columns: TransactionReportColumn[] = [
    { key: "studentName", label: "Student" },
    { key: "departmentName", label: "Department" },
    { key: "homeProgram", label: "Home Program" },
    { key: "hostProgram", label: "Host Program" },
    { key: "subject", label: "Subject" },
    { key: "unitsTotal", label: "Units", align: "center" },
    { key: "status", label: "Status" },
    { key: "requestedAt", label: "Requested At" },
  ];

  const filtersLabel = [
    departmentFilter || "All Departments",
    programs.find((item) => item.value === programMajorFilter)?.label ||
      "All Programs / Majors",
    yearLevelFilter ? `Year ${yearLevelFilter}` : "All Year Levels",
  ].join(" • ");

  return (
    <div className='min-h-screen p-6' style={{ backgroundColor: colors.paper }}>
      <div className='mx-auto flex w-full max-w-7xl flex-col gap-6'>
        <section className='overflow-hidden rounded-3xl px-6 py-6' style={cardStyle}>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div className='flex items-center gap-3'>
              <div
                className='flex h-12 w-12 items-center justify-center rounded-2xl'
                style={{ backgroundColor: `${colors.secondary}12`, color: colors.secondary }}
              >
                <BookOpen className='h-6 w-6' />
              </div>
              <div>
                <h1 className='text-3xl font-bold tracking-tight' style={{ color: colors.primary }}>
                  Inter-Program Subject Reports
                </h1>
                <p className='mt-1 text-sm leading-6' style={{ color: colors.tertiary }}>
                  Review inter-program subject requests for the current term and open a PDF-ready report viewer.
                </p>
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-3'>
              <button
                type='button'
                onClick={() => fetchReport()}
                disabled={isLoading}
                className='inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold'
                style={{ border: `1px solid ${colors.neutralBorder}`, backgroundColor: "white", color: colors.primary }}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                type='button'
                onClick={() => setIsViewerOpen(true)}
                disabled={isLoading || filteredRows.length === 0}
                className='inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60'
                style={{ backgroundColor: colors.secondary }}
              >
                <Printer className='h-4 w-4' />
                Open PDF Viewer
              </button>
            </div>
          </div>
        </section>

        <section className='overflow-hidden rounded-3xl' style={cardStyle}>
          <div className='border-b px-6 py-6' style={{ borderColor: colors.neutralBorder }}>
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
                style={{ border: `1px solid ${colors.neutralBorder}`, backgroundColor: "white", color: colors.primary }}
              >
                <option value=''>All Departments</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
              <select
                value={programMajorFilter}
                onChange={(event) => setProgramMajorFilter(event.target.value)}
                disabled={programsLoading}
                className='h-11 rounded-xl px-3 text-sm outline-none'
                style={{ border: `1px solid ${colors.neutralBorder}`, backgroundColor: "white", color: colors.primary }}
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
                style={{ border: `1px solid ${colors.neutralBorder}`, backgroundColor: "white", color: colors.primary }}
              >
                <option value=''>All Year Levels</option>
                <option value='1'>1st Year</option>
                <option value='2'>2nd Year</option>
                <option value='3'>3rd Year</option>
                <option value='4'>4th Year</option>
              </select>
              <div
                className='flex items-center rounded-xl px-4 py-3 text-sm font-medium'
                style={{ backgroundColor: `${colors.secondary}08`, border: `1px solid ${colors.secondary}22`, color: colors.primary }}
              >
                Current Term: {currentTermLabel}
              </div>
            </div>
          </div>

          <div className='grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-5'>
            {[
              { label: "Requests", value: summary.totalRequests },
              { label: "Students", value: summary.uniqueStudents },
              { label: "Units", value: summary.totalUnits },
              { label: "Approved", value: summary.approvedCount },
              { label: "Pending", value: summary.pendingCount },
            ].map((item) => (
              <div key={item.label} className='rounded-2xl px-5 py-4' style={{ backgroundColor: "white", border: `1px solid ${colors.neutralBorder}` }}>
                <div className='text-[11px] font-semibold uppercase tracking-[0.18em]' style={{ color: colors.neutral }}>
                  {item.label}
                </div>
                <div className='mt-2 text-2xl font-bold' style={{ color: colors.primary }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className='flex flex-col items-center justify-center gap-3 px-6 py-20'>
              <Loader2 className='h-8 w-8 animate-spin' style={{ color: colors.secondary }} />
              <p className='text-sm font-medium' style={{ color: colors.tertiary }}>
                Loading inter-program subject report...
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className='flex flex-col items-center justify-center gap-3 px-6 py-20'>
              <FileText className='h-8 w-8' style={{ color: colors.neutral }} />
              <p className='text-sm font-medium' style={{ color: colors.primary }}>
                No inter-program subject records found for the selected filters.
              </p>
            </div>
          ) : (
            <>
              <div className='overflow-x-auto px-6 py-6'>
                <table className='min-w-full'>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.neutralBorder}` }}>
                      {columns.map((column) => (
                        <th
                          key={column.key}
                          className={`px-4 py-4 text-[12px] font-semibold uppercase tracking-[0.18em] ${
                            column.align === "center" ? "text-center" : "text-left"
                          }`}
                          style={{ color: colors.neutral }}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => (
                      <tr
                        key={row.id}
                        style={{ borderBottom: `1px solid ${colors.neutralBorder}` }}
                      >
                        <td className='px-4 py-5 text-sm' style={{ color: colors.primary }}>
                          <div className='font-semibold'>{row.studentName}</div>
                          <div className='text-xs' style={{ color: colors.tertiary }}>
                            {row.studentNumber}
                          </div>
                        </td>
                        <td className='px-4 py-5 text-sm' style={{ color: colors.primary }}>
                          {row.departmentName || "N/A"}
                        </td>
                        <td className='px-4 py-5 text-sm' style={{ color: colors.primary }}>
                          <div className='font-semibold'>{row.homeProgramCode || "N/A"}</div>
                          <div className='text-xs' style={{ color: colors.tertiary }}>
                            {row.homeMajorName || "No major"}
                          </div>
                        </td>
                        <td className='px-4 py-5 text-sm' style={{ color: colors.primary }}>
                          <div className='font-semibold'>{row.hostProgramCode || "N/A"}</div>
                          <div className='text-xs' style={{ color: colors.tertiary }}>
                            {row.hostMajorName || "No major"}
                          </div>
                        </td>
                        <td className='px-4 py-5 text-sm' style={{ color: colors.primary }}>
                          <div className='font-semibold'>{row.courseCode || "N/A"}</div>
                          <div className='text-xs' style={{ color: colors.tertiary }}>
                            {row.descriptiveTitle || "No subject title"}
                          </div>
                        </td>
                        <td className='px-4 py-5 text-center text-sm' style={{ color: colors.primary }}>
                          {row.unitsTotal}
                        </td>
                        <td className='px-4 py-5 text-sm'>
                          <span
                            className='inline-flex rounded-full px-3 py-1 text-xs font-semibold'
                            style={{
                              backgroundColor:
                                row.status === "Approved"
                                  ? `${colors.success}16`
                                  : row.status === "Pending Approval"
                                    ? `${colors.warning}16`
                                    : `${colors.danger}16`,
                              color:
                                row.status === "Approved"
                                  ? colors.success
                                  : row.status === "Pending Approval"
                                    ? colors.warning
                                    : colors.danger,
                            }}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className='px-4 py-5 text-sm' style={{ color: colors.primary }}>
                          {row.requestedAt || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ borderTop: `1px solid ${colors.neutralBorder}`, backgroundColor: `${colors.neutralLight}66` }}>
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.max(1, Math.ceil(filteredRows.length / itemsPerPage))}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredRows.length}
                  itemName='inter-program subject records'
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
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

      {isViewerOpen && (
        <TransactionReportPDFViewer
          title='Inter-Program Subject Report'
          rows={filteredRows}
          columns={columns}
          onClose={() => setIsViewerOpen(false)}
          academicYear={currentTerm?.academicYear || "Current Academic Year"}
          semesterLabel={currentTerm?.semester ? `${currentTerm.semester} Semester` : "Current Semester"}
          filtersLabel={filtersLabel}
        />
      )}
    </div>
  );
}
