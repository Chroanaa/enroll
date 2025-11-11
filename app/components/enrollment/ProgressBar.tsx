import React from "react";
import { Award } from "lucide-react";
import { colors } from "../../colors";

interface ProgressBarProps {
  currentPage: number;
  totalPages: number;
  progress: number;
  pageTitle: string;
  onPageClick: (page: number) => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentPage,
  totalPages,
  progress,
  pageTitle,
  onPageClick,
}) => {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: colors.accent + "20" }}
          >
            <span className="text-sm font-bold" style={{ color: colors.secondary }}>
              Step {currentPage} of {totalPages}
            </span>
          </div>
          <span className="text-base font-semibold" style={{ color: colors.primary }}>
            {pageTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4" style={{ color: colors.secondary }} />
          <span className="text-base font-bold" style={{ color: colors.secondary }}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>
      <div className="w-full h-3 rounded-full shadow-inner" style={{ backgroundColor: `${colors.tertiary}20` }}>
        <div
          className="h-3 rounded-full transition-all duration-500 shadow-sm"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${colors.secondary}, ${colors.tertiary})`,
          }}
        />
      </div>
      {/* Page Indicators */}
      <div className="flex justify-center gap-2 mt-6">
        {Array.from({ length: totalPages }).map((_, index) => {
          const pageNum = index + 1;
          const isActive = currentPage === pageNum;
          
          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageClick(pageNum)}
              className={`w-8 h-8 rounded-full text-xs font-semibold transition-all duration-300 ${
                isActive ? "text-white" : "border"
              }`}
              style={
                isActive
                  ? { 
                      background: `linear-gradient(135deg, ${colors.secondary}, ${colors.tertiary})`,
                      boxShadow: `0 2px 8px ${colors.secondary}30`
                    }
                  : {
                      borderColor: colors.tertiary + "60",
                      color: colors.secondary,
                      backgroundColor: "white",
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = colors.secondary;
                  e.currentTarget.style.backgroundColor = colors.accent + "15";
                  e.currentTarget.style.transform = "scale(1.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = colors.tertiary + "60";
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.transform = "scale(1)";
                }
              }}
            >
              {pageNum}
            </button>
          );
        })}
      </div>
    </div>
  );
};

