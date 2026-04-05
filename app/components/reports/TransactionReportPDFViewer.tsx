"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { Filter, Printer, X } from "lucide-react";
import { colors } from "../../colors";

export type TransactionReportColumn = {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
};

export type TransactionReportRow = {
  id: number | string;
  status?: string | null;
  [key: string]: string | number | boolean | null | undefined;
};

interface TransactionReportPDFViewerProps {
  title: string;
  rows: TransactionReportRow[];
  columns: TransactionReportColumn[];
  onClose: () => void;
  academicYear: string;
  semesterLabel: string;
  filtersLabel: string;
}

function formatCellValue(value: TransactionReportRow[string]) {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export default function TransactionReportPDFViewer({
  title,
  rows,
  columns,
  onClose,
  academicYear,
  semesterLabel,
  filtersLabel,
}: TransactionReportPDFViewerProps) {
  const [statusFilter, setStatusFilter] = useState("all");

  const statusOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .map((row) => String(row.status || "").trim())
          .filter(Boolean),
      ),
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((row) => String(row.status || "") === statusFilter);
  }, [rows, statusFilter]);

  return (
    <div
      className='fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm print:bg-white print:overflow-visible'
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
            .transaction-report-shell {
              box-shadow: none !important;
              margin: 0 !important;
              max-width: none !important;
              border-radius: 0 !important;
              width: 100% !important;
            }
            .transaction-report-table {
              table-layout: fixed !important;
              width: 100% !important;
              font-size: 10px !important;
            }
            .transaction-report-table th,
            .transaction-report-table td {
              padding: 5px 6px !important;
              vertical-align: top !important;
              word-break: break-word !important;
              overflow-wrap: anywhere !important;
            }
          }
        `}
      </style>

      <div
        className='flex min-h-screen items-start justify-center p-4 md:p-8'
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className='transaction-report-shell w-full max-w-7xl overflow-hidden rounded-3xl shadow-2xl'
          style={{ backgroundColor: colors.paper }}
        >
          <div
            className='print-hidden flex flex-col gap-4 border-b px-6 py-5 lg:flex-row lg:items-center lg:justify-between'
            style={{ borderColor: `${colors.primary}20` }}
          >
            <div>
              <h2 className='text-2xl font-bold' style={{ color: colors.primary }}>
                {title}
              </h2>
              <p className='text-sm opacity-70' style={{ color: colors.primary }}>
                Preview, filter, and print the report.
              </p>
            </div>
            <div className='flex items-center gap-3'>
              <button
                type='button'
                onClick={() => window.print()}
                className='inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-white'
                style={{ backgroundColor: colors.secondary }}
              >
                <Printer className='h-4 w-4' />
                Print / Save PDF
              </button>
              <button
                type='button'
                onClick={onClose}
                className='inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 font-semibold hover:bg-black/5'
                style={{ borderColor: colors.tertiary, color: colors.primary }}
              >
                <X className='h-4 w-4' />
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
            <div className='mb-4 flex items-center gap-2'>
              <Filter className='h-4 w-4' style={{ color: colors.secondary }} />
              <span className='text-sm font-semibold' style={{ color: colors.primary }}>
                Report Filters
              </span>
            </div>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <label className='flex flex-col gap-1.5 text-sm'>
                <span
                  className='text-[10px] font-bold uppercase tracking-widest opacity-60'
                  style={{ color: colors.primary }}
                >
                  Status
                </span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className='rounded-xl border bg-white px-3 py-2.5 font-medium'
                  style={{
                    borderColor: `${colors.tertiary}40`,
                    color: colors.primary,
                  }}
                >
                  <option value='all'>All Statuses</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className='px-6 py-8 md:px-10'>
            <div className='mx-auto w-full max-w-6xl border border-gray-300 bg-white p-6 md:p-10'>
              <div className='mb-8 flex items-center justify-center gap-4'>
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

              <div className='space-y-1 text-center'>
                <h1 className='text-3xl font-bold uppercase' style={{ color: colors.primary }}>
                  {title}
                </h1>
                <p className='text-lg font-semibold text-gray-700'>{academicYear}</p>
                <p className='text-base font-semibold uppercase text-gray-600'>
                  {semesterLabel}
                </p>
              </div>

              <div className='mt-6 grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div
                  className='rounded-2xl border px-5 py-4'
                  style={{
                    backgroundColor: colors.paper,
                    borderColor: `${colors.tertiary}30`,
                  }}
                >
                  <p
                    className='text-[10px] font-bold uppercase tracking-widest opacity-60'
                    style={{ color: colors.primary }}
                  >
                    Filters Applied
                  </p>
                  <p className='mt-1 text-sm font-bold' style={{ color: colors.primary }}>
                    {filtersLabel}
                  </p>
                </div>
                <div
                  className='rounded-2xl border px-5 py-4 md:text-right'
                  style={{
                    backgroundColor: `${colors.secondary}10`,
                    borderColor: `${colors.secondary}30`,
                  }}
                >
                  <p
                    className='text-[10px] font-bold uppercase tracking-widest opacity-60'
                    style={{ color: colors.secondary }}
                  >
                    Total Records
                  </p>
                  <p className='mt-1 text-2xl font-black' style={{ color: colors.secondary }}>
                    {filteredRows.length}
                  </p>
                </div>
              </div>

              <div
                className='mt-8 overflow-x-auto overflow-hidden rounded-xl border'
                style={{ borderColor: colors.primary }}
              >
                <table
                  className='transaction-report-table w-full border-collapse text-sm'
                  style={{ color: colors.primary }}
                >
                  <thead>
                    <tr style={{ backgroundColor: colors.primary, color: colors.paper }}>
                      <th className='border border-gray-700 px-3 py-3 text-center font-bold'>
                        No.
                      </th>
                      {columns.map((column) => (
                        <th
                          key={column.key}
                          className={`border border-gray-700 px-3 py-3 font-bold ${
                            column.align === "center"
                              ? "text-center"
                              : column.align === "right"
                                ? "text-right"
                                : "text-left"
                          }`}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={columns.length + 1}
                          className='px-3 py-12 text-center font-medium italic opacity-50'
                        >
                          No records match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, index) => (
                        <tr key={row.id}>
                          <td className='border border-gray-300 px-3 py-2 text-center font-bold opacity-70'>
                            {index + 1}
                          </td>
                          {columns.map((column) => (
                            <td
                              key={`${row.id}-${column.key}`}
                              className={`border border-gray-300 px-3 py-2 ${
                                column.align === "center"
                                  ? "text-center"
                                  : column.align === "right"
                                    ? "text-right"
                                    : "text-left"
                              }`}
                            >
                              {formatCellValue(row[column.key])}
                            </td>
                          ))}
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
