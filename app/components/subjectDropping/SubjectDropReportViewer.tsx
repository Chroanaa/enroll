"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { Filter, Printer, X } from "lucide-react";
import { colors } from "../../colors";

export interface SubjectDropReportRow {
  id: number;
  studentNumber: string;
  studentName: string;
  courseCode: string;
  descriptiveTitle: string;
  unitsTotal: number;
  status: string;
  droppedAt: string | null;
  dropReason: string;
  refundable: boolean;
  academicYear: string;
  semester: number;
  yearLevel: number | null;
  programId: number | null;
  programCode: string | null;
  programName: string | null;
  majorId: number | null;
  majorName: string | null;
  departmentId: number | null;
  departmentName: string | null;
}

interface SubjectDropReportViewerProps {
  rows: SubjectDropReportRow[];
  onClose: () => void;
  academicYear: string;
  semesterLabel: string;
  selectedDepartmentLabel: string;
  selectedMajorLabel: string;
  selectedYearLevelLabel: string;
}

function formatDate(value: string | null) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function SubjectDropReportViewer({
  rows,
  onClose,
  academicYear,
  semesterLabel,
  selectedDepartmentLabel,
  selectedMajorLabel,
  selectedYearLevelLabel,
}: SubjectDropReportViewerProps) {
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  return (
    <div
      className='fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto print:bg-white print:overflow-visible'
      onClick={onClose}
    >
      <style type='text/css' media='print'>
        {`
          @page {
            size: landscape;
            margin: 6mm;
          }

          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
            }

            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background: #fff !important;
            }

            .print-hidden {
              display: none !important;
            }

            .subject-drop-shell {
              box-shadow: none !important;
              margin: 0 !important;
              max-width: none !important;
              border-radius: 0 !important;
              width: 100% !important;
            }

            #subject-drop-report-print-area,
            #subject-drop-report-print-area * {
              color: #000 !important;
            }

            #subject-drop-report-print-area {
              border: none !important;
              padding: 0 !important;
              max-width: none !important;
              margin: 0 auto !important;
            }

            .subject-drop-table {
              table-layout: fixed !important;
              width: 100% !important;
              font-size: 10px !important;
            }

            .subject-drop-table th,
            .subject-drop-table td {
              padding: 5px 6px !important;
              vertical-align: top !important;
              word-break: break-word !important;
              overflow-wrap: anywhere !important;
            }
          }
        `}
      </style>

      <div
        className='min-h-screen p-4 md:p-8 flex items-start justify-center'
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className='subject-drop-shell w-full max-w-7xl rounded-3xl shadow-2xl overflow-hidden'
          style={{ backgroundColor: colors.paper }}
        >
          <div
            className='print-hidden border-b px-6 py-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'
            style={{ borderColor: `${colors.primary}20` }}
          >
            <div>
              <h2 className='text-2xl font-bold' style={{ color: colors.primary }}>
                Subject Dropping Report
              </h2>
              <p className='text-sm opacity-70' style={{ color: colors.primary }}>
                Preview, filter, and print the current subject drop report.
              </p>
            </div>

            <div className='flex items-center gap-3'>
              <button
                type='button'
                onClick={() => window.print()}
                className='inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-white font-semibold transition-all hover:opacity-90 active:scale-95 shadow-sm'
                style={{ backgroundColor: colors.secondary }}
              >
                <Printer className='w-4 h-4' />
                Print / Save PDF
              </button>
              <button
                type='button'
                onClick={onClose}
                className='inline-flex items-center gap-2 rounded-xl px-5 py-2.5 border font-semibold transition-all hover:bg-black/5 active:scale-95'
                style={{ borderColor: colors.tertiary, color: colors.primary }}
              >
                <X className='w-4 h-4' />
                Close
              </button>
            </div>
          </div>

          <div
            className='print-hidden border-b px-6 py-5'
            style={{
              backgroundColor: `${colors.accent}10`,
              borderColor: `${colors.primary}10`,
            }}
          >
            <div className='flex items-center gap-2 mb-4'>
              <Filter className='w-4 h-4' style={{ color: colors.secondary }} />
              <span className='text-sm font-semibold' style={{ color: colors.primary }}>
                Report Filters
              </span>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <label className='flex flex-col gap-1.5 text-sm'>
                <span className='font-bold uppercase tracking-widest text-[10px] opacity-60' style={{ color: colors.primary }}>
                  Status
                </span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className='rounded-xl border px-3 py-2.5 bg-white font-medium focus:outline-none focus:ring-2 transition-all'
                  style={{
                    borderColor: `${colors.tertiary}40`,
                    color: colors.primary,
                  }}
                >
                  <option value='all'>All Statuses</option>
                  <option value='Dropped'>Dropped</option>
                  <option value='Pending Approval'>Pending Approval</option>
                </select>
              </label>
            </div>
          </div>

          <div className='px-6 py-8 md:px-10'>
            <div
              className='mx-auto w-full max-w-6xl border border-gray-300 bg-white p-6 md:p-10'
              id='subject-drop-report-print-area'
            >
              <div className='mb-8'>
                <div className='flex items-center justify-center gap-4'>
                  <div className='relative h-16 w-16 shrink-0'>
                    <Image
                      src='/logo.png'
                      alt='School Logo'
                      fill
                      className='object-contain'
                      priority
                    />
                  </div>
                  <div className='text-center'>
                    <h1
                      className='text-2xl font-black uppercase tracking-wide'
                      style={{ color: colors.primary }}
                    >
                      Colegio de Sta. Teresa de Avila
                    </h1>
                    <p
                      className='text-sm font-semibold uppercase tracking-[0.2em]'
                      style={{ color: colors.secondary }}
                    >
                      Enrollment System Dashboard
                    </p>
                  </div>
                </div>
              </div>

              <div className='text-center space-y-1'>
                <h1 className='text-3xl font-bold' style={{ color: colors.primary }}>
                  SUBJECT DROPPING REPORT
                </h1>
                <p className='text-lg font-semibold text-gray-700'>{academicYear}</p>
                <p className='text-base font-semibold text-gray-600 uppercase'>
                  {semesterLabel}
                </p>
              </div>

              <div className='mt-6 grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div
                  className='rounded-2xl border px-5 py-4 transition-all'
                  style={{
                    backgroundColor: colors.paper,
                    borderColor: `${colors.tertiary}30`,
                  }}
                >
                  <p className='text-[10px] uppercase font-bold tracking-widest opacity-60' style={{ color: colors.primary }}>
                    Filters Applied
                  </p>
                  <p className='mt-1 text-sm font-bold' style={{ color: colors.primary }}>
                    {selectedDepartmentLabel} • {selectedMajorLabel} • {selectedYearLevelLabel}
                  </p>
                </div>
                <div
                  className='rounded-2xl border px-5 py-4 md:text-right'
                  style={{
                    backgroundColor: `${colors.secondary}10`,
                    borderColor: `${colors.secondary}30`,
                  }}
                >
                  <p className='text-[10px] uppercase font-bold tracking-widest opacity-60' style={{ color: colors.secondary }}>
                    Total Records
                  </p>
                  <p className='mt-1 text-2xl font-black' style={{ color: colors.secondary }}>
                    {filteredRows.length} <span className='text-sm font-medium opacity-70'>Requests</span>
                  </p>
                </div>
              </div>

              <div className='mt-8 overflow-x-auto rounded-xl border overflow-hidden' style={{ borderColor: colors.primary }}>
                <table className='subject-drop-table w-full border-collapse text-sm' style={{ color: colors.primary }}>
                  <thead>
                    <tr style={{ backgroundColor: colors.primary, color: colors.paper }}>
                      <th className='border border-gray-700 px-3 py-3 text-center font-bold'>No.</th>
                      <th className='border border-gray-700 px-3 py-3 text-left font-bold'>Student</th>
                      <th className='border border-gray-700 px-3 py-3 text-left font-bold'>Department</th>
                      <th className='border border-gray-700 px-3 py-3 text-left font-bold'>Program / Major</th>
                      <th className='border border-gray-700 px-3 py-3 text-left font-bold'>Year</th>
                      <th className='border border-gray-700 px-3 py-3 text-left font-bold'>Subject</th>
                      <th className='border border-gray-700 px-3 py-3 text-center font-bold'>Units</th>
                      <th className='border border-gray-700 px-3 py-3 text-left font-bold'>Status</th>
                      <th className='border border-gray-700 px-3 py-3 text-left font-bold'>Dropped At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className='px-3 py-12 text-center font-medium italic opacity-50'>
                          No subject drop records match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, index) => (
                        <tr key={row.id}>
                          <td className='border border-gray-300 px-3 py-2 text-center font-bold opacity-70'>
                            {index + 1}
                          </td>
                          <td className='border border-gray-300 px-3 py-2'>
                            <div className='font-bold'>{row.studentName}</div>
                            <div className='text-xs opacity-75'>{row.studentNumber}</div>
                          </td>
                          <td className='border border-gray-300 px-3 py-2'>
                            {row.departmentName || "N/A"}
                          </td>
                          <td className='border border-gray-300 px-3 py-2'>
                            {[row.programCode, row.majorName || row.programName].filter(Boolean).join(" - ") || "N/A"}
                          </td>
                          <td className='border border-gray-300 px-3 py-2 text-center'>
                            {row.yearLevel ? `Year ${row.yearLevel}` : "N/A"}
                          </td>
                          <td className='border border-gray-300 px-3 py-2'>
                            <div className='font-bold'>{row.courseCode}</div>
                            <div className='text-xs opacity-75'>{row.descriptiveTitle}</div>
                          </td>
                          <td className='border border-gray-300 px-3 py-2 text-center'>
                            {row.unitsTotal}
                          </td>
                          <td className='border border-gray-300 px-3 py-2'>
                            {row.status}
                          </td>
                          <td className='border border-gray-300 px-3 py-2'>
                            {formatDate(row.droppedAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
