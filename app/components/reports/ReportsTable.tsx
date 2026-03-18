import React from "react";
import { FileBarChart, Calendar, User, Trash2 } from "lucide-react";
import { colors } from "../../colors";
import { Reports } from "../../types";

interface ReportsTableProps {
  reports: Reports[];
  onDelete?: (reportId: number) => void;
}

const ReportsTable: React.FC<ReportsTableProps> = ({ reports, onDelete }) => {
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
                ID
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Action
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Username
              </th>
              <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                Created At
              </th>
              {onDelete ? (
                <th className='px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-600'>
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {reports.length === 0 ? (
              <tr>
                <td
                  colSpan={onDelete ? 5 : 4}
                  className='px-6 py-12 text-center text-gray-500'
                >
                  <div className='flex flex-col items-center justify-center gap-3'>
                    <div
                      className='p-3 rounded-full'
                      style={{ backgroundColor: `${colors.primary}05` }}
                    >
                      <FileBarChart
                        className='w-6 h-6'
                        style={{ color: colors.primary }}
                      />
                    </div>
                    <p className='font-medium'>No reports found</p>
                    <p className='text-sm text-gray-400'>
                      Try adjusting your search or filters
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              reports.map((report) => {
                return (
                  <tr
                    key={report.id}
                    className='group hover:bg-gray-50/50 transition-colors'
                  >
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className='text-sm font-medium text-gray-700'>
                        #{report.id}
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-2'>
                        <FileBarChart className='w-3.5 h-3.5 text-gray-400' />
                        <span className='text-sm text-gray-600'>
                          {report.action || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <User className='w-3.5 h-3.5 text-gray-400' />
                        <span className='text-sm text-gray-600'>
                          {report.username || `User #${report.user_id}`}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <Calendar className='w-3.5 h-3.5 text-gray-400' />
                        <span className='text-sm text-gray-600'>
                          {report.created_at
                            ? new Date(report.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : "N/A"}
                        </span>
                      </div>
                    </td>
                    {onDelete ? (
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <div className='flex justify-end gap-2'>
                          <button
                            onClick={() => onDelete(report.id!)}
                            className='p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-red-600'
                            title='Delete'
                          >
                            <Trash2 className='w-4 h-4' />
                          </button>
                        </div>
                      </td>
                    ) : null}
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

export default ReportsTable;
