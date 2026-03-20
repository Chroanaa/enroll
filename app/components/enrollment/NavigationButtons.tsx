import React from "react";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { colors } from "../../colors";

interface NavigationButtonsProps {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void | Promise<void>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
  isCheckingDuplicate?: boolean;
  duplicateError?: string | null;
}

export const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  onSubmit,
  isSubmitting = false,
  isCheckingDuplicate = false,
  duplicateError = null,
}) => {
  const isNextDisabled = isCheckingDuplicate || !!duplicateError;
  return (
    <div
      className='flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-4 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t animate-in fade-in duration-700 delay-500'
      style={{ borderTopColor: colors.accent + "20" }}
    >
      <button
        type='button'
        onClick={onPrevious}
        disabled={currentPage === 1}
        className='w-full sm:w-auto order-2 sm:order-1 flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed bg-white border shadow-sm hover:shadow-md active:scale-95'
        style={{
          borderColor: colors.tertiary + "30",
          color: colors.primary,
        }}
        onMouseEnter={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.borderColor = colors.secondary;
            e.currentTarget.style.backgroundColor = colors.accent + "05";
            e.currentTarget.style.transform = "translateX(-4px)";
          }
        }}
        onMouseLeave={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.borderColor = colors.tertiary + "30";
            e.currentTarget.style.backgroundColor = "white";
            e.currentTarget.style.transform = "translateX(0)";
          }
        }}
      >
        <ChevronLeft className='w-4 h-4' />
        Previous Step
      </button>
      <div className='w-full sm:w-auto order-1 sm:order-2 flex gap-3'>
        {currentPage < totalPages ? (
          <button
            type='button'
            onClick={onNext}
            disabled={isNextDisabled}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-full text-sm font-semibold transition-all duration-300 text-white shadow-lg hover:shadow-xl active:scale-95 ${isNextDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
            style={{
              backgroundColor: colors.secondary,
              boxShadow: `0 4px 14px ${colors.secondary}40`,
            }}
            onMouseEnter={(e) => {
              if (!isNextDisabled) {
                e.currentTarget.style.backgroundColor = colors.primary;
                e.currentTarget.style.transform = "translateX(4px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isNextDisabled) {
                e.currentTarget.style.backgroundColor = colors.secondary;
                e.currentTarget.style.transform = "translateX(0)";
              }
            }}
          >
            {isCheckingDuplicate
              ? "Checking..."
              : duplicateError
                ? "Duplicate Found"
                : "Next Step"}
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
            className='w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-full text-sm font-semibold transition-all duration-300 text-white shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none'
            style={{
              backgroundColor: colors.secondary,
              boxShadow: `0 4px 14px ${colors.secondary}40`,
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = colors.primary;
                e.currentTarget.style.transform = "scale(1.02)";
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = colors.secondary;
                e.currentTarget.style.transform = "scale(1)";
              }
            }}
          >
            {isSubmitting ? (
              <>
                <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className='w-4 h-4' />
                Submit Enrollment
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
