import React from "react";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { colors } from "../../colors";

interface NavigationButtonsProps {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
}

export const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  onSubmit,
  isSubmitting = false,
}) => {
  return (
    <div
      className='flex justify-between gap-4 mt-6 pt-4 border-t'
      style={{ borderTopColor: colors.accent + "20" }}
    >
      <button
        type='button'
        onClick={onPrevious}
        disabled={currentPage === 1}
        className='flex items-center gap-1.5 px-4 py-2 border rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-white'
        style={{
          borderColor: colors.tertiary + "50",
          color: colors.primary,
        }}
        onMouseEnter={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.borderColor = colors.secondary;
            e.currentTarget.style.backgroundColor = colors.accent + "10";
          }
        }}
        onMouseLeave={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.borderColor = colors.tertiary + "50";
            e.currentTarget.style.backgroundColor = "white";
          }
        }}
      >
        <ChevronLeft className='w-4 h-4' />
        Previous
      </button>
      <div className='flex gap-3'>
        {currentPage < totalPages ? (
          <button
            type='button'
            onClick={onNext}
            className='flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-white'
            style={{ backgroundColor: colors.secondary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.secondary;
            }}
          >
            Next
            <ChevronRight className='w-4 h-4' />
          </button>
        ) : (
          <button
            type='button'
            onClick={(e) => {
              e.preventDefault();
              if (!isSubmitting) {
                onSubmit(e);
              }
            }}
            disabled={isSubmitting}
            className='flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            style={{ backgroundColor: colors.secondary }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = colors.primary;
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = colors.secondary;
              }
            }}
          >
            <CheckCircle2 className='w-4 h-4' />
            {isSubmitting ? "Submitting..." : "Submit Enrollment"}
          </button>
        )}
      </div>
    </div>
  );
};
