"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, CheckCircle2, ArrowLeft } from "lucide-react";
import { Curriculum, CurriculumCourse } from "../../types";
import { colors } from "../../colors";
import BasicInfoForm from "./BasicInfoForm";
import CurriculumStructureTable from "./CurriculumStructureTable";
import SubjectSelectionModal from "./SubjectSelectionModal";
import PrerequisiteEditModal from "./PrerequisiteEditModal";
import ConfirmationModal from "../common/ConfirmationModal";
import ErrorModal from "../common/ErrorModal";
import SuccessModal from "../common/SuccessModal";
import {
  parseAcademicYear,
  formatAcademicYear,
  calculateTotalUnits,
  createCurriculumData,
  serializePrerequisites,
  PrerequisiteData,
} from "./utils";

interface EditCurriculumPageProps {
  curriculum: Curriculum;
  onSave: (curriculum: Curriculum) => Promise<void>;
  onCancel: () => void;
}

const EditCurriculumPage: React.FC<EditCurriculumPageProps> = ({
  curriculum,
  onSave,
  onCancel,
}) => {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const effectiveYearValue = curriculum?.effective_year
    ? parseAcademicYear(curriculum.effective_year)
    : currentYear;

  const [formData, setFormData] = useState<Partial<Curriculum>>({
    program_name: curriculum.program_name || "",
    program_code: curriculum.program_code || "",
    major: curriculum.major || "",
    effective_year: curriculum.effective_year || formatAcademicYear(currentYear),
    total_units: curriculum.total_units || 0,
    courses: curriculum.courses || [],
    status: curriculum.status || "active",
  });

  const [selectedProgramId, setSelectedProgramId] = useState<number | undefined>(
    undefined
  );

  const [selectedMajorId, setSelectedMajorId] = useState<number | undefined>(
    undefined
  );

  const [effectiveYear, setEffectiveYear] = useState<number>(effectiveYearValue);
  const [courses, setCourses] = useState<CurriculumCourse[]>(
    curriculum.courses || []
  );

  const initialFormData = useRef<Partial<Curriculum>>({
    program_name: curriculum.program_name || "",
    program_code: curriculum.program_code || "",
    major: curriculum.major || "",
    effective_year: curriculum.effective_year || formatAcademicYear(currentYear),
    total_units: curriculum.total_units || 0,
    courses: curriculum.courses || [],
    status: curriculum.status || "active",
  });

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

  const [prerequisiteModal, setPrerequisiteModal] = useState<{
    isOpen: boolean;
    course: CurriculumCourse | null;
  }>({
    isOpen: false,
    course: null,
  });

  const [addSubjectsConfirmation, setAddSubjectsConfirmation] = useState<{
    isOpen: boolean;
    subjects: any[];
    yearLevel: number;
    semester: 1 | 2;
  }>({
    isOpen: false,
    subjects: [],
    yearLevel: 1,
    semester: 1,
  });

  const hasChanges = () => {
    const currentEffectiveYear = formatAcademicYear(effectiveYear);
    return (
      formData.program_name !== initialFormData.current.program_name ||
      formData.program_code !== initialFormData.current.program_code ||
      formData.major !== initialFormData.current.major ||
      currentEffectiveYear !== initialFormData.current.effective_year ||
      formData.status !== initialFormData.current.status ||
      JSON.stringify(courses) !== JSON.stringify(initialFormData.current.courses)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || showSaveConfirmation) {
      return;
    }

    if (!formData.program_name || !formData.program_code) {
      setErrorModal({
        isOpen: true,
        message: "Please fill in all required fields (Program Name and Program Code)",
        details: "Program and Program Code are required to update a curriculum.",
      });
      return;
    }

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
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setShowSaveConfirmation(false);
    
    try {
      const curriculumData = createCurriculumData(
        formData,
        courses,
        effectiveYear,
        curriculum.id
      );

      await onSave(curriculumData);
      setSuccessModal({
        isOpen: true,
        message: `Curriculum "${curriculumData.program_name}" has been updated successfully.`,
      });

      setTimeout(() => {
        onCancel();
      }, 2000);
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: `Failed to update curriculum: ${error.message || "Unknown error"}`,
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
    // Filter out subjects that are already in the curriculum
    const newSubjects = selectedSubjects.filter((subject) => {
      return !courses.some((c) => c.subject_id === subject.id);
    });

    if (newSubjects.length === 0) {
      setErrorModal({
        isOpen: true,
        message: "No new subjects to add",
        details: "All selected subjects are already in the curriculum.",
      });
      setSubjectModal({ isOpen: false, yearLevel: 1, semester: 1 });
      return;
    }

    // Show confirmation modal instead of adding directly
    setAddSubjectsConfirmation({
      isOpen: true,
      subjects: newSubjects,
      yearLevel,
      semester,
    });
    setSubjectModal({ isOpen: false, yearLevel: 1, semester: 1 });
  };

  const handleConfirmAddSubjects = () => {
    const { subjects, yearLevel, semester } = addSubjectsConfirmation;
    
    const newCourses: CurriculumCourse[] = subjects.map((subject) => {
      return {
        id: Date.now() + Math.random(),
        subject_id: subject.id,
        course_code: subject.code,
        descriptive_title: subject.name,
        units_lec: subject.units_lec || 0,
        lecture_hour: subject.lecture_hour || 0,
        lab_hour: subject.lab_hour || 0,
        units_lab: subject.units_lab || 0,
        units_total: (subject.units_lec || 0) + (subject.units_lab || 0),
        prerequisite: "",
        year_level: yearLevel,
        semester: semester,
      };
    });

    setCourses([...courses, ...newCourses]);
    setAddSubjectsConfirmation({ isOpen: false, subjects: [], yearLevel: 1, semester: 1 });
    
    // Show success modal
    setSuccessModal({
      isOpen: true,
      message: `${subjects.length} subject(s) have been successfully added to Year ${yearLevel} - Semester ${semester}.`,
    });
  };

  const handleRemoveCourse = (courseId: number) => {
    setCourses(courses.filter((c) => c.id !== courseId));
  };

  const handleEditPrerequisite = (course: CurriculumCourse) => {
    setPrerequisiteModal({
      isOpen: true,
      course,
    });
  };

  const handleSavePrerequisite = (prerequisiteData: PrerequisiteData) => {
    if (!prerequisiteModal.course) return;

    const prerequisiteString = serializePrerequisites(prerequisiteData);
    const updatedCourses = courses.map((c) =>
      c.id === prerequisiteModal.course!.id
        ? { ...c, prerequisite: prerequisiteString }
        : c
    );

    setCourses(updatedCourses);
    setPrerequisiteModal({ isOpen: false, course: null });
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
                Edit Curriculum
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Update curriculum program with subjects and course structure
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
              effectiveYear={effectiveYear}
              currentYear={currentYear}
              onProgramChange={(programId) => {
                setSelectedProgramId(programId);
              }}
              onMajorChange={(majorId) => {
                setSelectedMajorId(majorId);
              }}
              onEffectiveYearChange={(year) => {
                setEffectiveYear(year);
                const academicYear = formatAcademicYear(year);
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
              onEditPrerequisite={handleEditPrerequisite}
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
              {isSubmitting ? "Updating..." : "Update Curriculum"}
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

        {/* Prerequisite Edit Modal */}
        {prerequisiteModal.isOpen && prerequisiteModal.course && (
          <PrerequisiteEditModal
            isOpen={prerequisiteModal.isOpen}
            onClose={() => setPrerequisiteModal({ isOpen: false, course: null })}
            onSave={handleSavePrerequisite}
            course={prerequisiteModal.course}
            allCourses={courses}
          />
        )}

        {/* Save Confirmation Modal */}
        <ConfirmationModal
          isOpen={showSaveConfirmation}
          onClose={() => setShowSaveConfirmation(false)}
          onConfirm={performSave}
          title="Update Curriculum"
          message={`Are you sure you want to update "${formData.program_name}"?`}
          description="The curriculum will be updated with the new information."
          confirmText="Update Curriculum"
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

        {/* Add Subjects Confirmation Modal */}
        <ConfirmationModal
          isOpen={addSubjectsConfirmation.isOpen}
          onClose={() =>
            setAddSubjectsConfirmation({ isOpen: false, subjects: [], yearLevel: 1, semester: 1 })
          }
          onConfirm={handleConfirmAddSubjects}
          title="Add Subjects to Curriculum"
          message={
            addSubjectsConfirmation.subjects.length > 0
              ? (() => {
                  const subjectCount = addSubjectsConfirmation.subjects.length;
                  const yearLevel = addSubjectsConfirmation.yearLevel;
                  const semester = addSubjectsConfirmation.semester;
                  
                  // Build highlighted subject list
                  const maxShow = 10;
                  const subjectsToShow = addSubjectsConfirmation.subjects.slice(0, maxShow);
                  const remaining = subjectCount - maxShow;
                  
                  const subjectList = subjectsToShow
                    .map((s) => `• ${s.code} - ${s.name}`)
                    .join("\n");
                  
                  const moreText = remaining > 0 ? `\n... and ${remaining} more subject(s)` : "";
                  
                  return `Add ${subjectCount} subject(s) to Year ${yearLevel} - Semester ${semester}?\n\n${subjectList}${moreText}`;
                })()
              : `Add subjects to Year ${addSubjectsConfirmation.yearLevel} - Semester ${addSubjectsConfirmation.semester}?`
          }
          description={`The selected subjects will be added to the curriculum structure.`}
          confirmText="Add Subjects"
          cancelText="Cancel"
          variant="info"
        />
      </div>
    </div>
  );
};

export default EditCurriculumPage;

