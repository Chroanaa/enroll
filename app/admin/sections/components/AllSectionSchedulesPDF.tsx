'use client';

import { useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SectionForPDF {
  id: number;
  programId: number;
  sectionName: string;
  programCode: string;
  programName: string;
  yearLevel: number;
  academicYear: string;
  semester: string;
}

interface AllSectionSchedulesPDFProps {
  sections: SectionForPDF[];
  popupWindow: Window;
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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
  return m === 0 ? (h12 + ampm) : (h12 + ':' + String(m).padStart(2, '0') + ampm);
}

function fmtRange(start: string, end: string): string {
  return fmtTime(start) + '-' + fmtTime(end);
}

function yearLabel(yr: number): string {
  const map: Record<number, string> = {
    1: 'FIRST YEAR', 2: 'SECOND YEAR', 3: 'THIRD YEAR',
    4: 'FOURTH YEAR', 5: 'FIFTH YEAR',
  };
  return map[yr] || ('YEAR ' + yr);
}

function semLabel(sem: string): string {
  const s = sem.toLowerCase();
  if (s.includes('first') || s === '1') return '1st Semester';
  if (s.includes('second') || s === '2') return '2nd Semester';
  if (s.includes('summer')) return 'Summer';
  return sem;
}

function escHtml(s: string | undefined | null): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Row builder ────────────────────────────────────────────────────────────────

interface ScheduleRow {
  courseCode: string;
  courseDesc: string;
  days: string;
  times: string;
  rooms: string;
  faculty: string;
}

function buildSingleRow(courseCode: string, courseDesc: string, group: any[]): ScheduleRow {
  group.sort((a, b) => {
    const labDiff = (a.isLabSchedule ? 1 : 0) - (b.isLabSchedule ? 1 : 0);
    if (labDiff !== 0) return labDiff;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  const uniqueDays = Array.from(new Set(group.map((s) => DAY_ABBR[s.dayOfWeek] || s.dayOfWeek)));
  const timeLines = group.map((s) => fmtRange(s.startTime, s.endTime));
  const roomLines = group.map((s) => (s.room && s.room.room_number) ? s.room.room_number : '\u2014');

  let faculty = '';
  for (const s of group) {
    if (s.faculty) {
      faculty = s.faculty.first_name + ' ' + s.faculty.last_name;
      break;
    }
  }

  return {
    courseCode,
    courseDesc,
    days: uniqueDays.join(' / '),
    times: timeLines.join('<br/>'),
    rooms: roomLines.join('<br/>'),
    faculty,
  };
}

function buildRows(schedules: any[], curriculum: any[]): ScheduleRow[] {
  const grouped = new Map<number, any[]>();
  for (const s of schedules) {
    const arr = grouped.get(s.curriculumCourseId) ?? [];
    arr.push(s);
    grouped.set(s.curriculumCourseId, arr);
  }

  const rows: ScheduleRow[] = [];

  if (curriculum.length > 0) {
    for (const course of curriculum) {
      const group = grouped.get(course.id);
      if (!group || group.length === 0) continue;
      rows.push(buildSingleRow(
        course.course_code || 'N/A',
        course.descriptive_title || course.course_name || '',
        group
      ));
    }
  } else {
    for (const [, group] of grouped) {
      const s0 = group[0];
      const code: string = s0.courseCode || s0.course_code || 'N/A';
      const desc: string = s0.courseTitle || s0.courseDescription || '';
      rows.push(buildSingleRow(code, desc, group));
    }
  }

  return rows;
}

// ── HTML page builder ──────────────────────────────────────────────────────────

function buildSectionPage(
  section: SectionForPDF,
  schedules: any[],
  curriculum: any[],
  isLast: boolean
): string {
  const rows = buildRows(schedules, curriculum);
  const yrLab = yearLabel(section.yearLevel);
  const sem   = semLabel(section.semester);
  const dept  = (section.programName || section.programCode || '').toUpperCase();
  const pageBreak: string = isLast ? '' : 'page-break-after:always;';

  const TH = 'border:1px solid #ccc;padding:6px 9px;font-weight:700;font-size:11px;background:#fff;text-align:left;';
  const TD = 'border-bottom:1px solid #e5e7eb;padding:7px 9px;font-size:11px;';

  let tableRowsHtml = '';
  if (rows.length === 0) {
    tableRowsHtml = '<tr><td colspan="6" style="' + TD + 'text-align:center;color:#9ca3af;font-style:italic;padding:24px;">No schedules assigned</td></tr>';
  } else {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const bg = i % 2 === 0 ? '#ffffff' : '#faf9f7';
      const facultyCell = row.faculty
        ? escHtml(row.faculty)
        : '<span style="color:#9ca3af;font-style:italic;">TBA</span>';
      tableRowsHtml +=
        '<tr style="background:' + bg + ';">' +
        '<td style="' + TD + 'font-weight:700;white-space:nowrap;">' + escHtml(row.courseCode) + '</td>' +
        '<td style="' + TD + '">' + escHtml(row.courseDesc) + '</td>' +
        '<td style="' + TD + 'text-align:center;white-space:nowrap;">' + escHtml(row.days) + '</td>' +
        '<td style="' + TD + 'text-align:center;">' + row.times + '</td>' +
        '<td style="' + TD + 'text-align:center;">' + row.rooms + '</td>' +
        '<td style="' + TD + '">' + facultyCell + '</td>' +
        '</tr>';
    }
  }

  return (
    '<div style="' + pageBreak + 'padding:8px;font-family:Arial,sans-serif;color:#000;">' +

    '<div style="text-align:center;margin-bottom:0;">' +
      '<div style="font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">COLEGIO DE STA. TERESA DE AVILA</div>' +
      '<div style="font-size:10px;margin-top:2px;color:#555;">#6 Skylark St., Zabarte Subd., Novaliches, Q.C.</div>' +
      '<div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-top:8px;">' + escHtml(dept) + '</div>' +
      '<div style="background:#3A2313;color:#fff;padding:5px 0;margin-top:5px;font-size:18px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">' +
        escHtml(section.sectionName) +
      '</div>' +
      '<div style="font-size:13px;font-weight:700;margin:6px 0 12px;">' + escHtml(sem) + ', School Year ' + escHtml(section.academicYear) + '</div>' +
    '</div>' +

    '<table style="width:100%;border-collapse:collapse;font-size:11px;">' +
      '<thead>' +
        '<tr style="border-bottom:2px solid #3A2313;">' +
          '<th style="' + TH + 'width:80px;">CODE</th>' +
          '<th style="' + TH + '">COURSE DESCRIPTION</th>' +
          '<th style="' + TH + 'width:70px;text-align:center;">DAY/s</th>' +
          '<th style="' + TH + 'width:145px;text-align:center;">TIME</th>' +
          '<th style="' + TH + 'width:90px;text-align:center;">ROOM</th>' +
          '<th style="' + TH + '">FACULTY</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' +
        '<tr>' +
          '<td colspan="6" style="background:#d4d4d4;text-align:center;font-weight:700;font-size:11px;letter-spacing:2px;padding:5px 9px;border-top:1px solid #999;border-bottom:1px solid #999;">' +
            escHtml(yrLab) +
          '</td>' +
        '</tr>' +
        tableRowsHtml +
      '</tbody>' +
    '</table>' +

    '<div style="margin-top:24px;text-align:center;">' +
      '<div style="display:inline-block;border-top:2px solid #000;padding-top:4px;min-width:240px;">' +
        '<div style="font-weight:900;font-size:11px;text-transform:uppercase;">DR. HAROLD R. LUCERO</div>' +
        '<div style="font-size:10px;margin-top:1px;">DEAN\'S SIGNATURE OVER PRINTED NAME</div>' +
      '</div>' +
    '</div>' +

    '</div>'
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AllSectionSchedulesPDF({
  sections,
  popupWindow,
  onClose,
}: AllSectionSchedulesPDFProps) {
  useEffect(() => {
    let cancelled = false;
    const popup = popupWindow;

    // Show a loading screen while data is fetched (written synchronously before async work)
    popup.document.write(
      '<!DOCTYPE html><html><head><meta charset="UTF-8"/>' +
      '<title>Loading\u2026</title>' +
      '<style>' +
      'body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8f5f0;}' +
      '.box{text-align:center;color:#3A2313;}' +
      '.spinner{width:48px;height:48px;border:5px solid #E2C9B0;border-top-color:#955A27;border-radius:50%;animation:spin .9s linear infinite;margin:0 auto 20px;}' +
      '@keyframes spin{to{transform:rotate(360deg);}}' +
      'h2{font-size:18px;margin-bottom:8px;}' +
      'p{font-size:13px;color:#666;}' +
      '</style></head><body>' +
      '<div class="box"><div class="spinner"></div>' +
      '<h2>Loading All Section Schedules</h2>' +
      '<p>Fetching schedules for ' + sections.length + ' section' + (sections.length !== 1 ? 's' : '') + '\u2026</p>' +
      '</div></body></html>'
    );
    popup.document.close();

    async function fetchAllAndRender() {
      try {
        const dominantAcademicYear =
          sections.reduce<Record<string, number>>((acc, sec) => {
            const key = sec.academicYear || '';
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
          }, {});
        const dominantSemester =
          sections.reduce<Record<string, number>>((acc, sec) => {
            const key = sec.semester || '';
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
          }, {});

        const selectedAcademicYear =
          Object.entries(dominantAcademicYear).sort((a, b) => b[1] - a[1])[0]?.[0] || undefined;
        const selectedSemester =
          Object.entries(dominantSemester).sort((a, b) => b[1] - a[1])[0]?.[0] || undefined;

        const bulkResponse = await fetch('/api/class-schedule/section-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionIds: sections.map((sec) => sec.id),
            academicYear: selectedAcademicYear,
            semester: selectedSemester,
          }),
        });
        const bulkPayload = await bulkResponse.json();
        if (!bulkResponse.ok) {
          throw new Error(bulkPayload?.message || 'Failed to fetch section schedules');
        }

        const bySection =
          bulkPayload?.data?.bySection && typeof bulkPayload.data.bySection === 'object'
            ? bulkPayload.data.bySection
            : {};

        const results = sections.map((sec) => ({
          sec,
          schedules: Array.isArray(bySection[String(sec.id)]) ? bySection[String(sec.id)] : [],
          curriculum: [] as any[],
        }));

        if (cancelled || popup.closed) {
          if (!cancelled) onClose();
          return;
        }

        const firstSec = sections[0];
        const titleSem = firstSec ? semLabel(firstSec.semester) : '';
        const titleAy  = firstSec ? firstSec.academicYear : '';

        const pages = results
          .map((r, idx) => buildSectionPage(r.sec, r.schedules, r.curriculum, idx === results.length - 1))
          .join('');

        const html =
          '<!DOCTYPE html><html><head><meta charset="UTF-8"/>' +
          '<title>All Section Schedules \u2014 AY ' + escHtml(titleAy) + ' ' + escHtml(titleSem) + '</title>' +
          '<style>' +
          '@page{size:8.5in 11in;margin:0.45in 0.6in;}' +
          '*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}' +
          'body{font-family:Arial,sans-serif;background:#fff;color:#000;}' +
          'table{border-collapse:collapse;}' +
          '</style></head><body>' +
          pages +
          '<script>window.onload=function(){window.focus();window.print();window.onafterprint=function(){window.close();};};<\/script>' +
          '</body></html>';

        popup.document.open();
        popup.document.write(html);
        popup.document.close();

      } catch (err) {
        console.error('[AllSectionSchedulesPDF] Error:', err);
        if (!popup.closed) {
          try {
            popup.document.open();
            popup.document.write(
              '<!DOCTYPE html><html><body style="font-family:Arial;padding:40px;color:#c0392b;">' +
              '<h2>Error generating PDF</h2><p>' + String(err) + '</p>' +
              '<p>Please close this window and try again.</p>' +
              '</body></html>'
            );
            popup.document.close();
          } catch { /* ignore */ }
        }
      }

      if (!cancelled) onClose();
    }

    fetchAllAndRender();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
