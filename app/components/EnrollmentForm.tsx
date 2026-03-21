"use client";
import React, { useEffect, useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { colors } from "../colors";
import { defaultFormStyles } from "../utils/formStyles";
import { useEnrollmentForm } from "../hooks/useEnrollmentForm";
import { PAGE_COMPONENTS, PAGE_TITLES } from "./enrollment/pageComponents";
import { ProgressBar } from "./enrollment/ProgressBar";
import { NavigationButtons } from "./enrollment/NavigationButtons";
import { FormHeader } from "./enrollment/FormHeader";
import { EnrollmentPageProps } from "./enrollment/types";
import StudentInformationFormPDFViewer from "./enrollment/StudentInformationFormPDFViewer";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";

const EnrollmentForm: React.FC = () => {
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const form = useEnrollmentForm();
  const {
    currentPage,
    progress,
    TOTAL_PAGES,
    handleSubmit,
    nextPage,
    prevPage,
    goToPage,
    isSubmitting,
    submitSuccess,
    submitError,
    setSubmitSuccess,
    setSubmitError,
    fieldErrors,
    validationError,
    setValidationError,
    departments,
    duplicateError,
    isCheckingDuplicate,
  } = form;

  // Memoize common props for all page components
  const pageProps: EnrollmentPageProps = useMemo(
    () => ({
      formData: form.formData,
      handleInputChange: form.handleInputChange,
      handleDepartmentChange: form.handleDepartmentChange,
      handleProgramChange: form.handleProgramChange,
      handleMajorChange: form.handleMajorChange,
      handleCheckboxChange: form.handleCheckboxChange,
      filteredCoursePrograms: form.filteredCoursePrograms,
      departments: departments?.map((dept) => ({
        id: dept.id,
        name: dept.name,
        code: dept.code || "",
      })),
      majors: form.majors?.map((major) => ({
        id: major.id,
        name: major.name,
        code: major.code,
        program_id: major.program_id,
      })),
      selectedProgramHasMajors: form.selectedProgramHasMajors,
      photoPreview: form.photoPreview,
      fileInputRef: form.fileInputRef,
      handlePhotoUpload: form.handlePhotoUpload,
      removePhoto: form.removePhoto,
      handlePhotoError: form.handlePhotoError,
      getTodayDate: form.getTodayDate,
      fieldErrors: fieldErrors,
      duplicateError: duplicateError,
      isCheckingDuplicate: isCheckingDuplicate,
    }),
    [
      form.formData,
      form.handleInputChange,
      form.handleDepartmentChange,
      form.handleProgramChange,
      form.handleMajorChange,
      form.handleCheckboxChange,
      form.filteredCoursePrograms,
      departments,
      form.majors,
      form.selectedProgramHasMajors,
      form.photoPreview,
      form.fileInputRef,
      form.handlePhotoUpload,
      form.removePhoto,
      form.handlePhotoError,
      form.getTodayDate,
      fieldErrors,
      duplicateError,
      isCheckingDuplicate,
    ],
  );

  // Get current page component
  const CurrentPageComponent =
    PAGE_COMPONENTS[currentPage] || PAGE_COMPONENTS[1];
  const savedFormData = form.lastSubmittedData;
  const selectedProgram = form.filteredCoursePrograms.find(
    (program) => String(program.id) === String(savedFormData?.course_program),
  );
  const selectedDepartment = departments?.find(
    (department) => department.id === savedFormData?.department,
  );
  const selectedMajor = form.majors.find(
    (major) => major.id === savedFormData?.major_id,
  );
  const birthPlace = Array.isArray(savedFormData?.birthplace)
    ? savedFormData.birthplace.filter(Boolean).join(", ")
    : "";

  const pdfData = {
    studentNumber: savedFormData?.student_number || "",
    admissionDate: form.getTodayDate(),
    academicYear: savedFormData?.academic_year || "",
    admissionStatus: savedFormData?.admission_status || "",
    term: savedFormData?.term || "",
    requirements: savedFormData?.requirements || [],
    departmentName: selectedDepartment?.name || "",
    programName: selectedProgram?.name || "",
    majorName: selectedMajor?.name || "",
    familyName: savedFormData?.family_name || "",
    firstName: savedFormData?.first_name || "",
    middleName: savedFormData?.middle_name || "",
    sex: savedFormData?.sex || "",
    civilStatus: savedFormData?.civil_status || "",
    birthdate: savedFormData?.birthdate || "",
    birthPlace,
    completeAddress: savedFormData?.complete_address || "",
    contactNumber: savedFormData?.contact_number || "",
    emailAddress: savedFormData?.email_address || "",
    emergencyContactName: savedFormData?.emergency_contact_name || "",
    emergencyRelationship: savedFormData?.emergency_relationship || "",
    emergencyContactNumber: savedFormData?.emergency_contact_number || "",
    lastSchoolAttended: savedFormData?.last_school_attended || "",
    previousSchoolYear: savedFormData?.previous_school_year || "",
    programShs: savedFormData?.program_shs || "",
    remarks: savedFormData?.remarks || "",
    photoUrl: form.lastSubmittedPhotoPreview,
  };

  useEffect(() => {
    if (submitSuccess && form.lastSubmittedData) {
      setShowPDFPreview(true);
    }
  }, [submitSuccess, form.lastSubmittedData]);

  return (
    <div
      className='p-3 sm:p-4 md:p-6 min-h-screen'
      style={{ backgroundColor: colors.paper }}
    >
      <style>{defaultFormStyles}</style>
      <div className='max-w-7xl mx-auto w-full'>
        <FormHeader />

        <div className='max-w-7xl mx-auto'>
          <div
            className='rounded-2xl shadow-2xl p-4 sm:p-5 md:p-6'
            style={{
              backgroundColor: "white",
              border: `1px solid ${colors.accent}30`,
            }}
          >
            <ProgressBar
              currentStep={currentPage}
              totalSteps={TOTAL_PAGES}
              title={PAGE_TITLES[currentPage - 1]}
            />

            <form onSubmit={handleSubmit}>
              <div className='mb-4'>
                <CurrentPageComponent {...pageProps} />
              </div>
              {form.lastSubmittedData && (
                <div className='mb-4 flex justify-end'>
                  <button
                    type='button'
                    onClick={() => setShowPDFPreview(true)}
                    className='inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all'
                    style={{
                      borderColor: colors.secondary,
                      color: colors.secondary,
                      backgroundColor: `${colors.secondary}10`,
                    }}
                  >
                    <FileDown className='h-4 w-4' />
                    Preview / Download Student Info PDF
                  </button>
                </div>
              )}

              <NavigationButtons
                currentPage={currentPage}
                totalPages={TOTAL_PAGES}
                onPrevious={prevPage}
                onNext={nextPage}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                isCheckingDuplicate={isCheckingDuplicate}
                duplicateError={duplicateError}
              />
            </form>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={submitSuccess}
        onClose={() => setSubmitSuccess(false)}
        title='Enrollment Submitted Successfully'
        message='Your enrollment form has been submitted successfully. We will review your application and contact you soon.'
        autoClose={true}
        autoCloseDelay={5000}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={submitError !== null}
        onClose={() => setSubmitError(null)}
        title='Submission Failed'
        message={
          submitError?.message ||
          "An error occurred while submitting your enrollment."
        }
        details={submitError?.details}
      />

      {/* Validation Error Modal */}
      <ErrorModal
        isOpen={validationError.isOpen}
        onClose={() => setValidationError({ isOpen: false, message: "" })}
        title='Validation Error'
        message={validationError.message}
        details='Please review the highlighted fields and correct any errors before proceeding.'
      />

      {showPDFPreview && form.lastSubmittedData && (
        <StudentInformationFormPDFViewer
          data={pdfData}
          onClose={() => setShowPDFPreview(false)}
        />
      )}
    </div>
  );
};

export default EnrollmentForm;
