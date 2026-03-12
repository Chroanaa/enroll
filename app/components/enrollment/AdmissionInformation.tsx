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
import { useAcademicTermContext } from "../../contexts/AcademicTermContext";
import { getAcademicYear } from "../../utils/academicTermUtils";

const AdmissionInformation: React.FC<EnrollmentPageProps> = ({
  formData,
  handleInputChange,
  handleProgramChange,
  handleMajorChange,
  filteredCoursePrograms,
  departments = [],
  majors = [],
  selectedProgramHasMajors = false,
  photoPreview,
  fileInputRef,
  handlePhotoUpload,
  removePhoto,
  handlePhotoError,
  getTodayDate,
  fieldErrors = {},
}) => {
  formData.admission_date = getTodayDate?.() || "";
  
  // Get current academic term from context
  const { currentTerm, storedSettings } = useAcademicTermContext();
  
  // Debug logging
  React.useEffect(() => {
    console.log('[AdmissionInfo] Stored Settings:', storedSettings);
    console.log('[AdmissionInfo] Current Term:', currentTerm);
    console.log('[AdmissionInfo] Form Academic Year:', formData.academic_year);
    console.log('[AdmissionInfo] Form Term:', formData.term);
  }, [storedSettings, currentTerm, formData.academic_year, formData.term]);
  
  // Use academic year and semester from settings if available and form data is empty
  React.useEffect(() => {
    // Wait for stored settings to be loaded
    if (!storedSettings) {
      console.log('[AdmissionInfo] Waiting for stored settings...');
      return;
    }
    
    // Only set if we have stored settings and the form field is empty
    if (storedSettings.academicYear && !formData.academic_year) {
      console.log('[AdmissionInfo] Setting academic year to:', storedSettings.academicYear);
      handleInputChange("academic_year", storedSettings.academicYear);
    } else if (!storedSettings.academicYear && !formData.academic_year) {
      // Fall back to the academic year computed from the current date
      const computed = getAcademicYear(new Date()).academicYear;
      console.log('[AdmissionInfo] No stored academic year, using computed:', computed);
      handleInputChange("academic_year", computed);
    } else {
      console.log('[AdmissionInfo] Not setting academic year. Settings:', storedSettings.academicYear, 'Form:', formData.academic_year);
    }
    
    if (storedSettings.semester && !formData.term) {
      // Normalize semester value to lowercase (Second -> second)
      const normalizedSemester = storedSettings.semester.toLowerCase();
      console.log('[AdmissionInfo] Setting semester to:', normalizedSemester);
      handleInputChange("term", normalizedSemester);
    } else {
      console.log('[AdmissionInfo] Not setting semester. Settings:', storedSettings.semester, 'Form:', formData.term);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedSettings]);

  const inputClasses =
    "w-full px-4 py-2.5 rounded-xl border bg-white/50 transition-all duration-300 focus:ring-2 focus:ring-offset-0 outline-none";

  return (
    <div className='space-y-4 animate-in slide-in-from-bottom-4 duration-500 delay-100'>
      <div
        className='p-6 rounded-2xl bg-white border shadow-lg shadow-gray-100/50'
        style={{
          borderColor: colors.accent + "20",
          background: `linear-gradient(to bottom right, #ffffff, ${colors.paper})`,
        }}
      >
        <div
          className='flex items-center gap-4 mb-6 pb-4 border-b'
          style={{ borderColor: colors.accent + "10" }}
        >
          <div
            className='p-3 rounded-2xl shadow-sm transform transition-transform hover:scale-105 duration-300'
            style={{
              backgroundColor: "white",
              border: `1px solid ${colors.accent}20`,
            }}
          >
            <GraduationCap
              className='w-6 h-6'
              style={{ color: colors.secondary }}
            />
          </div>
          <div>
            <h2
              className='text-2xl font-bold tracking-tight'
              style={{ color: colors.primary }}
            >
              Admission Information
            </h2>
            <p
              className='text-sm mt-1 font-medium'
              style={{ color: colors.tertiary }}
            >
              Complete your admission details
            </p>
          </div>
        </div>

        <div
          className='flex items-center gap-3 px-4 py-2 rounded-xl mb-6 border'
          style={{
            backgroundColor: colors.accent + "05",
            borderColor: colors.accent + "10",
          }}
        >
          <Calendar className='w-5 h-5' style={{ color: colors.secondary }} />
          <span
            className='text-sm font-semibold'
            style={{ color: colors.primary }}
          >
            Date of Admission:
          </span>
          <p className='text-sm font-bold' style={{ color: colors.secondary }}>
            {getTodayDate?.() || ""}
          </p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Left Column - Form Fields */}
          <div className='lg:col-span-2 space-y-4'>
            <div className='group'>
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
              <div className='relative'>
                <select
                  name='admission_status'
                  data-field='admission_status'
                  value={formData.admission_status}
                  onChange={(e) =>
                    handleInputChange("admission_status", e.target.value)
                  }
                  className={`${inputClasses} appearance-none cursor-pointer ${fieldErrors.admission_status ? "border-red-500" : ""}`}
                  style={{
                    borderColor: fieldErrors.admission_status
                      ? "#ef4444"
                      : colors.tertiary + "30",
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor =
                      fieldErrors.admission_status
                        ? "#ef4444"
                        : colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 4px ${fieldErrors.admission_status ? "#ef444410" : colors.secondary + "10"}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      fieldErrors.admission_status
                        ? "#ef4444"
                        : colors.tertiary + "30";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value=''>Select Status</option>
                  <option value='new'>New Student</option>
                  <option value='transferee'>Transferee</option>
                </select>
                <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50'>
                  <svg
                    width='12'
                    height='12'
                    viewBox='0 0 12 12'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M2.5 4.5L6 8L9.5 4.5'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className='group'>
              <label
                className='flex items-center gap-2 text-sm font-semibold mb-2 ml-1'
                style={{ color: colors.primary }}
              >
                <BookOpen
                  className='w-4 h-4'
                  style={{ color: colors.secondary }}
                />
                Program / Major
              </label>
              <div className='relative'>
                <select
                  name='course_program'
                  data-field='course_program'
                  value={formData.course_program}
                  onChange={(e) => {
                    const programId = Number(e.target.value);
                    handleProgramChange?.(programId);
                  }}
                  className={`${inputClasses} appearance-none cursor-pointer ${fieldErrors.course_program ? "border-red-500" : ""}`}
                  style={{
                    borderColor: fieldErrors.course_program
                      ? "#ef4444"
                      : colors.tertiary + "30",
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor =
                      fieldErrors.course_program ? "#ef4444" : colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 4px ${fieldErrors.course_program ? "#ef444410" : colors.secondary + "10"}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      fieldErrors.course_program
                        ? "#ef4444"
                        : colors.tertiary + "30";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value=''>Select Program</option>
                  {filteredCoursePrograms?.map((program) => (
                    <option key={program.id} value={String(program.id)}>
                      {program.name}
                    </option>
                  ))}
                </select>
                <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50'>
                  <svg
                    width='12'
                    height='12'
                    viewBox='0 0 12 12'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M2.5 4.5L6 8L9.5 4.5'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </div>
              </div>
              {fieldErrors.course_program && (
                <p className='text-red-500 text-xs mt-1 ml-1'>
                  {fieldErrors.course_program}
                </p>
              )}
            </div>

            {/* Show majors dropdown if program has majors */}
            {selectedProgramHasMajors && (
              <div className='group'>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2 ml-1'
                  style={{ color: colors.primary }}
                >
                  <Building2
                    className='w-4 h-4'
                    style={{ color: colors.secondary }}
                  />
                  Major
                </label>
                <div className='relative'>
                  <select
                    name='major_id'
                    data-field='major_id'
                    value={formData.major_id}
                    onChange={(e) => {
                      const majorId = Number(e.target.value);
                      handleMajorChange?.(majorId);
                    }}
                    disabled={!formData.course_program || formData.course_program === "0"}
                    className={`${inputClasses} appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${fieldErrors.major_id ? "border-red-500" : ""}`}
                    style={{
                      borderColor: fieldErrors.major_id
                        ? "#ef4444"
                        : colors.tertiary + "30",
                      color: colors.primary,
                    }}
                    onFocus={(e) => {
                      if (!formData.course_program || formData.course_program === "0") return;
                      e.currentTarget.style.borderColor =
                        fieldErrors.major_id ? "#ef4444" : colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 4px ${fieldErrors.major_id ? "#ef444410" : colors.secondary + "10"}`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor =
                        fieldErrors.major_id
                          ? "#ef4444"
                          : colors.tertiary + "30";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <option value=''>
                      {formData.course_program && formData.course_program !== "0"
                        ? "Select Major"
                        : "Please select a program first"}
                    </option>
                    {majors.map((major) => (
                      <option key={major.id} value={major.id}>
                        {major.name} ({major.code})
                      </option>
                    ))}
                  </select>
                  <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50'>
                    <svg
                      width='12'
                      height='12'
                      viewBox='0 0 12 12'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M2.5 4.5L6 8L9.5 4.5'
                        stroke='currentColor'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </div>
                </div>
                {fieldErrors.major_id && (
                  <p className='text-red-500 text-xs mt-1 ml-1'>
                    {fieldErrors.major_id}
                  </p>
                )}
              </div>
            )}

            {/* Show department info if program has no majors */}
            {!selectedProgramHasMajors && formData.course_program && formData.course_program !== "0" && formData.department > 0 && (
              <div className='group'>
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
                <div className='relative'>
                  <select
                    name='department'
                    data-field='department'
                    value={formData.department}
                    disabled
                    className={`${inputClasses} appearance-none cursor-not-allowed opacity-75 bg-gray-50`}
                    style={{
                      borderColor: colors.tertiary + "30",
                      color: colors.primary,
                    }}
                  >
                    {departments
                      .filter((dept) => dept.id === formData.department)
                      .map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                  </select>
                  <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50'>
                    <svg
                      width='12'
                      height='12'
                      viewBox='0 0 12 12'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M2.5 4.5L6 8L9.5 4.5'
                        stroke='currentColor'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </div>
                </div>
                <p className='text-xs text-gray-500 mt-1 ml-1'>
                  Department is automatically set from the selected program
                </p>
              </div>
            )}

            <div className='group'>
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
                        className='absolute inset-0 opacity-10 pointer-events-none'
                        style={{ backgroundColor: colors.secondary }}
                      />
                    )}
                  </label>
                ))}
              </div>
              {fieldErrors.term && (
                <p className='text-red-500 text-xs mt-1 ml-1'>
                  {fieldErrors.term}
                </p>
              )}
            </div>

            {/* Year Level - Only show for transferees */}
            {formData.admission_status === "transferee" && (
              <div className='group'>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2 ml-1'
                  style={{ color: colors.primary }}
                >
                  <GraduationCap
                    className='w-4 h-4'
                    style={{ color: colors.secondary }}
                  />
                  Year Level <span className='text-red-500'>*</span>
                </label>
                <div className='relative'>
                  <select
                    name='year_level'
                    data-field='year_level'
                    value={formData.year_level || 1}
                    onChange={(e) =>
                      handleInputChange("year_level", e.target.value)
                    }
                    className={`${inputClasses} appearance-none cursor-pointer ${fieldErrors.year_level ? "border-red-500" : ""}`}
                    style={{
                      borderColor: fieldErrors.year_level
                        ? "#ef4444"
                        : colors.tertiary + "30",
                      color: colors.primary,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor =
                        fieldErrors.year_level ? "#ef4444" : colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 4px ${fieldErrors.year_level ? "#ef444410" : colors.secondary + "10"}`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor =
                        fieldErrors.year_level
                          ? "#ef4444"
                          : colors.tertiary + "30";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <option value='1'>1st Year</option>
                    <option value='2'>2nd Year</option>
                    <option value='3'>3rd Year</option>
                    <option value='4'>4th Year</option>
                    <option value='5'>5th Year</option>
                  </select>
                  <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50'>
                    <svg
                      width='12'
                      height='12'
                      viewBox='0 0 12 12'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <path
                        d='M2.5 4.5L6 8L9.5 4.5'
                        stroke='currentColor'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </div>
                </div>
                {fieldErrors.year_level && (
                  <p className='text-red-500 text-xs mt-1 ml-1'>
                    {fieldErrors.year_level}
                  </p>
                )}
              </div>
            )}

            <div className='group'>
              <label
                className='flex items-center gap-2 text-sm font-semibold mb-2 ml-1'
                style={{ color: colors.primary }}
              >
                <Calendar
                  className='w-4 h-4'
                  style={{ color: colors.secondary }}
                />
                Academic Year
              </label>
              <div className='relative'>
                <input
                  type='text'
                  name='academic_year'
                  data-field='academic_year'
                  value={formData.academic_year}
                  readOnly
                  className={`${inputClasses} cursor-default select-none`}
                  style={{
                    borderColor: colors.tertiary + "30",
                    color: colors.primary,
                  }}
                />
              </div>
              {fieldErrors.academic_year && (
                <p className='text-red-500 text-xs mt-1 ml-1'>
                  {fieldErrors.academic_year}
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Photo Upload */}
          <div className='lg:col-span-1'>
            <div className='sticky top-6'>
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
                  className={`w-40 h-48 border-2 border-dashed rounded-xl relative overflow-hidden cursor-pointer transition-all duration-300 group ${
                    photoPreview
                      ? "border-transparent shadow-md"
                      : "flex flex-col items-center justify-center hover:border-solid"
                  }`}
                  style={{
                    borderColor: photoPreview
                      ? "transparent"
                      : colors.accent + "40",
                    backgroundColor: photoPreview ? "white" : colors.paper,
                  }}
                  onMouseEnter={(e) => {
                    if (!photoPreview) {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.backgroundColor =
                        colors.accent + "10";
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
                        <div className='bg-white/20 p-3 rounded-full backdrop-blur-md'>
                          <Upload className='w-6 h-6 text-white' />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className='text-center p-4'>
                      <div
                        className='w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-transform duration-300 group-hover:scale-110'
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
                <p
                  className='text-xs text-center mt-4 max-w-[200px]'
                  style={{ color: colors.tertiary }}
                >
                  Supported formats: JPG, PNG. Max size: 5MB.
                </p>
                {fieldErrors.photo && (
                  <p className='text-red-500 text-xs text-center mt-2'>
                    {fieldErrors.photo}
                  </p>
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
