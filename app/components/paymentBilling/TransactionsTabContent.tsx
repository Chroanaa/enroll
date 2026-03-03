import React from "react";
import { Search, RefreshCw, Eye, Calendar, FileText } from "lucide-react";
import { colors } from "../../colors";
import { OrderHeader } from "../../utils/billingUtils";
import { formatAmount } from "./utils";

interface TransactionsTabContentProps {
  filteredOrders: OrderHeader[];
  paginatedOrders: OrderHeader[];
  transactionSearchTerm: string;
  setTransactionSearchTerm: (value: string) => void;
  showOnlyVoided: boolean;
  setShowOnlyVoided: (value: boolean) => void;
  transactionsPage: number;
  setTransactionsPage: (value: number) => void;
  onRefresh: () => void;
  onOrderDoubleClick: (order: OrderHeader) => void;
  formatAmount: (amount: number | null | undefined) => string;
}

export const TransactionsTabContent: React.FC<TransactionsTabContentProps> = ({
  filteredOrders,
  paginatedOrders,
  transactionSearchTerm,
  setTransactionSearchTerm,
  showOnlyVoided,
  setShowOnlyVoided,
  transactionsPage,
  setTransactionsPage,
  onRefresh,
  onOrderDoubleClick,
}) => {
  return (
    <div className='space-y-4'>
      {/* Stats and Filters */}
      <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4'>
        <div className='flex flex-col md:flex-row gap-4 items-center justify-between'>
          <div className='flex-1 relative w-full md:w-auto'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
            <input
              type='text'
              placeholder='Search by AR number, ID, or student...'
              value={transactionSearchTerm}
              onChange={(e) => setTransactionSearchTerm(e.target.value)}
              className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
          </div>
          <div className='flex items-center gap-4'>
            <label className='flex items-center gap-2 cursor-pointer'>
              <input
                type='checkbox'
                checked={showOnlyVoided}
                onChange={(e) => setShowOnlyVoided(e.target.checked)}
                className='w-4 h-4 rounded border-gray-300'
              />
              <span className='text-sm text-gray-600'>Show Only Voided</span>
            </label>
            <button
              onClick={onRefresh}
              className='px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity'
              style={{ backgroundColor: colors.secondary }}
            >
              <RefreshCw className='w-4 h-4' />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr
                className='text-white'
                style={{ backgroundColor: colors.primary }}
              >
                <th className='px-4 py-3 text-left text-sm font-medium'>
                  AR Number
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium'>
                  Student
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium'>
                  Date
                </th>
                <th className='px-4 py-3 text-left text-sm font-medium'>
                  Payment Type
                </th>
                <th className='px-4 py-3 text-right text-sm font-medium'>
                  Total Amount
                </th>
                <th className='px-4 py-3 text-center text-sm font-medium'>
                  Status
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200'>
              {paginatedOrders.map((order) => (
                <tr
                  key={order.id}
                  onDoubleClick={() => onOrderDoubleClick(order)}
                  className={`cursor-pointer transition-colors ${
                    order.isvoided
                      ? "bg-red-50 hover:bg-red-100"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <td className='px-4 py-3 text-sm'>
                    <div>
                      <p className='font-medium text-gray-900'>
                        {order.ar_number ||
                          `#${order.id.toString().padStart(6, "0")}`}
                      </p>
                      {order.ar_number && (
                        <p className='text-xs text-gray-500'>ID: {order.id}</p>
                      )}
                    </div>
                  </td>
                  <td className='px-4 py-3 text-sm text-gray-600'>
                    {order.student_name ? (
                      <div>
                        <p className='font-medium text-gray-900'>
                          {order.student_name}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {order.student_number}
                        </p>
                      </div>
                    ) : (
                      <span className='text-gray-400'>-</span>
                    )}
                  </td>
                  <td className='px-4 py-3 text-sm text-gray-600'>
                    <div className='flex items-center gap-2'>
                      <Calendar className='w-4 h-4 text-gray-400' />
                      {new Date(order.order_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className='px-4 py-3 text-sm text-gray-600'>
                    {order.payment_type || "N/A"}
                  </td>
                  <td
                    className='px-4 py-3 text-sm font-medium text-right'
                    style={{ color: colors.secondary }}
                  >
                    {formatAmount(order.order_amount || 0)}
                  </td>
                  <td className='px-4 py-3 text-center'>
                    {order.isvoided ? (
                      <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'>
                        Voided
                      </span>
                    ) : (
                      <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                        Completed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className='px-4 py-12 text-center text-gray-500'
                  >
                    <FileText className='w-12 h-12 mx-auto mb-3 text-gray-300' />
                    <p className='text-lg font-medium'>No transactions found</p>
                    <p className='text-sm'>
                      Transactions will appear here after processing payments.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredOrders.length > 10 && (
          <div className='px-4 py-3 border-t border-gray-200 flex items-center justify-between'>
            <p className='text-sm text-gray-500'>
              Showing {(transactionsPage - 1) * 10 + 1} to{" "}
              {Math.min(transactionsPage * 10, filteredOrders.length)} of{" "}
              {filteredOrders.length} transactions
            </p>
            <div className='flex gap-2'>
              <button
                onClick={() =>
                  setTransactionsPage(Math.max(1, transactionsPage - 1))
                }
                disabled={transactionsPage === 1}
                className='px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50'
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setTransactionsPage(
                    Math.min(
                      Math.ceil(filteredOrders.length / 10),
                      transactionsPage + 1,
                    ),
                  )
                }
                disabled={
                  transactionsPage >= Math.ceil(filteredOrders.length / 10)
                }
                className='px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50'
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
        <div className='flex gap-3'>
          <Eye className='w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5' />
          <div>
            <p className='text-sm font-medium text-blue-800'>
              View Transaction Details
            </p>
            <p className='text-sm text-blue-600'>
              Double-click on any transaction to view its details and void if
              needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
