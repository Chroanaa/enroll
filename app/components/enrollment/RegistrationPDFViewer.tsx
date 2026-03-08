'use client';

import React from 'react';
import { X, Download } from 'lucide-react';
import { colors } from '../../colors';

interface EnrolledSubject {
  course_code: string;
  descriptive_title: string;
  units_lec: number;
  units_lab: number;
  units_total: number;
}

interface PaymentSchedule {
  term: string;
  date: string;
  amount: number;
}

interface RegistrationData {
  studentName: string;
  studentNumber: string;
  programCode: string;
  programName: string;
  academicYear: string;
  semester: string;
  enrolledSubjects: EnrolledSubject[];
  tuitionFeePerUnit: number;
  cashBasis: {
    tuition: number;
    discount: number;
    netTuition: number;
    lab: number;
    misc: number;
    miscFeeItems?: { name: string; amount: number }[];
    fixedAmountTotal?: number;
    fixedFeeItems?: { name: string; amount: number }[];
    totalFees: number;
  };
  installmentBasis: {
    totalFees: number;
    downPayment: number;
    net: number;
    fivePercent: number;
    totalInstallment: number;
  };
  paymentSchedule: PaymentSchedule[];
}

interface RegistrationPDFViewerProps {
  data: RegistrationData;
  onClose: () => void;
}

export default function RegistrationPDFViewer({ data, onClose }: RegistrationPDFViewerProps) {
  const totalUnits = data.enrolledSubjects.reduce((sum, s) => sum + s.units_total, 0);
  const totalLabUnits = data.enrolledSubjects.reduce((sum, s) => sum + s.units_lab, 0);

  return (
    <div
      className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto print:p-0 print:static print:bg-white print:overflow-visible print:block print-container'
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <style type="text/css" media="print">
        {`
          @page { 
            size: 8.5in 11in; 
            margin: 0.5in; 
          }
          @media print {
            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            html, body {
              height: auto !important;
              overflow: visible !important;
              background: white !important;
              visibility: hidden;
            }
            .print-container {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
              visibility: hidden;
              overflow: visible !important;
              background: transparent !important;
            }
            #registration-print-area {
              visibility: visible !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: white !important;
              box-shadow: none !important;
            }
            #registration-print-area * {
              visibility: visible !important;
            }
          }
        `}
      </style>

      <div
        id="registration-print-area"
        className='rounded-lg shadow-2xl w-full max-w-5xl my-8 print:shadow-none print:my-0 print:w-full print:max-w-none'
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: colors.paper }}
      >
        {/* Header */}
        <div className='border-b-2 px-6 py-4 print:py-2 print:px-4 relative' style={{ borderColor: colors.primary }}>
          <div className='text-center'>
            <h1 className='text-xl font-bold tracking-wide print:text-base mb-1' style={{ color: colors.primary }}>
              COLEGIO DE STA. TERESA DE AVILA
            </h1>
            <p className='text-xs print:text-[10px]' style={{ color: colors.tertiary }}>
              (Dean's Copy)
            </p>
          </div>

          {/* Action buttons - Hidden in Print */}
          <div className='absolute top-4 right-4 flex items-center gap-2 print:hidden'>
            <button
              onClick={() => window.print()}
              className='p-2 rounded-lg transition-all'
              style={{ color: colors.primary, backgroundColor: `${colors.primary}10` }}
              title='Print/Download'
            >
              <Download className='w-5 h-5' />
            </button>
            <button
              onClick={onClose}
              className='p-2 rounded-full transition-colors'
              style={{ color: colors.tertiary, backgroundColor: `${colors.tertiary}10` }}
            >
              <X className='w-5 h-5' />
            </button>
          </div>
        </div>

        {/* Student Info Header */}
        <div className='px-6 py-4 print:px-4 print:py-2 grid grid-cols-2 gap-4 border-b' style={{ borderColor: colors.neutralBorder }}>
          <div>
            <div className='text-xs font-semibold mb-1' style={{ color: colors.tertiary }}>NAME</div>
            <div className='text-base font-bold print:text-sm' style={{ color: colors.primary }}>{data.studentName}</div>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <div className='text-xs font-semibold mb-1' style={{ color: colors.tertiary }}>PROGRAM</div>
              <div className='text-base font-bold print:text-sm' style={{ color: colors.primary }}>{data.programCode}</div>
            </div>
            <div>
              <div className='text-xs font-semibold mb-1' style={{ color: colors.tertiary }}>STUDENT NUMBER</div>
              <div className='text-xl font-bold print:text-lg' style={{ color: colors.success }}>{data.studentNumber}</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className='p-6 print:p-4 grid grid-cols-2 gap-6 print:gap-4'>
          {/* Left Column - Subjects */}
          <div>
            <div className='mb-3 print:mb-2'>
              <div className='text-sm font-bold mb-2 print:text-xs' style={{ color: colors.primary }}>SUBJECT/S ENROLLED</div>
              <div className='text-sm font-bold mb-2 print:text-xs text-right' style={{ color: colors.primary }}>UNITS</div>
            </div>
            <div className='space-y-1 print:space-y-0.5'>
              {data.enrolledSubjects.map((subject, idx) => (
                <div key={idx} className='flex justify-between items-start py-1.5 print:py-1 border-b' style={{ borderColor: colors.neutralBorder }}>
                  <div className='flex-1'>
                    <div className='text-sm font-semibold print:text-xs' style={{ color: colors.primary }}>
                      {subject.course_code} - {subject.descriptive_title}
                    </div>
                  </div>
                  <div className='text-sm font-bold print:text-xs text-right ml-4' style={{ color: colors.primary }}>
                    {subject.units_lec > 0 && subject.units_lab > 0 
                      ? `${subject.units_lec} + ${subject.units_lab}`
                      : subject.units_total}
                  </div>
                </div>
              ))}
            </div>
            <div className='mt-4 print:mt-2 pt-3 print:pt-2 border-t-2' style={{ borderColor: colors.primary }}>
              <div className='flex justify-between items-center'>
                <div className='text-sm font-bold print:text-xs' style={{ color: colors.primary }}>
                  TOTAL (Units + Laboratory/Non-Academic Units):
                </div>
                <div className='text-lg font-bold print:text-base' style={{ color: colors.primary }}>
                  {totalUnits - totalLabUnits} + {totalLabUnits}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Payment Summary */}
          <div>
            <div className='text-sm font-bold mb-3 print:mb-2 print:text-xs' style={{ color: colors.primary }}>SUMMARY OF PAYMENT</div>
            
            {/* Tuition Fee Per Unit */}
            <div className='mb-4 print:mb-2'>
              <div className='flex justify-between py-1 text-xs print:text-[10px]'>
                <span style={{ color: colors.neutral }}>TUITION FEE PER UNIT:</span>
                <span className='font-bold' style={{ color: colors.primary }}>{data.tuitionFeePerUnit}</span>
              </div>
            </div>

            {/* Cash vs Installment */}
            <div className='grid grid-cols-2 gap-4 print:gap-2 mb-4 print:mb-2'>
              <div className='text-center font-bold text-xs print:text-[10px] py-1' style={{ backgroundColor: `${colors.secondary}15`, color: colors.primary }}>
                CASH BASIS
              </div>
              <div className='text-center font-bold text-xs print:text-[10px] py-1' style={{ backgroundColor: `${colors.secondary}15`, color: colors.primary }}>
                INSTALLMENT BASIS
              </div>
            </div>

            {/* Payment Details */}
            <div className='space-y-1 print:space-y-0.5 text-xs print:text-[10px]'>
              <div className='grid grid-cols-2 gap-4 print:gap-2'>
                <div className='flex justify-between'>
                  <span style={{ color: colors.neutral }}>Tuition</span>
                  <span className='font-semibold' style={{ color: colors.primary }}>{data.cashBasis.tuition.toLocaleString()}</span>
                </div>
                <div className='flex justify-between'>
                  <span style={{ color: colors.neutral }}>Total Fees</span>
                  <span className='font-semibold' style={{ color: colors.primary }}>{data.installmentBasis.totalFees.toLocaleString()}</span>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4 print:gap-2'>
                <div className='flex justify-between'>
                  <span style={{ color: colors.neutral }}>Discount</span>
                  <span className='font-semibold' style={{ color: colors.primary }}>{data.cashBasis.discount.toLocaleString()}</span>
                </div>
                <div className='flex justify-between'>
                  <span style={{ color: colors.neutral }}>D. Payment</span>
                  <span className='font-semibold' style={{ color: colors.primary }}>{data.installmentBasis.downPayment.toLocaleString()}</span>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4 print:gap-2'>
                <div className='flex justify-between'>
                  <span style={{ color: colors.neutral }}>Net Tuition</span>
                  <span className='font-semibold' style={{ color: colors.primary }}>{data.cashBasis.netTuition.toLocaleString()}</span>
                </div>
                <div className='flex justify-between'>
                  <span style={{ color: colors.neutral }}>Net</span>
                  <span className='font-semibold' style={{ color: colors.primary }}>{data.installmentBasis.net.toLocaleString()}</span>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4 print:gap-2'>
                <div className='flex justify-between'>
                  <span style={{ color: colors.neutral }}>Lab.</span>
                  <span className='font-semibold' style={{ color: colors.primary }}>{data.cashBasis.lab.toLocaleString()}</span>
                </div>
                <div className='flex justify-between'>
                  <span style={{ color: colors.neutral }}>5% Ins. C.</span>
                  <span className='font-semibold' style={{ color: colors.primary }}>{data.installmentBasis.fivePercent.toLocaleString()}</span>
                </div>
              </div>

              {/* Fixed-amount subjects (e.g. NSTP, PE) — one row each */}
              {data.cashBasis.fixedFeeItems && data.cashBasis.fixedFeeItems.map((item, idx) => (
                <div key={idx} className='grid grid-cols-2 gap-4 print:gap-2'>
                  <div className='flex justify-between'>
                    <span style={{ color: colors.neutral }}>{item.name}</span>
                    <span className='font-semibold' style={{ color: colors.primary }}>{item.amount.toLocaleString()}</span>
                  </div>
                  <div></div>
                </div>
              ))}

              <div className='grid grid-cols-2 gap-4 print:gap-2'>
                <div className='flex justify-between'>
                  <span style={{ color: colors.neutral }}>Misc.</span>
                  <span className='font-semibold' style={{ color: colors.primary }}>{data.cashBasis.misc.toLocaleString()}</span>
                </div>
                <div></div>
              </div>



              <div className='grid grid-cols-2 gap-4 print:gap-2'>
                <div className='flex justify-between'>
                  <span style={{ color: colors.neutral }}>Other/s:</span>
                  <span className='font-semibold' style={{ color: colors.primary }}>NONE</span>
                </div>
                <div></div>
              </div>

              {/* Total Fees Row */}
              <div className='grid grid-cols-2 gap-4 print:gap-2 pt-2 print:pt-1 border-t' style={{ borderColor: colors.neutralBorder }}>
                <div className='flex justify-between font-bold'>
                  <span style={{ color: colors.primary }}>Total Fees</span>
                  <span style={{ color: colors.primary }}>{data.cashBasis.totalFees.toLocaleString()}</span>
                </div>
                <div className='flex justify-between font-bold'>
                  <span style={{ color: colors.primary }}>Total Ins.</span>
                  <span style={{ color: colors.primary }}>{data.installmentBasis.totalInstallment.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Mode of Payment */}
            <div className='mt-6 print:mt-3'>
              <div className='text-center font-bold text-sm mb-2 print:text-xs print:mb-1' style={{ color: colors.primary }}>
                MODE OF PAYMENT
              </div>
              <table className='w-full border-collapse text-xs print:text-[10px]'>
                <thead>
                  <tr style={{ backgroundColor: `${colors.secondary}15` }}>
                    <th className='border px-2 py-1 print:px-1 print:py-0.5 font-bold' style={{ borderColor: colors.tertiary, color: colors.primary }}>TERM</th>
                    <th className='border px-2 py-1 print:px-1 print:py-0.5 font-bold' style={{ borderColor: colors.tertiary, color: colors.primary }}>DATE</th>
                    <th className='border px-2 py-1 print:px-1 print:py-0.5 font-bold' style={{ borderColor: colors.tertiary, color: colors.primary }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {data.paymentSchedule.map((payment, idx) => (
                    <tr key={idx}>
                      <td className='border px-2 py-1 print:px-1 print:py-0.5 text-center' style={{ borderColor: colors.tertiary, color: colors.primary }}>{payment.term}</td>
                      <td className='border px-2 py-1 print:px-1 print:py-0.5 text-center' style={{ borderColor: colors.tertiary, color: colors.primary }}>{payment.date}</td>
                      <td className='border px-2 py-1 print:px-1 print:py-0.5 text-right' style={{ borderColor: colors.tertiary, color: colors.primary }}>{payment.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature Area */}
            <div className='mt-6 print:mt-4 pt-4 print:pt-2 border-t' style={{ borderColor: colors.neutralBorder }}>
              <div className='text-center'>
                <div className='inline-block border-b-2 px-12 py-1 mb-1' style={{ borderColor: colors.primary }}>
                  <span className='text-sm print:text-xs' style={{ color: colors.primary }}>&nbsp;</span>
                </div>
                <div className='text-xs print:text-[10px] font-semibold' style={{ color: colors.tertiary }}>
                  ACCOUNTING / CASHIER'S SIGNATURE
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
