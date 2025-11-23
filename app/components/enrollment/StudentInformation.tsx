import React from "react";
import { User, Phone, Mail } from "lucide-react";
import { colors } from "../../colors";
import { EnrollmentPageProps } from "./types";

const StudentInformation: React.FC<EnrollmentPageProps> = ({
  formData,
  handleInputChange,
}) => {
  return (
    <div className='space-y-6'>
      <div
        className='p-6 rounded-xl bg-white border shadow-sm'
        style={{
          borderColor: colors.accent + "40",
          background: `linear-gradient(to bottom, ${colors.paper}, white)`,
        }}
      >
        <div className='flex items-center gap-3 mb-6'>
          <div
            className='p-2 rounded-lg'
            style={{ backgroundColor: colors.accent + "20" }}
          >
            <User className='w-5 h-5' style={{ color: colors.secondary }} />
          </div>
          <div>
            <h2 className='text-xl font-bold' style={{ color: colors.primary }}>
              STUDENT INFORMATION
            </h2>
            <p className='text-xs mt-0.5' style={{ color: colors.tertiary }}>
              Personal details and contact information
            </p>
          </div>
        </div>
        <div className='grid grid-cols-3 gap-4 mb-4'>
          <div>
            <label
              className='block text-sm font-medium mb-1'
              style={{ color: colors.primary }}
            >
              Family Name
            </label>
            <input
              type='text'
              value={formData.family_name}
              onChange={(e) => handleInputChange("family_name", e.target.value)}
              className='w-full px-3 py-2 border rounded-lg custom-focus transition-all duration-200 text-sm'
              style={{
                borderColor: colors.tertiary + "60",
                color: colors.primary,
              }}
            />
          </div>
          <div>
            <label
              className='block text-sm font-medium mb-1'
              style={{ color: colors.primary }}
            >
              First Name
            </label>
            <input
              type='text'
              value={formData.first_name}
              onChange={(e) => handleInputChange("first_name", e.target.value)}
              className='w-full px-3 py-2 border rounded-lg custom-focus transition-all duration-200 text-sm'
              style={{
                borderColor: colors.tertiary + "60",
                color: colors.primary,
              }}
            />
          </div>
          <div>
            <label
              className='block text-sm font-medium mb-1'
              style={{ color: colors.primary }}
            >
              Middle Name
            </label>
            <input
              type='text'
              value={formData.middle_name}
              onChange={(e) => handleInputChange("middle_name", e.target.value)}
              className='w-full px-3 py-2 border rounded-lg custom-focus transition-all duration-200 text-sm'
              style={{
                borderColor: colors.tertiary + "60",
                color: colors.primary,
              }}
            />
          </div>
        </div>
        <div className='grid grid-cols-3 gap-4 mb-4'>
          <div>
            <label
              className='block text-sm font-medium mb-1'
              style={{ color: colors.primary }}
            >
              Sex
            </label>
            <select
              value={formData.sex}
              onChange={(e) => handleInputChange("sex", e.target.value)}
              className='w-full px-3 py-2 border rounded-lg custom-focus transition-all duration-200 text-sm'
              style={{
                borderColor: colors.tertiary + "60",
                color: colors.primary,
              }}
            >
              <option value=''>Select</option>
              <option value='male'>Male</option>
              <option value='female'>Female</option>
            </select>
          </div>
          <div>
            <label
              className='block text-sm font-medium mb-1'
              style={{ color: colors.primary }}
            >
              Civil Status
            </label>
            <select
              value={formData.civil_status}
              onChange={(e) =>
                handleInputChange("civil_status", e.target.value)
              }
              className='w-full px-3 py-2 border rounded-lg custom-focus transition-all duration-200 text-sm'
              style={{
                borderColor: colors.tertiary + "60",
                color: colors.primary,
              }}
            >
              <option value=''>Select</option>
              <option value='single'>Single</option>
              <option value='married'>Married</option>
              <option value='widowed'>Widowed</option>
              <option value='separated'>Separated</option>
            </select>
          </div>
          <div>
            <label
              className='block text-sm font-medium mb-1'
              style={{ color: colors.primary }}
            >
              Birthdate
            </label>
            <input
              type='date'
              value={formData.birthdate}
              onChange={(e) => handleInputChange("birthdate", e.target.value)}
              className='w-full px-3 py-2 border rounded-lg custom-focus transition-all duration-200 text-sm'
              style={{
                borderColor: colors.tertiary + "60",
                color: colors.primary,
              }}
            />
          </div>
        </div>
        <div className='mb-4'>
          <label
            className='block text-sm font-medium mb-1'
            style={{ color: colors.primary }}
          >
            Birthplace
          </label>
          <input
            type='text'
            value={formData.birthplace}
            onChange={(e) => handleInputChange("birthplace", e.target.value)}
            className='w-full px-3 py-2 border rounded-lg custom-focus transition-all duration-200 text-sm'
            style={{
              borderColor: colors.tertiary + "60",
              color: colors.primary,
            }}
          />
        </div>
        <div className='mb-4'>
          <label
            className='block text-sm font-medium mb-1'
            style={{ color: colors.primary }}
          >
            Complete Address
          </label>
          <textarea
            value={formData.complete_address}
            onChange={(e) =>
              handleInputChange("complete_address", e.target.value)
            }
            rows={3}
            className='w-full px-3 py-2 border rounded-lg custom-focus transition-all duration-200 text-sm bg-white'
            style={{
              borderColor: colors.tertiary + "60",
              color: colors.primary,
            }}
          />
        </div>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label
              className='flex items-center gap-2 text-sm font-semibold mb-2'
              style={{ color: colors.primary }}
            >
              <Phone className='w-4 h-4' style={{ color: colors.secondary }} />
              Contact Number
            </label>
            <input
              type='tel'
              value={formData.contact_number}
              onChange={(e) => {
                // Only allow numbers
                const value = e.target.value.replace(/\D/g, "");
                handleInputChange("contact_number", value);
              }}
              className='w-full px-4 py-2.5 border rounded-lg custom-focus transition-all duration-200 text-sm hover:shadow-sm'
              style={{
                borderColor: colors.tertiary + "60",
                color: colors.primary,
              }}
              placeholder='Enter numbers only'
              pattern='[0-9]*'
              inputMode='numeric'
            />
          </div>
          <div>
            <label
              className='flex items-center gap-2 text-sm font-semibold mb-2'
              style={{ color: colors.primary }}
            >
              <Mail className='w-4 h-4' style={{ color: colors.secondary }} />
              Email Address
            </label>
            <input
              type='email'
              value={formData.email_address}
              onChange={(e) =>
                handleInputChange("email_address", e.target.value)
              }
              className='w-full px-4 py-2.5 border rounded-lg custom-focus transition-all duration-200 text-sm hover:shadow-sm'
              style={{
                borderColor: colors.tertiary + "60",
                color: colors.primary,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentInformation;
