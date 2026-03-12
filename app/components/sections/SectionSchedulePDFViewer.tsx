'use client';

import React from 'react';
import { X, Download } from 'lucide-react';
import { colors } from '../../colors';
import { SectionResponse } from '../../types/sectionTypes';

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAY_ABBR: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tues', Wednesday: 'Wed',
  Thursday: 'Thurs', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

function fmtTime(isoStr: string): string {
  const d = new Date(isoStr);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}

function fmtRange(start: string, end: string): string {
  return `${fmtTime(start)}-${fmtTime(end)}`;
}

function yearLabel(yr: number): string {
  const map: Record<number, string> = {
    1: 'FIRST YEAR', 2: 'SECOND YEAR', 3: 'THIRD YEAR',
    4: 'FOURTH YEAR', 5: 'FIFTH YEAR',
  };
  return map[yr] || `YEAR ${yr}`;
}

function semLabel(sem: string): string {
  const s = sem.toLowerCase();
  if (s.includes('first') || s === '1') return '1st Semester';
  if (s.includes('second') || s === '2') return '2nd Semester';
  if (s.includes('summer')) return 'Summer';
  return sem;
}

function esc(s: string | undefined | null): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Row building ──────────────────────────────────────────────────────────────

interface ScheduleRow {
  courseCode: string;
  courseDesc: string;
  /** Unique days, joined with ' / ' */
  days: string;
  /** One time-range per schedule slot, joined with '\n' */
  times: string;
  /** One room per schedule slot, joined with '\n' */
  rooms: string;
  /** First assigned faculty full name */
  faculty: string;
}

function buildRows(schedules: any[], curriculum: any[]): ScheduleRow[] {
  // Group raw schedule entries by curriculumCourseId
  const grouped = new Map<number, any[]>();
  for (const s of schedules) {
    const arr = grouped.get(s.curriculumCourseId) ?? [];
    arr.push(s);
    grouped.set(s.curriculumCourseId, arr);
  }

  const rows: ScheduleRow[] = [];

  // Walk curriculum to preserve subject order
  for (const course of curriculum) {
    const group = grouped.get(course.id);
    if (!group || group.length === 0) continue;

    // Lecture first, lab second; within same type sort by start time
    group.sort((a, b) => {
      const labDiff = (a.isLabSchedule ? 1 : 0) - (b.isLabSchedule ? 1 : 0);
      if (labDiff !== 0) return labDiff;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    const uniqueDays = [...new Set(group.map((s) => DAY_ABBR[s.dayOfWeek] || s.dayOfWeek))];
    const timeLines = group.map((s) => fmtRange(s.startTime, s.endTime));
    const roomLines = group.map((s) => s.room?.room_number || '—');

    let faculty = '';
    for (const s of group) {
      if (s.faculty) {
        faculty = `${s.faculty.first_name} ${s.faculty.last_name}`;
        break;
      }
    }

    rows.push({
      courseCode: course.course_code || 'N/A',
      courseDesc: course.descriptive_title || course.course_name || '',
      days: uniqueDays.join(' / '),
      times: timeLines.join('\n'),
      rooms: roomLines.join('\n'),
      faculty,
    });
  }

  return rows;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SectionSchedulePDFViewerProps {
  section: SectionResponse;
  schedules: any[];
  curriculum: any[];
  onClose: () => void;
}

export default function SectionSchedulePDFViewer({
  section,
  schedules,
  curriculum,
  onClose,
}: SectionSchedulePDFViewerProps) {
  const rows = buildRows(schedules, curriculum);
  const yrLabel = yearLabel(section.yearLevel);
  const sem = semLabel(section.semester);
  const schoolDept = section.programName
    ? section.programName.toUpperCase()
    : section.programCode || '';
  const printDate = new Date().toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // ── Print / save as PDF ───────────────────────────────────────────────────
  function handlePrint() {
    const tableRows = rows
      .map(
        (row, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#faf9f7'};">
        <td style="padding:7px 9px;font-weight:700;font-size:11px;color:#4a2c14;white-space:nowrap;border-bottom:1px solid #e5e7eb;">${esc(row.courseCode)}</td>
        <td style="padding:7px 9px;font-size:11px;color:#374151;border-bottom:1px solid #e5e7eb;">${esc(row.courseDesc)}</td>
        <td style="padding:7px 9px;font-size:11px;text-align:center;white-space:nowrap;border-bottom:1px solid #e5e7eb;">${esc(row.days)}</td>
        <td style="padding:7px 9px;font-size:11px;text-align:center;border-bottom:1px solid #e5e7eb;">${row.times
          .split('\n')
          .map((t) => `<div style="white-space:nowrap;">${esc(t)}</div>`)
          .join('')}</td>
        <td style="padding:7px 9px;font-size:11px;text-align:center;border-bottom:1px solid #e5e7eb;">${row.rooms
          .split('\n')
          .map((r) => `<div style="white-space:nowrap;">${esc(r)}</div>`)
          .join('')}</td>
        <td style="padding:7px 9px;font-size:11px;border-bottom:1px solid #e5e7eb;">${esc(row.faculty)}</td>
      </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Class Schedule — ${esc(section.sectionName)}</title>
  <style>
    @page { size: 8.5in 11in; margin: 0.5in 0.65in; }
    * { box-sizing: border-box; margin: 0; padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important; }
    body { font-family: Arial, sans-serif; background: #fff; color: #1f2937; }

    .school-name { text-align: center; font-size: 20px; font-weight: 900;
      letter-spacing: 0.05em; color: #000; text-transform: uppercase; }
    .school-addr { text-align: center; font-size: 10px; color: #555; margin-top: 3px; }
    .dept-name   { text-align: center; font-size: 13px; font-weight: 700;
      letter-spacing: 0.07em; color: #000; margin-top: 10px; text-transform: uppercase; }
    .section-bar { background: #000; color: #fff; text-align: center;
      font-size: 20px; font-weight: 900; padding: 5px 0; margin-top: 6px;
      letter-spacing: 0.07em; }
    .term-line   { text-align: center; font-size: 13px; font-weight: 700;
      margin: 7px 0 14px; }

    table { width: 100%; border-collapse: collapse; }
    thead th { border: 1px solid #000; padding: 6px 9px; font-weight: 700;
      font-size: 11px; background: #fff; }
    thead th.center { text-align: center; }

    .year-row td { background: #d4d4d4; text-align: center; font-weight: 700;
      font-size: 12px; letter-spacing: 0.07em; padding: 5px 9px;
      border: 1px solid #999; }

    .print-date { text-align: right; font-size: 9px; color: #9ca3af; margin-top: 14px; }
  </style>
</head>
<body>
  <div class="school-name">COLEGIO DE STA. TERESA DE AVILA</div>
  <div class="school-addr">#6 Skylark St., Zabarte Subd., Novaliches, Q.C.</div>
  <div class="dept-name">${esc(schoolDept)}</div>
  <div class="section-bar">${esc(section.sectionName)}</div>
  <div class="term-line">${esc(sem)}, School Year ${esc(section.academicYear)}</div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left;width:78px;">CODE</th>
        <th style="text-align:left;">COURSE DESCRIPTION</th>
        <th class="center" style="width:68px;">DAY/s</th>
        <th class="center" style="width:140px;">TIME</th>
        <th class="center" style="width:82px;">ROOM</th>
        <th style="text-align:left;">FACULTY</th>
      </tr>
    </thead>
    <tbody>
      <tr class="year-row"><td colspan="6">${esc(yrLabel)}</td></tr>
      ${tableRows}
    </tbody>
  </table>

  <div class="print-date">Printed: ${printDate}</div>

  <div style="margin-top:24px;text-align:center;">
    <div style="display:inline-block;border-top:2px solid #000;padding-top:4px;min-width:240px;">
      <div style="font-weight:900;font-size:11px;text-transform:uppercase;">DR. HAROLD R. LUCERO</div>
      <div style="font-size:10px;margin-top:1px;">DEAN'S SIGNATURE OVER PRINTED NAME</div>
    </div>
  </div>

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
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-[200] overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-4xl my-8"
        style={{ backgroundColor: '#FFFFFF' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── School Header ── */}
        <div
          className="border-b-2 px-6 py-5 relative text-center"
          style={{ borderColor: colors.primary }}
        >
          <h1 className="text-xl font-extrabold tracking-wide" style={{ color: colors.primary }}>
            COLEGIO DE STA. TERESA DE AVILA
          </h1>
          <p className="text-[10px] tracking-wide mt-0.5" style={{ color: colors.tertiary }}>
            #6 Skylark St., Zabarte Subd., Novaliches, Q.C.
          </p>
          <p
            className="text-sm font-bold tracking-widest uppercase mt-2"
            style={{ color: colors.primary }}
          >
            {schoolDept}
          </p>
          {/* Section name bar */}
          <div
            className="mt-2 py-2 -mx-6 px-6"
            style={{ backgroundColor: colors.primary, color: 'white' }}
          >
            <span className="text-lg font-black tracking-wider">{section.sectionName}</span>
          </div>
          <p className="text-sm font-semibold mt-2.5" style={{ color: colors.primary }}>
            {sem}, School Year {section.academicYear}
          </p>

          {/* Action buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg transition-all hover:scale-105"
              style={{ color: colors.primary, backgroundColor: `${colors.primary}10` }}
              title="Print / Save as PDF"
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

        {/* ── Schedule Table ── */}
        <div className="px-6 py-5 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: colors.neutral }}>
                No schedules have been assigned to this section yet.
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {['CODE', 'COURSE DESCRIPTION', 'DAY/s', 'TIME', 'ROOM', 'FACULTY'].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left font-bold text-[11px] tracking-wide"
                      style={{
                        color: colors.primary,
                        borderBottom: `2px solid ${colors.primary}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Year Level Header Row */}
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-2 text-center font-bold text-xs tracking-widest"
                    style={{
                      backgroundColor: 'rgba(74,44,20,0.10)',
                      color: colors.primary,
                      borderTop: `1px solid rgba(74,44,20,0.15)`,
                      borderBottom: `1px solid rgba(74,44,20,0.15)`,
                    }}
                  >
                    {yrLabel}
                  </td>
                </tr>

                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#faf9f7',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    <td
                      className="px-3 py-2.5 font-bold text-xs whitespace-nowrap"
                      style={{ color: colors.primary }}
                    >
                      {row.courseCode}
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: '#374151' }}>
                      {row.courseDesc}
                    </td>
                    <td
                      className="px-3 py-2.5 text-xs text-center whitespace-nowrap"
                      style={{ color: '#374151' }}
                    >
                      {row.days}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-center" style={{ color: '#374151' }}>
                      {row.times.split('\n').map((t, i) => (
                        <div key={i} className="whitespace-nowrap">
                          {t}
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-center" style={{ color: '#374151' }}>
                      {row.rooms.split('\n').map((r, i) => (
                        <div key={i} className="whitespace-nowrap">
                          {r}
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: '#374151' }}>
                      {row.faculty || (
                        <span style={{ color: colors.neutral, fontStyle: 'italic' }}>TBA</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Print date */}
          <div className="mt-4 text-right text-[10px]" style={{ color: colors.neutral }}>
            Printed: {printDate}
          </div>

          {/* Dean Signature */}
          <div className="mt-6 text-center">
            <div
              className="inline-block pt-1 px-8"
              style={{ borderTop: `2px solid ${colors.primary}`, minWidth: '220px' }}
            >
              <p className="font-black text-xs uppercase tracking-wide" style={{ color: colors.primary }}>
                DR. HAROLD R. LUCERO
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: colors.neutral }}>
                DEAN'S SIGNATURE OVER PRINTED NAME
              </p>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="px-6 py-4 border-t flex justify-end gap-3"
          style={{ borderColor: colors.neutralBorder }}
        >
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: colors.secondary }}
          >
            <Download className="w-4 h-4" />
            Print / Save PDF
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold border transition-all hover:opacity-80"
            style={{ borderColor: colors.neutralBorder, color: colors.primary }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
