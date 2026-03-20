import React from "react";
import { colors } from "../../colors";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  title: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
  title,
}) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className='mb-6 sm:mb-8 animate-in fade-in slide-in-from-top-4 duration-700'>
      <div className='flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-3'>
        <div>
          <span
            className='text-xs font-bold uppercase tracking-wider mb-1 block'
            style={{ color: colors.secondary }}
          >
            Step {currentStep} of {totalSteps}
          </span>
          <h2
            className='text-lg sm:text-xl font-bold tracking-tight'
            style={{ color: colors.primary }}
          >
            {title}
          </h2>
        </div>
        <div
          className='text-xs sm:text-sm font-bold px-3 py-1 rounded-full w-fit'
          style={{
            color: colors.secondary,
            backgroundColor: colors.accent + "15",
            border: `1px solid ${colors.accent}30`
          }}
        >
          {Math.round(progress)}% Complete
        </div>
      </div>
      <div
        className='h-3 w-full rounded-full overflow-hidden shadow-inner'
        style={{ backgroundColor: colors.accent + "15" }}
      >
        <div
          className='h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden'
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${colors.secondary}, ${colors.primary})`,
            boxShadow: `0 0 10px ${colors.secondary}40`
          }}
        >
          <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] skew-x-12" style={{ transform: 'skewX(-20deg) translateX(-150%)' }} />
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          100% { transform: skewX(-20deg) translateX(200%); }
        }
      `}</style>
    </div>
  );
};
