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
import {
  mockDepartmentsForEnrollment,
  mockCoursePrograms,
} from "../../data/mockData";
import { EnrollmentPageProps } from "./types";

const AdmissionInformation: React.FC<EnrollmentPageProps> = ({
  formData,
  handleInputChange,
  handleDepartmentChange,
  filteredCoursePrograms,
  photoPreview,
  fileInputRef,
  handlePhotoUpload,
  removePhoto,
  handlePhotoError,
  getTodayDate,
}) => {
  formData.admission_date = getTodayDate?.() || "";
  return (
    <div className='space-y-6'>
      <div
        className='p-6 rounded-xl bg-white border shadow-sm'
        style={{
          borderColor: colors.accent + "40",
          background: `linear-gradient(to bottom, ${colors.paper}, white)`,
        }}
      >
        <div className='flex items-center gap-3 mb-4'>
          <div
            className='p-2 rounded-lg'
            style={{ backgroundColor: colors.accent + "20" }}
          >
            <GraduationCap
              className='w-5 h-5'
              style={{ color: colors.secondary }}
            />
          </div>
          <div>
            <h2 className='text-xl font-bold' style={{ color: colors.primary }}>
              ADMISSION INFORMATION
            </h2>
            <p className='text-xs mt-0.5' style={{ color: colors.tertiary }}>
              Complete your admission details
            </p>
          </div>
        </div>
        <div
          className='flex items-center gap-2 px-3 py-2 rounded-lg mb-6'
          style={{ backgroundColor: colors.accent + "10" }}
        >
          <Calendar className='w-4 h-4' style={{ color: colors.secondary }} />
          <p
            className='text-sm font-medium'
            style={{ color: colors.secondary }}
          >
            {getTodayDate?.() || ""}
          </p>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {/* Left Column */}
          <div className='space-y-4'>
            <div>
              <label
                className='flex items-center gap-2 text-sm font-semibold mb-2'
                style={{ color: colors.primary }}
              >
                <UserCircle
                  className='w-4 h-4'
                  style={{ color: colors.secondary }}
                />
                Admission Status
              </label>
              <select
                value={formData.admission_status}
                onChange={(e) =>
                  handleInputChange("admission_status", e.target.value)
                }
                className='w-full px-4 py-2.5 border rounded-lg custom-focus transition-all duration-200 text-sm bg-white hover:shadow-sm'
                style={{
                  borderColor: colors.tertiary + "60",
                  color: colors.primary,
                }}
              >
                <option value=''>Select Status</option>
                <option value='new'>New Student</option>
                <option value='transferee'>Transferee</option>
                <option value='returning'>Returning Student</option>
              </select>
            </div>

            <div>
              <label
                className='flex items-center gap-2 text-sm font-semibold mb-2'
                style={{ color: colors.primary }}
              >
                <Building2
                  className='w-4 h-4'
                  style={{ color: colors.secondary }}
                />
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) =>
                  handleDepartmentChange?.(Number(e.target.value))
                }
                className='w-full px-4 py-2.5 border rounded-lg custom-focus transition-all duration-200 text-sm bg-white hover:shadow-sm'
                style={{
                  borderColor: colors.tertiary + "60",
                  color: colors.primary,
                }}
              >
                <option value=''>Select Department</option>
                {mockDepartmentsForEnrollment.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className='flex items-center gap-2 text-sm font-semibold mb-2'
                style={{ color: colors.primary }}
              >
                <BookOpen
                  className='w-4 h-4'
                  style={{ color: colors.secondary }}
                />
                Course/Program
              </label>
              <select
                value={formData.course_program}
                onChange={(e) =>
                  handleInputChange("course_program", e.target.value)
                }
                disabled={!formData.department}
                className='w-full px-4 py-2.5 border rounded-lg custom-focus transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:shadow-sm'
                style={{
                  borderColor: colors.tertiary + "60",
                  color: colors.primary,
                }}
              >
                <option value=''>
                  {formData.department
                    ? "Select Course/Program"
                    : "Please select a department first"}
                </option>
                {filteredCoursePrograms?.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className='flex items-center gap-2 text-sm font-semibold mb-3'
                style={{ color: colors.primary }}
              >
                <Calendar
                  className='w-4 h-4'
                  style={{ color: colors.secondary }}
                />
                Term
              </label>
              <div className='flex gap-4'>
                {["First", "Second", "Summer"].map((term) => (
                  <label
                    key={term}
                    className='flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all hover:shadow-sm'
                    style={{
                      borderColor:
                        formData.term === term.toLowerCase()
                          ? colors.secondary
                          : colors.tertiary + "40",
                      backgroundColor:
                        formData.term === term.toLowerCase()
                          ? colors.accent + "15"
                          : "transparent",
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
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className='space-y-4'>
            {/* Photo Section */}
            <div>
              <label
                className='flex items-center gap-2 text-sm font-semibold mb-3'
                style={{ color: colors.primary }}
              >
                <ImageIcon
                  className='w-4 h-4'
                  style={{ color: colors.secondary }}
                />
                Photo
              </label>
              <div
                className='rounded-xl shadow-sm border p-3 flex flex-col items-center'
                style={{
                  borderColor: colors.accent + "40",
                  backgroundColor: colors.paper,
                }}
              >
                <div
                  className={`w-32 h-40 sm:w-36 sm:h-44 border-2 border-dashed rounded-lg relative overflow-hidden cursor-pointer transition-all duration-200 group ${
                    photoPreview
                      ? ""
                      : "flex flex-col items-center justify-center"
                  }`}
                  style={{
                    borderColor: photoPreview
                      ? colors.tertiary + "60"
                      : colors.accent + "60",
                    backgroundColor: photoPreview
                      ? "#ffffff"
                      : colors.accent + "05",
                  }}
                  onMouseEnter={(e) => {
                    if (!photoPreview) {
                      e.currentTarget.style.borderColor =
                        colors.secondary + "80";
                      e.currentTarget.style.backgroundColor =
                        colors.accent + "15";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!photoPreview) {
                      e.currentTarget.style.borderColor = colors.accent + "60";
                      e.currentTarget.style.backgroundColor =
                        colors.accent + "05";
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
                        className='absolute inset-0 w-full h-full object-cover'
                        style={{ zIndex: 1 }}
                        onError={() => handlePhotoError?.()}
                      />
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          removePhoto?.();
                        }}
                        className='absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-sm z-30'
                        aria-label='Remove photo'
                      >
                        ×
                      </button>
                      <div className='absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity duration-200 flex items-center justify-center pointer-events-none z-20'>
                        <Upload className='w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200' />
                      </div>
                    </>
                  ) : (
                    <div className='text-center p-2'>
                      <ImageIcon
                        className='w-6 h-6 mx-auto mb-1 group-hover:scale-110 transition-transform duration-200'
                        style={{ color: "#9CA3AF" }}
                      />
                      <span
                        className='text-xs block'
                        style={{ color: "#6B7280" }}
                      >
                        Click to upload photo
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdmissionInformation;
