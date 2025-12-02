"use client";

import React, { useState, useRef } from "react";

import { GraduationCap, CheckCircle2, X } from "lucide-react";

import { Curriculum, CurriculumCourse } from "../../types";

import { colors } from "../../colors";

import ConfirmationModal from "../common/ConfirmationModal";
import BasicInfoForm from "./BasicInfoForm";
import CourseFormSection from "./CourseFormSection";
import CourseList from "./CourseList";
import {
  parseAcademicYear,
  formatAcademicYear,
  getInitialProgramId,
  getInitialMajorId,
  calculateTotalUnits,
  createCourseFromForm,
  getInitialCourseForm,
  createCurriculumData,
} from "./utils";

interface CurriculumFormProps {
  curriculum: Curriculum | null;

  onSave: (curriculum: Curriculum) => void;

  onCancel: () => void;
}

const CurriculumForm: React.FC<CurriculumFormProps> = ({
  curriculum,

  onSave,

  onCancel,
}) => {
  const currentYear = new Date().getFullYear();

  const parsedYears = curriculum?.effective_year
    ? parseAcademicYear(curriculum.effective_year)
    : { startYear: currentYear, endYear: currentYear + 1 };

  const initialFormData = useRef<Partial<Curriculum>>(
    curriculum || {
      program_name: "",

      program_code: "",

      major: "",

      effective_year: formatAcademicYear(currentYear, currentYear + 1),

      total_units: 0,

      courses: [],

      status: "active",
    }
  );

  const [formData, setFormData] = useState<Partial<Curriculum>>(
    initialFormData.current
  );

  const [selectedProgramId, setSelectedProgramId] = useState<
    number | undefined
  >(getInitialProgramId(curriculum));

  const [selectedMajorId, setSelectedMajorId] = useState<number | undefined>(
    getInitialMajorId(curriculum)
  );

  // Year states for effective year

  const [startYear, setStartYear] = useState<number>(parsedYears.startYear);

  const [endYear, setEndYear] = useState<number>(parsedYears.endYear);

  const [courses, setCourses] = useState<CurriculumCourse[]>(
    curriculum?.courses || []
  );

  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  const [showCancelWarning, setShowCancelWarning] = useState(false);

  const [editingCourseIndex, setEditingCourseIndex] = useState<number | null>(
    null
  );

  const [courseForm, setCourseForm] = useState<
    Partial<CurriculumCourse> & { selectedSubjectId?: number }
  >(getInitialCourseForm());

  const hasChanges = () => {
    if (!curriculum) return false;

    const currentEffectiveYear = formatAcademicYear(startYear, endYear);

    return (
      formData.program_name !== initialFormData.current.program_name ||
      formData.program_code !== initialFormData.current.program_code ||
      formData.major !== initialFormData.current.major ||
      currentEffectiveYear !== initialFormData.current.effective_year ||
      formData.status !== initialFormData.current.status ||
      JSON.stringify(courses) !== JSON.stringify(curriculum.courses)
    );
  };

  const handleSubjectChange = (subjectId: number) => {};

  const handleAddCourse = () => {
    if (courseForm.course_code && courseForm.descriptive_title) {
      const existingCourseId =
        editingCourseIndex !== null
          ? courses[editingCourseIndex]?.id
          : undefined;
      const newCourse = createCourseFromForm(
        courseForm as any,
        existingCourseId
      );

      if (editingCourseIndex !== null) {
        const updated = [...courses];
        updated[editingCourseIndex] = newCourse;
        setCourses(updated);
        setEditingCourseIndex(null);
      } else {
        setCourses([...courses, newCourse]);
      }

      setCourseForm(getInitialCourseForm());
    }
  };

  const handleEditCourse = (index: number) => {
    const course = courses[index];

    setCourseForm({
      ...course,

      selectedSubjectId: course.subject_id,
    });

    setEditingCourseIndex(index);
  };

  const handleDeleteCourse = (index: number) => {
    setCourses(courses.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.program_name && formData.program_code) {
      if (curriculum && hasChanges()) {
        setShowSaveConfirmation(true);
      } else {
        performSave();
      }
    }
  };

  const performSave = () => {
    if (formData.program_name && formData.program_code) {
      const curriculumData = createCurriculumData(
        formData,
        courses,
        startYear,
        endYear,
        curriculum?.id
      );

      onSave(curriculumData);
      setShowSaveConfirmation(false);
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

  return (
    <div
      className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto'
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={handleCancel}
    >
      <div
        className='rounded-2xl shadow-2xl w-full max-w-4xl bg-white my-8 max-h-[90vh] flex flex-col'
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className='px-6 py-4 flex items-center justify-between border-b sticky top-0 bg-white z-10'
          style={{
            backgroundColor: `${colors.primary}08`,

            borderColor: `${colors.primary}15`,
          }}
        >
          <div className='flex items-center gap-3'>
            <div
              className='p-2 rounded-lg'
              style={{ backgroundColor: `${colors.secondary}20` }}
            >
              <GraduationCap
                className='w-5 h-5'
                style={{ color: colors.secondary }}
              />
            </div>

            <div>
              <h2
                className='text-xl font-bold'
                style={{ color: colors.primary }}
              >
                {curriculum ? "Edit Curriculum" : "Add New Curriculum"}
              </h2>

              <p className='text-sm text-gray-500'>
                {curriculum
                  ? "Update curriculum details"
                  : "Create a new curriculum program"}
              </p>
            </div>
          </div>

          <button
            onClick={handleCancel}
            className='p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-6 overflow-y-auto flex-1'>
          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* Basic Information */}
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

            {/* Courses Section */}

            <div className='border-t pt-6'>
              <div className='flex items-center justify-between mb-4'>
                <h3
                  className='text-lg font-semibold'
                  style={{ color: colors.primary }}
                >
                  Courses ({courses.length})
                </h3>

                <div className='text-sm text-gray-600'>
                  Total Units: <strong>{calculateTotalUnits(courses)}</strong>
                </div>
              </div>

              <CourseFormSection
                courseForm={courseForm}
                editingCourseIndex={editingCourseIndex}
                onSubjectChange={handleSubjectChange}
                onUnitsChange={(units) => {
                  setCourseForm({
                    ...courseForm,
                    units_total: units,
                    units_lec: units,
                    units_lab: 0,
                  });
                }}
                onYearLevelChange={(yearLevel) => {
                  setCourseForm({ ...courseForm, year_level: yearLevel });
                }}
                onSemesterChange={(semester) => {
                  setCourseForm({ ...courseForm, semester });
                }}
                onPrerequisiteChange={(prerequisite) => {
                  setCourseForm({ ...courseForm, prerequisite });
                }}
                onAddCourse={handleAddCourse}
                onCancelEdit={() => {
                  setEditingCourseIndex(null);
                  setCourseForm(getInitialCourseForm());
                }}
              />

              <CourseList
                courses={courses}
                onEditCourse={handleEditCourse}
                onDeleteCourse={handleDeleteCourse}
              />
            </div>

            <div
              className='flex justify-end gap-3 pt-6 mt-6 border-t'
              style={{ borderColor: `${colors.primary}10` }}
            >
              <button
                type='button'
                onClick={handleCancel}
                className='px-6 py-2.5 rounded-xl transition-all font-medium flex items-center gap-2 hover:bg-gray-100'
                style={{
                  color: colors.primary,

                  border: "1px solid #E5E7EB",
                }}
              >
                Cancel
              </button>

              <button
                type='submit'
                className='px-6 py-2.5 text-white rounded-xl transition-all font-medium flex items-center gap-2 shadow-lg shadow-blue-900/20'
                style={{ backgroundColor: colors.secondary }}
              >
                <CheckCircle2 className='w-4 h-4' />

                {curriculum ? "Save Changes" : "Create Curriculum"}
              </button>
            </div>
          </form>
        </div>

        {/* Save Confirmation Modal */}

        <ConfirmationModal
          isOpen={showSaveConfirmation}
          onClose={() => setShowSaveConfirmation(false)}
          onConfirm={performSave}
          title='Save Changes'
          message={`Are you sure you want to save changes to "${
            formData.program_name || curriculum?.program_name
          }"?`}
          description='The curriculum information will be updated with the new details.'
          confirmText='Save Changes'
          cancelText='Cancel'
          variant='info'
        />

        {/* Cancel Warning Modal */}

        <ConfirmationModal
          isOpen={showCancelWarning}
          onClose={() => setShowCancelWarning(false)}
          onConfirm={handleConfirmCancel}
          title='Unsaved Changes'
          message='You have unsaved changes. Are you sure you want to leave?'
          description='Your changes will be lost if you continue without saving.'
          confirmText='Leave Without Saving'
          cancelText='Stay and Edit'
          variant='warning'
        />
      </div>
    </div>
  );
};

export default CurriculumForm;
