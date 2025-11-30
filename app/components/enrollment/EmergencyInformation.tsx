import React from "react";
import { Users } from "lucide-react";
import { colors } from "../../colors";
import { EnrollmentPageProps } from "./types";

const EmergencyInformation: React.FC<EnrollmentPageProps> = ({
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
  
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>, fieldName: string) => {
    e.currentTarget.style.borderColor = fieldErrors[fieldName] ? "#ef4444" : colors.secondary;
    e.currentTarget.style.boxShadow = `0 0 0 4px ${fieldErrors[fieldName] ? "#ef444410" : colors.secondary + "10"}`;
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>, fieldName: string) => {
    e.currentTarget.style.borderColor = fieldErrors[fieldName] ? "#ef4444" : colors.tertiary + "30";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div className='space-y-6 animate-in slide-in-from-bottom-4 duration-500 delay-300'>
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
            <Users className='w-6 h-6' style={{ color: colors.secondary }} />
          </div>
          <div>
            <h2 className='text-2xl font-bold tracking-tight' style={{ color: colors.primary }}>
              Emergency Information
            </h2>
            <p className='text-sm mt-1 font-medium' style={{ color: colors.tertiary }}>
              Emergency contact details
            </p>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <div className="group">
            <label
              className='block text-sm font-semibold mb-2 ml-1 transition-colors'
              style={{ color: colors.primary }}
            >
              Name of Emergency Contact
            </label>
            <input
              name="emergency_contact_name"
              data-field="emergency_contact_name"
              type='text'
              value={formData.emergency_contact_name}
              onChange={(e) =>
                handleInputChange("emergency_contact_name", e.target.value)
              }
              className={`${inputClasses} ${fieldErrors.emergency_contact_name ? "border-red-500" : ""}`}
              style={getInputStyle("emergency_contact_name")}
              onFocus={(e) => handleFocus(e, "emergency_contact_name")}
              onBlur={(e) => handleBlur(e, "emergency_contact_name")}
              placeholder="Full Name"
            />
            {fieldErrors.emergency_contact_name && (
              <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.emergency_contact_name}</p>
            )}
          </div>
          <div className="group">
            <label
              className='block text-sm font-semibold mb-2 ml-1 transition-colors'
              style={{ color: colors.primary }}
            >
              Relationship
            </label>
            <div className="relative">
              <select
                name="emergency_relationship"
                data-field="emergency_relationship"
                value={formData.emergency_relationship}
                onChange={(e) =>
                  handleInputChange("emergency_relationship", e.target.value)
                }
                className={`${inputClasses} appearance-none cursor-pointer ${fieldErrors.emergency_relationship ? "border-red-500" : ""}`}
                style={getInputStyle("emergency_relationship")}
                onFocus={(e) => handleFocus(e, "emergency_relationship")}
                onBlur={(e) => handleBlur(e, "emergency_relationship")}
              >
                <option value=''>Select Relationship</option>
                <option value='Mother'>Mother</option>
                <option value='Father'>Father</option>
                <option value='Spouse'>Spouse</option>
                <option value='Sibling'>Sibling</option>
                <option value='Legal Guardian'>Legal Guardian</option>
                <option value='Grandparent'>Grandparent</option>
                <option value='Aunt / Uncle'>Aunt / Uncle</option>
                <option value='Relative'>Relative</option>
                <option value='Other'>Other</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            {fieldErrors.emergency_relationship && (
              <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.emergency_relationship}</p>
            )}
          </div>
          <div className="group">
            <label
              className='block text-sm font-semibold mb-2 ml-1 transition-colors'
              style={{ color: colors.primary }}
            >
              Emergency Contact Number
            </label>
            <input
              name="emergency_contact_number"
              data-field="emergency_contact_number"
              type='tel'
              value={formData.emergency_contact_number}
              onChange={(e) => {
                // Only allow numbers
                const value = e.target.value.replace(/\D/g, "");
                handleInputChange("emergency_contact_number", value);
              }}
              className={`${inputClasses} ${fieldErrors.emergency_contact_number ? "border-red-500" : ""}`}
              style={getInputStyle("emergency_contact_number")}
              onFocus={(e) => handleFocus(e, "emergency_contact_number")}
              onBlur={(e) => handleBlur(e, "emergency_contact_number")}
              placeholder='09123456789'
              pattern='[0-9]*'
              inputMode='numeric'
            />
            {fieldErrors.emergency_contact_number && (
              <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.emergency_contact_number}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyInformation;
