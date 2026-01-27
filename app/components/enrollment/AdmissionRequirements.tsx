import React from "react";
import { FileText, CheckCircle2, Circle } from "lucide-react";
import { colors } from "../../colors";
import { EnrollmentPageProps } from "./types";

const AdmissionRequirements: React.FC<EnrollmentPageProps> = ({
  formData,
  handleCheckboxChange,
  fieldErrors = {},
}) => {
  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 delay-400">
      <div
        className="p-6 rounded-2xl bg-white border shadow-lg shadow-gray-100/50"
        style={{
          borderColor: colors.accent + "20",
          background: `linear-gradient(to bottom right, #ffffff, ${colors.paper})`
        }}
      >
        <div className="flex items-center gap-4 mb-6 pb-4 border-b" style={{ borderColor: colors.accent + "10" }}>
          <div
            className="p-3 rounded-2xl shadow-sm transform transition-transform hover:scale-105 duration-300"
            style={{
              backgroundColor: "white",
              border: `1px solid ${colors.accent}20`
            }}
          >
            <FileText className="w-6 h-6" style={{ color: colors.secondary }} />
          </div>
          <div>
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: colors.primary }}
            >
              Admission Requirements
            </h2>
            <p className="text-sm mt-1 font-medium" style={{ color: colors.tertiary }}>
              Select all submitted documents
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 rounded-xl mb-6 border"
          style={{
            backgroundColor: colors.accent + "05",
            borderColor: colors.accent + "10"
          }}
        >
          <CheckCircle2 className="w-5 h-5" style={{ color: colors.secondary }} />
          <p className="text-sm font-medium" style={{ color: colors.secondary }}>
            Please check all requirements that have been submitted
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            "School Form 10 / Form 137A",
            "Transcript of Records",
            "Certificate of Good Moral Character",
            "School Form 9 / Form 138",
            "Honorable Dismissal",
            "Birth / Marriage Certificate",
          ].map((req) => {
            const isSelected = formData.requirements.includes(req);
            return (
              <label
                key={req}
                className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-300 group relative overflow-hidden"
                style={{
                  borderColor: isSelected ? colors.secondary : colors.tertiary + "20",
                  backgroundColor: isSelected ? colors.accent + "08" : "white",
                  boxShadow: isSelected ? `0 4px 12px ${colors.secondary}15` : "none"
                }}
                onClick={() => handleCheckboxChange?.(req)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleCheckboxChange?.(req)}
                  className="sr-only"
                  aria-label={req}
                />
                <div className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                  {isSelected ? (
                    <CheckCircle2 className="w-6 h-6" style={{ color: colors.secondary }} />
                  ) : (
                    <Circle className="w-6 h-6" style={{ color: colors.tertiary + "40" }} />
                  )}
                </div>
                <span
                  className="text-sm font-semibold flex-1 transition-colors duration-300"
                  style={{ color: isSelected ? colors.secondary : colors.primary }}
                >
                  {req}
                </span>
                {isSelected && (
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none"
                    style={{ backgroundColor: colors.secondary }}
                  />
                )}
              </label>
            );
          })}
        </div>
        {fieldErrors.requirements && (
          <p className="text-red-500 text-xs mt-4 ml-1">{fieldErrors.requirements}</p>
        )}
      </div>
    </div>
  );
};

export default AdmissionRequirements;

