'use client';

import { useEffect } from 'react';

export interface SectionForClasslistPDF {
  id: number;
  programId: number;
  sectionName: string;
  programCode: string;
  programName: string;
  yearLevel: number;
  academicYear: string;
  semester: string;
}

interface AssignedStudent {
  studentNumber: string;
  name: string;
  assignmentType: string;
  email?: string | null;
}

interface AllSectionClasslistsPDFProps {
  sections: SectionForClasslistPDF[];
  popupWindow: Window;
  onClose: () => void;
}

const semesterLabel = (sem: string): string => {
  const s = sem.trim().toLowerCase();
  if (s === '1' || s === 'first' || s === 'first semester') return '1st Semester';
  if (s === '2' || s === 'second' || s === 'second semester') return '2nd Semester';
  if (s === '3' || s === 'summer') return 'Summer';
  return sem;
};

const yearLevelLabel = (yr: number): string => {
  const labels: Record<number, string> = {
    1: '1st Year',
    2: '2nd Year',
    3: '3rd Year',
    4: '4th Year',
    5: '5th Year',
  };
  return labels[yr] || `Year ${yr}`;
};

const escHtml = (value: string | undefined | null): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function buildSectionClasslistPage(
  section: SectionForClasslistPDF,
  students: AssignedStudent[],
  isLast: boolean,
  printedAt: string
): string {
  const regularCount = students.filter((s) => s.assignmentType !== 'irregular').length;
  const irregularCount = students.filter((s) => s.assignmentType === 'irregular').length;
  const pageBreak = isLast ? '' : 'page-break-after: always;';

  const rowsHtml =
    students.length === 0
      ? '<tr><td colspan="5" style="text-align:center;padding:24px;color:#9ca3af;font-style:italic;">No students assigned to this section.</td></tr>'
      : students
          .map((student, index) => {
            const bg = index % 2 === 0 ? '#ffffff' : '#faf9f7';
            const type = student.assignmentType === 'irregular' ? 'Irregular' : 'Regular';
            const typeColor = student.assignmentType === 'irregular' ? '#7e22ce' : '#1d4ed8';
            return (
              '<tr style="background:' +
              bg +
              ';border-bottom:1px solid #e5e7eb;">' +
              '<td style="padding:8px 10px;font-size:11px;color:#9ca3af;width:38px;">' +
              (index + 1) +
              '</td>' +
              '<td style="padding:8px 10px;font-size:11px;font-weight:700;color:#4a2c14;">' +
              escHtml(student.studentNumber) +
              '</td>' +
              '<td style="padding:8px 10px;font-size:11px;color:#374151;">' +
              escHtml(student.name) +
              '</td>' +
              '<td style="padding:8px 10px;font-size:11px;color:#374151;">' +
              escHtml(student.email ?? '') +
              '</td>' +
              '<td style="padding:8px 10px;font-size:11px;font-weight:700;text-align:center;color:' +
              typeColor +
              ';">' +
              type +
              '</td>' +
              '</tr>'
            );
          })
          .join('');

  return (
    '<section style="' +
    pageBreak +
    'padding:8px 6px 14px;font-family:Arial,sans-serif;color:#1f2937;">' +
    '<div style="text-align:center;border-bottom:2px solid #4a2c14;padding-bottom:10px;margin-bottom:8px;">' +
    '<div style="font-size:18px;font-weight:900;letter-spacing:.04em;color:#4a2c14;">COLEGIO DE STA. TERESA DE AVILA</div>' +
    '<div style="font-size:10px;color:#7c5230;letter-spacing:.08em;margin-top:2px;">Foundation, Inc. - Molo, Iloilo City</div>' +
    '<div style="display:inline-block;margin-top:7px;padding:3px 16px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;background:rgba(149,90,39,.10);color:#955a27;">Section Classlist</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:8px 0;border-bottom:1px solid #e5e7eb;background:rgba(74,44,20,.03);">' +
    '<div><div style="font-size:9px;font-weight:700;letter-spacing:.1em;color:#7c5230;">Section</div><div style="font-size:12px;font-weight:700;color:#4a2c14;">' +
    escHtml(section.sectionName) +
    '</div></div>' +
    '<div><div style="font-size:9px;font-weight:700;letter-spacing:.1em;color:#7c5230;">Program</div><div style="font-size:12px;font-weight:700;color:#4a2c14;">' +
    escHtml(section.programCode || section.programName) +
    '</div></div>' +
    '<div><div style="font-size:9px;font-weight:700;letter-spacing:.1em;color:#7c5230;">Year Level</div><div style="font-size:12px;font-weight:700;color:#4a2c14;">' +
    escHtml(yearLevelLabel(section.yearLevel)) +
    '</div></div>' +
    '<div><div style="font-size:9px;font-weight:700;letter-spacing:.1em;color:#7c5230;">Term</div><div style="font-size:12px;font-weight:700;color:#4a2c14;">' +
    escHtml(`${semesterLabel(section.semester)}, A.Y. ${section.academicYear}`) +
    '</div></div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #e5e7eb;font-size:11px;">' +
    '<span style="font-weight:700;color:#4a2c14;">Total: <span style="color:#955a27;">' +
    students.length +
    '</span></span>' +
    '<span style="color:#d1d5db;">|</span>' +
    '<span style="font-weight:700;color:#1d4ed8;">Regular: ' +
    regularCount +
    '</span>' +
    '<span style="font-weight:700;color:#7e22ce;">Irregular: ' +
    irregularCount +
    '</span>' +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:11px;">' +
    '<thead><tr style="background:rgba(74,44,20,.06);border-bottom:2px solid #4a2c14;">' +
    '<th style="padding:8px 10px;text-align:left;font-size:10.5px;color:#4a2c14;width:38px;">#</th>' +
    '<th style="padding:8px 10px;text-align:left;font-size:10.5px;color:#4a2c14;">Student No.</th>' +
    '<th style="padding:8px 10px;text-align:left;font-size:10.5px;color:#4a2c14;">Full Name</th>' +
    '<th style="padding:8px 10px;text-align:left;font-size:10.5px;color:#4a2c14;">Email</th>' +
    '<th style="padding:8px 10px;text-align:center;font-size:10.5px;color:#4a2c14;">Type</th>' +
    '</tr></thead>' +
    '<tbody>' +
    rowsHtml +
    '</tbody>' +
    '</table>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:30px;padding-top:12px;border-top:1px solid #e5e7eb;">' +
    '<div style="text-align:center;"><div style="border-bottom:2px solid #4a2c14;height:24px;margin-bottom:5px;"></div><div style="font-size:9.5px;font-weight:700;letter-spacing:.1em;color:#7c5230;text-transform:uppercase;">Prepared by</div></div>' +
    '<div style="text-align:center;"><div style="border-bottom:2px solid #4a2c14;height:24px;margin-bottom:5px;"></div><div style="font-size:9.5px;font-weight:700;letter-spacing:.1em;color:#7c5230;text-transform:uppercase;">Noted by / Registrar</div></div>' +
    '</div>' +
    '<div style="text-align:right;font-size:9px;color:#9ca3af;margin-top:8px;">Printed: ' +
    escHtml(printedAt) +
    '</div>' +
    '</section>'
  );
}

export default function AllSectionClasslistsPDF({
  sections,
  popupWindow,
  onClose,
}: AllSectionClasslistsPDFProps) {
  useEffect(() => {
    let cancelled = false;
    const popup = popupWindow;

    popup.document.write(
      '<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Loading...</title>' +
        '<style>' +
        'body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8f5f0;}' +
        '.box{text-align:center;color:#3A2313;}' +
        '.spinner{width:48px;height:48px;border:5px solid #E2C9B0;border-top-color:#955A27;border-radius:50%;animation:spin .9s linear infinite;margin:0 auto 20px;}' +
        '@keyframes spin{to{transform:rotate(360deg);}}' +
        'h2{font-size:18px;margin-bottom:8px;}p{font-size:13px;color:#666;}' +
        '</style></head><body>' +
        '<div class="box"><div class="spinner"></div><h2>Loading Section Classlists</h2><p>Fetching student lists for ' +
        sections.length +
        ' section' +
        (sections.length !== 1 ? 's' : '') +
        '...</p></div></body></html>'
    );
    popup.document.close();

    async function fetchAndRender() {
      try {
        const dominantAcademicYear =
          sections.reduce<Record<string, number>>((acc, section) => {
            const key = section.academicYear || '';
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
          }, {});
        const dominantSemester =
          sections.reduce<Record<string, number>>((acc, section) => {
            const key = section.semester || '';
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
          }, {});

        const selectedAcademicYear =
          Object.entries(dominantAcademicYear).sort((a, b) => b[1] - a[1])[0]?.[0] || undefined;
        const selectedSemester =
          Object.entries(dominantSemester).sort((a, b) => b[1] - a[1])[0]?.[0] || undefined;

        const bulkResponse = await fetch('/api/student-section/classlist-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionIds: sections.map((section) => section.id),
            academicYear: selectedAcademicYear,
            semester: selectedSemester,
          }),
        });

        const bulkPayload = await bulkResponse.json();
        if (!bulkResponse.ok) {
          throw new Error(bulkPayload?.message || 'Failed to fetch classlist data');
        }
        const bySection =
          bulkPayload?.data?.bySection && typeof bulkPayload.data.bySection === 'object'
            ? bulkPayload.data.bySection
            : {};

        const results = sections.map((section) => ({
          section,
          students: Array.isArray(bySection[String(section.id)])
            ? (bySection[String(section.id)] as AssignedStudent[])
            : [],
        }));

        if (cancelled || popup.closed) {
          if (!cancelled) onClose();
          return;
        }

        const printedAt = new Date().toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const pages = results
          .map((result, index) =>
            buildSectionClasslistPage(
              result.section,
              result.students,
              index === results.length - 1,
              printedAt
            )
          )
          .join('');

        const firstSection = sections[0];
        const titleTerm = firstSection
          ? `${semesterLabel(firstSection.semester)}, A.Y. ${firstSection.academicYear}`
          : 'Filtered Sections';

        const html =
          '<!DOCTYPE html><html><head><meta charset="UTF-8"/>' +
          '<title>Section Classlists - ' +
          escHtml(titleTerm) +
          '</title>' +
          '<style>' +
          '@page{size:8.5in 11in;margin:.5in .6in;}' +
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
      } catch (error) {
        if (!popup.closed) {
          try {
            popup.document.open();
            popup.document.write(
              '<!DOCTYPE html><html><body style="font-family:Arial;padding:40px;color:#c0392b;">' +
                '<h2>Error generating classlist PDF</h2><p>' +
                escHtml(String(error)) +
                '</p><p>Please close this window and try again.</p></body></html>'
            );
            popup.document.close();
          } catch {
            // noop
          }
        }
      }

      if (!cancelled) onClose();
    }

    fetchAndRender();

    return () => {
      cancelled = true;
    };
  }, [sections, popupWindow, onClose]);

  return null;
}
