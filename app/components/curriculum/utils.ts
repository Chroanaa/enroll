import { Curriculum, CurriculumCourse } from "../../types";

export const parseAcademicYear = (
  academicYear: string
): { startYear: number; endYear: number } => {
  if (!academicYear) {
    const currentYear = new Date().getFullYear();
    return { startYear: currentYear, endYear: currentYear + 1 };
  }
  const match = academicYear.match(/AY (\d{4})-(\d{4})/);
  if (match) {
    return {
      startYear: parseInt(match[1]),
      endYear: parseInt(match[2]),
    };
  }

  const parts = academicYear.split("-");
  if (parts.length === 2) {
    const start = parseInt(parts[0].replace(/\D/g, ""));
    const end = parseInt(parts[1].replace(/\D/g, ""));
    if (!isNaN(start) && !isNaN(end)) {
      return { startYear: start, endYear: end };
    }
  }
  const currentYear = new Date().getFullYear();
  return { startYear: currentYear, endYear: currentYear + 1 };
};

export const formatAcademicYear = (
  startYear: number,
  endYear: number
): string => {
  return `AY ${startYear}-${endYear}`;
};

export const getInitialProgramId = () => {};

export const getInitialMajorId = () => {};

export const calculateTotalUnits = (courses: CurriculumCourse[]): number => {
  return courses.reduce((total, course) => total + course.units_total, 0);
};

export const createCourseFromForm = (
  courseForm: Partial<CurriculumCourse> & { selectedSubjectId?: number },
  courseId?: number
): CurriculumCourse => {
  return {
    id: courseId || Date.now(),
    subject_id: courseForm.selectedSubjectId,
    course_code: (courseForm.course_code || "").toUpperCase(),
    descriptive_title: courseForm.descriptive_title || "",
    units_lec: courseForm.units_lec || 0,
    units_lab: courseForm.units_lab || 0,
    units_total: courseForm.units_total || 0,
    prerequisite: courseForm.prerequisite || "",
    year_level: courseForm.year_level || 1,
    semester: courseForm.semester || 1,
  };
};

export const getInitialCourseForm = (): Partial<CurriculumCourse> & {
  selectedSubjectId?: number;
} => {
  return {
    selectedSubjectId: undefined,
    course_code: "",
    descriptive_title: "",
    units_lec: 0,
    units_lab: 0,
    units_total: 0,
    prerequisite: "",
    year_level: 1,
    semester: 1,
  };
};

export const createCurriculumData = (
  formData: Partial<Curriculum>,
  courses: CurriculumCourse[],
  startYear: number,
  endYear: number,
  curriculumId?: number
): Curriculum => {
  const totalUnits = calculateTotalUnits(courses);
  const effectiveYear = formatAcademicYear(startYear, endYear);

  return {
    ...formData,
    id: curriculumId || Date.now(),
    program_name: formData.program_name!,
    program_code: formData.program_code!.toUpperCase(),
    major: formData.major || "",
    effective_year: effectiveYear,
    total_units: totalUnits,
    courses: courses,
    status: (formData.status as "active" | "inactive") || "active",
  } as Curriculum;
};
