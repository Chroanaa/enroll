import React from "react";
import { FileText, CheckCircle2 } from "lucide-react";
import { colors } from "../../colors";
import { EnrollmentPageProps } from "./types";

const AdmissionRequirements: React.FC<EnrollmentPageProps> = ({
  formData,
  handleCheckboxChange,
}) => {
  return (
    <div className="space-y-6">
      <div
        className="p-6 rounded-xl bg-white border shadow-sm"
        style={{ 
          borderColor: colors.accent + "40",
          background: `linear-gradient(to bottom, ${colors.paper}, white)`
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: colors.accent + "20" }}
          >
            <FileText className="w-5 h-5" style={{ color: colors.secondary }} />
          </div>
          <div>
            <h2
              className="text-xl font-bold"
              style={{ color: colors.primary }}
            >
              ADMISSION REQUIREMENTS
            </h2>
            <p className="text-xs mt-0.5" style={{ color: colors.tertiary }}>
              Select all submitted documents
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-6" style={{ backgroundColor: colors.accent + "10" }}>
          <CheckCircle2 className="w-4 h-4" style={{ color: colors.secondary }} />
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
          ].map((req) => (
            <label 
              key={req} 
              className="flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md"
              style={{ 
                borderColor: formData.requirements.includes(req) ? colors.secondary : colors.tertiary + "40",
                backgroundColor: formData.requirements.includes(req) ? colors.accent + "15" : "white"
              }}
              onClick={() => handleCheckboxChange?.(req)}
            >
              <input
                type="checkbox"
                checked={formData.requirements.includes(req)}
                onChange={() => handleCheckboxChange?.(req)}
                className="sr-only"
                aria-label={req}
              />
              <div className="flex-shrink-0">
                {formData.requirements.includes(req) ? (
                  <CheckCircle2 className="w-5 h-5" style={{ color: colors.secondary }} />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: colors.tertiary + "60" }} />
                )}
              </div>
              <span className="text-sm font-medium flex-1" style={{ color: formData.requirements.includes(req) ? colors.secondary : colors.primary }}>
                {req}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdmissionRequirements;

