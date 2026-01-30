import { Curriculum, CurriculumCourse } from "../../types";

export const parseAcademicYear = (
  academicYear: string
): number => {
  if (!academicYear) {
    return new Date().getFullYear();
  }

  const match = academicYear.match(/AY (\d{4})/);
  if (match) {
    return parseInt(match[1]);
  }

 
  const yearMatch = academicYear.match(/\d{4}/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    if (!isNaN(year)) {
      return year;
    }
  }
  
  return new Date().getFullYear();
};

export const formatAcademicYear = (
  year: number
): string => {
  return `AY ${year}`;
};

export const getInitialProgramId = () => {};

export const getInitialMajorId = () => {};

export const calculateTotalUnits = (courses: CurriculumCourse[]): number => {
  return courses.reduce((total, course) => total + course.units_total, 0);
};

// Note: Units and hours are stored independently - no automatic calculation
// units_lec and lecture_hour are separate fields
// units_lab and lab_hour are separate fields

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
    lecture_hour: courseForm.lecture_hour || 0,
    lab_hour: courseForm.lab_hour || 0,
    units_lab: courseForm.units_lab || 0,
    units_total: courseForm.units_total || 0,
    prerequisite: courseForm.prerequisite || "",
    year_level: courseForm.year_level || 1,
    semester: courseForm.semester || 1,
    fixedAmount: courseForm.fixedAmount !== undefined && courseForm.fixedAmount !== null 
      ? Number(courseForm.fixedAmount) 
      : undefined,
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
    lecture_hour: 0,
    lab_hour: 0,
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
  effectiveYear: number,
  curriculumId?: number
): Curriculum => {
  const totalUnits = calculateTotalUnits(courses);
  const effectiveYearFormatted = formatAcademicYear(effectiveYear);

  return {
    ...formData,
    id: curriculumId || Date.now(),
    program_name: formData.program_name!,
    program_code: formData.program_code!.toUpperCase(),
    major: formData.major || "",
    effective_year: effectiveYearFormatted,
    total_units: totalUnits,
    courses: courses,
    status: (formData.status as "active" | "inactive") || "active",
  } as Curriculum;
};

// Prerequisite helper functions
export interface PrerequisiteData {
  subjectIds: number[];
  yearLevel?: number;
}

export const formatPrerequisites = (
  data: PrerequisiteData,
  allCourses: CurriculumCourse[],
  allSubjects?: Array<{ id: number; code: string }>
): string => {
  const parts: string[] = [];
  
  if (data.subjectIds.length > 0) {
    const subjectCodes = data.subjectIds
      .map((id) => {
        // First try to find in courses (curriculum courses)
        const course = allCourses.find((c) => c.subject_id === id);
        if (course?.course_code) {
          return course.course_code;
        }
        // Fallback to subjects if provided
        if (allSubjects) {
          const subject = allSubjects.find((s) => s.id === id);
          if (subject?.code) {
            return subject.code;
          }
        }
        return null;
      })
      .filter((code): code is string => !!code);
    parts.push(...subjectCodes);
  }
  
  if (data.yearLevel) {
    parts.push(`Year ${data.yearLevel}`);
  }
  
  return parts.length > 0 ? parts.join(", ") : "";
};

export const parsePrerequisites = (
  prerequisiteString: string | undefined,
  allCourses: CurriculumCourse[]
): PrerequisiteData => {
  if (!prerequisiteString) {
    return { subjectIds: [], yearLevel: undefined };
  }

  try {
    // Try parsing as JSON first
    const parsed = JSON.parse(prerequisiteString);
    return {
      subjectIds: parsed.subjectIds || [],
      yearLevel: parsed.yearLevel,
    };
  } catch {
    // If not JSON, try to parse as simple string format
    const subjectIds: number[] = [];
    let yearLevel: number | undefined = undefined;

    // Extract year level (e.g., "Year 2", "Y2", "2nd Year")
    const yearMatch = prerequisiteString.match(/(?:Year|Y)\s*(\d+)|(\d+)(?:st|nd|rd|th)\s*Year/i);
    if (yearMatch) {
      yearLevel = parseInt(yearMatch[1] || yearMatch[2]);
    }

    // Try to find subject codes in the string
    allCourses.forEach((course) => {
      if (course.course_code && prerequisiteString.includes(course.course_code)) {
        if (course.subject_id) {
          subjectIds.push(course.subject_id);
        }
      }
    });

    return { subjectIds, yearLevel };
  }
};

export const serializePrerequisites = (data: PrerequisiteData): string => {
  return JSON.stringify(data);
};