"use client";

import React, { useMemo, useState } from "react";
import { Filter, Printer, X } from "lucide-react";
import { colors } from "../../colors";
import { useAcademicTermContext } from "../../contexts/AcademicTermContext";
import { useProgramsWithMajors } from "../../hooks/useProgramsWithMajors";
import { formatProgramDisplay } from "../../utils/programUtils";
import {
  ENROLLMENT_STATUS_OPTIONS,
  getStatusLabel,
  normalizeEnrollmentStatus,
} from "./utils";

interface EnrollmentReportViewerProps {
  enrollments: Array<Record<string, any>>;
  onClose: () => void;
}

function normalizeGender(value: string | null | undefined): "male" | "female" | "" {
  const normalized = (value || "").trim().toLowerCase();

  if (normalized.startsWith("m")) {
    return "male";
  }

  if (normalized.startsWith("f")) {
    return "female";
  }

  return "";
}

function formatStudentName(enrollment: Record<string, any>) {
  return [
    enrollment.family_name,
    enrollment.first_name,
    enrollment.middle_name,
  ]
    .filter(Boolean)
    .join(", ")
    .replace(", ", ", ");
}

function formatEnrollmentDate(value: string | Date | null | undefined) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-PH", {
    year: "2-digit",
    month: "short",
    day: "2-digit",
  });
}

function formatProgramMajor(enrollment: Record<string, any>) {
  const programCode =
    enrollment.program_code || enrollment.course_program || "N/A";
  const majorName = enrollment.major_name || null;

  if (programCode === "N/A") {
    return "N/A";
  }

  return formatProgramDisplay(programCode, majorName);
}

export default function EnrollmentReportViewer({
  enrollments,
  onClose,
}: EnrollmentReportViewerProps) {
  const { currentTerm, storedSettings } = useAcademicTermContext();
  const { programs, loading: programsLoading } = useProgramsWithMajors();
  const [genderFilter, setGenderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [programMajorFilter, setProgramMajorFilter] = useState("all");

  const filteredEnrollments = useMemo(() => {
    const selectedProgram =
      programMajorFilter === "all"
        ? null
        : programs.find((program) => program.value === programMajorFilter) || null;
    const selectedStatus =
      statusFilter === "all" ? "all" : Number(statusFilter);

    return [...enrollments]
      .filter((enrollment) => {
        const enrollmentGender = normalizeGender(enrollment.sex);
        const enrollmentProgramId =
          enrollment.program_id !== null && enrollment.program_id !== undefined
            ? Number(enrollment.program_id)
            : Number.parseInt(enrollment.course_program || "", 10);
        const enrollmentMajorId =
          enrollment.major_id !== null && enrollment.major_id !== undefined
            ? Number(enrollment.major_id)
            : null;
        const enrollmentStatus = normalizeEnrollmentStatus(enrollment.status);

        const matchesGender =
          genderFilter === "all" || enrollmentGender === genderFilter;
        const matchesProgramMajor =
          selectedProgram === null ||
          (enrollmentProgramId === selectedProgram.programId &&
            (selectedProgram.majorId === null ||
              enrollmentMajorId === selectedProgram.majorId));
        const matchesStatus =
          selectedStatus === "all" || enrollmentStatus === selectedStatus;

        return matchesGender && matchesProgramMajor && matchesStatus;
      })
      .sort((a, b) => {
        const lastNameCompare = String(a.family_name || "").localeCompare(
          String(b.family_name || ""),
        );

        if (lastNameCompare !== 0) {
          return lastNameCompare;
        }

        return String(a.first_name || "").localeCompare(String(b.first_name || ""));
      });
  }, [enrollments, genderFilter, programMajorFilter, programs, statusFilter]);

  const selectedProgramMajorLabel =
    programMajorFilter === "all"
      ? "All Programs / Majors"
      : programs.find((program) => program.value === programMajorFilter)?.label ||
        "Selected Program / Major";

  const selectedStatusLabel =
    ENROLLMENT_STATUS_OPTIONS.find(
      (option) => String(option.value) === statusFilter,
    )?.label || "All Status";

  const selectedGenderLabel =
    genderFilter === "all"
      ? "All Genders"
      : genderFilter === "male"
        ? "Male"
        : "Female";

  const academicYearLabel =
    storedSettings?.academicYear ||
    currentTerm?.academicYear ||
    filteredEnrollments[0]?.academic_year ||
    enrollments[0]?.academic_year ||
    "All Academic Years";

  const termLabel = storedSettings?.semester
    ? `${storedSettings.semester.toUpperCase()} SEMESTER`
    : currentTerm?.semester
      ? `${currentTerm.semester.toUpperCase()} SEMESTER`
      : filteredEnrollments[0]?.term
        ? `${String(filteredEnrollments[0].term).toUpperCase()} SEMESTER`
        : enrollments[0]?.term
          ? `${String(enrollments[0].term).toUpperCase()} SEMESTER`
          : "ALL TERMS";

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

            .report-shell {
              box-shadow: none !important;
              margin: 0 !important;
              max-width: none !important;
              border-radius: 0 !important;
              width: 100% !important;
            }

            #enrollment-report-print-area,
            #enrollment-report-print-area * {
              color: #000 !important;
            }

            #enrollment-report-print-area {
              border: none !important;
              padding: 0 !important;
              max-width: none !important;
              margin: 0 auto !important;
            }

            .print-title {
              font-size: 24px !important;
              line-height: 1.1 !important;
            }

            .print-subtitle {
              font-size: 12px !important;
              line-height: 1.1 !important;
            }

            .print-meta {
              margin-top: 12px !important;
              gap: 8px !important;
            }

            .print-meta-box {
              padding: 8px 10px !important;
            }

            .print-table {
              table-layout: fixed !important;
              width: 100% !important;
              font-size: 10px !important;
            }

            .print-table th,
            .print-table td {
              padding: 5px 6px !important;
              vertical-align: top !important;
              word-break: break-word !important;
              overflow-wrap: anywhere !important;
            }

            .print-col-no { width: 4%; }
            .print-col-student-number { width: 10%; }
            .print-col-name { width: 18%; }
            .print-col-email { width: 20%; }
            .print-col-gender { width: 7%; }
            .print-col-program { width: 17%; }
            .print-col-status { width: 8%; }
            .print-col-date { width: 10%; }
          }
        `}
      </style>

      <div
        className='min-h-screen p-4 md:p-8 flex items-start justify-center'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='report-shell w-full max-w-7xl rounded-3xl bg-white shadow-2xl overflow-hidden'>
          <div className='print-hidden border-b px-6 py-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
            <div>
              <h2
                className='text-2xl font-bold'
                style={{ color: colors.primary }}
              >
                Enrollment Report
              </h2>
              <p className='text-sm text-gray-500'>
                Filter students and print or save the preview as PDF.
              </p>
            </div>

            <div className='flex items-center gap-3'>
              <button
                type='button'
                onClick={() => window.print()}
                className='inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-white'
                style={{ backgroundColor: colors.secondary }}
              >
                <Printer className='w-4 h-4' />
                Print / Save PDF
              </button>
              <button
                type='button'
                onClick={onClose}
                className='inline-flex items-center gap-2 rounded-xl px-4 py-2.5 border'
                style={{ borderColor: colors.neutralBorder, color: colors.primary }}
              >
                <X className='w-4 h-4' />
                Close
              </button>
            </div>
          </div>

          <div className='print-hidden border-b px-6 py-5 bg-gray-50/80'>
            <div className='flex items-center gap-2 mb-4'>
              <Filter className='w-4 h-4' style={{ color: colors.secondary }} />
              <span className='text-sm font-semibold' style={{ color: colors.primary }}>
                Report Filters
              </span>
            </div>

            <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4'>
              <label className='flex flex-col gap-2 text-sm'>
                <span className='font-medium' style={{ color: colors.primary }}>
                  Gender
                </span>
                <select
                  value={genderFilter}
                  onChange={(event) => setGenderFilter(event.target.value)}
                  className='rounded-xl border px-3 py-2.5 bg-white'
                  style={{ borderColor: colors.neutralBorder, color: colors.primary }}
                >
                  <option value='all'>All Genders</option>
                  <option value='male'>Male</option>
                  <option value='female'>Female</option>
                </select>
              </label>

              <label className='flex flex-col gap-2 text-sm'>
                <span className='font-medium' style={{ color: colors.primary }}>
                  Program / Major
                </span>
                <select
                  value={programMajorFilter}
                  onChange={(event) => setProgramMajorFilter(event.target.value)}
                  className='rounded-xl border px-3 py-2.5 bg-white'
                  style={{ borderColor: colors.neutralBorder, color: colors.primary }}
                >
                  <option value='all'>All Programs / Majors</option>
                  {programs.map((program) => (
                    <option key={program.value} value={program.value}>
                      {program.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className='flex flex-col gap-2 text-sm'>
                <span className='font-medium' style={{ color: colors.primary }}>
                  Status
                </span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className='rounded-xl border px-3 py-2.5 bg-white'
                  style={{ borderColor: colors.neutralBorder, color: colors.primary }}
                  disabled={programsLoading}
                >
                  {ENROLLMENT_STATUS_OPTIONS.map((option) => (
                    <option key={String(option.value)} value={String(option.value)}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className='px-6 py-8 md:px-10'>
            <div
              className='mx-auto w-full max-w-5xl border border-gray-300 bg-white p-6 md:p-10'
              id='enrollment-report-print-area'
            >
              <div className='text-center space-y-1'>
                <h1
                  className='print-title text-3xl font-bold'
                  style={{ color: colors.primary }}
                >
                  ENROLLMENT REPORT
                </h1>
                <p className='print-subtitle text-lg font-semibold text-gray-700'>
                  {academicYearLabel}
                </p>
                <p className='print-subtitle text-base font-semibold text-gray-600 uppercase'>
                  {termLabel}
                </p>
              </div>

              <div className='print-meta mt-6 grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div className='print-meta-box rounded-xl border bg-gray-50 px-4 py-3'>
                  <p className='text-xs uppercase tracking-wide text-gray-500'>Filters</p>
                  <p className='mt-1 text-sm font-medium' style={{ color: colors.primary }}>
                    {selectedGenderLabel} | {selectedProgramMajorLabel} | {selectedStatusLabel}
                  </p>
                </div>
                <div className='print-meta-box rounded-xl border bg-gray-50 px-4 py-3 md:text-right'>
                  <p className='text-xs uppercase tracking-wide text-gray-500'>Total Students</p>
                  <p className='mt-1 text-2xl font-bold' style={{ color: colors.secondary }}>
                    {filteredEnrollments.length}
                  </p>
                </div>
              </div>

              <div className='mt-6 overflow-x-auto'>
                <table
                  className='print-table w-full border-collapse text-sm'
                  style={{ color: "#000000" }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#E5E7EB" }}>
                      <th className='print-col-no border border-gray-700 px-2 py-2 text-center'>No.</th>
                      <th className='print-col-student-number border border-gray-700 px-2 py-2 text-left'>Student Number</th>
                      <th className='print-col-name border border-gray-700 px-2 py-2 text-left'>Name</th>
                      <th className='print-col-email border border-gray-700 px-2 py-2 text-left'>Email</th>
                      <th className='print-col-gender border border-gray-700 px-2 py-2 text-left'>Gender</th>
                      <th className='print-col-program border border-gray-700 px-2 py-2 text-left'>Program / Major</th>
                      <th className='print-col-status border border-gray-700 px-2 py-2 text-left'>Status</th>
                      <th className='print-col-date border border-gray-700 px-2 py-2 text-left'>Date Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnrollments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className='border border-gray-700 px-3 py-8 text-center text-gray-500'
                        >
                          No students found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredEnrollments.map((enrollment, index) => (
                        <tr key={String(enrollment.id)}>
                          <td className='border border-gray-700 px-2 py-1.5 text-center'>
                            {index + 1}
                          </td>
                          <td className='border border-gray-700 px-2 py-1.5'>
                            {enrollment.student_number || "N/A"}
                          </td>
                          <td className='border border-gray-700 px-2 py-1.5 font-medium'>
                            {formatStudentName(enrollment)}
                          </td>
                          <td className='border border-gray-700 px-2 py-1.5'>
                            {enrollment.email_address || "N/A"}
                          </td>
                          <td className='border border-gray-700 px-2 py-1.5'>
                            {normalizeGender(enrollment.sex) === "male"
                              ? "Male"
                              : normalizeGender(enrollment.sex) === "female"
                                ? "Female"
                                : "N/A"}
                          </td>
                          <td className='border border-gray-700 px-2 py-1.5'>
                            {formatProgramMajor(enrollment)}
                          </td>
                          <td className='border border-gray-700 px-2 py-1.5'>
                            {getStatusLabel(enrollment.status)}
                          </td>
                          <td className='border border-gray-700 px-2 py-1.5'>
                            {formatEnrollmentDate(enrollment.admission_date)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan={7}
                        className='border border-gray-700 px-2 py-2 text-right font-semibold'
                      >
                        Number of Students
                      </td>
                      <td className='border border-gray-700 px-2 py-2 font-bold text-center'>
                        {filteredEnrollments.length}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
