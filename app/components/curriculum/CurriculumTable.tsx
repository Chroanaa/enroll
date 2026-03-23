"use client";
import React, { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Curriculum, CurriculumCourse, Subject } from "../../types";
import { colors } from "../../colors";
import { parsePrerequisites, formatPrerequisites } from "./utils";
import { getSubjects } from "../../utils/subjectUtils";

interface CurriculumTableProps {
  curriculum: Curriculum;
  onClose: () => void;
}

const CurriculumTable: React.FC<CurriculumTableProps> = ({
  curriculum,
  onClose,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Fetch subjects for displaying prerequisite codes
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const subjectsData = await getSubjects();
        const subjectsArray: Subject[] = Array.isArray(subjectsData)
          ? subjectsData
          : (Object.values(subjectsData) as Subject[]);
        setSubjects(subjectsArray);
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };
    fetchSubjects();
  }, []);

  // Group courses by year level and semester
  const groupedCourses = React.useMemo(() => {
    const grouped: Record<
      number,
      { [key: number]: CurriculumCourse[] }
    > = {};

    curriculum.courses.forEach((course: CurriculumCourse) => {
      if (!grouped[course.year_level]) {
        grouped[course.year_level] = { 1: [], 2: [] };
      }
      grouped[course.year_level][course.semester].push(course);
    });

    return grouped;
  }, [curriculum.courses]);

  // Calculate total units for a semester
  const calculateSemesterUnits = (
    courses: CurriculumCourse[]
  ): number => {
    return courses.reduce((total: number, course: CurriculumCourse) => total + course.units_total, 0);
  };

  // Get aligned courses for both semesters (pad shorter semester with empty rows)
  const getAlignedCourses = (
    semester1: CurriculumCourse[],
    semester2: CurriculumCourse[]
  ): { sem1: (CurriculumCourse | null)[], sem2: (CurriculumCourse | null)[] } => {
    const maxLength = Math.max(semester1.length, semester2.length);
    const aligned1: (CurriculumCourse | null)[] = [...semester1];
    const aligned2: (CurriculumCourse | null)[] = [...semester2];

    // Pad shorter array with null values
    while (aligned1.length < maxLength) {
      aligned1.push(null);
    }
    while (aligned2.length < maxLength) {
      aligned2.push(null);
    }

    return { sem1: aligned1, sem2: aligned2 };
  };

  const yearLabels = ["FIRST YEAR", "SECOND YEAR", "THIRD YEAR", "FOURTH YEAR"];
  // Always display a 4-year structure in the curriculum viewer.
  const yearsToRender = [1, 2, 3, 4];

  return (
    <div
      className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto print:p-0 print:static print:bg-white print:overflow-visible print:block print-container'
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <style type="text/css" media="print">
        {`
          @page { 
            size: 8.5in 13in; 
            margin: 0.25in; 
          }
          @media print {
            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            html, body {
              height: auto !important;
              overflow: visible !important;
              background: white !important;
              visibility: hidden;
            }
            .print-container {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
              visibility: hidden;
              overflow: visible !important;
              background: transparent !important;
              align-items: flex-start !important;
              justify-content: flex-start !important;
            }
            #curriculum-print-area {
              visibility: visible !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: white !important;
              box-shadow: none !important;
            }
            #curriculum-print-area * {
              visibility: visible !important;
            }
            #curriculum-content-area {
              max-height: none !important;
              height: auto !important;
              overflow: visible !important;
            }
            ::-webkit-scrollbar { 
              display: none !important; 
            }
          }
        `}
      </style>
      <div
        id="curriculum-print-area"
        className='rounded-lg shadow-2xl w-full max-w-7xl my-8 print:shadow-none print:my-0 print:w-full print:max-w-none'
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: colors.paper }}
      >
        {/* School Header */}
        <div
          className='border-b-4 px-8 py-6 print:py-1 print:px-4 print:border-b-2 relative'
          style={{ borderColor: colors.primary }}
        >
          <div className='absolute left-8 print:left-4 top-1/2 -translate-y-1/2 print:top-1/2'>
            <img
              src="/logo.png"
              alt="School Logo"
              className='w-32 h-32 print:w-24 print:h-24 object-contain'
              style={{ maxWidth: 'none', height: 'auto' }}
            />
          </div>
          <div className='text-center'>
            <h1
              className='text-2xl font-bold tracking-wide print:text-lg mb-2 print:mb-1'
              style={{ color: colors.primary }}
            >
                  COLEGIO DE STA. TERESA DE AVILA
                </h1>
            <p className='text-xs print:text-[10px]' style={{ color: colors.tertiary }}>
                  Brgy. San B. Zuasola Subd. Brgy. Kalsipayan, Novaliches
                </p>
            <p className='text-xs print:text-[10px]' style={{ color: colors.tertiary }}>
                  Quezon City 1124 Philippines
                </p>
            <p className='text-xs print:text-[10px]' style={{ color: colors.tertiary }}>
                  Tel No.: 8961-4734 / 8961-4735
                </p>
            <p className='text-xs print:text-[10px]' style={{ color: colors.tertiary }}>
                  Email: office@csta.edu.ph
                </p>
          </div>
        </div>

        {/* Program Title */}
        <div
          className='px-8 py-6 border-b-2 relative print:py-1 print:px-4 print:border-b'
          style={{ borderColor: colors.tertiary }}
        >
          <div className='text-center'>
            <h2
              className='text-xl font-bold mb-1 print:text-base'
              style={{ color: colors.primary }}
            >
              {curriculum.program_name.toUpperCase()}
            </h2>
            <p
              className='text-sm font-semibold print:text-xs'
              style={{ color: colors.tertiary }}
            >
              Effective {curriculum.effective_year}
            </p>
            {curriculum.tuition_fee_per_unit != null && (
              <p className='text-xs mt-0.5 print:text-[10px]' style={{ color: colors.secondary }}>
                Tuition: ₱{Number(curriculum.tuition_fee_per_unit).toFixed(2)}/unit
              </p>
            )}
          </div>
          
          {/* Close and Download buttons - Hidden in Print */}
          <div className='absolute top-4 right-4 flex items-center gap-2 print:hidden'>
            <button
              onClick={() => window.print()}
              className='p-2 rounded-lg transition-all'
              style={{
                color: colors.primary,
                backgroundColor: `${colors.primary}10`
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${colors.primary}20`}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = `${colors.primary}10`}
              title='Print/Download'
            >
              <Download className='w-5 h-5' />
            </button>
            <button
              onClick={onClose}
              className='p-2 rounded-full transition-colors'
              style={{
                color: colors.tertiary,
                backgroundColor: `${colors.tertiary}10`
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${colors.tertiary}20`}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = `${colors.tertiary}10`}
            >
              <X className='w-5 h-5' />
            </button>
          </div>
        </div>

        {/* Curriculum Content */}
        <div id="curriculum-content-area" className='p-8 space-y-6 max-h-[70vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-4 print:space-y-4'>
          {yearsToRender.map((year) => {
              const semesters = groupedCourses[year] || { 1: [], 2: [] };
              const { sem1, sem2 } = getAlignedCourses(semesters[1], semesters[2]);

              return (
                <div key={year} className='space-y-4 print:space-y-1'>
                  {/* Year Level Header */}
                  <div 
                    className='text-center py-2 font-bold text-base print:py-1 print:text-sm'
                    style={{
                      backgroundColor: colors.primary,
                      color: colors.paper
                    }}
                  >
                    {yearLabels[year - 1] || `YEAR ${year}`}
                  </div>

                  {/* Side-by-side Semesters */}
                  <div className='grid grid-cols-2 gap-4 print:gap-2'>
                    {/* First Semester */}
                    <div className='space-y-2 print:space-y-1'>
                      <h4
                        className='text-center font-bold text-sm py-1 border-l-4 border-r-4 print:text-[10px] print:py-0.5'
                        style={{
                          backgroundColor: `${colors.secondary}15`,
                          borderColor: colors.secondary,
                          color: colors.primary
                        }}
                      >
                        First Semester
                      </h4>
                      <div className='overflow-x-auto print:overflow-visible'>
                        <table
                          className='w-full border-collapse text-xs print:text-[9px]'
                          style={{
                            borderColor: colors.tertiary
                          }}
                        >
                          <thead>
                            <tr style={{ backgroundColor: `${colors.secondary}20` }}>
                              <th
                                className='border px-2 py-2 text-center font-bold print:px-1 print:py-0.5'
                                rowSpan={2}
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                CODE
                              </th>
                              <th
                                className='border px-2 py-2 text-center font-bold print:px-1 print:py-0.5'
                                rowSpan={2}
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                TITLE
                              </th>
                              <th
                                className='border px-2 py-2 text-center font-bold print:px-1 print:py-0.5'
                                colSpan={2}
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                HOURS
                              </th>
                              <th
                                className='border px-2 py-2 text-center font-bold print:px-1 print:py-0.5'
                                rowSpan={2}
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                UNIT
                              </th>
                              <th
                                className='border px-2 py-2 text-center font-bold print:px-1 print:py-0.5'
                                rowSpan={2}
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                Pre-req
                              </th>
                            </tr>
                            <tr style={{ backgroundColor: `${colors.secondary}20` }}>
                              <th
                                className='border px-2 py-1 text-center font-bold text-xs print:text-[8px] print:px-0.5 print:py-0.5'
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                Lec
                              </th>
                              <th
                                className='border px-2 py-1 text-center font-bold text-xs print:text-[8px] print:px-0.5 print:py-0.5'
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                Lab
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sem1.length === 0 ? (
                              <tr>
                                <td
                                  className='border px-2 py-2 text-center text-[10px] italic print:px-1 print:py-0.5'
                                  colSpan={6}
                                  style={{
                                    borderColor: colors.tertiary,
                                    color: colors.tertiary,
                                  }}
                                >
                                  No subjects listed for this semester
                                </td>
                              </tr>
                            ) : sem1.map((course, index: number) => {
                              if (!course) {
                                // Empty row for alignment
                                return (
                                  <tr key={`empty-1-${index}`}>
                                    <td
                                      className='border px-2 py-2 print:px-1 print:py-0.5'
                                      style={{ borderColor: colors.tertiary }}
                                    >&nbsp;</td>
                                    <td
                                      className='border px-2 py-2 print:px-1 print:py-0.5'
                                      style={{ borderColor: colors.tertiary }}
                                    >&nbsp;</td>
                                    <td
                                      className='border px-2 py-2 text-center print:px-1 print:py-0.5'
                                      style={{ borderColor: colors.tertiary }}
                                    >&nbsp;</td>
                                    <td
                                      className='border px-2 py-2 text-center print:px-1 print:py-0.5'
                                      style={{ borderColor: colors.tertiary }}
                                    >&nbsp;</td>
                                    <td
                                      className='border px-2 py-2 text-center print:px-1 print:py-0.5'
                                      style={{ borderColor: colors.tertiary }}
                                    >&nbsp;</td>
                                    <td
                                      className='border px-2 py-2 text-center print:px-1 print:py-0.5'
                                      style={{ borderColor: colors.tertiary }}
                                    >&nbsp;</td>
                                  </tr>
                                );
                              }
                              return (
                                <tr
                                  key={course.id || index}
                                  style={{ backgroundColor: index % 2 === 0 ? colors.paper : `${colors.accent}08` }}
                                >
                                  <td
                                    className='border px-2 py-2 font-semibold print:px-1 print:py-0.5'
                                    style={{
                                      borderColor: colors.tertiary,
                                      color: colors.primary
                                    }}
                                  >
                                    {course.course_code}
                                  </td>
                                  <td
                                    className='border px-2 py-2 print:px-1 print:py-0.5'
                                    style={{
                                      borderColor: colors.tertiary,
                                      color: colors.primary
                                    }}
                                  >
                                    {course.descriptive_title}
                                  </td>
                                  <td
                                    className='border px-2 py-2 text-center print:px-1 print:py-0.5'
                                    style={{
                                      borderColor: colors.tertiary,
                                      color: colors.primary
                                    }}
                                  >
                                    {course.lecture_hour || 0}
                                  </td>
                                  <td
                                    className='border px-2 py-2 text-center print:px-1 print:py-0.5'
                                    style={{
                                      borderColor: colors.tertiary,
                                      color: colors.primary
                                    }}
                                  >
                                    {course.lab_hour || 0}
                                  </td>
                                  <td
                                    className='border px-2 py-2 text-center font-semibold print:px-1 print:py-0.5'
                                    style={{
                                      borderColor: colors.tertiary,
                                      color: colors.primary
                                    }}
                                  >
                                    {course.units_total}
                                  </td>
                                  
                                  <td
                                    className='border px-2 py-2 text-center print:px-1 print:py-0.5'
                                    style={{
                                      borderColor: colors.tertiary,
                                      color: colors.primary
                                    }}
                                  >
                                    {course.prerequisite
                                      ? formatPrerequisites(
                                          parsePrerequisites(course.prerequisite, curriculum.courses),
                                          curriculum.courses,
                                          subjects
                                        )
                                      : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                            <tr
                              className='font-bold'
                              style={{ backgroundColor: `${colors.secondary}15` }}
                            >
                              <td
                                colSpan={4}
                                className='border px-2 py-2 text-right text-xs print:text-[8px] print:px-1 print:py-0.5'
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                TOTAL
                              </td>
                              <td
                                className='border px-2 py-2 text-center text-xs print:text-[8px] print:px-1 print:py-0.5'
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                {calculateSemesterUnits(semesters[1])}
                              </td>
                              <td
                                className='border px-2 py-2 print:px-1 print:py-0.5'
                                style={{ borderColor: colors.tertiary }}
                              ></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Second Semester */}
                    <div className='space-y-2 print:space-y-1'>
                      <h4
                        className='text-center font-bold text-sm py-1 border-l-4 border-r-4 print:text-[10px] print:py-0.5'
                        style={{
                          backgroundColor: `${colors.secondary}15`,
                          borderColor: colors.secondary,
                          color: colors.primary
                        }}
                      >
                        Second Semester
                      </h4>
                      <div className='overflow-x-auto print:overflow-visible'>
                        <table
                          className='w-full border-collapse text-xs print:text-[9px]'
                          style={{
                            borderColor: colors.tertiary
                          }}
                        >
                          <thead>
                            <tr style={{ backgroundColor: `${colors.secondary}20` }}>
                              <th
                                className='border px-2 py-2 text-center font-bold print:px-1 print:py-0.5'
                                rowSpan={2}
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                CODE
                              </th>
                              <th
                                className='border px-2 py-2 text-center font-bold print:px-1 print:py-0.5'
                                rowSpan={2}
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                TITLE
                              </th>
                              <th
                                className='border px-2 py-2 text-center font-bold print:px-1 print:py-0.5'
                                colSpan={2}
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                HOURS
                              </th>
                              <th
                                className='border px-2 py-2 text-center font-bold print:px-1 print:py-0.5'
                                rowSpan={2}
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                UNIT
                              </th>
                              <th
                                className='border px-2 py-2 text-center font-bold print:px-1 print:py-0.5'
                                rowSpan={2}
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                Pre-req
                              </th>
                            </tr>
                            <tr style={{ backgroundColor: `${colors.secondary}20` }}>
                              <th
                                className='border px-2 py-1 text-center font-bold text-xs print:text-[8px] print:px-0.5 print:py-0.5'
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                Lec
                              </th>
                              <th
                                className='border px-2 py-1 text-center font-bold text-xs print:text-[8px] print:px-0.5 print:py-0.5'
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                Lab
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sem2.length === 0 ? (
                              <tr>
                                <td
                                  className='border px-2 py-2 text-center text-[10px] italic print:px-1 print:py-0.5'
                                  colSpan={6}
                                  style={{
                                    borderColor: colors.tertiary,
                                    color: colors.tertiary,
                                  }}
                                >
                                  No subjects listed for this semester
                                </td>
                              </tr>
                            ) : sem2.map((course, index: number) => {
                              if (!course) {
                                // Empty row for alignment
                                return (
                                  <tr key={`empty-2-${index}`}>
                                    <td
                                      className='border px-2 py-2 print:px-1 print:py-0.5'
                                      style={{ borderColor: colors.tertiary }}
                                    >&nbsp;</td>
                                    <td
                                      className='border px-2 py-2 print:px-1 print:py-0.5'
                                      style={{ borderColor: colors.tertiary }}
                                    >&nbsp;</td>
                                    <td
                                      className='border px-2 py-2 text-center print:px-1 print:py-0.5'
                                      style={{ borderColor: colors.tertiary }}
                                    >&nbsp;</td>
                                    <td
                                      className='border px-2 py-2 text-center print:px-1 print:py-0.5'
                                      style={{ borderColor: colors.tertiary }}
                                    >&nbsp;</td>
                                    <td
                                      className='border px-2 py-2 text-center print:px-1 print:py-0.5'
                                      style={{ borderColor: colors.tertiary }}
                                    >&nbsp;</td>
                                    <td
                                      className='border px-2 py-2 text-center print:px-1 print:py-0.5'
                                      style={{ borderColor: colors.tertiary }}
                                    >&nbsp;</td>
                                  </tr>
                                );
                              }
                              return (
                                <tr
                                  key={course.id || index}
                                  style={{ backgroundColor: index % 2 === 0 ? colors.paper : `${colors.accent}08` }}
                                >
                                  <td
                                    className='border px-2 py-2 font-semibold print:px-1 print:py-0.5'
                                    style={{
                                      borderColor: colors.tertiary,
                                      color: colors.primary
                                    }}
                                  >
                                    {course.course_code}
                                  </td>
                                  <td
                                    className='border px-2 py-2 print:px-1 print:py-0.5'
                                    style={{
                                      borderColor: colors.tertiary,
                                      color: colors.primary
                                    }}
                                  >
                                    {course.descriptive_title}
                                  </td>
                                  <td
                                    className='border px-2 py-2 text-center print:px-1 print:py-0.5'
                                    style={{
                                      borderColor: colors.tertiary,
                                      color: colors.primary
                                    }}
                                  >
                                    {course.lecture_hour || 0}
                                  </td>
                                  <td
                                    className='border px-2 py-2 text-center print:px-1 print:py-0.5'
                                    style={{
                                      borderColor: colors.tertiary,
                                      color: colors.primary
                                    }}
                                  >
                                    {course.lab_hour || 0}
                                  </td>
                                  <td
                                    className='border px-2 py-2 text-center font-semibold print:px-1 print:py-0.5'
                                    style={{
                                      borderColor: colors.tertiary,
                                      color: colors.primary
                                    }}
                                  >
                                    {course.units_total}
                                  </td>
                                
                                  <td
                                    className='border px-2 py-2 text-center print:px-1 print:py-0.5'
                                    style={{
                                      borderColor: colors.tertiary,
                                      color: colors.primary
                                    }}
                                  >
                                    {course.prerequisite
                                      ? formatPrerequisites(
                                          parsePrerequisites(course.prerequisite, curriculum.courses),
                                          curriculum.courses,
                                          subjects
                                        )
                                      : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                            <tr
                              className='font-bold'
                              style={{ backgroundColor: `${colors.secondary}15` }}
                            >
                              <td
                                colSpan={4}
                                className='border px-2 py-2 text-right text-xs print:text-[8px] print:px-1 print:py-0.5'
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                TOTAL
                              </td>
                              <td
                                className='border px-2 py-2 text-center text-xs print:text-[8px] print:px-1 print:py-0.5'
                                style={{
                                  borderColor: colors.tertiary,
                                  color: colors.primary
                                }}
                              >
                                {calculateSemesterUnits(semesters[2])}
                              </td>
                              <td
                                className='border px-2 py-2 print:px-1 print:py-0.5'
                                style={{ borderColor: colors.tertiary }}
                              ></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default CurriculumTable;
