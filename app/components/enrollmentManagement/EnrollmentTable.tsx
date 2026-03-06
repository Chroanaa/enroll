import React, { useState } from "react";
import {
  User,
  BookOpen,
  Calendar,
  Edit2,
  Trash2,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { colors } from "../../colors";
import { Enrollment } from "../../types";
import { getStatusColor, getStatusLabel } from "./utils";
import ConfirmationModal from "../common/ConfirmationModal";
import SuccessModal from "../common/SuccessModal";

interface EnrollmentTableProps {
  enrollments: Enrollment[];
  onEdit: (enrollment: Enrollment) => void;
  onDelete: (enrollmentId: string) => void;
  onEnrollmentStatusChange?: () => void;
}

const EnrollmentTable: React.FC<EnrollmentTableProps> = ({
  enrollments,
  onEdit,
  onDelete,
  onEnrollmentStatusChange,
}) => {
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; enrollment: Enrollment | null }>({ isOpen: false, enrollment: null });
  const [successModal, setSuccessModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [enrolling, setEnrolling] = useState(false);

  const handleEnrollClick = (enrollment: Enrollment) => {
    setConfirmModal({ isOpen: true, enrollment });
  };

  const handleConfirmEnroll = async () => {
    if (!confirmModal.enrollment) return;
    
    setEnrolling(true);
    try {
      const response = await fetch(`/api/auth/enroll/${confirmModal.enrollment.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 1 }) // 1 = Enrolled
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to enroll student');
      }

      const studentName = `${confirmModal.enrollment.first_name} ${confirmModal.enrollment.family_name}`;
      setConfirmModal({ isOpen: false, enrollment: null });
      setSuccessModal({ isOpen: true, message: `${studentName} has been successfully enrolled!` });
      
      // Refresh the enrollment list
      if (onEnrollmentStatusChange) {
        onEnrollmentStatusChange();
      }
    } catch (error) {
      console.error('Error enrolling student:', error);
      alert(error instanceof Error ? error.message : 'Failed to enroll student');
    } finally {
      setEnrolling(false);
    }
  };
  return (
    <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[900px]'>
          <thead>
            <tr
              style={{
                backgroundColor: `${colors.primary}05`,
                borderBottom: `1px solid ${colors.primary}10`,
              }}
            >
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Student ID
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Student
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Course
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Status
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Enrollment Date
              </th>
              <th className='px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-600'>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {enrollments.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className='px-6 py-12 text-center text-gray-500'
                >
                  <div className='flex flex-col items-center justify-center gap-3'>
                    <div
                      className='p-3 rounded-full'
                      style={{ backgroundColor: `${colors.primary}05` }}
                    >
                      <UserPlus
                        className='w-6 h-6'
                        style={{ color: colors.primary }}
                      />
                    </div>
                    <p className='font-medium'>No enrollments found</p>
                    <p className='text-sm text-gray-400'>
                      Try adjusting your search or filters
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              enrollments.map((enrollment) => {
                const statusStyles = getStatusColor(enrollment.status);
                return (
                  <tr
                    key={enrollment.id}
                    className='group hover:bg-gray-50/50 transition-colors'
                  >
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className='text-sm font-mono text-gray-700'>
                        {(enrollment as any).student_number || "N/A"}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <div className='flex-shrink-0 h-10 w-10'>
                          {(enrollment as any).photo ? (
                            <img
                              src={(enrollment as any).photo}
                              alt={`${enrollment.first_name} ${enrollment.family_name}`}
                              className='h-10 w-10 rounded-xl object-cover shadow-sm'
                              style={{
                                border: `1px solid ${colors.primary}10`,
                              }}
                              onError={(e) => {
                                // Fallback to icon if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                target.nextElementSibling?.classList.remove(
                                  "hidden"
                                );
                              }}
                            />
                          ) : null}
                          <div
                            className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm ${
                              (enrollment as any).photo ? "hidden" : ""
                            }`}
                            style={{
                              backgroundColor: "white",
                              border: `1px solid ${colors.primary}10`,
                            }}
                          >
                            <User
                              className='h-5 w-5'
                              style={{ color: colors.primary }}
                            />
                          </div>
                        </div>
                        <div className='ml-4'>
                          <div
                            className='text-sm font-semibold'
                            style={{ color: colors.primary }}
                          >
                            {enrollment.first_name} {enrollment.middle_name}{" "}
                            {enrollment.family_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <BookOpen className='w-3.5 h-3.5 text-gray-400' />
                        <span className='text-sm text-gray-600'>
                          {enrollment.course_program || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border'
                        style={{
                          backgroundColor: statusStyles.bg,
                          color: statusStyles.text,
                          borderColor: statusStyles.border,
                        }}
                      >
                        <span
                          className='w-1.5 h-1.5 rounded-full mr-1.5'
                          style={{ backgroundColor: statusStyles.text }}
                        />
                        {getStatusLabel(enrollment.status)}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <Calendar className='w-3.5 h-3.5 text-gray-400' />
                        <span className='text-sm text-gray-600'>
                          {new Date(
                            enrollment.admission_date
                          ).toLocaleDateString() || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <div className='flex justify-end gap-2'>
                        {(enrollment.status === 4 || enrollment.status === null) && (
                          <button
                            onClick={() => handleEnrollClick(enrollment)}
                            className='px-3 py-2 rounded-lg hover:shadow-sm border transition-all text-white flex items-center gap-1.5'
                            style={{ backgroundColor: colors.success, borderColor: colors.success }}
                            title='Enroll Student'
                          >
                            <UserCheck className='w-4 h-4' />
                            <span className='text-xs font-semibold'>Enroll</span>
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(enrollment)}
                          className='p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-blue-600'
                          title='Edit'
                        >
                          <Edit2 className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => onDelete(enrollment.id)}
                          className='p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-red-600'
                          title='Delete'
                        >
                          <Trash2 className='w-4 h-4' />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, enrollment: null })}
        onConfirm={handleConfirmEnroll}
        title="Confirm Enrollment"
        message={`Are you sure you want to enroll ${confirmModal.enrollment?.first_name} ${confirmModal.enrollment?.family_name}?\n\nThis will change their status from "${getStatusLabel(confirmModal.enrollment?.status)}" to "Enrolled".`}
        confirmText="Enroll Student"
        cancelText="Cancel"
        variant="success"
        isLoading={enrolling}
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        message={successModal.message}
        autoClose={true}
        autoCloseDelay={3000}
      />
    </div>
  );
};

export default EnrollmentTable;
