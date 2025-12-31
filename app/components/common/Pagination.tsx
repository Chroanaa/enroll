import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { colors } from "../../colors";

export const getPageNumbers = (
  currentPage: number,
  totalPages: number
): (number | string)[] => {
  const pages: (number | string)[] = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) {
        pages.push(i);
      }
      pages.push("ellipsis");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push("ellipsis");
      for (let i = totalPages - 3; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      pages.push("ellipsis");
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push(i);
      }
      pages.push("ellipsis");
      pages.push(totalPages);
    }
  }
  return pages;
};

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  itemName?: string; // e.g., "enrollments", "students", "courses"
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  itemName = "items",
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 25, 50, 100],
}) => {
  if (totalItems === 0) return null;

  return (
    <div className='px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4'>
      <div className='flex items-center gap-2'>
        <span className='text-sm text-gray-600'>Show</span>
        <select
          value={itemsPerPage}
          onChange={(e) => {
            onItemsPerPageChange(Number(e.target.value));
            onPageChange(1);
          }}
          className='px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-offset-0 cursor-pointer bg-white'
          style={{
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = colors.secondary;
            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#E5E7EB";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {itemsPerPageOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className='text-sm text-gray-600'>
          of {totalItems} {itemName}
        </span>
      </div>

      <div className='flex items-center gap-2'>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className='p-2 rounded-lg border border-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50'
          style={{
            color: currentPage === 1 ? "#9CA3AF" : colors.primary,
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.borderColor = colors.secondary;
              e.currentTarget.style.backgroundColor = `${colors.secondary}10`;
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.borderColor = "#E5E7EB";
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <ChevronLeft className='w-4 h-4' />
        </button>

        <div className='flex items-center gap-1'>
          {getPageNumbers(currentPage, totalPages).map((page, index) => {
            if (page === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className='px-2 text-gray-400'
                >
                  ...
                </span>
              );
            }
            const pageNum = page as number;
            const isActive = pageNum === currentPage;
            return (
              <button
                type="button"
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "text-white"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: colors.secondary,
                      }
                    : {}
                }
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = `${colors.secondary}10`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className='p-2 rounded-lg border border-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50'
          style={{
            color: currentPage === totalPages ? "#9CA3AF" : colors.primary,
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.borderColor = colors.secondary;
              e.currentTarget.style.backgroundColor = `${colors.secondary}10`;
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.borderColor = "#E5E7EB";
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <ChevronRight className='w-4 h-4' />
        </button>
      </div>
    </div>
  );
};

export default Pagination;

