"use client";
import React from "react";

interface TableSkeletonProps {
  rows?: number;
  columns: number;
  hasCheckbox?: boolean;
  columnConfigs?: {
    type: "text" | "icon-text" | "badge" | "actions" | "avatar-text";
    width?: string;
  }[];
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns,
  hasCheckbox = false,
  columnConfigs,
}) => {
  const getSkeletonCell = (columnIndex: number) => {
    // If custom configs provided, use them
    if (columnConfigs && columnConfigs[columnIndex]) {
      const config = columnConfigs[columnIndex];
      
      switch (config.type) {
        case "icon-text":
          return (
            <div className='flex items-center gap-2'>
              <div className='h-7 w-7 bg-gray-200 rounded-lg'></div>
              <div className='space-y-1'>
                <div className='h-3 bg-gray-200 rounded w-32'></div>
                <div className='h-2 bg-gray-200 rounded w-24'></div>
              </div>
            </div>
          );
        case "avatar-text":
          return (
            <div className='flex items-center'>
              <div className='flex-shrink-0 h-10 w-10'>
                <div className='h-10 w-10 rounded-xl bg-gray-200'></div>
              </div>
              <div className='ml-4 space-y-1'>
                <div className='h-3 bg-gray-200 rounded w-32'></div>
                <div className='h-2 bg-gray-200 rounded w-24'></div>
              </div>
            </div>
          );
        case "badge":
          return <div className='h-5 bg-gray-200 rounded-full w-16'></div>;
        case "actions":
          return (
            <div className='flex justify-end gap-2'>
              <div className='h-6 w-6 bg-gray-200 rounded-lg'></div>
              <div className='h-6 w-6 bg-gray-200 rounded-lg'></div>
            </div>
          );
        case "text":
        default:
          return (
            <div
              className={`h-4 bg-gray-200 rounded ${config.width || "w-20"}`}
            ></div>
          );
      }
    }

    // Default skeleton cells
    if (columnIndex === 0 && !hasCheckbox) {
      // First column - usually code/icon-text
      return (
        <div className='flex items-center gap-2'>
          <div className='h-3.5 w-3.5 bg-gray-200 rounded'></div>
          <div className='h-4 bg-gray-200 rounded w-20'></div>
        </div>
      );
    } else if (columnIndex === 1 && !hasCheckbox) {
      // Second column - usually name with avatar
      return (
        <div className='flex items-center'>
          <div className='flex-shrink-0 h-10 w-10'>
            <div className='h-10 w-10 rounded-xl bg-gray-200'></div>
          </div>
          <div className='ml-4 space-y-1'>
            <div className='h-3 bg-gray-200 rounded w-32'></div>
            <div className='h-2 bg-gray-200 rounded w-24'></div>
          </div>
        </div>
      );
    } else if (columnIndex === columns - 1) {
      // Last column - usually actions
      return (
        <div className='flex justify-end gap-2'>
          <div className='h-6 w-6 bg-gray-200 rounded-lg'></div>
          <div className='h-6 w-6 bg-gray-200 rounded-lg'></div>
        </div>
      );
    } else {
      // Regular text column
      return <div className='h-4 bg-gray-200 rounded w-20'></div>;
    }
  };

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={`skeleton-${rowIndex}`} className='animate-pulse'>
          {hasCheckbox && (
            <td className='px-3 py-2 whitespace-nowrap'>
              <div className='w-3.5 h-3.5 bg-gray-200 rounded'></div>
            </td>
          )}
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td
              key={`skeleton-${rowIndex}-${colIndex}`}
              className='px-6 py-4 whitespace-nowrap'
            >
              {getSkeletonCell(colIndex)}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export default TableSkeleton;

