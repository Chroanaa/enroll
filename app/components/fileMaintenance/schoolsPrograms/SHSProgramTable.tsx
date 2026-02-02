import React from "react";
import { GraduationCap, Edit2, Trash2 } from "lucide-react";
import { colors } from "../../../colors";
import TableSkeleton from "../../common/TableSkeleton";
import { SHSProgram } from "./index";

interface SHSProgramTableProps {
  programs: SHSProgram[];
  onEdit: (program: SHSProgram) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
}

const SHSProgramTable: React.FC<SHSProgramTableProps> = ({
  programs,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  return (
    <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[800px]'>
          <thead>
            <tr
              style={{
                backgroundColor: `${colors.primary}05`,
                borderBottom: `1px solid ${colors.primary}10`,
              }}
            >
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Program Name
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Type
              </th>
              <th className='px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-600'>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {isLoading ? (
              <TableSkeleton
                rows={5}
                columns={3}
                columnConfigs={[
                  { type: "avatar-text" }, // Program Name
                  { type: "badge" }, // Type
                  { type: "actions" }, // Actions
                ]}
              />
            ) : programs.length === 0 ? (
              <tr>
                <td colSpan={3} className='px-6 py-12 text-center text-gray-500'>
                  <div className='flex flex-col items-center justify-center gap-3'>
                    <div
                      className='p-3 rounded-full'
                      style={{ backgroundColor: `${colors.primary}05` }}
                    >
                      <GraduationCap
                        className='w-6 h-6'
                        style={{ color: colors.primary }}
                      />
                    </div>
                    <p className='font-medium'>No programs found</p>
                    <p className='text-sm text-gray-400'>
                      Try adjusting your search or filters
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              programs.map((program) => (
                <tr
                  key={program.id}
                  className='group hover:bg-gray-50/50 transition-colors'
                >
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='flex items-center'>
                      <div className='flex-shrink-0 h-10 w-10'>
                        <div
                          className='h-10 w-10 rounded-xl flex items-center justify-center shadow-sm'
                          style={{
                            backgroundColor: "white",
                            border: `1px solid ${colors.primary}10`,
                          }}
                        >
                          <GraduationCap
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
                          {program.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    {program.is_custom ? (
                      <span
                        className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border'
                        style={{
                          backgroundColor: `${colors.primary}10`,
                          color: colors.primary,
                          borderColor: `${colors.primary}20`,
                        }}
                      >
                        <span
                          className='w-1.5 h-1.5 rounded-full mr-1.5'
                          style={{ backgroundColor: colors.primary }}
                        />
                        Custom
                      </span>
                    ) : (
                      <span
                        className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border'
                        style={{
                          backgroundColor: "#F3F4F6",
                          color: "#6B7280",
                          borderColor: "#E5E7EB",
                        }}
                      >
                        <span
                          className='w-1.5 h-1.5 rounded-full mr-1.5 bg-gray-400'
                        />
                        Default
                      </span>
                    )}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                    <div className='flex justify-end gap-2'>
                      <button
                        onClick={() => onEdit(program)}
                        className='p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-blue-600'
                        title='Edit'
                      >
                        <Edit2 className='w-4 h-4' />
                      </button>
                      <button
                        onClick={() => onDelete(program.id)}
                        className='p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-red-600'
                        title='Delete'
                      >
                        <Trash2 className='w-4 h-4' />
                      </button>
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

export default SHSProgramTable;

