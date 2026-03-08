import React from "react";
import { User, CheckCircle2, XCircle, Calendar, BookOpen, Eye, Edit, FileText } from "lucide-react";
import { colors } from "../../colors";

interface StudentAssessment {
  id: number;
  student_number: string;
  first_name: string;
  middle_name?: string;
  family_name: string;
  program_code?: string;
  year_level?: number;
  has_assessment: boolean;
  assessment_date?: string;
  total_amount?: number;
  photo?: string;
}

interface AssessmentStudentListProps {
  students: StudentAssessment[];
  onSelectStudent: (studentNumber: string) => void;
  onViewAssessment?: (studentNumber: string) => void;
  loading?: boolean;
}

const AssessmentStudentList: React.FC<AssessmentStudentListProps> = ({
  students,
  onSelectStudent,
  onViewAssessment,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
        <div className='p-8 text-center'>
          <div className='animate-spin rounded-full h-10 w-10 border-b-2 mx-auto' style={{ borderColor: colors.primary }}></div>
          <p className='mt-3 text-sm text-gray-500'>Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[900px]'>
          <thead>
            <tr
              style={{
                backgroundColor: `${colors.primary}05`,
                borderBottom: `1px solid ${colors.primary}10`,
              }}
            >
              <th className='px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600'>
                Student ID
              </th>
              <th className='px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600'>
                Student Name
              </th>
              <th className='px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600'>
                Program
              </th>
              <th className='px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600'>
                Year Level
              </th>
              <th className='px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600'>
                Assessment Status
              </th>
              <th className='px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600'>
                Assessment Date
              </th>
              <th className='px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600'>
                Total Amount
              </th>
              <th className='px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600'>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {students.length === 0 ? (
              <tr>
                <td colSpan={8} className='px-3 py-8 text-center text-gray-500'>
                  <div className='flex flex-col items-center justify-center gap-2'>
                    <div
                      className='p-2 rounded-full'
                      style={{ backgroundColor: `${colors.primary}05` }}
                    >
                      <User className='w-5 h-5' style={{ color: colors.primary }} />
                    </div>
                    <p className='text-sm font-medium'>No students found</p>
                    <p className='text-xs text-gray-400'>
                      Try adjusting your search or filters
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr
                  key={student.student_number}
                  className='group hover:bg-gray-50/50 transition-colors'
                >
                  <td className='px-3 py-2 whitespace-nowrap'>
                    <span className='text-xs font-mono text-gray-700'>
                      {student.student_number}
                    </span>
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap'>
                    <div className='flex items-center'>
                      <div className='flex-shrink-0 h-7 w-7'>
                        {student.photo ? (
                          <img
                            src={student.photo}
                            alt={`${student.first_name} ${student.family_name}`}
                            className='h-7 w-7 rounded-lg object-cover shadow-sm'
                            style={{
                              border: `1px solid ${colors.primary}10`,
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              target.nextElementSibling?.classList.remove("hidden");
                            }}
                          />
                        ) : null}
                        <div
                          className={`h-7 w-7 rounded-lg flex items-center justify-center shadow-sm ${
                            student.photo ? "hidden" : ""
                          }`}
                          style={{
                            backgroundColor: "white",
                            border: `1px solid ${colors.primary}10`,
                          }}
                        >
                          <User className='h-4 w-4' style={{ color: colors.primary }} />
                        </div>
                      </div>
                      <div className='ml-2'>
                        <div
                          className='text-xs font-semibold'
                          style={{ color: colors.primary }}
                        >
                          {student.first_name} {student.middle_name ? student.middle_name + " " : ""}
                          {student.family_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap'>
                    <div className='flex items-center gap-1.5'>
                      <BookOpen className='w-3 h-3 text-gray-400' />
                      <span className='text-xs text-gray-600'>
                        {student.program_code || "N/A"}
                      </span>
                    </div>
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap'>
                    <span className='text-xs text-gray-600'>
                      {student.year_level ? `Year ${student.year_level}` : "N/A"}
                    </span>
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap'>
                    {student.has_assessment ? (
                      <span
                        className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border'
                        style={{
                          backgroundColor: "#10b98120",
                          color: "#059669",
                          borderColor: "#10b98140",
                        }}
                      >
                        <CheckCircle2 className='w-3 h-3 mr-1' />
                        Assessed
                      </span>
                    ) : (
                      <span
                        className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border'
                        style={{
                          backgroundColor: "#ef444420",
                          color: "#dc2626",
                          borderColor: "#ef444440",
                        }}
                      >
                        <XCircle className='w-3 h-3 mr-1' />
                        Not Assessed
                      </span>
                    )}
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap'>
                    {student.assessment_date ? (
                      <div className='flex items-center gap-1.5'>
                        <Calendar className='w-3 h-3 text-gray-400' />
                        <span className='text-xs text-gray-600'>
                          {new Date(student.assessment_date).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <span className='text-xs text-gray-400'>-</span>
                    )}
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap'>
                    {student.total_amount ? (
                      <span className='text-xs font-semibold text-gray-700'>
                        ₱{student.total_amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    ) : (
                      <span className='text-xs text-gray-400'>-</span>
                    )}
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap'>
                    <div className='flex items-center justify-end gap-1.5'>
                      {student.has_assessment ? (
                        <>
                          {/* View Button */}
                          <button
                            onClick={() => onViewAssessment?.(student.student_number)}
                            className='inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all border'
                            style={{
                              backgroundColor: "#3b82f620",
                              color: "#2563eb",
                              borderColor: "#3b82f640",
                            }}
                            title='View Assessment'
                          >
                            <Eye className='w-3 h-3' />
                            View
                          </button>
                          {/* Edit Button */}
                          <button
                            onClick={() => onSelectStudent(student.student_number)}
                            className='inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all border'
                            style={{
                              backgroundColor: "#f59e0b20",
                              color: "#d97706",
                              borderColor: "#f59e0b40",
                            }}
                            title='Edit Assessment'
                          >
                            <Edit className='w-3 h-3' />
                            Edit
                          </button>
                        </>
                      ) : (
                        /* Assess Button */
                        <button
                          onClick={() => onSelectStudent(student.student_number)}
                          className='inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all border'
                          style={{
                            backgroundColor: "#10b98120",
                            color: "#059669",
                            borderColor: "#10b98140",
                          }}
                          title='Create Assessment'
                        >
                          <FileText className='w-3 h-3' />
                          Assess
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssessmentStudentList;
