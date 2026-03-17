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
    <div
      className='flex flex-col items-center justify-between gap-4 px-6 py-4 sm:flex-row'
      style={{
        borderTop: `1px solid ${colors.neutralBorder}`,
      }}
    >
      <div className='flex items-center gap-2'>
        <span className='text-sm' style={{ color: colors.neutral }}>
          Show
        </span>
        <select
          value={itemsPerPage}
          onChange={(e) => {
            onItemsPerPageChange(Number(e.target.value));
            onPageChange(1);
          }}
          className='cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium'
          style={{
            border: `1px solid ${colors.neutralBorder}`,
            backgroundColor: colors.paper,
            color: colors.primary,
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = colors.secondary;
            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = colors.neutralBorder;
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {itemsPerPageOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className='text-sm' style={{ color: colors.neutral }}>
          of {totalItems} {itemName}
        </span>
      </div>

      <div className='flex items-center gap-2'>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className='rounded-lg border p-2 transition-all disabled:cursor-not-allowed disabled:opacity-40'
          style={{
            borderColor: colors.neutralBorder,
            color: currentPage === 1 ? colors.neutral : colors.primary,
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.borderColor = colors.secondary;
              e.currentTarget.style.backgroundColor = `${colors.secondary}10`;
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.borderColor = colors.neutralBorder;
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
                  className='px-2'
                  style={{ color: colors.neutral }}
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
                className='rounded-lg px-3 py-1.5 text-sm font-medium transition-all'
                style={
                  isActive
                    ? {
                        backgroundColor: colors.secondary,
                        color: colors.paper,
                      }
                    : {
                        color: colors.primary,
                      }
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
          className='rounded-lg border p-2 transition-all disabled:cursor-not-allowed disabled:opacity-40'
          style={{
            borderColor: colors.neutralBorder,
            color: currentPage === totalPages ? colors.neutral : colors.primary,
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.borderColor = colors.secondary;
              e.currentTarget.style.backgroundColor = `${colors.secondary}10`;
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.borderColor = colors.neutralBorder;
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

