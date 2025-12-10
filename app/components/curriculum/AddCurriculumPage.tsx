"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, CheckCircle2, ArrowLeft } from "lucide-react";
import { Curriculum, CurriculumCourse } from "../../types";
import { colors } from "../../colors";
import BasicInfoForm from "./BasicInfoForm";
import CurriculumStructureTable from "./CurriculumStructureTable";
import SubjectSelectionModal from "./SubjectSelectionModal";
import ConfirmationModal from "../common/ConfirmationModal";
import ErrorModal from "../common/ErrorModal";
import SuccessModal from "../common/SuccessModal";
import {
  parseAcademicYear,
  formatAcademicYear,
  calculateTotalUnits,
  createCurriculumData,
} from "./utils";

interface AddCurriculumPageProps {
  onSave: (curriculum: Curriculum) => Promise<void>;
  onCancel: () => void;
}

const AddCurriculumPage: React.FC<AddCurriculumPageProps> = ({
  onSave,
  onCancel,
}) => {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState<Partial<Curriculum>>({
    program_name: "",
    program_code: "",
    major: "",
    effective_year: formatAcademicYear(currentYear, currentYear + 1),
    total_units: 0,
    courses: [],
    status: "active",
  });

  const [selectedProgramId, setSelectedProgramId] = useState<number | undefined>(
    undefined
  );

  const [selectedMajorId, setSelectedMajorId] = useState<number | undefined>(
    undefined
  );

  const [startYear, setStartYear] = useState<number>(currentYear);
  const [endYear, setEndYear] = useState<number>(currentYear + 1);
  const [courses, setCourses] = useState<CurriculumCourse[]>([]);

  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
    details?: string;
  }>({
    isOpen: false,
    message: "",
    details: "",
  });

  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: "",
  });

  const [subjectModal, setSubjectModal] = useState<{
    isOpen: boolean;
    yearLevel: number;
    semester: 1 | 2;
  }>({
    isOpen: false,
    yearLevel: 1,
    semester: 1,
  });

  const hasChanges = () => {
    return (
      formData.program_name !== "" ||
      formData.program_code !== "" ||
      courses.length > 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting || showSaveConfirmation) {
      return;
    }

    // Validate required fields
    if (!formData.program_name || !formData.program_code) {
      setErrorModal({
        isOpen: true,
        message: "Please fill in all required fields (Program Name and Program Code)",
        details: "Program and Program Code are required to create a curriculum.",
      });
      return;
    }

    // Validate that at least one course is added
    if (!courses || courses.length === 0) {
      setErrorModal({
        isOpen: true,
        message: "No courses added to curriculum",
        details: "Please add at least one course/subject to the curriculum before saving.",
      });
      return;
    }

    setShowSaveConfirmation(true);
  };

  const performSave = async () => {
    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setShowSaveConfirmation(false);
    
    try {
      const curriculumData = createCurriculumData(
        formData,
        courses,
        startYear,
        endYear
      );

      await onSave(curriculumData);
      setSuccessModal({
        isOpen: true,
        message: `Curriculum "${curriculumData.program_name}" has been created successfully.`,
      });

      // Redirect after a short delay
      setTimeout(() => {
        onCancel();
      }, 2000);
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: `Failed to create curriculum: ${error.message || "Unknown error"}`,
        details: "Please check your input and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges()) {
      setShowCancelWarning(true);
    } else {
      onCancel();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelWarning(false);
    onCancel();
  };

  const handleAddSubjects = (yearLevel: number, semester: 1 | 2) => {
    setSubjectModal({
      isOpen: true,
      yearLevel,
      semester,
    });
  };

  const handleSubjectsSelected = (selectedSubjects: any[], yearLevel: number, semester: 1 | 2) => {
    // Create courses from selected subjects
    const newCourses: CurriculumCourse[] = selectedSubjects.map((subject) => {
      // Check for duplicates
      const isDuplicate = courses.some(
        (c) =>
          c.subject_id === subject.id &&
          c.year_level === yearLevel &&
          c.semester === semester
      );

      if (isDuplicate) {
        return null;
      }

      return {
        id: Date.now() + Math.random(),
        subject_id: subject.id,
        course_code: subject.code,
        descriptive_title: subject.name,
        units_lec: subject.units_lec || 0,
        units_lab: subject.units_lab || 0,
        units_total: (subject.units_lec || 0) + (subject.units_lab || 0),
        prerequisite: "",
        year_level: yearLevel,
        semester: semester,
      };
    }).filter((course): course is CurriculumCourse => course !== null);

    setCourses([...courses, ...newCourses]);
    setSubjectModal({ isOpen: false, yearLevel: 1, semester: 1 });
  };

  const handleRemoveCourse = (courseId: number) => {
    setCourses(courses.filter((c) => c.id !== courseId));
  };

  const totalUnits = calculateTotalUnits(courses);

  return (
    <div
      className="min-h-screen p-6 font-sans"
      style={{ backgroundColor: colors.paper, minHeight: "100vh" }}
    >
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleCancel}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${colors.secondary}20` }}
            >
              <GraduationCap
                className="w-6 h-6"
                style={{ color: colors.secondary }}
              />
            </div>
            <div>
              <h1
                className="text-3xl font-bold tracking-tight"
                style={{ color: colors.primary }}
              >
                Add New Curriculum
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Create a new curriculum program with subjects and course structure
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: colors.primary }}
            >
              Basic Information
            </h2>
            <BasicInfoForm
              formData={formData}
              selectedProgramId={selectedProgramId}
              selectedMajorId={selectedMajorId}
              startYear={startYear}
              endYear={endYear}
              currentYear={currentYear}
              onProgramChange={(programId) => {
                setSelectedProgramId(programId);
              }}
              onMajorChange={(majorId) => {
                setSelectedMajorId(majorId);
              }}
              onStartYearChange={(year) => {
                setStartYear(year);
                setEndYear(year + 1);
                const academicYear = formatAcademicYear(year, year + 1);
                setFormData({ ...formData, effective_year: academicYear });
              }}
              onEndYearChange={(year) => {
                setEndYear(year);
                const academicYear = formatAcademicYear(startYear, year);
                setFormData({ ...formData, effective_year: academicYear });
              }}
              onStatusChange={(status) => {
                setFormData({ ...formData, status });
              }}
              onFormDataChange={setFormData}
              onMajorReset={() => {
                setSelectedMajorId(undefined);
                setFormData((prev) => ({ ...prev, major: "" }));
              }}
            />
          </div>

          {/* Curriculum Structure */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-xl font-semibold"
                style={{ color: colors.primary }}
              >
                Curriculum Structure
              </h2>
              <div className="text-sm text-gray-600">
                Total Units: <strong className="text-lg">{totalUnits}</strong>
              </div>
            </div>

            <CurriculumStructureTable
              courses={courses}
              onAddSubjects={handleAddSubjects}
              onRemoveCourse={handleRemoveCourse}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2.5 rounded-xl transition-all font-medium flex items-center gap-2 hover:bg-gray-100"
              style={{
                color: colors.primary,
                border: "1px solid #E5E7EB",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-white rounded-xl transition-all font-medium flex items-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: colors.secondary }}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? "Creating..." : "Create Curriculum"}
            </button>
          </div>
        </form>

        {/* Subject Selection Modal */}
        {subjectModal.isOpen && (
          <SubjectSelectionModal
            isOpen={subjectModal.isOpen}
            onClose={() => setSubjectModal({ isOpen: false, yearLevel: 1, semester: 1 })}
            onSubjectsSelected={handleSubjectsSelected}
            initialYearLevel={subjectModal.yearLevel}
            initialSemester={subjectModal.semester}
            existingCourses={courses}
          />
        )}

        {/* Save Confirmation Modal */}
        <ConfirmationModal
          isOpen={showSaveConfirmation}
          onClose={() => setShowSaveConfirmation(false)}
          onConfirm={performSave}
          title="Create Curriculum"
          message={`Are you sure you want to create "${formData.program_name}"?`}
          description="The curriculum will be saved and available for use."
          confirmText="Create Curriculum"
          cancelText="Cancel"
          variant="info"
        />

        {/* Cancel Warning Modal */}
        <ConfirmationModal
          isOpen={showCancelWarning}
          onClose={() => setShowCancelWarning(false)}
          onConfirm={handleConfirmCancel}
          title="Unsaved Changes"
          message="You have unsaved changes. Are you sure you want to leave?"
          description="Your changes will be lost if you continue without saving."
          confirmText="Leave Without Saving"
          cancelText="Stay and Edit"
          variant="warning"
        />

        {/* Success Modal */}
        <SuccessModal
          isOpen={successModal.isOpen}
          onClose={() => setSuccessModal({ isOpen: false, message: "" })}
          message={successModal.message}
          autoClose={true}
          autoCloseDelay={2000}
        />

        {/* Error Modal */}
        <ErrorModal
          isOpen={errorModal.isOpen}
          onClose={() =>
            setErrorModal({ isOpen: false, message: "", details: "" })
          }
          message={errorModal.message}
          details={errorModal.details}
        />
      </div>
    </div>
  );
};

export default AddCurriculumPage;

