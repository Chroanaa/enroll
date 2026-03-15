import React from "react";
import { Users2, Hash, Mail, Phone, Building2, Edit2, Trash2 } from "lucide-react";
import { Faculty } from "../../../types";
import { colors } from "../../../colors";
import { getStatusColor } from "../utils";
import { getPositionColor } from "./utils";
import TableSkeleton from "../../common/TableSkeleton";

interface FacultyTableProps {
  faculty: Faculty[];
  onEdit: (faculty: Faculty) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
}

const FacultyTable: React.FC<FacultyTableProps> = ({
  faculty,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  return (
    <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[1000px]'>
          <thead>
            <tr
              style={{
                backgroundColor: `${colors.primary}05`,
                borderBottom: `1px solid ${colors.primary}10`,
              }}
            >
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Employee ID
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Faculty
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Contact
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Department
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Position
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Employment
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Mother Unit / Degree
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
                columns={9}
                columnConfigs={[
                  { type: "text", width: "w-24" }, // Employee ID
                  { type: "avatar-text" }, // Faculty
                  { type: "text", width: "w-32" }, // Contact
                  { type: "icon-text" }, // Department
                  { type: "badge" }, // Position
                  { type: "badge" }, // Employment
                  { type: "text", width: "w-40" }, // Mother Unit / Degree
                  { type: "badge" }, // Status
                  { type: "actions" }, // Actions
                ]}
              />
            ) : faculty.length === 0 ? (
              <tr>
                <td colSpan={9} className='px-6 py-12 text-center text-gray-500'>
                  <div className='flex flex-col items-center justify-center gap-3'>
                    <div
                      className='p-3 rounded-full'
                      style={{ backgroundColor: `${colors.primary}05` }}
                    >
                      <Users2
                        className='w-6 h-6'
                        style={{ color: colors.primary }}
                      />
                    </div>
                    <p className='font-medium'>No faculty found</p>
                    <p className='text-sm text-gray-400'>
                      Try adjusting your search or filters
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              faculty.map((fac) => {
                const statusStyles = getStatusColor(fac.status);
                return (
                  <tr
                    key={fac.id}
                    className='group hover:bg-gray-50/50 transition-colors'
                  >
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <Hash className='w-3.5 h-3.5 text-gray-400' />
                        <span className='text-sm font-medium text-gray-700'>
                          {fac.employee_id}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <div className='flex-shrink-0 h-10 w-10'>
                          <div
                            className='h-10 w-10 rounded-full flex items-center justify-center shadow-sm'
                            style={{
                              backgroundColor: "white",
                              border: `1px solid ${colors.primary}10`,
                            }}
                          >
                            <Users2
                              className='h-5 w-5'
                              style={{ color: colors.primary }}
                            />
                          </div>
                        </div>
                        <div className='ml-4'>
                          <div
                            className='text-xl font-semibold'
                            style={{ color: colors.primary }}
                          >
                            {fac.first_name} {fac.middle_name} {fac.last_name}
                          </div>
                          {fac.specialization && (
                            <div className='text-xs text-gray-500 mt-0.5 truncate max-w-[200px]'>
                              {fac.specialization}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex flex-col gap-1'>
                        <div className='flex items-center gap-2 text-sm text-gray-600'>
                          <Mail className='w-3.5 h-3.5 text-gray-400' />
                          {fac.email}
                        </div>
                        {fac.phone && (
                          <div className='flex items-center gap-2 text-sm text-gray-500'>
                            <Phone className='w-3.5 h-3.5 text-gray-400' />
                            {fac.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <Building2 className='w-3.5 h-3.5 text-gray-400' />
                        <span className='text-sm text-gray-600'>
                          {fac.departmentName || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPositionColor(
                          fac.position
                        )}`}
                      >
                        {fac.position.charAt(0).toUpperCase() +
                          fac.position.slice(1)}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className='inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-100 text-slate-700 border-slate-200'>
                        {fac.employment_status || "N/A"}
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='text-sm text-gray-600 space-y-1'>
                        <div>{fac.mother_unit || "N/A"}</div>
                        <div className='text-xs text-gray-500'>
                          {fac.degree || "No degree"}
                        </div>
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
                        {fac.status.charAt(0).toUpperCase() +
                          fac.status.slice(1)}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <div className='flex justify-end gap-2'>
                        <button
                          onClick={() => onEdit(fac)}
                          className='p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-blue-600'
                          title='Edit'
                        >
                          <Edit2 className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => onDelete(fac.id)}
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

export default FacultyTable;



