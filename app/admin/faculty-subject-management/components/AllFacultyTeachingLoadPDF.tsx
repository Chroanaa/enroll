'use client';

import { useEffect } from 'react';

interface Schedule {
  id: number;
  sectionId: number;
  sectionName: string;
  curriculumCourseId: number;
  facultyId: number | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  courseCode: string;
  courseTitle: string;
  room: { id: number; room_number: string } | null;
  unitsLec: number;
  unitsLab: number;
  unitsTotal: number;
}

interface Faculty {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  departmentName: string;
  position?: string;
  specialization?: string;
}

interface AllFacultyTeachingLoadPDFProps {
  faculties: Faculty[];
  academicYear: string;
  semester: string;
  popupWindow: Window;
  onClose: () => void;
}

// ── Helpers ──
const TIME_SLOTS: number[] = [];
for (let m = 450; m < 1260; m += 30) TIME_SLOTS.push(m);

const formatMins = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const getLocalMins = (isoStr: string): number => {
  const d = new Date(isoStr);
  return d.getHours() * 60 + d.getMinutes();
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBRS = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];

const SUBJECT_COLORS = [
  { bg: '#EAD8F5', text: '#4A235A' },
  { bg: '#FDEBD0', text: '#784212' },
  { bg: '#D5E8D4', text: '#1E5128' },
  { bg: '#D6EAF8', text: '#1A5276' },
  { bg: '#FDEDEC', text: '#641E16' },
  { bg: '#FEF9E7', text: '#7D6608' },
  { bg: '#E8F8F5', text: '#0E6251' },
];

function esc(s: string | undefined | null): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildFacultyPage(faculty: Faculty, schedules: Schedule[], academicYear: string, semester: string, isLast: boolean): string {
  // ── Occupancy grid ──
  type Cell = { schedule: Schedule; rowspan: number } | 'skip' | null;
  const occupancy: Cell[][] = DAYS.map(() => Array<Cell>(TIME_SLOTS.length).fill(null));

  const colorMap = new Map<string, { bg: string; text: string }>();
  let colorIdx = 0;

  for (const s of schedules) {
    if (!colorMap.has(s.courseCode)) {
      colorMap.set(s.courseCode, SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length]);
      colorIdx++;
    }
    const dayIdx = DAYS.indexOf(s.dayOfWeek);
    if (dayIdx < 0) continue;
    const startMins = getLocalMins(s.startTime);
    const endMins = getLocalMins(s.endTime);
    const startSlot = Math.round((startMins - 450) / 30);
    const endSlot = Math.round((endMins - 450) / 30);
    if (startSlot < 0 || startSlot >= TIME_SLOTS.length) continue;
    const rowspan = Math.max(1, Math.min(endSlot - startSlot, TIME_SLOTS.length - startSlot));
    if (occupancy[dayIdx][startSlot] !== null) continue;
    occupancy[dayIdx][startSlot] = { schedule: s, rowspan };
    for (let k = startSlot + 1; k < startSlot + rowspan; k++) {
      if (k < TIME_SLOTS.length) occupancy[dayIdx][k] = 'skip';
    }
  }

  // ── Totals ──
  const hoursPerDay = DAYS.map((_, di) =>
    schedules
      .filter(s => DAYS[di] === s.dayOfWeek)
      .reduce((acc, s) => acc + (getLocalMins(s.endTime) - getLocalMins(s.startTime)) / 60, 0)
  );
  const totalHours = hoursPerDay.reduce((a, b) => a + b, 0);
  const seenSC = new Set<string>();
  let totalUnits = 0;
  for (const s of schedules) {
    const key = `${s.sectionId}-${s.curriculumCourseId}`;
    if (!seenSC.has(key)) { seenSC.add(key); totalUnits += s.unitsTotal; }
  }
  const numPreps = new Set(schedules.map(s => s.courseCode)).size;

  // ── Meta ──
  const semLabel = semester === 'first' ? 'FIRST SEMESTER'
    : semester === 'second' ? 'SECOND SEMESTER' : 'SUMMER';
  const mid = faculty.middle_name ? ` ${faculty.middle_name.charAt(0)}.` : '';
  const facultyName = `${faculty.last_name.toUpperCase()}, ${faculty.first_name}${mid}`;
  const isFullTime = faculty.position?.toLowerCase().includes('full') ?? false;

  const TH = 'border:1px solid #000;padding:2px 1px;font-weight:700;background:#fff;font-size:8px;';
  const TD = 'border:1px solid #000;padding:0 1px;font-size:8px;';

  // ── Table rows ──
  const tableRows = TIME_SLOTS.map((slotStart, si) => {
    const cells = DAYS.map((_, di) => {
      const cell = occupancy[di][si];
      if (cell === 'skip') return '';
      if (!cell) return `<td style="${TD}height:13px;"></td>`;
      const { schedule: s, rowspan } = cell;
      const col = colorMap.get(s.courseCode) || SUBJECT_COLORS[0];
      return `<td rowspan="${rowspan}" style="${TD}background:${col.bg};color:${col.text};text-align:center;vertical-align:middle;padding:1px;">
        <div style="font-weight:900;font-size:8px;line-height:1.1;">${esc(s.courseCode)}</div>
        <div style="font-size:7px;line-height:1.1;">${esc(s.courseTitle)}</div>
        <div style="font-size:7px;font-weight:600;line-height:1.1;">${esc(s.sectionName)}</div>
        <div style="font-size:7px;line-height:1.1;">${esc(s.room?.room_number || '')}</div>
        <div style="font-size:7px;line-height:1.1;">${esc(faculty.last_name)}</div>
      </td>`;
    }).join('');
    return `<tr style="height:13px;">
      <td style="${TD}text-align:right;padding-right:3px;white-space:nowrap;">${formatMins(slotStart)}</td>
      <td style="${TD}text-align:center;">-</td>
      <td style="${TD}padding-left:3px;white-space:nowrap;">${formatMins(slotStart + 30)}</td>
      ${cells}
    </tr>`;
  }).join('');

  const pageBreak = isLast ? '' : 'page-break-after:always;';

  return `
  <div style="${pageBreak}padding:8px;font-family:Arial,sans-serif;color:#000;">

    <!-- School Header -->
    <div style="text-align:center;margin-bottom:6px;">
      <div style="font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">COLEGIO DE STA TERESA DE AVILA</div>
      <div style="font-size:9px;margin-top:1px;">6 Kingfisher St. cor. Skylark St., Zabarte Subd., Novaliches, Quezon City</div>
      <div style="margin-top:5px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;">${esc(faculty.departmentName?.toUpperCase() || 'COLLEGE OF INFORMATION TECHNOLOGY')}</div>
        <div style="background:#000;color:#fff;padding:4px 10px;margin-top:4px;font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">CONFIRMATION OF TEACHING LOAD</div>
        <div style="margin-top:3px;font-weight:600;font-size:10px;">AY:${esc(academicYear)}</div>
        <div style="font-weight:700;font-size:10px;">TERM : ${esc(semLabel)}</div>
      </div>
    </div>

    <!-- Faculty Info -->
    <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:5px;">
      <tbody>
        <tr>
          <td style="padding-bottom:3px;width:72px;">Faculty</td>
          <td style="padding-bottom:3px;width:12px;">:</td>
          <td style="padding-bottom:3px;font-weight:700;border-bottom:1px solid #000;min-width:200px;">${esc(facultyName)}</td>
          <td style="padding-bottom:3px;padding-left:12px;width:120px;white-space:nowrap;">Status :</td>
          <td style="padding-bottom:3px;white-space:nowrap;">Full-Time ${isFullTime ? '&#9745;' : '&#9744;'}&nbsp;&nbsp;Part-Time ${!isFullTime ? '&#9745;' : '&#9744;'}</td>
        </tr>
        <tr>
          <td style="padding-bottom:3px;">Degree</td>
          <td style="padding-bottom:3px;">:</td>
          <td style="padding-bottom:3px;font-weight:700;border-bottom:1px solid #000;">${esc(faculty.specialization || '')}</td>
          <td style="padding-bottom:3px;padding-left:12px;white-space:nowrap;">Nature of Appointment :</td>
          <td style="padding-bottom:3px;border-bottom:1px solid #000;min-width:100px;"></td>
        </tr>
        <tr>
          <td>Mother Unit</td><td>:</td>
          <td style="border-bottom:1px solid #000;"></td>
          <td></td><td></td>
        </tr>
      </tbody>
    </table>

    <!-- Schedule Grid -->
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
      <colgroup>
        <col style="width:55px"/>
        <col style="width:10px"/>
        <col style="width:55px"/>
        ${DAYS.map(() => '<col/>').join('')}
      </colgroup>
      <thead>
        <tr>
          <th colspan="3" style="${TH}"></th>
          <th colspan="6" style="${TH}text-align:center;">Days</th>
        </tr>
        <tr>
          <th colspan="3" style="${TH}text-align:center;">Time</th>
          ${DAY_ABBRS.map(d => `<th style="${TH}text-align:center;">${d}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        <tr>
          <td colspan="3" style="${TD}text-align:center;font-weight:700;padding:2px 1px;">NUMBER OF HOURS</td>
          ${hoursPerDay.map(h => `<td style="${TD}text-align:center;font-weight:700;padding:2px 1px;">${h.toFixed(2)}</td>`).join('')}
        </tr>
      </tbody>
    </table>

    <!-- Summary -->
    <table style="width:100%;border-collapse:collapse;font-size:10px;">
      <tbody>
        <tr>
          <td style="${TD}font-weight:700;padding:3px 6px;width:300px;">TOTAL NUMBER OF HOURS PER WEEK :</td>
          <td style="${TD}text-align:center;font-weight:900;font-size:13px;padding:3px;">${totalHours.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="${TD}font-weight:700;padding:3px 6px;">TOTAL NUMBER OF UNITS</td>
          <td style="${TD}text-align:center;font-weight:900;font-size:13px;padding:3px;">${totalUnits.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="${TD}font-weight:700;padding:3px 6px;">NUMBER OF PREPARATIONS</td>
          <td style="${TD}text-align:center;font-weight:900;font-size:13px;padding:3px;">${numPreps}</td>
        </tr>
      </tbody>
    </table>

    <!-- Signatures -->
    <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:32px;">
      <div>
        <p style="font-size:10px;margin-bottom:28px;">Prepared by :</p>
        <div style="border-bottom:1px solid #000;padding-bottom:2px;">
          <p style="text-align:center;font-weight:700;font-size:10px;">HAROLD R. LUCERO, DIT</p>
        </div>
        <p style="text-align:center;font-size:10px;">Dean</p>
      </div>
      <div>
        <p style="font-size:10px;margin-bottom:28px;">Conforme:</p>
        <div style="border-bottom:1px solid #000;padding-bottom:2px;">
          <p style="text-align:center;font-weight:700;font-size:10px;">${esc(facultyName)}</p>
        </div>
        <p style="text-align:center;font-size:10px;">Faculty</p>
      </div>
    </div>
    <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:32px;">
      <div>
        <p style="font-size:10px;margin-bottom:28px;">Noted By :</p>
        <div style="border-bottom:1px solid #000;padding-bottom:2px;">
          <p style="text-align:center;font-size:10px;">VPAA</p>
        </div>
      </div>
      <div>
        <p style="font-size:10px;margin-bottom:28px;">Approved by :</p>
        <div style="border-bottom:1px solid #000;padding-bottom:2px;">
          <p style="text-align:center;font-weight:700;font-size:10px;">MRS. JOSEPHINE M. ROXAS</p>
        </div>
        <p style="text-align:center;font-size:10px;">Executive Vice President</p>
      </div>
    </div>

  </div>`;
}

export default function AllFacultyTeachingLoadPDF({
  faculties,
  academicYear,
  semester,
  popupWindow,
  onClose,
}: AllFacultyTeachingLoadPDFProps) {
  useEffect(() => {
    let cancelled = false;
    const popup = popupWindow;

    // Show a loading screen while data is fetched
    const loadingHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Loading…</title>
<style>
  body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;
       height:100vh;margin:0;background:#f8f5f0;}
  .box{text-align:center;color:#3A2313;}
  .spinner{width:48px;height:48px;border:5px solid #E2C9B0;border-top-color:#955A27;
           border-radius:50%;animation:spin .9s linear infinite;margin:0 auto 20px;}
  @keyframes spin{to{transform:rotate(360deg);}}
  h2{font-size:18px;margin-bottom:8px;}
  p{font-size:13px;color:#666;}
</style></head><body>
<div class="box">
  <div class="spinner"></div>
  <h2>Loading All Faculty Teaching Loads</h2>
  <p>Fetching schedules for ${faculties.length} faculty member${faculties.length !== 1 ? 's' : ''}…</p>
</div></body></html>`;

    popup.document.write(loadingHtml);
    popup.document.close();

    async function fetchAllAndRender() {
      try {
        const bulkResponse = await fetch('/api/class-schedule/faculty-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            facultyIds: faculties.map((faculty) => faculty.id),
            academicYear,
            semester,
          }),
        });
        const bulkPayload = await bulkResponse.json();
        if (!bulkResponse.ok) {
          throw new Error(bulkPayload?.message || 'Failed to fetch faculty schedules');
        }

        const byFaculty =
          bulkPayload?.data?.byFaculty && typeof bulkPayload.data.byFaculty === 'object'
            ? bulkPayload.data.byFaculty
            : {};

        const scheduleResults: Schedule[][] = faculties.map((faculty) =>
          Array.isArray(byFaculty[String(faculty.id)])
            ? (byFaculty[String(faculty.id)] as Schedule[])
            : []
        );

        if (cancelled || popup.closed) {
          if (!cancelled) onClose();
          return;
        }

        const semLabel = semester === 'first' ? 'First Semester'
          : semester === 'second' ? 'Second Semester' : 'Summer';

        const pages = faculties
          .map((faculty, idx) =>
            buildFacultyPage(faculty, scheduleResults[idx], academicYear, semester, idx === faculties.length - 1)
          )
          .join('');

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>All Faculty Teaching Loads — AY ${academicYear} ${semLabel}</title>
  <style>
    @page { size: 8.5in 11in; margin: 0.3in; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; color: #000; }
    table { border-collapse: collapse; }
  </style>
</head>
<body>
  ${pages}
  <script>
    window.onload = function () {
      window.focus();
      window.print();
      window.onafterprint = function () { window.close(); };
    };
  <\/script>
</body>
</html>`;

        popup.document.open();
        popup.document.write(html);
        popup.document.close();

      } catch (err) {
        console.error('[AllFacultyTeachingLoadPDF] Error:', err);
        if (!popup.closed) {
          try {
            popup.document.open();
            popup.document.write(
              `<!DOCTYPE html><html><body style="font-family:Arial;padding:40px;color:#c0392b;">
              <h2>Error generating PDF</h2><p>${String(err)}</p>
              <p>Please close this window and try again.</p>
              </body></html>`
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
