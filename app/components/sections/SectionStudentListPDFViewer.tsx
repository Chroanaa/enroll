'use client';

import React from 'react';
import { X, Download, Users } from 'lucide-react';
import { colors } from '../../colors';

// ---------- helpers ----------
const semesterLabel = (sem: string) => {
  const s = sem.toLowerCase();
  if (s === 'first'  || s === '1') return '1st Semester';
  if (s === 'second' || s === '2') return '2nd Semester';
  if (s === 'summer' || s === '3') return 'Summer';
  return sem;
};

const yearLevelLabel = (yr: number) => {
  const labels: Record<number, string> = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year', 5: '5th Year' };
  return labels[yr] || `Year ${yr}`;
};

// ---------- types ----------
interface AssignedStudent {
  studentNumber: string;
  name: string;
  assignmentType: string;
  subjectCount?: number;
}

interface SectionStudentListPDFViewerProps {
  sectionName: string;
  programCode: string;
  programName: string;
  yearLevel: number;
  academicYear: string;
  semester: string;
  students: AssignedStudent[];
  onClose: () => void;
}

export default function SectionStudentListPDFViewer({
  sectionName,
  programCode,
  programName,
  yearLevel,
  academicYear,
  semester,
  students,
  onClose,
}: SectionStudentListPDFViewerProps) {
  const regular = students.filter(s => s.assignmentType !== 'irregular');
  const irregular = students.filter(s => s.assignmentType === 'irregular');
  const printDate = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  const handlePrint = () => {
    const rows = students.length === 0
      ? `<tr><td colspan="4" style="text-align:center;padding:32px 12px;color:#9ca3af;font-style:italic;">No students assigned to this section.</td></tr>`
      : students.map((s, idx) => `
          <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#faf9f7'};border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px 10px;color:#9ca3af;font-size:11px;width:36px;">${idx + 1}</td>
            <td style="padding:8px 10px;font-weight:700;color:#4a2c14;font-size:11px;">${s.studentNumber}</td>
            <td style="padding:8px 10px;color:#374151;font-size:11px;">${s.name}</td>
            <td style="padding:8px 10px;text-align:center;">
              <span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:700;
                background:${s.assignmentType === 'irregular' ? '#f3e8ff' : '#dbeafe'};
                color:${s.assignmentType === 'irregular' ? '#7e22ce' : '#1d4ed8'};">
                ${s.assignmentType === 'irregular' ? 'Irregular' : 'Regular'}
              </span>
            </td>
          </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Section Student List — ${sectionName}</title>
  <style>
    @page { size: 8.5in 11in; margin: 0.55in 0.6in; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; color: #1f2937; }
    /* School header */
    .school-header { text-align: center; border-bottom: 2.5px solid #4a2c14; padding-bottom: 14px; margin-bottom: 0; }
    .school-name { font-size: 18px; font-weight: 900; letter-spacing: 0.04em; color: #4a2c14; }
    .school-sub { font-size: 10.5px; letter-spacing: 0.08em; color: #7c5230; margin-top: 2px; }
    .list-badge { display: inline-block; margin-top: 8px; padding: 3px 20px; border-radius: 999px;
      font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
      background: rgba(149,90,39,0.1); color: #955a27; }
    /* Info bar */
    .info-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
      padding: 10px 0 10px; border-bottom: 1px solid #e5e7eb;
      background: rgba(74,44,20,0.03); }
    .info-item .label { font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.1em; color: #7c5230; margin-bottom: 2px; }
    .info-item .value { font-size: 12px; font-weight: 700; color: #4a2c14; }
    /* Summary */
    .summary { display: flex; align-items: center; gap: 12px; padding: 7px 0;
      border-bottom: 1px solid #e5e7eb; font-size: 11px; }
    .summary .total { font-weight: 700; color: #4a2c14; }
    .summary .total span { color: #955a27; }
    .pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 10px; font-weight: 600; }
    .pill-blue { background: #dbeafe; color: #1d4ed8; }
    .pill-purple { background: #f3e8ff; color: #7e22ce; }
    .sep { color: #d1d5db; }
    /* Table */
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
    thead tr { background: rgba(74,44,20,0.06); border-bottom: 2px solid #4a2c14; }
    thead th { padding: 8px 10px; text-align: left; font-weight: 700; font-size: 10.5px; color: #4a2c14; }
    thead th.center { text-align: center; }
    /* Signature footer */
    .sig-footer { display: grid; grid-template-columns: 1fr 1fr; gap: 48px;
      margin-top: 36px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
    .sig-block { text-align: center; }
    .sig-line { border-bottom: 2px solid #4a2c14; margin-bottom: 5px; padding-bottom: 4px; height: 28px; }
    .sig-label { font-size: 9.5px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.1em; color: #7c5230; }
    /* Print date */
    .print-date { text-align: right; font-size: 9px; color: #9ca3af; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="school-header">
    <div class="school-name">COLEGIO DE STA. TERESA DE AVILA</div>
    <div class="school-sub">Foundation, Inc. — Molo, Iloilo City</div>
    <div class="list-badge">Section Student List</div>
  </div>

  <div class="info-bar">
    <div class="info-item"><div class="label">Section</div><div class="value">${sectionName}</div></div>
    <div class="info-item"><div class="label">Program</div><div class="value">${programCode}</div></div>
    <div class="info-item"><div class="label">Year Level</div><div class="value">${yearLevelLabel(yearLevel)}</div></div>
    <div class="info-item"><div class="label">Term</div><div class="value">${semesterLabel(semester)}, A.Y. ${academicYear}</div></div>
  </div>

  <div class="summary">
    <span class="total">Total: <span>${students.length}</span></span>
    <span class="sep">|</span>
    <span class="pill pill-blue">Regular: ${regular.length}</span>
    <span class="pill pill-purple">Irregular: ${irregular.length}</span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:36px;">#</th>
        <th>Student No.</th>
        <th>Full Name</th>
        <th class="center">Type</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="sig-footer">
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Prepared by</div></div>
    <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Noted by / Registrar</div></div>
  </div>

  <div class="print-date">Printed: ${printDate}</div>

  <script>
    window.onload = function () {
      window.focus();
      window.print();
      window.onafterprint = function () { window.close(); };
    };
  </script>
</body>
</html>`;

    const popup = window.open('', '_blank', 'width=900,height=720,scrollbars=yes');
    if (popup) {
      popup.document.write(html);
      popup.document.close();
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-[200] overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-3xl my-8"
        onClick={e => e.stopPropagation()}
        style={{ backgroundColor: '#FFFFFF' }}
      >
        {/* ── School Header ── */}
        <div
          className="border-b-2 px-6 py-5 relative text-center"
          style={{ borderColor: colors.primary }}
        >
          <div className="flex items-center justify-center mb-1">
            <div>
              <h1 className="text-xl font-extrabold tracking-wide" style={{ color: colors.primary }}>
                COLEGIO DE STA. TERESA DE AVILA
              </h1>
              <p className="text-[11px] tracking-wider" style={{ color: colors.tertiary }}>
                Foundation, Inc. — Molo, Iloilo City
              </p>
            </div>
          </div>
          <div
            className="mt-2 mx-auto inline-block px-6 py-1 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{ backgroundColor: `${colors.secondary}15`, color: colors.secondary }}
          >
            Section Student List
          </div>

          {/* Action buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg transition-all hover:scale-105"
              style={{ color: colors.primary, backgroundColor: `${colors.primary}10` }}
              title="Print / Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full transition-colors"
              style={{ color: colors.tertiary, backgroundColor: `${colors.tertiary}10` }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Section Info Bar ── */}
        <div
          className="px-6 py-3 grid grid-cols-4 gap-4 border-b"
          style={{ backgroundColor: `${colors.primary}05`, borderColor: colors.neutralBorder }}
        >
          {[
            { label: 'SECTION', value: sectionName },
            { label: 'PROGRAM', value: programCode },
            { label: 'YEAR LEVEL', value: yearLevelLabel(yearLevel) },
            { label: 'TERM', value: `${semesterLabel(semester)}, A.Y. ${academicYear}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: colors.tertiary }}>
                {label}
              </div>
              <div className="text-sm font-bold" style={{ color: colors.primary }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Summary Pills ── */}
        <div className="px-6 py-2 flex items-center gap-3 border-b" style={{ borderColor: colors.neutralBorder }}>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" style={{ color: colors.primary }} />
            <span className="text-xs font-semibold" style={{ color: colors.primary }}>
              Total: <span style={{ color: colors.secondary }}>{students.length}</span>
            </span>
          </div>
          <span className="text-gray-300">|</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
            Regular: {regular.length}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
            Irregular: {irregular.length}
          </span>
        </div>

        {/* ── Student Table ── */}
        <div className="px-6 py-4">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr style={{ backgroundColor: `${colors.primary}08`, borderBottom: `2px solid ${colors.primary}` }}>
                <th className="px-3 py-2 text-left font-bold w-10" style={{ color: colors.primary }}>#</th>
                <th className="px-3 py-2 text-left font-bold" style={{ color: colors.primary }}>Student No.</th>
                <th className="px-3 py-2 text-left font-bold" style={{ color: colors.primary }}>Full Name</th>
                <th className="px-3 py-2 text-center font-bold" style={{ color: colors.primary }}>Type</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400 italic">
                    No students assigned to this section.
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => (
                  <tr
                    key={student.studentNumber}
                    style={{
                      borderBottom: `1px solid ${colors.neutralBorder}`,
                      backgroundColor: idx % 2 === 0 ? 'white' : `${colors.primary}03`,
                    }}
                  >
                    <td className="px-3 py-2 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="px-3 py-2 font-bold" style={{ color: colors.primary }}>
                      {student.studentNumber}
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-700">{student.name}</td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          student.assignmentType === 'irregular'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {student.assignmentType === 'irregular' ? 'Irregular' : 'Regular'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer / Signature ── */}
        <div
          className="px-6 py-4 border-t grid grid-cols-2 gap-8"
          style={{ borderColor: colors.neutralBorder }}
        >
          <div className="text-center">
            <div className="border-b-2 mb-1 pb-1" style={{ borderColor: colors.primary }}>&nbsp;</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: colors.tertiary }}>
              Prepared by
            </div>
          </div>
          <div className="text-center">
            <div className="border-b-2 mb-1 pb-1" style={{ borderColor: colors.primary }}>&nbsp;</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: colors.tertiary }}>
              Noted by / Registrar
            </div>
          </div>
        </div>

        {/* Print date */}
        <div className="px-6 pb-3 text-right text-[10px] text-gray-400">
          Printed: {printDate}
        </div>
      </div>
    </div>
  );
}
