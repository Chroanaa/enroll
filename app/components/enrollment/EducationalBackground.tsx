import React from "react";
import { School } from "lucide-react";
import { colors } from "../../colors";
import { EnrollmentPageProps } from "./types";

const EducationalBackground: React.FC<EnrollmentPageProps> = ({
  formData,
  handleInputChange,
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
        <div className="flex items-center gap-3 mb-6">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: colors.accent + "20" }}
          >
            <School className="w-5 h-5" style={{ color: colors.secondary }} />
          </div>
          <div>
            <h2
              className="text-xl font-bold"
              style={{ color: colors.primary }}
            >
              EDUCATIONAL BACKGROUND
            </h2>
            <p className="text-xs mt-0.5" style={{ color: colors.tertiary }}>
              Previous educational information
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
              Last School Attended
            </label>
            <input
              type="text"
              value={formData.lastSchoolAttended}
              onChange={(e) => handleInputChange("lastSchoolAttended", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg custom-focus transition-all duration-200 text-sm"
              style={{
                borderColor: colors.tertiary + "60",
                color: colors.primary,
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
              School Year
            </label>
            <input
              type="text"
              value={formData.schoolYear}
              onChange={(e) => handleInputChange("schoolYear", e.target.value)}
              placeholder="e.g., 2023-2024"
              className="w-full px-3 py-2 border rounded-lg custom-focus transition-all duration-200 text-sm"
              style={{
                borderColor: colors.tertiary + "60",
                color: colors.primary,
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
              Program (SHS)
            </label>
            <input
              type="text"
              value={formData.programSHS}
              onChange={(e) => handleInputChange("programSHS", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg custom-focus transition-all duration-200 text-sm"
              style={{
                borderColor: colors.tertiary + "60",
                color: colors.primary,
              }}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
            Remarks
          </label>
          <textarea
            value={formData.remarks}
            onChange={(e) => handleInputChange("remarks", e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg custom-focus transition-all duration-200 text-sm bg-white"
            style={{
              borderColor: colors.tertiary + "60",
              color: colors.primary,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default EducationalBackground;

