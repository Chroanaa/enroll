import React from "react";
import { School } from "lucide-react";
import { colors } from "../../colors";
import { EnrollmentPageProps } from "./types";

const EducationalBackground: React.FC<EnrollmentPageProps> = ({
  formData,
  handleInputChange,
  fieldErrors = {},
}) => {
  const inputClasses =
    "w-full px-4 py-3 rounded-xl border bg-white/50 transition-all duration-300 focus:ring-2 focus:ring-offset-0 outline-none";
  
  const getInputStyle = (fieldName: string) => ({
    borderColor: fieldErrors[fieldName] ? "#ef4444" : colors.tertiary + "30",
    color: colors.primary,
  });
  
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>, fieldName: string) => {
    e.currentTarget.style.borderColor = fieldErrors[fieldName] ? "#ef4444" : colors.secondary;
    e.currentTarget.style.boxShadow = `0 0 0 4px ${fieldErrors[fieldName] ? "#ef444410" : colors.secondary + "10"}`;
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>, fieldName: string) => {
    e.currentTarget.style.borderColor = fieldErrors[fieldName] ? "#ef4444" : colors.tertiary + "30";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div className='space-y-6 animate-in slide-in-from-bottom-4 duration-500 delay-200'>
      <div
        className='p-8 rounded-2xl bg-white border shadow-lg shadow-gray-100/50'
        style={{
          borderColor: colors.accent + "20",
          background: `linear-gradient(to bottom right, #ffffff, ${colors.paper})`,
        }}
      >
        <div className='flex items-center gap-4 mb-8 pb-6 border-b' style={{ borderColor: colors.accent + "10" }}>
          <div
            className='p-3 rounded-2xl shadow-sm transform transition-transform hover:scale-105 duration-300'
            style={{
              backgroundColor: "white",
              border: `1px solid ${colors.accent}20`
            }}
          >
            <School className='w-6 h-6' style={{ color: colors.secondary }} />
          </div>
          <div>
            <h2 className='text-2xl font-bold tracking-tight' style={{ color: colors.primary }}>
              Educational Background
            </h2>
            <p className='text-sm mt-1 font-medium' style={{ color: colors.tertiary }}>
              Previous educational information
            </p>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-6'>
          <div className="group">
            <label
              className='block text-sm font-semibold mb-2 ml-1 transition-colors'
              style={{ color: colors.primary }}
            >
              Last School Attended
            </label>
            <input
              name="last_school_attended"
              data-field="last_school_attended"
              type='text'
              value={formData.last_school_attended}
              onChange={(e) =>
                handleInputChange("last_school_attended", e.target.value)
              }
              className={`${inputClasses} ${fieldErrors.last_school_attended ? "border-red-500" : ""}`}
              style={getInputStyle("last_school_attended")}
              onFocus={(e) => handleFocus(e, "last_school_attended")}
              onBlur={(e) => handleBlur(e, "last_school_attended")}
              placeholder="Name of School"
            />
            {fieldErrors.last_school_attended && (
              <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.last_school_attended}</p>
            )}
          </div>
          <div className="group">
            <label
              className='block text-sm font-semibold mb-2 ml-1 transition-colors'
              style={{ color: colors.primary }}
            >
              Previous School Year (SHS)
            </label>
            <div className="relative">
              <select
                name="previous_school_year"
                data-field="previous_school_year"
                value={formData.previous_school_year || ""}
                onChange={(e) => handleInputChange("previous_school_year", e.target.value)}
                className={`${inputClasses} appearance-none cursor-pointer ${fieldErrors.previous_school_year ? "border-red-500" : ""}`}
                style={getInputStyle("previous_school_year")}
                onFocus={(e) => handleFocus(e as any, "previous_school_year")}
                onBlur={(e) => handleBlur(e as any, "previous_school_year")}
              >
                <option value=''>Select Previous School Year</option>
                {Array.from({ length: 10 }, (_, i) => {
                  const currentYear = new Date().getFullYear();
                  const startYear = currentYear - i - 1; // Start from previous year and go back
                  const endYear = startYear + 1;
                  const yearValue = `${startYear}-${endYear}`;
                  return (
                    <option key={yearValue} value={yearValue}>
                      {yearValue}
                    </option>
                  );
                })}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            {fieldErrors.previous_school_year && (
              <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.previous_school_year}</p>
            )}
          </div>
          <div className="group">
            <label
              className='block text-sm font-semibold mb-2 ml-1 transition-colors'
              style={{ color: colors.primary }}
            >
              Program (SHS)
            </label>
            <input
              type='text'
              value={formData.program_shs}
              onChange={(e) => handleInputChange("program_shs", e.target.value)}
              className={inputClasses}
              style={{
                borderColor: colors.tertiary + "30",
                color: colors.primary,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.secondary;
                e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.tertiary + "30";
                e.currentTarget.style.boxShadow = "none";
              }}
              placeholder="e.g. STEM, ABM"
            />
          </div>
        </div>

        <div className="group">
          <label
            className='block text-sm font-semibold mb-2 ml-1 transition-colors'
            style={{ color: colors.primary }}
          >
            Remarks
          </label>
          <textarea
            value={formData.remarks}
            onChange={(e) => handleInputChange("remarks", e.target.value)}
            rows={4}
            className={`${inputClasses} resize-none`}
            style={{
              borderColor: colors.tertiary + "30",
              color: colors.primary,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.secondary;
              e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.tertiary + "30";
              e.currentTarget.style.boxShadow = "none";
            }}
            placeholder="Additional notes or comments..."
          />
        </div>
      </div>
    </div>
  );
};

export default EducationalBackground;
