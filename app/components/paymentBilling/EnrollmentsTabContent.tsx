import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  FileText,
  Loader2,
  ShoppingCart,
  Trash2,
  X,
  DollarSign,
  RefreshCw,
  Eye,
} from "lucide-react";
import { colors } from "../../colors";
import { CartStudent } from "./StudentPaymentCheckoutModal";
import { FinancialDetailModal } from "./FinancialDetailModal";

export interface StudentSummary {
  assessment_id: number;
  student_number: string;
  student_name: string;
  course_program: string | null;
  year_level: number | null;
  academic_year: string;
  semester: number;
  payment_mode: string;
  total_due: number;
  total_paid: number;
  remaining_balance: number;
  payment_status: "Unpaid" | "Partial" | "Fully Paid";
}

interface EnrollmentsTabContentProps {
  academicYearSearch: string;
  setAcademicYearSearch: (value: string) => void;
  semesterSearch: 1 | 2;
  setSemesterSearch: (value: 1 | 2) => void;
  formatAmount: (amount: number | null | undefined) => string;
  // Cart-related props
  cartStudents: CartStudent[];
  onAddToCart: (student: StudentSummary) => void;
  onRemoveFromCart: (assessmentId: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  onUpdateCartAmount: (assessmentId: number, amount: number) => void;
}

export const EnrollmentsTabContent: React.FC<EnrollmentsTabContentProps> = ({
  academicYearSearch,
  setAcademicYearSearch,
  semesterSearch,
  setSemesterSearch,
  formatAmount: formatAmountProp,
  cartStudents,
  onAddToCart,
  onRemoveFromCart,
  onClearCart,
  onCheckout,
  onUpdateCartAmount,
}) => {
  const [allStudents, setAllStudents] = useState<StudentSummary[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "Unpaid" | "Partial" | "Fully Paid"
  >("all");
  const [detailAssessmentId, setDetailAssessmentId] = useState<number | null>(
    null,
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchAllStudents = async () => {
    setIsLoadingStudents(true);
    try {
      const params = new URLSearchParams();
      if (academicYearSearch) params.set("academic_year", academicYearSearch);
      if (semesterSearch) params.set("semester", String(semesterSearch));
      if (searchTerm) params.set("search", searchTerm);

      const response = await fetch(
        `/api/auth/assessment/all-summaries?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch student summaries");
      }
      const data = await response.json();
      setAllStudents(data.data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchAllStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredStudents = useMemo(() => {
    let result = allStudents;
    if (statusFilter !== "all") {
      result = result.filter((s) => s.payment_status === statusFilter);
    }
    return result;
  }, [allStudents, statusFilter]);

  const isInCart = (assessmentId: number) => {
    return cartStudents.some((s) => s.assessment_id === assessmentId);
  };

  const handleDoubleClick = (student: StudentSummary) => {
    if (student.remaining_balance <= 0) return;
    if (isInCart(student.assessment_id)) return;
    onAddToCart(student);
  };

  const cartTotal = useMemo(() => {
    return cartStudents.reduce((sum, s) => sum + s.amount_to_pay, 0);
  }, [cartStudents]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "Fully Paid": "bg-green-100 text-green-800",
      Partial: "bg-orange-100 text-orange-800",
      Unpaid: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-800"}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className='flex gap-6'>
      {/* Left: Student List */}
      <div
        className={`${cartStudents.length > 0 ? "flex-1" : "w-full"} space-y-4`}
      >
        {/* Search & Filters */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4'>
          <div className='flex items-center gap-3 mb-3'>
            <h2 className='text-lg font-bold' style={{ color: colors.primary }}>
              Student Financial Summaries
            </h2>
            <button
              onClick={fetchAllStudents}
              disabled={isLoadingStudents}
              className='p-1.5 rounded-lg hover:bg-gray-100 transition-colors'
              title='Refresh'
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-500 ${isLoadingStudents ? "animate-spin" : ""}`}
              />
            </button>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
            <div>
              <input
                type='text'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchAllStudents();
                }}
                placeholder='Search student...'
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
              />
            </div>
            <div>
              <input
                type='text'
                value={academicYearSearch}
                onChange={(e) => setAcademicYearSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchAllStudents();
                }}
                placeholder='Academic Year'
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
              />
            </div>
            <div>
              <select
                value={semesterSearch}
                onChange={(e) =>
                  setSemesterSearch(parseInt(e.target.value) as 1 | 2)
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
              >
                <option value={1}>1st Semester</option>
                <option value={2}>2nd Semester</option>
              </select>
            </div>
            <div className='flex gap-2'>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className='flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
              >
                <option value='all'>All Status</option>
                <option value='Unpaid'>Unpaid</option>
                <option value='Partial'>Partial</option>
                <option value='Fully Paid'>Fully Paid</option>
              </select>
              <button
                onClick={fetchAllStudents}
                disabled={isLoadingStudents}
                className='px-4 py-2 rounded-lg text-white font-medium text-sm hover:opacity-90 transition-colors'
                style={{ backgroundColor: colors.secondary }}
              >
                <Search className='w-4 h-4' />
              </button>
            </div>
          </div>
          <p className='text-xs text-gray-500 mt-2'>
            Double-click a student to add them to the payment cart. Press Enter
            in search fields to filter.
          </p>
        </div>

        {/* Student Table */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
          {isLoadingStudents ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='w-8 h-8 animate-spin text-gray-400' />
              <span className='ml-2 text-gray-500'>Loading students...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className='text-center py-12'>
              <FileText className='w-12 h-12 mx-auto mb-3 text-gray-400' />
              <p className='text-gray-600 font-medium'>No students found</p>
              <p className='text-gray-500 text-sm mt-1'>
                Try adjusting your search filters or click Search to load data.
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='bg-gray-50 border-b border-gray-200'>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Student #
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Name
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Program
                    </th>
                    <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Total Due
                    </th>
                    <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Paid
                    </th>
                    <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Balance
                    </th>
                    <th className='px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Status
                    </th>
                    <th className='px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200'>
                  {filteredStudents.map((student) => {
                    const inCart = isInCart(student.assessment_id);
                    return (
                      <tr
                        key={student.assessment_id}
                        onDoubleClick={() => handleDoubleClick(student)}
                        className={`transition-colors cursor-pointer ${
                          inCart
                            ? "bg-blue-50 border-l-4 border-l-blue-400"
                            : student.remaining_balance <= 0
                              ? "bg-green-50/50 hover:bg-green-50"
                              : "hover:bg-gray-50"
                        }`}
                        title={
                          inCart
                            ? "Already in cart"
                            : student.remaining_balance <= 0
                              ? "Fully paid"
                              : "Double-click to add to payment cart"
                        }
                      >
                        <td className='px-4 py-3 text-sm font-medium text-gray-900'>
                          {student.student_number}
                        </td>
                        <td className='px-4 py-3 text-sm text-gray-700'>
                          {student.student_name}
                        </td>
                        <td className='px-4 py-3 text-sm text-gray-600'>
                          {student.course_program || "-"}
                        </td>
                        <td
                          className='px-4 py-3 text-sm text-right font-medium'
                          style={{ color: colors.secondary }}
                        >
                          {formatAmountProp(student.total_due)}
                        </td>
                        <td className='px-4 py-3 text-sm text-right text-green-600 font-medium'>
                          {formatAmountProp(student.total_paid)}
                        </td>
                        <td className='px-4 py-3 text-sm text-right font-bold text-red-600'>
                          {formatAmountProp(student.remaining_balance)}
                        </td>
                        <td className='px-4 py-3 text-center'>
                          {getStatusBadge(student.payment_status)}
                        </td>
                        <td className='px-4 py-3 text-center'>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailAssessmentId(student.assessment_id);
                              setIsDetailModalOpen(true);
                            }}
                            className='inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-white hover:opacity-90 transition-colors'
                            style={{ backgroundColor: colors.secondary }}
                            title='View financial detail'
                          >
                            <Eye className='w-3.5 h-3.5' />
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filteredStudents.length > 0 && (
            <div className='px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500'>
              Showing {filteredStudents.length} of {allStudents.length}{" "}
              student(s)
            </div>
          )}
        </div>
      </div>

      {/* Right: Payment Cart */}
      {cartStudents.length > 0 && (
        <div className='w-80 flex-shrink-0'>
          <div className='bg-white rounded-lg shadow-sm border border-gray-100 sticky top-4'>
            {/* Cart Header */}
            <div
              className='px-4 py-3 border-b flex items-center justify-between'
              style={{
                backgroundColor: `${colors.primary}08`,
                borderColor: `${colors.primary}15`,
              }}
            >
              <div className='flex items-center gap-2'>
                <ShoppingCart
                  className='w-5 h-5'
                  style={{ color: colors.secondary }}
                />
                <h3 className='font-bold' style={{ color: colors.primary }}>
                  Payment Cart
                </h3>
                <span className='text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full'>
                  {cartStudents.length}
                </span>
              </div>
              <button
                onClick={onClearCart}
                className='text-xs text-red-500 hover:text-red-700 flex items-center gap-1'
              >
                <Trash2 className='w-3 h-3' />
                Clear
              </button>
            </div>

            {/* Cart Items */}
            <div className='p-3 space-y-3 max-h-[400px] overflow-y-auto'>
              {cartStudents.map((student) => (
                <div
                  key={student.assessment_id}
                  className='border border-gray-200 rounded-lg p-3 bg-gray-50'
                >
                  <div className='flex items-start justify-between mb-2'>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium text-gray-900 truncate'>
                        {student.student_number}
                      </p>
                      <p className='text-xs text-gray-500 truncate'>
                        {student.student_name}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemoveFromCart(student.assessment_id)}
                      className='text-gray-400 hover:text-red-500 p-0.5'
                    >
                      <X className='w-4 h-4' />
                    </button>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-gray-500'>
                      Balance: {formatAmountProp(student.remaining_balance)}
                    </span>
                    <div className='relative'>
                      <span className='absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs'>
                        ₱
                      </span>
                      <input
                        type='number'
                        step='0.01'
                        min='0.01'
                        max={student.remaining_balance}
                        value={student.amount_to_pay}
                        onChange={(e) =>
                          onUpdateCartAmount(
                            student.assessment_id,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className='w-28 pl-5 pr-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Footer */}
            <div className='p-4 border-t border-gray-200'>
              <div className='flex justify-between items-center mb-3'>
                <span className='font-medium text-gray-700'>Total</span>
                <span
                  className='text-lg font-bold'
                  style={{ color: colors.secondary }}
                >
                  {formatAmountProp(cartTotal)}
                </span>
              </div>
              <button
                onClick={onCheckout}
                className='w-full py-2.5 rounded-lg text-white font-medium transition-colors hover:opacity-90 flex items-center justify-center gap-2'
                style={{ backgroundColor: colors.secondary }}
              >
                <DollarSign className='w-4 h-4' />
                Process Payment
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Financial Detail Modal */}
      <FinancialDetailModal
        isOpen={isDetailModalOpen}
        assessmentId={detailAssessmentId}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailAssessmentId(null);
        }}
        formatAmount={formatAmountProp}
        onPaymentSuccess={fetchAllStudents}
      />
    </div>
  );
};
