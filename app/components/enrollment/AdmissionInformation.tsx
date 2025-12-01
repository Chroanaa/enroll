import React from "react";
import {
  GraduationCap,
  Calendar,
  UserCircle,
  Building2,
  BookOpen,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { colors } from "../../colors";
import { EnrollmentPageProps } from "./types";

const AdmissionInformation: React.FC<EnrollmentPageProps> = ({
  formData,
  handleInputChange,
  handleDepartmentChange,
  filteredCoursePrograms,
  departments = [],
  photoPreview,
  fileInputRef,
  handlePhotoUpload,
  removePhoto,
  handlePhotoError,
  getTodayDate,
  fieldErrors = {},
}) => {
  formData.admission_date = getTodayDate?.() || "";

  const inputClasses =
    "w-full px-4 py-3 rounded-xl border bg-white/50 transition-all duration-300 focus:ring-2 focus:ring-offset-0 outline-none";

  return (
    <div className='space-y-6 animate-in slide-in-from-bottom-4 duration-500 delay-100'>
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
            <GraduationCap
              className='w-6 h-6'
              style={{ color: colors.secondary }}
            />
          </div>
          <div>
            <h2 className='text-2xl font-bold tracking-tight' style={{ color: colors.primary }}>
              Admission Information
            </h2>
            <p className='text-sm mt-1 font-medium' style={{ color: colors.tertiary }}>
              Complete your admission details
            </p>
          </div>
        </div>

        <div
          className='flex items-center gap-3 px-4 py-3 rounded-xl mb-8 border'
          style={{
            backgroundColor: colors.accent + "05",
            borderColor: colors.accent + "10"
          }}
        >
          <Calendar className='w-5 h-5' style={{ color: colors.secondary }} />
          <span className="text-sm font-semibold" style={{ color: colors.primary }}>Date of Admission:</span>
          <p
            className='text-sm font-bold'
            style={{ color: colors.secondary }}
          >
            {getTodayDate?.() || ""}
          </p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Left Column - Form Fields */}
          <div className='lg:col-span-2 space-y-6'>
            <div className="group">
              <label
                className='flex items-center gap-2 text-sm font-semibold mb-2 ml-1'
                style={{ color: colors.primary }}
              >
                <UserCircle
                  className='w-4 h-4'
                  style={{ color: colors.secondary }}
                />
                Admission Status
              </label>
              <div className="relative">
                <select
                  name="admission_status"
                  data-field="admission_status"
                  value={formData.admission_status}
                  onChange={(e) =>
                    handleInputChange("admission_status", e.target.value)
                  }
                  className={`${inputClasses} appearance-none cursor-pointer ${fieldErrors.admission_status ? "border-red-500" : ""}`}
                  style={{
                    borderColor: fieldErrors.admission_status ? "#ef4444" : colors.tertiary + "30",
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = fieldErrors.admission_status ? "#ef4444" : colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 4px ${fieldErrors.admission_status ? "#ef444410" : colors.secondary + "10"}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = fieldErrors.admission_status ? "#ef4444" : colors.tertiary + "30";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value=''>Select Status</option>
                  <option value='new'>New Student</option>
                  <option value='transferee'>Transferee</option>
                  <option value='returning'>Returning Student</option>
                  <option value='completed'>Completed</option>
                  <option value='dropped'>Dropped</option>
                  <option value='pending'>Pending</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="group">
              <label
                className='flex items-center gap-2 text-sm font-semibold mb-2 ml-1'
                style={{ color: colors.primary }}
              >
                <Building2
                  className='w-4 h-4'
                  style={{ color: colors.secondary }}
                />
                Department
              </label>
              <div className="relative">
                <select
                  name="department"
                  data-field="department"
                  value={formData.department}
                  onChange={(e) =>
                    handleDepartmentChange?.(Number(e.target.value))
                  }
                  className={`${inputClasses} appearance-none cursor-pointer ${fieldErrors.department ? "border-red-500" : ""}`}
                  style={{
                    borderColor: fieldErrors.department ? "#ef4444" : colors.tertiary + "30",
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = fieldErrors.department ? "#ef4444" : colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 4px ${fieldErrors.department ? "#ef444410" : colors.secondary + "10"}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = fieldErrors.department ? "#ef4444" : colors.tertiary + "30";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value=''>Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              {fieldErrors.department && (
                <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.department}</p>
              )}
            </div>

            <div className="group">
              <label
                className='flex items-center gap-2 text-sm font-semibold mb-2 ml-1'
                style={{ color: colors.primary }}
              >
                <BookOpen
                  className='w-4 h-4'
                  style={{ color: colors.secondary }}
                />
                Course/Program
              </label>
              <div className="relative">
                <select
                  name="course_program"
                  data-field="course_program"
                  value={formData.course_program}
                  onChange={(e) =>
                    handleInputChange("course_program", e.target.value)
                  }
                  disabled={!formData.department}
                  className={`${inputClasses} appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${fieldErrors.course_program ? "border-red-500" : ""}`}
                  style={{
                    borderColor: fieldErrors.course_program ? "#ef4444" : colors.tertiary + "30",
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    if (!formData.department) return;
                    e.currentTarget.style.borderColor = fieldErrors.course_program ? "#ef4444" : colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 4px ${fieldErrors.course_program ? "#ef444410" : colors.secondary + "10"}`;
                  }}
                  onBlur={(e) => {
                    if (!formData.department) return;
                    e.currentTarget.style.borderColor = fieldErrors.course_program ? "#ef4444" : colors.tertiary + "30";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value=''>
                    {formData.department
                      ? "Select Course/Program"
                      : "Please select a department first"}
                  </option>
                  {filteredCoursePrograms?.map((program) => (
                    <option key={program.id} value={String(program.id)}>
                      {program.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              {fieldErrors.course_program && (
                <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.course_program}</p>
              )}
            </div>

            <div className="group">
              <label
                className='flex items-center gap-2 text-sm font-semibold mb-3 ml-1'
                style={{ color: colors.primary }}
              >
                <Calendar
                  className='w-4 h-4'
                  style={{ color: colors.secondary }}
                />
                Term
              </label>
              <div className='flex flex-wrap gap-4'>
                {["First", "Second", "Summer"].map((term) => (
                  <label
                    key={term}
                    className='flex items-center gap-3 px-5 py-3 rounded-xl border cursor-pointer transition-all duration-300 hover:shadow-md relative overflow-hidden group/radio'
                    style={{
                      borderColor:
                        formData.term === term.toLowerCase()
                          ? colors.secondary
                          : colors.tertiary + "30",
                      backgroundColor:
                        formData.term === term.toLowerCase()
                          ? colors.accent + "10"
                          : "white",
                    }}
                  >
                    <input
                      type='radio'
                      name='term'
                      value={term.toLowerCase()}
                      checked={formData.term === term.toLowerCase()}
                      onChange={(e) =>
                        handleInputChange("term", e.target.value)
                      }
                      className='custom-radio h-4 w-4'
                      style={{ accentColor: colors.secondary }}
                    />
                    <span
                      className='text-sm font-medium'
                      style={{
                        color:
                          formData.term === term.toLowerCase()
                            ? colors.secondary
                            : colors.primary,
                      }}
                    >
                      {term}
                    </span>
                    {formData.term === term.toLowerCase() && (
                      <div
                        className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{ backgroundColor: colors.secondary }}
                      />
                    )}
                  </label>
                ))}
              </div>
              {fieldErrors.term && (
                <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.term}</p>
              )}
            </div>
          </div>

          {/* Right Column - Photo Upload */}
          <div className='lg:col-span-1'>
            <div className="sticky top-6">
              <label
                className='flex items-center gap-2 text-sm font-semibold mb-3 ml-1'
                style={{ color: colors.primary }}
              >
                <ImageIcon
                  className='w-4 h-4'
                  style={{ color: colors.secondary }}
                />
                Student Photo
              </label>
              <div
                className='rounded-2xl shadow-sm border p-6 flex flex-col items-center justify-center bg-white transition-all duration-300 hover:shadow-md'
                style={{
                  borderColor: colors.accent + "20",
                }}
              >
                <div
                  className={`w-40 h-48 border-2 border-dashed rounded-xl relative overflow-hidden cursor-pointer transition-all duration-300 group ${photoPreview
                      ? "border-transparent shadow-md"
                      : "flex flex-col items-center justify-center hover:border-solid"
                    }`}
                  style={{
                    borderColor: photoPreview
                      ? "transparent"
                      : colors.accent + "40",
                    backgroundColor: photoPreview
                      ? "white"
                      : colors.paper,
                  }}
                  onMouseEnter={(e) => {
                    if (!photoPreview) {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.backgroundColor = colors.accent + "10";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!photoPreview) {
                      e.currentTarget.style.borderColor = colors.accent + "40";
                      e.currentTarget.style.backgroundColor = colors.paper;
                    }
                  }}
                  onClick={() => fileInputRef?.current?.click()}
                  role='button'
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef?.current?.click();
                    }
                  }}
                >
                  {photoPreview ? (
                    <>
                      <img
                        key={photoPreview}
                        src={photoPreview}
                        alt='Student photo preview'
                        className='absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
                        style={{ zIndex: 1 }}
                        onError={() => handlePhotoError?.()}
                      />
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          removePhoto?.();
                        }}
                        className='absolute top-2 right-2 bg-white/90 text-red-500 rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-md z-30 backdrop-blur-sm'
                        aria-label='Remove photo'
                      >
                        ×
                      </button>
                      <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none z-20 backdrop-blur-[2px]'>
                        <div className="bg-white/20 p-3 rounded-full backdrop-blur-md">
                          <Upload className='w-6 h-6 text-white' />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className='text-center p-4'>
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: colors.accent + "20" }}
                      >
                        <ImageIcon
                          className='w-6 h-6'
                          style={{ color: colors.secondary }}
                        />
                      </div>
                      <span
                        className='text-sm font-medium block mb-1'
                        style={{ color: colors.primary }}
                      >
                        Upload Photo
                      </span>
                      <span
                        className='text-xs block opacity-70'
                        style={{ color: colors.tertiary }}
                      >
                        Click to browse
                      </span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  onChange={handlePhotoUpload}
                  className='hidden'
                  id='photo-upload'
                />
                <p className="text-xs text-center mt-4 max-w-[200px]" style={{ color: colors.tertiary }}>
                  Supported formats: JPG, PNG. Max size: 5MB.
                </p>
                {fieldErrors.photo && (
                  <p className="text-red-500 text-xs text-center mt-2">{fieldErrors.photo}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdmissionInformation;
