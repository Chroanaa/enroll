import React from "react";
import { Search, FileText, Loader2 } from "lucide-react";
import { colors } from "../../colors";
import { formatAmount } from "./utils";

interface EnrollmentsTabContentProps {
  studentNumberSearch: string;
  setStudentNumberSearch: (value: string) => void;
  academicYearSearch: string;
  setAcademicYearSearch: (value: string) => void;
  semesterSearch: 1 | 2;
  setSemesterSearch: (value: 1 | 2) => void;
  financialSummary: any;
  isLoadingFinancialSummary: boolean;
  onSearch: () => void;
  onBrowseClick: () => void;
  formatAmount: (amount: number | null | undefined) => string;
}

export const EnrollmentsTabContent: React.FC<EnrollmentsTabContentProps> = ({
  studentNumberSearch,
  setStudentNumberSearch,
  academicYearSearch,
  setAcademicYearSearch,
  semesterSearch,
  setSemesterSearch,
  financialSummary,
  isLoadingFinancialSummary,
  onSearch,
  onBrowseClick,
}) => {
  return (
    <div className='space-y-6'>
      {/* Search Section */}
      <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-6'>
        <h2
          className='text-lg font-bold mb-4'
          style={{ color: colors.primary }}
        >
          Search Student Financial Summary
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Student Number
            </label>
            <div className='flex gap-2'>
              <input
                type='text'
                value={studentNumberSearch}
                onChange={(e) => setStudentNumberSearch(e.target.value)}
                placeholder='Enter student number'
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSearch();
                  }
                }}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
              <button
                type='button'
                onClick={onBrowseClick}
                className='px-3 py-2 rounded-lg text-white font-medium flex items-center gap-2 hover:opacity-90 transition-colors'
                style={{ backgroundColor: colors.secondary }}
              >
                <Search className='w-4 h-4' />
                Browse
              </button>
            </div>
            <p className='text-xs text-gray-500 mt-1'>
              Use the browse option to search by name with major/program filters.
            </p>
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Academic Year
            </label>
            <input
              type='text'
              value={academicYearSearch}
              onChange={(e) => setAcademicYearSearch(e.target.value)}
              placeholder='e.g., 2024-2025'
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSearch();
                }
              }}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
            <p className='text-xs text-gray-500 mt-1'>Press Enter to search.</p>
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Semester
            </label>
            <select
              value={semesterSearch}
              onChange={(e) =>
                setSemesterSearch(parseInt(e.target.value) as 1 | 2)
              }
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            >
              <option value={1}>First Semester</option>
              <option value={2}>Second Semester</option>
            </select>
            {isLoadingFinancialSummary && (
              <p className='text-xs text-gray-500 mt-1 flex items-center gap-2'>
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
                Loading...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Financial Summary Display */}
      {financialSummary && (
        <div className='space-y-6'>
          {/* Assessment Summary */}
          <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-6'>
            <h3
              className='text-lg font-bold mb-4'
              style={{ color: colors.primary }}
            >
              Assessment Summary
            </h3>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div>
                <p className='text-sm text-gray-500 mb-1'>Gross Tuition</p>
                <p
                  className='text-lg font-semibold'
                  style={{ color: colors.secondary }}
                >
                  {formatAmount(
                    financialSummary.assessment_summary?.gross_tuition || 0,
                  )}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500 mb-1'>Discount</p>
                <p className='text-lg font-semibold text-green-600'>
                  -
                  {formatAmount(
                    financialSummary.assessment_summary?.discount_amount || 0,
                  )}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500 mb-1'>Net Tuition</p>
                <p
                  className='text-lg font-semibold'
                  style={{ color: colors.secondary }}
                >
                  {formatAmount(
                    financialSummary.assessment_summary?.net_tuition || 0,
                  )}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500 mb-1'>Total Fees</p>
                <p
                  className='text-lg font-semibold'
                  style={{ color: colors.secondary }}
                >
                  {formatAmount(
                    financialSummary.assessment_summary?.total_fees || 0,
                  )}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500 mb-1'>Fixed Amount</p>
                <p
                  className='text-lg font-semibold'
                  style={{ color: colors.secondary }}
                >
                  {formatAmount(
                    financialSummary.assessment_summary?.fixed_amount_total ||
                      0,
                  )}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500 mb-1'>Base Total</p>
                <p
                  className='text-lg font-semibold'
                  style={{ color: colors.secondary }}
                >
                  {formatAmount(
                    financialSummary.assessment_summary?.base_total || 0,
                  )}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500 mb-1'>Payment Mode</p>
                <p className='text-lg font-semibold capitalize'>
                  {financialSummary.assessment_summary?.payment_mode || "N/A"}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500 mb-1'>Total Due</p>
                <p className='text-lg font-semibold text-orange-600'>
                  {formatAmount(
                    financialSummary.assessment_summary?.total_due || 0,
                  )}
                </p>
              </div>
            </div>
            {financialSummary.assessment_summary?.payment_mode ===
              "installment" && (
              <div className='mt-4 pt-4 border-t border-gray-200'>
                <p className='text-sm text-gray-500 mb-1'>Down Payment</p>
                <p
                  className='text-lg font-semibold'
                  style={{ color: colors.secondary }}
                >
                  {formatAmount(
                    financialSummary.assessment_summary?.down_payment || 0,
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Installment Schedule */}
          {financialSummary.assessment_summary?.payment_mode ===
            "installment" &&
            financialSummary.installment_schedule &&
            financialSummary.installment_schedule.length > 0 && (
              <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-6'>
                <h3
                  className='text-lg font-bold mb-4'
                  style={{ color: colors.primary }}
                >
                  Installment Schedule
                </h3>
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead>
                      <tr className='bg-gray-50 border-b border-gray-200'>
                        <th className='px-4 py-3 text-left text-sm font-medium text-gray-700'>
                          Label
                        </th>
                        <th className='px-4 py-3 text-left text-sm font-medium text-gray-700'>
                          Due Date
                        </th>
                        <th className='px-4 py-3 text-right text-sm font-medium text-gray-700'>
                          Amount
                        </th>
                        <th className='px-4 py-3 text-center text-sm font-medium text-gray-700'>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200'>
                      {financialSummary.installment_schedule.map(
                        (schedule: any, index: number) => (
                          <tr key={index} className='hover:bg-gray-50'>
                            <td className='px-4 py-3 text-sm font-medium text-gray-900'>
                              {schedule.label}
                            </td>
                            <td className='px-4 py-3 text-sm text-gray-600'>
                              {new Date(schedule.due_date).toLocaleDateString()}
                            </td>
                            <td
                              className='px-4 py-3 text-sm text-right font-semibold'
                              style={{ color: colors.secondary }}
                            >
                              {formatAmount(schedule.amount || 0)}
                            </td>
                            <td className='px-4 py-3 text-center'>
                              {schedule.is_paid ? (
                                <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                                  Paid
                                </span>
                              ) : (
                                <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800'>
                                  Unpaid
                                </span>
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* Payment Summary */}
          <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-6'>
            <h3
              className='text-lg font-bold mb-4'
              style={{ color: colors.primary }}
            >
              Payment Summary
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <div>
                <p className='text-sm text-gray-500 mb-1'>Total Paid</p>
                <p className='text-2xl font-bold text-green-600'>
                  {formatAmount(
                    financialSummary.payment_summary?.total_paid || 0,
                  )}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500 mb-1'>Remaining Balance</p>
                <p className='text-2xl font-bold text-red-600'>
                  {formatAmount(
                    financialSummary.payment_summary?.remaining_balance || 0,
                  )}
                </p>
              </div>
              <div>
                <p className='text-sm text-gray-500 mb-1'>Payment Status</p>
                <p
                  className={`text-2xl font-bold ${
                    financialSummary.payment_summary?.payment_status ===
                    "Fully Paid"
                      ? "text-green-600"
                      : financialSummary.payment_summary?.payment_status ===
                        "Partial"
                        ? "text-orange-600"
                        : "text-red-600"
                  }`}
                >
                  {financialSummary.payment_summary?.payment_status || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Results Message */}
      {!financialSummary && !isLoadingFinancialSummary && (
        <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center'>
          <FileText className='w-16 h-16 mx-auto mb-4 text-gray-400' />
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            No Financial Summary
          </h3>
          <p className='text-gray-600'>
            Enter student number, academic year, and semester to view financial
            summary.
          </p>
        </div>
      )}
    </div>
  );
};

