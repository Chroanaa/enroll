import React, { memo } from "react";
import { BookOpen, Hash, GraduationCap, Clock, Edit2, Trash2 } from "lucide-react";
import { Subject } from "../../../types";
import { colors } from "../../../colors";
import { getStatusColor } from "../utils";

interface SubjectTableProps {
  subjects: Subject[];
  onEdit: (subject: Subject) => void;
  onDelete: (id: number) => void;
  selectedSubjects?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
  isLoading?: boolean;
}

const SubjectTable: React.FC<SubjectTableProps> = ({
  subjects,
  onEdit,
  onDelete,
  selectedSubjects = [],
  onSelectionChange,
  isLoading = false,
}) => {
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectionChange) {
      if (e.target.checked) {
        onSelectionChange(subjects.map((s) => s.id));
      } else {
        onSelectionChange([]);
      }
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange([...selectedSubjects, id]);
      } else {
        onSelectionChange(selectedSubjects.filter((selectedId) => selectedId !== id));
      }
    }
  };

  const isAllSelected = subjects.length > 0 && selectedSubjects.length === subjects.length;
  const isIndeterminate = selectedSubjects.length > 0 && selectedSubjects.length < subjects.length;
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
              {onSelectionChange && (
                <th className='px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600 w-10'>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isIndeterminate;
                    }}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    style={{
                      accentColor: colors.secondary,
                    }}
                  />
                </th>
              )}
              <th className='px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600'>
                Code
              </th>
              <th className='px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600'>
                Subject
              </th>
              <th className='px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600'>
                Units (Lec/Lab)
              </th>
              <th className='px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600'>
                Hours (Lec/Lab)
              </th>
              <th className='px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600'>
                Fixed Amount
              </th>
              <th className='px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600'>
                Status
              </th>
              <th className='px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600'>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {isLoading ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className='animate-pulse'>
                  {onSelectionChange && (
                    <td className='px-3 py-2 whitespace-nowrap'>
                      <div className='w-3.5 h-3.5 bg-gray-200 rounded'></div>
                    </td>
                  )}
                  <td className='px-3 py-2 whitespace-nowrap'>
                    <div className='h-4 bg-gray-200 rounded w-20'></div>
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap'>
                    <div className='flex items-center gap-2'>
                      <div className='h-7 w-7 bg-gray-200 rounded-lg'></div>
                      <div className='space-y-1'>
                        <div className='h-3 bg-gray-200 rounded w-32'></div>
                        <div className='h-2 bg-gray-200 rounded w-24'></div>
                      </div>
                    </div>
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap'>
                    <div className='h-4 bg-gray-200 rounded w-12'></div>
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap'>
                    <div className='h-4 bg-gray-200 rounded w-12'></div>
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap'>
                    <div className='h-4 bg-gray-200 rounded w-16'></div>
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap'>
                    <div className='h-5 bg-gray-200 rounded-full w-16'></div>
                  </td>
                  <td className='px-3 py-2 whitespace-nowrap text-right'>
                    <div className='flex justify-end gap-1.5'>
                      <div className='h-6 w-6 bg-gray-200 rounded-lg'></div>
                      <div className='h-6 w-6 bg-gray-200 rounded-lg'></div>
                    </div>
                  </td>
                </tr>
              ))
            ) : subjects.length === 0 ? (
              <tr>
                <td colSpan={onSelectionChange ? 8 : 7} className='px-3 py-8 text-center text-gray-500'>
                  <div className='flex flex-col items-center justify-center gap-3'>
                    <div
                      className='p-3 rounded-full'
                      style={{ backgroundColor: `${colors.primary}05` }}
                    >
                      <BookOpen
                        className='w-6 h-6'
                        style={{ color: colors.primary }}
                      />
                    </div>
                    <p className='font-medium'>No subjects found</p>
                    <p className='text-sm text-gray-400'>
                      Try adjusting your search or filters
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              subjects.map((subject) => {
                const statusStyles = getStatusColor(subject.status);
                return (
                  <tr
                    key={subject.id}
                    className='group hover:bg-gray-50/50 transition-colors'
                  >
                    {onSelectionChange && (
                      <td className='px-3 py-2 whitespace-nowrap'>
                        <input
                          type="checkbox"
                          checked={selectedSubjects.includes(subject.id)}
                          onChange={(e) => handleSelectOne(subject.id, e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                          style={{
                            accentColor: colors.secondary,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    <td className='px-3 py-2 whitespace-nowrap'>
                      <div className='flex items-center gap-1.5'>
                        <Hash className='w-3 h-3 text-gray-400' />
                        <span className='text-xs font-medium text-gray-700'>
                          {subject.code}
                        </span>
                      </div>
                    </td>
                    <td className='px-3 py-2 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <div className='flex-shrink-0 h-7 w-7'>
                          <div
                            className='h-7 w-7 rounded-lg flex items-center justify-center shadow-sm'
                            style={{
                              backgroundColor: "white",
                              border: `1px solid ${colors.primary}10`,
                            }}
                          >
                            <BookOpen
                              className='h-3.5 w-3.5'
                              style={{ color: colors.primary }}
                            />
                          </div>
                        </div>
                        <div className='ml-2'>
                          <div
                            className='text-xs font-semibold'
                            style={{ color: colors.primary }}
                          >
                            {subject.name}
                          </div>
                          {subject.description && (
                            <div className='text-[10px] text-gray-500 mt-0.5 truncate max-w-[200px]'>
                              {subject.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className='px-3 py-2 whitespace-nowrap'>
                      <div className='flex items-center gap-1.5'>
                        <GraduationCap className='w-3 h-3 text-gray-400' />
                        <span className='text-xs font-medium text-gray-700'>
                          {subject.units_lec || 0}/{subject.units_lab || 0}
                        </span>
                      </div>
                    </td>
                    <td className='px-3 py-2 whitespace-nowrap'>
                      <div className='flex items-center gap-1.5'>
                        <Clock className='w-3 h-3 text-gray-400' />
                        <span className='text-xs font-medium text-gray-700'>
                          {subject.lecture_hour || 0}/{subject.lab_hour || 0}
                        </span>
                      </div>
                    </td>
                    <td className='px-3 py-2 whitespace-nowrap'>
                      <span className='text-xs font-medium text-gray-700'>
                        {subject.fixedAmount !== undefined && subject.fixedAmount !== null && subject.fixedAmount !== 0
                          ? `₱${Number(subject.fixedAmount).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : "₱0.00"}
                      </span>
                    </td>
                    <td className='px-3 py-2 whitespace-nowrap'>
                      <span
                        className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border'
                        style={{
                          backgroundColor: statusStyles.bg,
                          color: statusStyles.text,
                          borderColor: statusStyles.border,
                        }}
                      >
                        <span
                          className='w-1 h-1 rounded-full mr-1'
                          style={{ backgroundColor: statusStyles.text }}
                        />
                        {subject.status.charAt(0).toUpperCase() +
                          subject.status.slice(1)}
                      </span>
                    </td>
                    <td className='px-3 py-2 whitespace-nowrap text-right text-xs font-medium'>
                      <div className='flex justify-end gap-1.5'>
                        <button
                          onClick={() => onEdit(subject)}
                          className='p-1.5 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-blue-600'
                          title='Edit'
                        >
                          <Edit2 className='w-3.5 h-3.5' />
                        </button>
                        <button
                          onClick={() => onDelete(subject.id)}
                          className='p-1.5 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-red-600'
                          title='Delete'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
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

export default memo(SubjectTable);


