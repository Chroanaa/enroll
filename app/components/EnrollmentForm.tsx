"use client";
import React, { useMemo } from "react";
import { colors } from "../colors";
import { defaultFormStyles } from "../utils/formStyles";
import { useEnrollmentForm } from "../hooks/useEnrollmentForm";
import { PAGE_COMPONENTS, PAGE_TITLES } from "./enrollment/pageComponents";
import { ProgressBar } from "./enrollment/ProgressBar";
import { NavigationButtons } from "./enrollment/NavigationButtons";
import { FormHeader } from "./enrollment/FormHeader";
import { EnrollmentPageProps } from "./enrollment/types";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";

const EnrollmentForm: React.FC = () => {
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
      handleCheckboxChange: form.handleCheckboxChange,
      filteredCoursePrograms: form.filteredCoursePrograms,
      departments: departments?.map((dept) => ({
        id: dept.id,
        name: dept.name,
        code: dept.code || "",
      })),
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
      form.handleCheckboxChange,
      form.filteredCoursePrograms,
      departments,
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

  return (
    <div
      className='p-4 sm:p-6 min-h-screen'
      style={{ backgroundColor: colors.paper }}
    >
      <style>{defaultFormStyles}</style>
      <div className='max-w-7xl mx-auto w-full'>
        <FormHeader />

        <div className='max-w-7xl mx-auto'>
          <div
            className='rounded-2xl shadow-2xl p-6'
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
    </div>
  );
};

export default EnrollmentForm;
