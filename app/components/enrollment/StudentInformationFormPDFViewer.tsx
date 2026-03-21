'use client';

import React from 'react';
import { Download, X } from 'lucide-react';
import { colors } from '../../colors';

interface StudentInformationFormPDFData {
  studentNumber: string;
  admissionDate: string;
  academicYear: string;
  admissionStatus: string;
  term: string;
  requirements: string[];
  departmentName: string;
  programName: string;
  majorName?: string;
  familyName: string;
  firstName: string;
  middleName: string;
  sex: string;
  civilStatus: string;
  birthdate: string;
  birthPlace: string;
  completeAddress: string;
  contactNumber: string;
  emailAddress: string;
  emergencyContactName: string;
  emergencyRelationship: string;
  emergencyContactNumber: string;
  lastSchoolAttended: string;
  previousSchoolYear: string;
  programShs: string;
  remarks: string;
  photoUrl?: string | null;
}

interface StudentInformationFormPDFViewerProps {
  data: StudentInformationFormPDFData;
  onClose: () => void;
}

const formatDate = (value: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const labelize = (value: string) => {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const CHECKBOX_REQUIREMENTS = [
  'School Form 10 / Form 137A',
  'Transcript of Records',
  'Certificate of Good Moral Character',
  'School Form 9 / Form 138',
  'Honorable Dismissal',
  'Birth / Marriage Certificate',
];

export default function StudentInformationFormPDFViewer({
  data,
  onClose,
}: StudentInformationFormPDFViewerProps) {
  const selectedRequirements = new Set(data.requirements || []);

  const fullProgramLabel = data.majorName
    ? `${data.programName} (${data.majorName})`
    : data.programName;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-4 pt-8 print:block print:bg-white print:p-0'
      onClick={onClose}
    >
      <style type='text/css' media='print'>{`
        @page { size: 8.5in 11in; margin: 0.45in; }
        @media print {
          html, body {
            background: white !important;
            overflow: visible !important;
            visibility: hidden;
          }
          .student-info-print-container {
            visibility: hidden !important;
          }
          #student-info-print-area, #student-info-print-area * {
            visibility: visible !important;
          }
          #student-info-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
          .student-info-print-hide {
            display: none !important;
          }
        }
      `}</style>

      <div
        id='student-info-print-area'
        className='student-info-print-container w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-xl shadow-2xl print:overflow-visible'
        style={{
          backgroundColor: colors.paper,
          border: `1px solid ${colors.accent}30`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className='student-info-print-hide sticky top-0 z-10 flex items-center justify-between border-b px-5 py-3'
          style={{
            borderColor: colors.neutralBorder,
            backgroundColor: colors.paper,
          }}
        >
          <h2 className='text-lg font-bold' style={{ color: colors.primary }}>
            Student Information Form PDF Preview
          </h2>
          <div className='flex items-center gap-2'>
            <button
              onClick={handlePrint}
              className='rounded-lg p-2'
              style={{ backgroundColor: `${colors.secondary}15`, color: colors.secondary }}
              title='Download / Print'
            >
              <Download className='h-5 w-5' />
            </button>
            <button
              onClick={onClose}
              className='rounded-lg p-2'
              style={{ backgroundColor: `${colors.tertiary}15`, color: colors.tertiary }}
              title='Close'
            >
              <X className='h-5 w-5' />
            </button>
          </div>
        </div>

        <div className='p-5 text-[13px] leading-snug text-black print:p-0 print:text-[11px]'>
          <div className='grid grid-cols-[1fr_170px] gap-4 border-b pb-3' style={{ borderColor: colors.tertiary }}>
            <div>
              <div className='text-center'>
                <div className='flex items-center justify-center gap-3'>
                  <img
                    src='/logo.png'
                    alt='School Logo'
                    className='h-16 w-16 object-contain print:h-12 print:w-12'
                  />
                  <div>
                    <div className='text-[28px] font-bold tracking-wide print:text-[19px]'>
                      COLEGIO DE STA. TERESA DE AVILA
                    </div>
                    <div className='text-[12px] print:text-[10px]'>
                      1177 Quirino Highway, Brgy. Kaligayahan, Novaliches, Quezon City
                    </div>
                  </div>
                </div>
                <div className='mt-1 text-[16px] font-semibold uppercase print:text-[13px]'>
                  Student Information Form
                </div>
              </div>

              <div className='mt-3 grid grid-cols-2 gap-x-6 gap-y-2'>
                <div>
                  <span className='font-semibold'>Admission Date:</span> {data.admissionDate || '-'}
                </div>
                <div>
                  <span className='font-semibold'>Admission Status:</span> {labelize(data.admissionStatus) || '-'}
                </div>
                <div>
                  <span className='font-semibold'>Academic Year:</span> {data.academicYear || '-'}
                </div>
                <div>
                  <span className='font-semibold'>Term:</span> {labelize(data.term) || '-'}
                </div>
              </div>
            </div>

            <div className='border p-2' style={{ borderColor: colors.tertiary, backgroundColor: '#fff' }}>
              <div className='mb-1 text-center text-[11px] font-semibold'>PHOTO</div>
              <div className='flex h-[140px] items-center justify-center border print:h-[128px]' style={{ borderColor: colors.tertiary }}>
                {data.photoUrl ? (
                  <img src={data.photoUrl} alt='Student Photo' className='h-full w-full object-cover' />
                ) : (
                  <span className='text-[10px] text-gray-500'>No photo uploaded</span>
                )}
              </div>
              <div className='mt-1 text-center text-[11px]'>
                <span className='font-semibold'>Student Number:</span> {data.studentNumber || '-'}
              </div>
            </div>
          </div>

          <div className='mt-3 border p-2 bg-white/70' style={{ borderColor: colors.tertiary }}>
            <div className='mb-1 font-semibold uppercase'>Admission Requirements</div>
            <div className='grid grid-cols-2 gap-x-6 gap-y-1'>
              {CHECKBOX_REQUIREMENTS.map((item) => (
                <div key={item}>[{selectedRequirements.has(item) ? 'x' : ' '}] {item}</div>
              ))}
            </div>
          </div>

          <div className='mt-3 border p-2 bg-white/70' style={{ borderColor: colors.tertiary }}>
            <div className='grid grid-cols-2 gap-x-6 gap-y-1'>
              <div>
                <span className='font-semibold'>Department:</span> {data.departmentName || '-'}
              </div>
              <div>
                <span className='font-semibold'>Course/Program:</span> {fullProgramLabel || '-'}
              </div>
            </div>
          </div>

          <div className='mt-3 border p-2 bg-white/70' style={{ borderColor: colors.tertiary }}>
            <div className='mb-1 font-semibold uppercase'>Personal Information</div>
            <div className='grid grid-cols-3 gap-x-5 gap-y-1'>
              <div>
                <span className='font-semibold'>Family Name:</span> {data.familyName || '-'}
              </div>
              <div>
                <span className='font-semibold'>First Name:</span> {data.firstName || '-'}
              </div>
              <div>
                <span className='font-semibold'>Middle Name:</span> {data.middleName || '-'}
              </div>
              <div>
                <span className='font-semibold'>Sex:</span> {labelize(data.sex) || '-'}
              </div>
              <div>
                <span className='font-semibold'>Civil Status:</span> {labelize(data.civilStatus) || '-'}
              </div>
              <div>
                <span className='font-semibold'>Birthdate:</span> {formatDate(data.birthdate) || '-'}
              </div>
            </div>
            <div className='mt-1'>
              <span className='font-semibold'>Birthplace:</span> {data.birthPlace || '-'}
            </div>
            <div className='mt-1'>
              <span className='font-semibold'>Complete Address:</span> {data.completeAddress || '-'}
            </div>
            <div className='mt-1 grid grid-cols-2 gap-x-6'>
              <div>
                <span className='font-semibold'>Contact Number:</span> {data.contactNumber || '-'}
              </div>
              <div>
                <span className='font-semibold'>Email Address:</span> {data.emailAddress || '-'}
              </div>
            </div>
          </div>

          <div className='mt-3 border p-2 bg-white/70' style={{ borderColor: colors.tertiary }}>
            <div className='mb-1 font-semibold uppercase'>Emergency Information</div>
            <div className='grid grid-cols-3 gap-x-6 gap-y-1'>
              <div>
                <span className='font-semibold'>Name:</span> {data.emergencyContactName || '-'}
              </div>
              <div>
                <span className='font-semibold'>Relationship:</span> {data.emergencyRelationship || '-'}
              </div>
              <div>
                <span className='font-semibold'>Contact Number:</span> {data.emergencyContactNumber || '-'}
              </div>
            </div>
          </div>

          <div className='mt-3 border p-2 bg-white/70' style={{ borderColor: colors.tertiary }}>
            <div className='mb-1 font-semibold uppercase'>Educational Background</div>
            <div className='grid grid-cols-2 gap-x-6 gap-y-1'>
              <div>
                <span className='font-semibold'>Last School Attended:</span> {data.lastSchoolAttended || '-'}
              </div>
              <div>
                <span className='font-semibold'>School Year:</span> {data.previousSchoolYear || '-'}
              </div>
              <div>
                <span className='font-semibold'>Program (SHS):</span> {data.programShs || '-'}
              </div>
              <div>
                <span className='font-semibold'>Remarks:</span> {data.remarks || '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
