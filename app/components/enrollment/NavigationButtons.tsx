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
      className='flex justify-between gap-4 mt-8 pt-6 border-t animate-in fade-in duration-700 delay-500'
      style={{ borderTopColor: colors.accent + "20" }}
    >
      <button
        type='button'
        onClick={onPrevious}
        disabled={currentPage === 1}
        className='flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed bg-white border shadow-sm hover:shadow-md active:scale-95'
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
      <div className='flex gap-3'>
        {currentPage < totalPages ? (
          <button
            type='button'
            onClick={onNext}
            className='flex items-center gap-2 px-8 py-3 rounded-full text-sm font-semibold transition-all duration-300 text-white shadow-lg hover:shadow-xl active:scale-95'
            style={{
              backgroundColor: colors.secondary,
              boxShadow: `0 4px 14px ${colors.secondary}40`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.primary;
              e.currentTarget.style.transform = "translateX(4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.secondary;
              e.currentTarget.style.transform = "translateX(0)";
            }}
          >
            Next Step
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
            className='flex items-center gap-2 px-8 py-3 rounded-full text-sm font-semibold transition-all duration-300 text-white shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none'
            style={{
              backgroundColor: colors.secondary,
              boxShadow: `0 4px 14px ${colors.secondary}40`
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
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
