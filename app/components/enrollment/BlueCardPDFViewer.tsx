'use client';

import React from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { colors } from '../../colors';

type ClassListItem = {
  sectionName?: string;
  courseCode: string;
  descriptiveTitle: string;
  unitsTotal?: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  facultyName: string;
};

type BlueCardData = {
  familyName?: string;
  firstName?: string;
  middleName?: string;
  studentNumber: string;
  studentName?: string;
  programCode?: string;
  programName?: string;
  yearLevel?: number | null;
  academicStatus?: string;
  homeAddress?: string;
  mobileNumber?: string;
  academicYear: string;
  semester: string;
  classList?: ClassListItem[];
  enrolledSubjects?: Array<{
    course_code: string;
    descriptive_title: string;
    units_total: number;
  }>;
};

interface BlueCardPDFViewerProps {
  data: BlueCardData;
  onClose: () => void;
  auditContext?: string;
}

const formatTime = (timeValue: string) => {
  const parsed = new Date(timeValue);
  if (Number.isNaN(parsed.getTime())) return timeValue || '';
  return parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export default function BlueCardPDFViewer({ data, onClose, auditContext }: BlueCardPDFViewerProps) {
  const [isPrinting, setIsPrinting] = React.useState(false);
  const originalTitleRef = React.useRef<string>('');

  const groupedRows = React.useMemo(() => {
    const rows = Array.isArray(data.classList) ? data.classList : [];
    if (rows.length === 0 && Array.isArray(data.enrolledSubjects)) {
      return data.enrolledSubjects.map((s) => ({
        subject: `${s.course_code} - ${s.descriptive_title}`,
        units: Number(s.units_total) || 0,
        day: [] as string[],
        time: [] as string[],
        instructor: '',
      }));
    }

    const map = new Map<string, { subject: string; units: number; day: string[]; time: string[]; instructor: string }>();
    for (const row of rows) {
      const key = `${row.courseCode}|${row.descriptiveTitle}`;
      const item = map.get(key) || {
        subject: `${row.courseCode} - ${row.descriptiveTitle}`,
        units: Number(row.unitsTotal) || 0,
        day: [],
        time: [],
        instructor: row.facultyName || '',
      };
      if (row.dayOfWeek && !item.day.includes(row.dayOfWeek)) item.day.push(row.dayOfWeek);
      const timeRange = `${formatTime(row.startTime)} - ${formatTime(row.endTime)}`;
      if (row.startTime && row.endTime && !item.time.includes(timeRange)) item.time.push(timeRange);
      if (!item.instructor && row.facultyName) item.instructor = row.facultyName;
      map.set(key, item);
    }
    return Array.from(map.values()).slice(0, 11);
  }, [data.classList, data.enrolledSubjects]);

  const totalUnits = groupedRows.reduce((sum, row) => sum + (Number(row.units) || 0), 0);
  const sem = String(data.semester || '').toLowerCase();
  const isFirstSem = sem.includes('1') || sem.includes('first');
  const isSecondSem = sem.includes('2') || sem.includes('second');
  const yearLevel = Number(data.yearLevel || 0);
  const status = String(data.academicStatus || '').toLowerCase();
  const primarySection =
    Array.isArray(data.classList) && data.classList.length > 0
      ? String(data.classList[0].sectionName || '').trim()
      : '';

  const sanitizedFileName = React.useMemo(() => {
    const fullName = [
      data.familyName || '',
      data.firstName || '',
      data.middleName || '',
    ]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() || (data.studentName || '').trim() || 'UNKNOWN';

    const semesterLabel = String(data.semester || 'SEM').replace(/\s+/g, '-');
    const sectionLabel = primarySection || 'NO-SECTION';

    const raw = `${data.studentNumber || 'NO-STUDENT'} - ${fullName} - ${sectionLabel} - ${semesterLabel} - BLUE CARD`;
    return raw.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
  }, [
    data.familyName,
    data.firstName,
    data.middleName,
    data.studentName,
    data.studentNumber,
    data.semester,
    primarySection,
  ]);

  React.useEffect(() => {
    const handleAfterPrint = () => {
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      const response = await fetch('/api/auth/enrollment/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentNumber: data.studentNumber,
          academicYear: data.academicYear,
          semester: data.semester,
          context: auditContext || 'blue_card_pdf',
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to record print audit.');
      }
      originalTitleRef.current = document.title;
      document.title = sanitizedFileName;
      window.print();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to print blue card.');
    } finally {
      // Fallback in case afterprint does not fire in some browsers.
      setTimeout(() => {
        if (originalTitleRef.current) {
          document.title = originalTitleRef.current;
        }
      }, 1000);
      setIsPrinting(false);
    }
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-8 print:p-0 print:block print:bg-white'
      onClick={onClose}
    >
      <style type='text/css' media='print'>{`
        @page { size: landscape; margin: 0.1in; }
        @media print {
          html, body { background: white !important; overflow: visible !important; visibility: hidden; }
          .blue-card-print-container { visibility: hidden !important; }
          #blue-card-print-area, #blue-card-print-area * { visibility: visible !important; }
          #blue-card-print-area {
            position: static !important;
            display: block !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: 1px solid #222 !important;
            page-break-inside: auto !important;
          }
          #blue-card-print-area .print-tight {
            font-size: 8.2px !important;
            line-height: 1.05 !important;
          }
          #blue-card-print-area table { page-break-inside: auto !important; }
          #blue-card-print-area tr { page-break-after: auto !important; }
        }
      `}</style>

      <div
        id='blue-card-print-area'
        className='blue-card-print-container w-full max-w-[1700px] rounded-lg bg-white shadow-2xl max-h-[92vh] overflow-auto print:max-h-none print:overflow-visible'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='relative border-b px-4 py-3 print:hidden' style={{ borderColor: colors.neutralBorder }}>
          <div className='text-lg font-bold' style={{ color: colors.primary }}>Blue Card Preview</div>
          <div className='absolute right-4 top-3 flex items-center gap-2'>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className='rounded-lg p-2'
              style={{ backgroundColor: `${colors.secondary}15`, color: colors.secondary }}
            >
              {isPrinting ? <Loader2 className='h-5 w-5 animate-spin' /> : <Download className='h-5 w-5' />}
            </button>
            <button onClick={onClose} className='rounded-lg p-2' style={{ backgroundColor: `${colors.tertiary}10`, color: colors.tertiary }}>
              <X className='h-5 w-5' />
            </button>
          </div>
        </div>

        <div className='p-4 text-[13px] leading-snug text-black print:p-2 print:text-[9px] print-tight'>
          <div className='text-center'>
            <div className='text-[46px] tracking-wide font-semibold print:text-[22px]'>COLEGIO DE STA. TERESA DE AVILA</div>
            <div className='text-[17px] print:text-[9px]'>1177 Quirino Highway, Barangay Kaligayahan, Novaliches Quezon City</div>
            <div className='text-[17px] print:text-[9px]'>8275-3916 / 09123245035 / 09652871385</div>
            <div className='mt-1 text-[56px] font-bold leading-tight print:text-[23px]'>REGISTRATION AND TENTATIVE REPORT OF GRADES</div>
          </div>

          <div className='mt-3 grid grid-cols-12 gap-2'>
            <div className='col-span-3 border p-1'>SURNAME: <b>{data.familyName || '-'}</b></div>
            <div className='col-span-3 border p-1'>FIRST NAME: <b>{data.firstName || '-'}</b></div>
            <div className='col-span-3 border p-1'>MIDDLE NAME: <b>{data.middleName || '-'}</b></div>
            <div className='col-span-3 border p-1'>STUDENT NUMBER: <b>{data.studentNumber || '-'}</b></div>

            <div className='col-span-3 border p-1'>
              YEAR LEVEL:
              <span className='ml-2'>[{yearLevel === 1 ? 'x' : ' '}]1</span>
              <span className='ml-2'>[{yearLevel === 2 ? 'x' : ' '}]2</span>
              <span className='ml-2'>[{yearLevel === 3 ? 'x' : ' '}]3</span>
              <span className='ml-2'>[{yearLevel === 4 ? 'x' : ' '}]4</span>
              <div>SEMESTER: <span className='ml-1'>[{isFirstSem ? 'x' : ' '}] FIRST</span> <span className='ml-2'>[{isSecondSem ? 'x' : ' '}] SECOND</span></div>
              <div>ACADEMIC YEAR: <b>{data.academicYear || '-'}</b></div>
            </div>
            <div className='col-span-5 border p-1'>
              STUDENT STATUS:
              <span className='ml-2'>[{status.includes('new') ? 'x' : ' '}] NEW</span>
              <span className='ml-2'>[{status.includes('old') || status.includes('regular') ? 'x' : ' '}] OLD</span>
              <span className='ml-2'>[{status.includes('returnee') ? 'x' : ' '}] RETURNEE</span>
              <span className='ml-2'>[{status.includes('cross') ? 'x' : ' '}] CROSS-ENROLLEE</span>
              <div>HOME ADDRESS: <b>{data.homeAddress || '-'}</b></div>
            </div>
            <div className='col-span-4 border p-1'>
              COURSE: <b>{data.programCode || data.programName || '-'}</b>
              <div>MOBILE / TELEPHONE: <b>{data.mobileNumber || '-'}</b></div>
            </div>
          </div>

          <table className='mt-2 w-full border-collapse border text-[13px] print:text-[9px]'>
            <thead>
              <tr>
                <th className='border p-1.5 w-[42px]'>No.</th>
                <th className='border p-1.5'>SUBJECT/S</th>
                <th className='border p-1.5 w-[66px]'>Units</th>
                <th className='border p-1.5 w-[98px]'>Day</th>
                <th className='border p-1.5 w-[170px]'>Time</th>
                <th className='border p-1.5 w-[190px]'>Instructor</th>
                <th className='border p-1.5 w-[100px]'>PRE-LIM</th>
                <th className='border p-1.5 w-[100px]'>MID-TERM</th>
                <th className='border p-1.5 w-[100px]'>PRE-FINAL</th>
                <th className='border p-1.5 w-[100px]'>FINAL</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 11 }).map((_, idx) => {
                const row = groupedRows[idx];
                return (
                  <tr key={idx} className='h-8 print:h-4'>
                    <td className='border p-1 text-center'>{idx + 1}</td>
                    <td className='border p-1'>{row?.subject || ''}</td>
                    <td className='border p-1 text-center'>{row?.units || ''}</td>
                    <td className='border p-1 text-center'>{row?.day?.join(', ') || ''}</td>
                    <td className='border p-1 text-center'>{row?.time?.join(' / ') || ''}</td>
                    <td className='border p-1'>{row?.instructor || ''}</td>
                    <td className='border p-1'></td>
                    <td className='border p-1'></td>
                    <td className='border p-1'></td>
                    <td className='border p-1'></td>
                  </tr>
                );
              })}
              <tr>
                <td className='border p-1 text-right font-semibold' colSpan={2}>TOTAL UNITS</td>
                <td className='border p-1 text-center font-semibold'>{totalUnits}</td>
                <td className='border p-1 text-center font-semibold' colSpan={2}>PARENT'S SIGNATURE</td>
                <td className='border p-1' colSpan={5}></td>
              </tr>
            </tbody>
          </table>

          <div className='mt-1 grid grid-cols-12 gap-1 text-[12px] print:text-[8px]'>
            <div className='col-span-4'>
              <div className='mb-1 font-semibold'>COLLEGE DEAN:</div>
              <div className='h-8 border print:h-6'></div>
            </div>
            <div className='col-span-4'>
              <div className='mb-1 font-semibold'>REGISTRAR:</div>
              <div className='h-8 border print:h-6'></div>
            </div>
            <div className='col-span-4'>
              <div className='mb-1 font-semibold'>DATE ENROLLED:</div>
              <div className='h-8 border print:h-6'></div>
            </div>
          </div>

          <div className='mt-1 grid grid-cols-12 gap-1 text-[11px] print:text-[8px]'>
            <div className='col-span-5 border p-1'>
              <div className='font-semibold mb-1'>GRADING SYSTEM</div>
              <div>1.00 = 98-100</div>
              <div>1.25 = 95-97</div>
              <div>1.50 = 92-94</div>
              <div>1.75 = 89-91</div>
              <div>2.00 = 86-88</div>
              <div>2.25 = 83-85</div>
              <div>2.50 = 80-82</div>
              <div>2.75 = 76-79</div>
              <div>3.00 = 75</div>
              <div>5.00 = Below 75</div>
            </div>
            <div className='col-span-2 border p-1'>
              <div>DRP = Dropped</div>
              <div>INC = Incomplete</div>
              <div>AW = Authorized Withdrawal</div>
              <div>UW = Unauthorized Withdrawal</div>
            </div>
            <div className='col-span-5 border p-1'>
              <div className='font-semibold'>Reminders:</div>
              <div>- Please have the professor sign the bluecard.</div>
              <div>- No clearance will be signed by the registrar at the end of the semester.</div>
              <div>- You only have 1 year to complete INC (Incomplete grades).</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
