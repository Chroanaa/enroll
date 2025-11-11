import React from "react";
import { Users } from "lucide-react";
import { colors } from "../../colors";
import { EnrollmentPageProps } from "./types";

const EmergencyInformation: React.FC<EnrollmentPageProps> = ({
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
            <Users className="w-5 h-5" style={{ color: colors.secondary }} />
          </div>
          <div>
            <h2
              className="text-xl font-bold"
              style={{ color: colors.primary }}
            >
              EMERGENCY INFORMATION
            </h2>
            <p className="text-xs mt-0.5" style={{ color: colors.tertiary }}>
              Emergency contact details
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
              Name of Emergency Contact
            </label>
            <input
              type="text"
              value={formData.emergencyContactName}
              onChange={(e) => handleInputChange("emergencyContactName", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg custom-focus transition-all duration-200 text-sm"
              style={{
                borderColor: colors.tertiary + "60",
                color: colors.primary,
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
              Relationship
            </label>
            <select
              value={formData.emergencyRelationship}
              onChange={(e) => handleInputChange("emergencyRelationship", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg custom-focus transition-all duration-200 text-sm bg-white"
              style={{
                borderColor: colors.tertiary + "60",
                color: colors.primary,
              }}
            >
              <option value="">Select Relationship</option>
              <option value="Mother">Mother</option>
              <option value="Father">Father</option>
              <option value="Spouse">Spouse</option>
              <option value="Sibling">Sibling</option>
              <option value="Legal Guardian">Legal Guardian</option>
              <option value="Grandparent">Grandparent</option>
              <option value="Aunt / Uncle">Aunt / Uncle</option>
              <option value="Relative">Relative</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.primary }}>
              Emergency Contact Number
            </label>
            <input
              type="tel"
              value={formData.emergencyContactNumber}
              onChange={(e) => {
                // Only allow numbers
                const value = e.target.value.replace(/\D/g, '');
                handleInputChange("emergencyContactNumber", value);
              }}
              className="w-full px-3 py-2 border rounded-lg custom-focus transition-all duration-200 text-sm"
              style={{
                borderColor: colors.tertiary + "60",
                color: colors.primary,
              }}
              placeholder="Enter numbers only"
              pattern="[0-9]*"
              inputMode="numeric"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyInformation;

