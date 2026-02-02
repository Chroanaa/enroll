import React from "react";
import { Network, Hash, Building2, User, Edit2, Trash2 } from "lucide-react";
import { Department } from "../../../types";
import { colors } from "../../../colors";
import { getStatusColor } from "../utils";
import TableSkeleton from "../../common/TableSkeleton";

interface DepartmentTableProps {
  departments: Department[];
  onEdit: (department: Department) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
}

const DepartmentTable: React.FC<DepartmentTableProps> = ({
  departments,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
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
                Code
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Department
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Building
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Head
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Status
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
                columns={6}
                columnConfigs={[
                  { type: "text", width: "w-20" }, // Code
                  { type: "avatar-text" }, // Department
                  { type: "icon-text" }, // Building
                  { type: "icon-text" }, // Head
                  { type: "badge" }, // Status
                  { type: "actions" }, // Actions
                ]}
              />
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={6} className='px-6 py-12 text-center text-gray-500'>
                  <div className='flex flex-col items-center justify-center gap-3'>
                    <div
                      className='p-3 rounded-full'
                      style={{ backgroundColor: `${colors.primary}05` }}
                    >
                      <Network
                        className='w-6 h-6'
                        style={{ color: colors.primary }}
                      />
                    </div>
                    <p className='font-medium'>No departments found</p>
                    <p className='text-sm text-gray-400'>
                      Try adjusting your search or filters
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              departments.map((dept) => {
                const statusStyles = getStatusColor(dept.status);
                return (
                  <tr
                    key={dept.id}
                    className='group hover:bg-gray-50/50 transition-colors'
                  >
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <Hash className='w-3.5 h-3.5 text-gray-400' />
                        <span className='text-sm font-medium text-gray-700'>
                          {dept.code}
                        </span>
                      </div>
                    </td>
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
                            <Network
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
                            {dept.name}
                          </div>
                          {dept.description && (
                            <div className='text-xs text-gray-500 mt-0.5 truncate max-w-[200px]'>
                              {dept.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <Building2 className='w-3.5 h-3.5 text-gray-400' />
                        <span className='text-sm text-gray-600'>
                          {dept.buildingName || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <User className='w-3.5 h-3.5 text-gray-400' />
                        <span className='text-sm text-gray-600'>
                          {dept.head || "N/A"}
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
                        {dept.status.charAt(0).toUpperCase() +
                          dept.status.slice(1)}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <div className='flex justify-end gap-2'>
                        <button
                          onClick={() => onEdit(dept)}
                          className='p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-blue-600'
                          title='Edit'
                        >
                          <Edit2 className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => onDelete(dept.id)}
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
    </div>
  );
};

export default DepartmentTable;



