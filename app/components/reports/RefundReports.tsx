"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Filter, Loader2, Printer, RefreshCw } from "lucide-react";
import { colors } from "../../colors";
import { useAcademicTerm } from "../../hooks/useAcademicTerm";
import { useProgramsWithMajors } from "../../hooks/useProgramsWithMajors";
import { parseProgramFilter } from "../../utils/programUtils";
import ActiveTermCard from "../common/ActiveTermCard";
import ErrorModal from "../common/ErrorModal";
import Pagination from "../common/Pagination";
import TransactionReportPDFViewer, {
  TransactionReportColumn,
  TransactionReportRow,
} from "./TransactionReportPDFViewer";

type RefundReportRow = TransactionReportRow & {
  studentNumber: string;
  studentName: string;
  departmentName: string;
  programMajor: string;
  yearLevel: number | null;
  courseCode: string;
  descriptiveTitle: string;
  refundAmount: number;
  payoutAmount: number;
  adjustmentAmount: number;
  referenceNo: string;
  processedAtLabel: string;
  disposition: string;
  status: string;
  refundDetailsLabel?: string;
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  border: `1px solid ${colors.neutralBorder}`,
  boxShadow: `0 14px 32px ${colors.neutralBorder}55`,
};

function formatPeso(amount: number | null | undefined) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(amount || 0));
}

export default function RefundReports() {
  const { currentTerm } = useAcademicTerm();
  const { programs, loading: programsLoading } = useProgramsWithMajors();
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [programMajorFilter, setProgramMajorFilter] = useState("");
  const [yearLevelFilter, setYearLevelFilter] = useState("");
  const [rows, setRows] = useState<RefundReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [summary, setSummary] = useState({
    totalRefunds: 0,
    uniqueStudents: 0,
    totalRefundAmount: 0,
    totalCashPayout: 0,
    totalAdjustment: 0,
  });
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
      });

      if (departmentFilter) params.set("departmentId", departmentFilter);

      if (programMajorFilter) {
        const parsed = parseProgramFilter(programMajorFilter);
        if (parsed.programId) {
          params.set("programId", String(parsed.programId));
        }
        if (parsed.majorId) {
          params.set("majorId", String(parsed.majorId));
        }
      }

      if (yearLevelFilter) params.set("yearLevel", yearLevelFilter);

      const response = await fetch(
        `/api/auth/refunds/report?${params.toString()}`,
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load refund report.");
      }

      const nextRows = Array.isArray(result.rows)
        ? result.rows.map((item: any) => ({
            ...item,
            programMajor: [item.programCode || item.programName, item.majorName]
              .filter(Boolean)
              .join(" - ") || "N/A",
            subject: [item.courseCode, item.descriptiveTitle]
              .filter(Boolean)
              .join(" - "),
            refundAmountLabel: formatPeso(Number(item.refundAmount || 0)),
            payoutAmountLabel: formatPeso(Number(item.payoutAmount || 0)),
            adjustmentAmountLabel: formatPeso(Number(item.adjustmentAmount || 0)),
            refundDetailsLabel: `Refund: ${formatPeso(Number(item.refundAmount || 0))} | Adjusted: ${formatPeso(Number(item.adjustmentAmount || 0))}`,
            yearLevelLabel: item.yearLevel ? `Year ${item.yearLevel}` : "N/A",
          }))
        : [];

      setRows(nextRows);
      setSummary(
        result.summary || {
          totalRefunds: 0,
          uniqueStudents: 0,
          totalRefundAmount: 0,
          totalCashPayout: 0,
          totalAdjustment: 0,
        },
      );
    } catch (error) {
      setRows([]);
      setSummary({
        totalRefunds: 0,
        uniqueStudents: 0,
        totalRefundAmount: 0,
        totalCashPayout: 0,
        totalAdjustment: 0,
      });
      setErrorModal({
        isOpen: true,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load refund report.",
        details: "",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [currentTerm, departmentFilter, programMajorFilter, yearLevelFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [departmentFilter, programMajorFilter, yearLevelFilter, rows.length]);

  const departmentOptions = useMemo(() => {
    return Array.from(
      new Set(rows.map((row) => row.departmentName).filter(Boolean)),
    ) as string[];
  }, [rows]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return rows.slice(start, start + itemsPerPage);
  }, [currentPage, itemsPerPage, rows]);

  const columns: TransactionReportColumn[] = [
    { key: "studentName", label: "Student" },
    { key: "programMajor", label: "Program / Major" },
    { key: "subject", label: "Subject" },
    { key: "refundDetailsLabel", label: "Refund Details" },
    { key: "payoutAmountLabel", label: "Cash Payout", align: "right" },
    { key: "disposition", label: "Disposition" },
    { key: "referenceNo", label: "Reference No." },
    { key: "processedAtLabel", label: "Processed At" },
    { key: "status", label: "Status" },
  ];

  const filtersLabel = [
    departmentFilter || "All Departments",
    programs.find((item) => item.value === programMajorFilter)?.label ||
      "All Programs / Majors",
    yearLevelFilter ? `Year ${yearLevelFilter}` : "All Year Levels",
  ].join(" • ");

  return (
    <div className='min-h-screen p-5' style={{ backgroundColor: colors.paper }}>
      <div className='mx-auto flex w-full max-w-7xl flex-col gap-4'>
        <section className='overflow-hidden rounded-3xl px-5 py-5' style={cardStyle}>
          <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
            <div>
              <h1 className='text-[2rem] font-bold tracking-tight' style={{ color: colors.primary }}>
                Refund Reports
              </h1>
              <p className='mt-1 text-sm leading-5' style={{ color: colors.tertiary }}>
                Review processed subject refunds, including assessment adjustments and cash payouts, with a PDF-ready report viewer.
              </p>
            </div>

            <ActiveTermCard value={currentTermLabel} />
          </div>
        </section>

        <section className='overflow-hidden rounded-3xl' style={cardStyle}>
          <div className='border-b px-5 py-5' style={{ borderColor: colors.neutralBorder }}>
            <div className='flex items-center gap-2'>
              <Filter className='h-4 w-4' style={{ color: colors.secondary }} />
              <h2 className='text-lg font-semibold' style={{ color: colors.primary }}>
                Report Filters
              </h2>
            </div>
            <div className='mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
              <select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                className='h-10 rounded-xl px-3 text-sm outline-none'
                style={{
                  border: `1px solid ${colors.neutralBorder}`,
                  backgroundColor: "white",
                  color: colors.primary,
                }}
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
                className='h-10 rounded-xl px-3 text-sm outline-none'
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
                className='h-10 rounded-xl px-3 text-sm outline-none'
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
                <option value='5'>5th Year</option>
              </select>

              <div className='flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-2 xl:justify-end'>
                <button
                  type='button'
                  onClick={() => fetchReport()}
                  disabled={isLoading}
                  className='inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold'
                  style={{
                    border: `1px solid ${colors.neutralBorder}`,
                    backgroundColor: "white",
                    color: colors.primary,
                  }}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  type='button'
                  onClick={() => setIsViewerOpen(true)}
                  disabled={isLoading || rows.length === 0}
                  className='inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60'
                  style={{ backgroundColor: colors.secondary }}
                >
                  <Printer className='h-4 w-4' />
                  Open PDF Viewer
                </button>
              </div>
            </div>
          </div>

          <div className='grid gap-3 px-5 py-4 md:grid-cols-2 xl:grid-cols-5'>
            {[
              { label: "Refund Transactions", value: summary.totalRefunds, formatter: String },
              { label: "Students", value: summary.uniqueStudents, formatter: String },
              { label: "Total Refund", value: summary.totalRefundAmount, formatter: formatPeso },
              { label: "Cash Payout", value: summary.totalCashPayout, formatter: formatPeso },
              { label: "Assessment Adjustment", value: summary.totalAdjustment, formatter: formatPeso },
            ].map((item) => (
              <div
                key={item.label}
                className='rounded-2xl px-4 py-3'
                style={{
                  border: `1px solid ${colors.neutralBorder}`,
                  backgroundColor: "white",
                }}
              >
                <p className='text-xs font-bold uppercase tracking-[0.22em]' style={{ color: colors.tertiary }}>
                  {item.label}
                </p>
                <p className='mt-2 text-[2rem] font-bold leading-none' style={{ color: colors.primary }}>
                  {item.formatter(item.value as never)}
                </p>
              </div>
            ))}
          </div>

          <div className='px-5 pb-5'>
            <div
              className='overflow-hidden rounded-2xl border'
              style={{ borderColor: colors.neutralBorder }}
            >
              <div className='overflow-x-auto'>
                <table className='min-w-full border-collapse'>
                  <thead>
                    <tr style={{ backgroundColor: `${colors.secondary}10` }}>
                      {[
                        "Student",
                        "Program / Major",
                        "Subject",
                        "Refund Details",
                        "Cash Payout",
                        "Disposition",
                        "Reference",
                        "Processed",
                      ].map((label) => (
                        <th
                          key={label}
                          className='px-3 py-3 text-left text-xs font-bold uppercase tracking-[0.16em]'
                          style={{ color: colors.primary }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className='px-3 py-12 text-center'>
                          <div className='flex items-center justify-center gap-3 text-sm' style={{ color: colors.tertiary }}>
                            <Loader2 className='h-5 w-5 animate-spin' />
                            Loading refund report...
                          </div>
                        </td>
                      </tr>
                    ) : paginatedRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className='px-3 py-12 text-center text-sm' style={{ color: colors.tertiary }}>
                          No processed refunds found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row) => (
                        <tr
                          key={row.id}
                          className='border-t'
                          style={{ borderColor: `${colors.neutralBorder}` }}
                        >
                          <td className='px-3 py-3 text-sm'>
                            <div className='font-semibold' style={{ color: colors.primary }}>
                              {row.studentName}
                            </div>
                            <div className='text-xs' style={{ color: colors.tertiary }}>
                              {row.studentNumber}
                            </div>
                          </td>
                          <td className='px-3 py-3 text-sm' style={{ color: colors.primary }}>
                            <div>{row.programMajor}</div>
                            <div className='text-xs' style={{ color: colors.tertiary }}>
                              {row.yearLevel ? `Year ${row.yearLevel}` : "N/A"}
                            </div>
                          </td>
                          <td className='px-3 py-3 text-sm'>
                            <div className='font-semibold' style={{ color: colors.primary }}>
                              {row.courseCode || "N/A"}
                            </div>
                            <div className='text-xs' style={{ color: colors.tertiary }}>
                              {row.descriptiveTitle || "N/A"}
                            </div>
                          </td>
                          <td className='px-3 py-3 text-sm'>
                            <div className='font-semibold' style={{ color: colors.primary }}>
                              Refund: {formatPeso(row.refundAmount)}
                            </div>
                            <div className='text-xs font-medium' style={{ color: colors.secondary }}>
                              Adjusted: {formatPeso(row.adjustmentAmount)}
                            </div>
                          </td>
                          <td className='px-3 py-3 text-sm font-semibold text-right' style={{ color: "#15803d" }}>
                            {formatPeso(row.payoutAmount)}
                          </td>
                          <td className='px-3 py-3 text-sm' style={{ color: colors.primary }}>
                            {row.disposition}
                          </td>
                          <td className='px-3 py-3 text-sm' style={{ color: colors.primary }}>
                            {row.referenceNo}
                          </td>
                          <td className='px-3 py-3 text-sm' style={{ color: colors.primary }}>
                            {row.processedAtLabel}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className='border-t px-5 py-4' style={{ borderColor: colors.neutralBorder }}>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.max(1, Math.ceil(rows.length / itemsPerPage))}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
              totalItems={rows.length}
              itemName='refunds'
            />
          </div>
        </section>
      </div>

      {isViewerOpen ? (
        <TransactionReportPDFViewer
          title='Refund Reports'
          rows={rows}
          columns={columns}
          onClose={() => setIsViewerOpen(false)}
          academicYear={currentTerm?.academicYear || ""}
          semesterLabel={currentTerm?.semester ? `${currentTerm.semester} Semester` : ""}
          filtersLabel={filtersLabel}
        />
      ) : null}

      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        details={errorModal.details}
        onClose={() =>
          setErrorModal({
            isOpen: false,
            message: "",
            details: "",
          })
        }
      />
    </div>
  );
}
