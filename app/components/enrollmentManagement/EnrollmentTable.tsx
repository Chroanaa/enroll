import React from "react";
import {
  User,
  BookOpen,
  Calendar,
  Edit2,
  UserPlus,
  FileWarning,
} from "lucide-react";
import { colors } from "../../colors";
import { Enrollment } from "../../types";
import {
  getMissingEnrollmentRequirements,
  getStatusColor,
  getStatusLabel,
} from "./utils";

interface EnrollmentTableProps {
  enrollments: Enrollment[];
  onSelect: (enrollment: Enrollment) => void;
}

const EnrollmentTable: React.FC<EnrollmentTableProps> = ({
  enrollments,
  onSelect,
}) => {
  return (
    <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[1100px]'>
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
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Verification
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Verified By
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
                  colSpan={8}
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
                const missingRequirements = getMissingEnrollmentRequirements(
                  (enrollment as any).requirements,
                );
                const hasMissingRequirements = missingRequirements.length > 0;
                return (
                  <tr
                    key={enrollment.id}
                    className='group hover:bg-gray-50/50 transition-colors'
                    style={{
                      backgroundColor: hasMissingRequirements ? "#FFF9ED" : undefined,
                    }}
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
                          {hasMissingRequirements && (
                            <div className='mt-1 flex items-center gap-2'>
                              <span
                                className='inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold'
                                style={{
                                  backgroundColor: "#FEF3C7",
                                  color: "#92400E",
                                  borderColor: "#FDE68A",
                                }}
                                title={missingRequirements.join(", ")}
                              >
                                <FileWarning className='h-3 w-3' />
                                Missing {missingRequirements.length} doc
                                {missingRequirements.length > 1 ? "s" : ""}
                              </span>
                            </div>
                          )}
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
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border'
                        style={{
                          backgroundColor:
                            enrollment.verification_status === "approved"
                              ? "#DCFCE7"
                              : enrollment.verification_status === "rejected"
                                ? "#FEE2E2"
                                : enrollment.verification_status === "needs_revision"
                                  ? "#DBEAFE"
                                  : "#FEF3C7",
                          color:
                            enrollment.verification_status === "approved"
                              ? "#166534"
                              : enrollment.verification_status === "rejected"
                                ? "#991B1B"
                                : enrollment.verification_status === "needs_revision"
                                  ? "#1E40AF"
                                  : "#92400E",
                          borderColor:
                            enrollment.verification_status === "approved"
                              ? "#86EFAC"
                              : enrollment.verification_status === "rejected"
                                ? "#FECACA"
                                : enrollment.verification_status === "needs_revision"
                                  ? "#93C5FD"
                                  : "#FDE68A",
                        }}
                      >
                        {(enrollment.verification_status || "pending")
                          .replace("_", " ")
                          .replace(/\b\w/g, (char) => char.toUpperCase())}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='space-y-1'>
                        <span className='text-sm text-gray-600'>
                          {(enrollment as any).verified_by_name || "N/A"}
                        </span>
                        {hasMissingRequirements && (
                          <p
                            className='text-xs font-medium'
                            style={{ color: "#B45309" }}
                            title={missingRequirements.join(", ")}
                          >
                            Follow up required
                          </p>
                        )}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <div className='flex justify-end gap-2'>
                        <button
                          onClick={() => onSelect(enrollment)}
                          className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-blue-600'
                          title='Edit'
                        >
                          <Edit2 className='w-4 h-4' />
                          <span className='text-xs font-semibold'>Edit</span>
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

    </div>
  );
};

export default EnrollmentTable;
