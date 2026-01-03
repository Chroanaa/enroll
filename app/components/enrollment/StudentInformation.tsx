import React from "react";
import { User, Phone, Mail } from "lucide-react";
import { colors } from "../../colors";
import { EnrollmentPageProps } from "./types";

const StudentInformation: React.FC<EnrollmentPageProps> = ({
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
  
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, fieldName: string) => {
    e.currentTarget.style.borderColor = fieldErrors[fieldName] ? "#ef4444" : colors.secondary;
    e.currentTarget.style.boxShadow = `0 0 0 4px ${fieldErrors[fieldName] ? "#ef444410" : colors.secondary + "10"}`;
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, fieldName: string) => {
    e.currentTarget.style.borderColor = fieldErrors[fieldName] ? "#ef4444" : colors.tertiary + "30";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div className='space-y-6 animate-in slide-in-from-bottom-4 duration-500'>
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
            <User className='w-6 h-6' style={{ color: colors.secondary }} />
          </div>
          <div>
            <h2 className='text-2xl font-bold tracking-tight' style={{ color: colors.primary }}>
              Student Information
            </h2>
            <p className='text-sm mt-1 font-medium' style={{ color: colors.tertiary }}>
              Please provide your personal details
            </p>
          </div>
        </div>

        <div className='mb-6 group'>
          <label
            className='block text-sm font-semibold mb-2 ml-1 transition-colors'
            style={{ color: colors.primary }}
          >
            Student ID <span className='text-xs text-gray-500'>(Auto-generated)</span>
          </label>
          <input
            name="student_number"
            data-field="student_number"
            type='text'
            value={formData.student_number}
            readOnly
            disabled
            className={`${inputClasses} cursor-not-allowed opacity-75 bg-gray-50`}
            style={{
              borderColor: colors.tertiary + "30",
              color: colors.primary,
            }}
            placeholder="Auto-generated (YY-00001)"
          />
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-6'>
          <div className="group">
            <label
              className='block text-sm font-semibold mb-2 ml-1 transition-colors'
              style={{ color: colors.primary }}
            >
              Family Name
            </label>
            <input
              name="family_name"
              data-field="family_name"
              type='text'
              value={formData.family_name}
              onChange={(e) => handleInputChange("family_name", e.target.value)}
              className={`${inputClasses} ${fieldErrors.family_name ? "border-red-500" : ""}`}
              style={getInputStyle("family_name")}
              onFocus={(e) => handleFocus(e, "family_name")}
              onBlur={(e) => handleBlur(e, "family_name")}
              placeholder="e.g. Dela Cruz"
            />
            {fieldErrors.family_name && (
              <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.family_name}</p>
            )}
          </div>
          <div className="group">
            <label
              className='block text-sm font-semibold mb-2 ml-1 transition-colors'
              style={{ color: colors.primary }}
            >
              First Name
            </label>
            <input
              name="first_name"
              data-field="first_name"
              type='text'
              value={formData.first_name}
              onChange={(e) => handleInputChange("first_name", e.target.value)}
              className={`${inputClasses} ${fieldErrors.first_name ? "border-red-500" : ""}`}
              style={getInputStyle("first_name")}
              onFocus={(e) => handleFocus(e, "first_name")}
              onBlur={(e) => handleBlur(e, "first_name")}
              placeholder="e.g. Juan"
            />
            {fieldErrors.first_name && (
              <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.first_name}</p>
            )}
          </div>
          <div className="group">
            <label
              className='block text-sm font-semibold mb-2 ml-1 transition-colors'
              style={{ color: colors.primary }}
            >
              Middle Name
            </label>
            <input
              type='text'
              value={formData.middle_name}
              onChange={(e) => handleInputChange("middle_name", e.target.value)}
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
              placeholder="Optional"
            />
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-6'>
          <div className="group">
            <label
              className='block text-sm font-semibold mb-2 ml-1'
              style={{ color: colors.primary }}
            >
              Sex
            </label>
            <div className="relative">
              <select
                name="sex"
                data-field="sex"
                value={formData.sex}
                onChange={(e) => handleInputChange("sex", e.target.value)}
                className={`${inputClasses} appearance-none cursor-pointer ${fieldErrors.sex ? "border-red-500" : ""}`}
                style={getInputStyle("sex")}
                onFocus={(e) => handleFocus(e, "sex")}
                onBlur={(e) => handleBlur(e, "sex")}
              >
                <option value=''>Select Sex</option>
                <option value='male'>Male</option>
                <option value='female'>Female</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            {fieldErrors.sex && (
              <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.sex}</p>
            )}
          </div>
          <div className="group">
            <label
              className='block text-sm font-semibold mb-2 ml-1'
              style={{ color: colors.primary }}
            >
              Civil Status
            </label>
            <div className="relative">
              <select
                name="civil_status"
                data-field="civil_status"
                value={formData.civil_status}
                onChange={(e) =>
                  handleInputChange("civil_status", e.target.value)
                }
                className={`${inputClasses} appearance-none cursor-pointer ${fieldErrors.civil_status ? "border-red-500" : ""}`}
                style={getInputStyle("civil_status")}
                onFocus={(e) => handleFocus(e, "civil_status")}
                onBlur={(e) => handleBlur(e, "civil_status")}
              >
                <option value=''>Select Status</option>
                <option value='single'>Single</option>
                <option value='married'>Married</option>
                <option value='widowed'>Widowed</option>
                <option value='separated'>Separated</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            {fieldErrors.civil_status && (
              <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.civil_status}</p>
            )}
          </div>
          <div className="group">
            <label
              className='block text-sm font-semibold mb-2 ml-1'
              style={{ color: colors.primary }}
            >
              Birthdate
            </label>
            <input
              name="birthdate"
              data-field="birthdate"
              type='date'
              value={formData.birthdate}
              onChange={(e) => handleInputChange("birthdate", e.target.value)}
              className={`${inputClasses} ${fieldErrors.birthdate ? "border-red-500" : ""}`}
              style={getInputStyle("birthdate")}
              onFocus={(e) => handleFocus(e, "birthdate")}
              onBlur={(e) => handleBlur(e, "birthdate")}
            />
            {fieldErrors.birthdate && (
              <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.birthdate}</p>
            )}
          </div>
        </div>

        <div className='mb-6 group'>
          <label
            className='block text-sm font-semibold mb-2 ml-1'
            style={{ color: colors.primary }}
          >
            Birthplace
          </label>
          <input
            name="birthplace"
            data-field="birthplace"
            type='text'
            value={formData.birthplace}
            onChange={(e) => handleInputChange("birthplace", e.target.value)}
            className={`${inputClasses} ${fieldErrors.birthplace ? "border-red-500" : ""}`}
            style={getInputStyle("birthplace")}
            onFocus={(e) => handleFocus(e, "birthplace")}
            onBlur={(e) => handleBlur(e, "birthplace")}
            placeholder="City/Municipality, Province"
          />
          {fieldErrors.birthplace && (
            <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.birthplace}</p>
          )}
        </div>

        <div className='mb-6 group'>
          <label
            className='block text-sm font-semibold mb-2 ml-1'
            style={{ color: colors.primary }}
          >
            Complete Address
          </label>
          <textarea
            name="complete_address"
            data-field="complete_address"
            value={formData.complete_address}
            onChange={(e) =>
              handleInputChange("complete_address", e.target.value)
            }
            rows={3}
            className={`${inputClasses} resize-none ${fieldErrors.complete_address ? "border-red-500" : ""}`}
            style={getInputStyle("complete_address")}
            onFocus={(e) => handleFocus(e, "complete_address")}
            onBlur={(e) => handleBlur(e, "complete_address")}
            placeholder="House No., Street, Barangay, City/Municipality, Province"
          />
          {fieldErrors.complete_address && (
            <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.complete_address}</p>
          )}
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className="group">
            <label
              className='flex items-center gap-2 text-sm font-semibold mb-2 ml-1'
              style={{ color: colors.primary }}
            >
              <Phone className='w-4 h-4' style={{ color: colors.secondary }} />
              Contact Number
            </label>
            <input
              name="contact_number"
              data-field="contact_number"
              type='tel'
              value={formData.contact_number}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                handleInputChange("contact_number", value);
              }}
              className={`${inputClasses} ${fieldErrors.contact_number ? "border-red-500" : ""}`}
              style={getInputStyle("contact_number")}
              onFocus={(e) => handleFocus(e, "contact_number")}
              onBlur={(e) => handleBlur(e, "contact_number")}
              placeholder='09123456789'
              pattern='[0-9]*'
              inputMode='numeric'
            />
            {fieldErrors.contact_number && (
              <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.contact_number}</p>
            )}
          </div>
          <div className="group">
            <label
              className='flex items-center gap-2 text-sm font-semibold mb-2 ml-1'
              style={{ color: colors.primary }}
            >
              <Mail className='w-4 h-4' style={{ color: colors.secondary }} />
              Email Address
            </label>
            <input
              name="email_address"
              data-field="email_address"
              type='email'
              value={formData.email_address}
              onChange={(e) =>
                handleInputChange("email_address", e.target.value)
              }
              className={`${inputClasses} ${fieldErrors.email_address ? "border-red-500" : ""}`}
              style={getInputStyle("email_address")}
              onFocus={(e) => handleFocus(e, "email_address")}
              onBlur={(e) => handleBlur(e, "email_address")}
              placeholder="example@email.com"
            />
            {fieldErrors.email_address && (
              <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.email_address}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentInformation;
