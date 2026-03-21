import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../[...nextauth]/authOptions";
import { prisma } from "@/app/lib/prisma";

const ROLES = {
  FACULTY: 3,
  DEAN: 5,
} as const;

type EnrollmentPreview = {
  student_number: string | null;
  first_name: string | null;
  middle_name: string | null;
  family_name: string | null;
  email_address: string | null;
};

type DropHistoryRow = {
  student_number: string | null;
  academic_year: string | null;
  semester: number | null;
  curriculum_course_id: number | null;
  status: string | null;
};

function normalizeSemesterToNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = String(value || "")
    .trim()
    .toLowerCase();
  if (!text) return null;
  if (text === "1" || text.includes("first")) return 1;
  if (text === "2" || text.includes("second")) return 2;
  if (text === "3" || text.includes("third") || text.includes("summer"))
    return 3;
  return null;
}

type FacultyRecord = {
  id: number;
  employee_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  department_id: number;
  position: string;
  email: string;
  user_id: number | null;
};

const formatFullName = (
  firstName?: string | null,
  middleName?: string | null,
  lastName?: string | null,
) =>
  [firstName, middleName, lastName]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const compareAcademicYearDesc = (left?: string | null, right?: string | null) =>
  String(right || "").localeCompare(String(left || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || 0;
    const userId = Number((session?.user as any)?.id) || 0;

    if (
      !session ||
      ![ROLES.FACULTY, ROLES.DEAN].includes(userRole) ||
      !Number.isFinite(userId)
    ) {
      return NextResponse.json(
        { error: "Unauthorized. Faculty and dean access only." },
        { status: 403 },
      );
    }

    const viewerFaculty = await prisma.faculty.findFirst({
      where: {
        user_id: userId,
      },
      select: {
        id: true,
        employee_id: true,
        first_name: true,
        middle_name: true,
        last_name: true,
        department_id: true,
        position: true,
        email: true,
        user_id: true,
      },
    });

    if (!viewerFaculty) {
      return NextResponse.json(
        {
          error:
            "No faculty profile linked to this account. Please assign this user to a faculty record.",
        },
        { status: 404 },
      );
    }

    const departmentId =
      viewerFaculty.department_id ||
      Number((session.user as any)?.departmentId) ||
      null;

    if (!departmentId) {
      return NextResponse.json(
        {
          error:
            "No department is linked to this account. Please assign this user to a faculty record with a department.",
        },
        { status: 404 },
      );
    }

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, name: true },
    });

    const facultyWhere =
      userRole === ROLES.DEAN
        ? { department_id: departmentId }
        : { id: viewerFaculty.id };

    const facultyMembers = await prisma.faculty.findMany({
      where: facultyWhere,
      select: {
        id: true,
        employee_id: true,
        first_name: true,
        middle_name: true,
        last_name: true,
        department_id: true,
        position: true,
        email: true,
        user_id: true,
      },
      orderBy: [{ last_name: "asc" }, { first_name: "asc" }],
    });

    const facultyIds = facultyMembers.map((faculty) => faculty.id);

    const scheduleCounts =
      facultyIds.length > 0
        ? await prisma.class_schedule.groupBy({
            by: ["faculty_id", "section_id"],
            where: { faculty_id: { in: facultyIds } },
            _count: { id: true },
          })
        : [];

    const facultySectionRows = scheduleCounts.filter(
      (
        row,
      ): row is {
        faculty_id: number;
        section_id: number;
        _count: { id: number };
      } => Number.isFinite(row.faculty_id),
    );

    const sectionIds = [
      ...new Set(
        facultySectionRows
          .map((row) => row.section_id)
          .filter((id): id is number => Number.isFinite(id)),
      ),
    ];

    const [sections, assignments, facultySchedules] = await Promise.all([
      prisma.sections.findMany({
        where: {
          id: { in: sectionIds },
        },
        select: {
          id: true,
          section_name: true,
          year_level: true,
          academic_year: true,
          semester: true,
          status: true,
          student_count: true,
          max_capacity: true,
        },
        orderBy: [{ academic_year: "desc" }, { section_name: "asc" }],
      }),
      prisma.student_section.findMany({
        where: {
          section_id: { in: sectionIds },
        },
        select: {
          id: true,
          section_id: true,
          student_number: true,
          academic_year: true,
          semester: true,
          assignment_type: true,
        },
        orderBy: [{ section_id: "asc" }, { student_number: "asc" }],
      }),
      prisma.class_schedule.findMany({
        where: {
          faculty_id: { in: facultyIds },
          section_id: { in: sectionIds },
        },
        select: {
          id: true,
          faculty_id: true,
          section_id: true,
          curriculum_course_id: true,
        },
      }),
    ]);

    const studentNumbers = [
      ...new Set(
        assignments.map((item) => item.student_number).filter(Boolean),
      ),
    ];
    const assignmentIds = assignments.map((item) => item.id);

    const enrollmentRows =
      studentNumbers.length > 0
        ? await prisma.enrollment.findMany({
            where: {
              student_number: { in: studentNumbers },
            },
            select: {
              student_number: true,
              first_name: true,
              middle_name: true,
              family_name: true,
              email_address: true,
            },
            orderBy: [{ id: "desc" }],
          })
        : [];

    const enrollmentByStudent = new Map<string, EnrollmentPreview>();
    for (const row of enrollmentRows) {
      const key = row.student_number || "";
      if (!key || enrollmentByStudent.has(key)) {
        continue;
      }
      enrollmentByStudent.set(key, row);
    }

    const curriculumBySection = new Map<number, Set<number>>();
    for (const schedule of facultySchedules) {
      if (
        !Number.isFinite(schedule.section_id) ||
        !Number.isFinite(schedule.curriculum_course_id)
      ) {
        continue;
      }
      const sectionSet =
        curriculumBySection.get(schedule.section_id) || new Set<number>();
      sectionSet.add(Number(schedule.curriculum_course_id));
      curriculumBySection.set(schedule.section_id, sectionSet);
    }

    const allCurriculumCourseIds = [
      ...new Set(
        facultySchedules
          .map((row) => Number(row.curriculum_course_id))
          .filter((id) => Number.isFinite(id)),
      ),
    ];
    const scheduleIds = [
      ...new Set(
        facultySchedules
          .map((row) => Number(row.id))
          .filter((id) => Number.isFinite(id)),
      ),
    ];
    const allAcademicYears = [
      ...new Set(assignments.map((row) => row.academic_year).filter(Boolean)),
    ];

    const [curriculumCourseRows, studentSubjectAssignments] = await Promise.all(
      [
        allCurriculumCourseIds.length > 0
          ? prisma.curriculum_course.findMany({
              where: { id: { in: allCurriculumCourseIds } },
              select: {
                id: true,
                course_code: true,
                descriptive_title: true,
              },
            })
          : [],
        assignmentIds.length > 0 && scheduleIds.length > 0
          ? prisma.student_section_subjects.findMany({
              where: {
                student_section_id: { in: assignmentIds },
                class_schedule_id: { in: scheduleIds },
              },
              select: {
                student_section_id: true,
                class_schedule_id: true,
              },
            })
          : [],
      ],
    );

    const curriculumCourseMap = new Map<
      number,
      {
        id: number;
        course_code: string | null;
        descriptive_title: string;
      }
    >();
    for (const row of curriculumCourseRows) {
      curriculumCourseMap.set(row.id, row);
    }
    const scheduleKeyById = new Map<number, string>();
    const scheduleSubjectById = new Map<
      number,
      {
        curriculumCourseId: number;
        courseCode: string;
        descriptiveTitle: string;
      }
    >();

    for (const schedule of facultySchedules) {
      const scheduleId = Number(schedule.id);
      const facultyId = Number(schedule.faculty_id);
      const sectionId = Number(schedule.section_id);
      const curriculumCourseId = Number(schedule.curriculum_course_id);

      if (
        !Number.isFinite(scheduleId) ||
        !Number.isFinite(facultyId) ||
        !Number.isFinite(sectionId) ||
        !Number.isFinite(curriculumCourseId)
      ) {
        continue;
      }

      const curriculumCourse = curriculumCourseMap.get(curriculumCourseId);
      scheduleKeyById.set(scheduleId, `${facultyId}|${sectionId}`);
      scheduleSubjectById.set(scheduleId, {
        curriculumCourseId,
        courseCode:
          curriculumCourse?.course_code || `Course ${curriculumCourseId}`,
        descriptiveTitle: curriculumCourse?.descriptive_title || "",
      });
    }

    const studentSubjectsByFacultySection = new Map<
      string,
      Map<
        number,
        Map<
          number,
          {
            curriculumCourseId: number;
            courseCode: string;
            descriptiveTitle: string;
          }
        >
      >
    >();

    for (const row of studentSubjectAssignments) {
      const assignmentId = Number(row.student_section_id);
      const scheduleId = Number(row.class_schedule_id);
      const facultySectionKey = scheduleKeyById.get(scheduleId);
      const subject = scheduleSubjectById.get(scheduleId);

      if (
        !Number.isFinite(assignmentId) ||
        !facultySectionKey ||
        !subject
      ) {
        continue;
      }

      const studentsForFacultySection =
        studentSubjectsByFacultySection.get(facultySectionKey) ||
        new Map<
          number,
          Map<
            number,
            {
              curriculumCourseId: number;
              courseCode: string;
              descriptiveTitle: string;
            }
          >
        >();
      const subjectsForStudent =
        studentsForFacultySection.get(assignmentId) ||
        new Map<
          number,
          {
            curriculumCourseId: number;
            courseCode: string;
            descriptiveTitle: string;
          }
        >();

      subjectsForStudent.set(subject.curriculumCourseId, subject);
      studentsForFacultySection.set(assignmentId, subjectsForStudent);
      studentSubjectsByFacultySection.set(
        facultySectionKey,
        studentsForFacultySection,
      );
    }

    const dropHistoryRows =
      studentNumbers.length > 0 &&
      allCurriculumCourseIds.length > 0 &&
      allAcademicYears.length > 0
        ? await prisma.$queryRaw<DropHistoryRow[]>`
            SELECT
              student_number,
              academic_year,
              semester,
              curriculum_course_id,
              status
            FROM subject_drop_history
            WHERE student_number IN (${Prisma.join(studentNumbers)})
              AND academic_year IN (${Prisma.join(allAcademicYears as string[])})
              AND curriculum_course_id IN (${Prisma.join(allCurriculumCourseIds)})
              AND status IN ('pending_approval', 'dropped')
          `
        : [];

    const dropStatusByStudentTerm = new Map<
      string,
      { pending: number; dropped: number }
    >();

    for (const row of dropHistoryRows) {
      const studentNumber = String(row.student_number || "");
      const academicYear = String(row.academic_year || "");
      const semesterNum = normalizeSemesterToNumber(row.semester);
      const curriculumCourseId = Number(row.curriculum_course_id);
      const normalizedStatus = String(row.status || "").toLowerCase();
      if (
        !studentNumber ||
        !academicYear ||
        !semesterNum ||
        !Number.isFinite(curriculumCourseId)
      ) {
        continue;
      }

      for (const section of sections) {
        if (
          section.academic_year !== academicYear ||
          normalizeSemesterToNumber(section.semester) !== semesterNum
        ) {
          continue;
        }

        const sectionCurricula = curriculumBySection.get(section.id);
        if (!sectionCurricula || !sectionCurricula.has(curriculumCourseId)) {
          continue;
        }

        const key = `${section.id}|${studentNumber}|${academicYear}|${semesterNum}`;
        const bucket = dropStatusByStudentTerm.get(key) || {
          pending: 0,
          dropped: 0,
        };
        if (normalizedStatus === "pending_approval") {
          bucket.pending += 1;
        } else if (normalizedStatus === "dropped") {
          bucket.dropped += 1;
        }
        dropStatusByStudentTerm.set(key, bucket);
      }
    }

    const studentsBySection = new Map<number, any[]>();
    for (const assignment of assignments) {
      const studentEnrollment = enrollmentByStudent.get(
        assignment.student_number,
      );
      const fullName = formatFullName(
        studentEnrollment?.first_name,
        studentEnrollment?.middle_name,
        studentEnrollment?.family_name,
      );

      const semesterNum = normalizeSemesterToNumber(assignment.semester);
      const dropKey = `${assignment.section_id}|${assignment.student_number}|${assignment.academic_year}|${semesterNum || ""}`;
      const dropStats = dropStatusByStudentTerm.get(dropKey);
      const pendingDropCount = dropStats?.pending || 0;
      const droppedCount = dropStats?.dropped || 0;
      const dropStatus =
        pendingDropCount > 0
          ? "pending_drop"
          : droppedCount > 0
            ? "dropped"
            : "active";

      const student = {
        assignmentId: assignment.id,
        studentNumber: assignment.student_number,
        fullName: fullName || assignment.student_number,
        email: studentEnrollment?.email_address || "",
        academicYear: assignment.academic_year,
        semester: assignment.semester,
        assignmentType: assignment.assignment_type || "regular",
        dropStatus,
        pendingDropCount,
        droppedCount,
      };

      const bucket = studentsBySection.get(assignment.section_id) || [];
      bucket.push(student);
      studentsBySection.set(assignment.section_id, bucket);
    }

    const sectionMap = new Map(
      sections.map((section) => [
        section.id,
        {
          id: section.id,
          sectionName: section.section_name,
          yearLevel: section.year_level,
          academicYear: section.academic_year,
          semester: section.semester,
          status: section.status,
          studentCount:
            section.student_count ||
            studentsBySection.get(section.id)?.length ||
            0,
          maxCapacity: section.max_capacity || 0,
        },
      ]),
    );

    const sectionsByFaculty = new Map<number, any[]>();
    for (const row of facultySectionRows) {
      const baseSection = sectionMap.get(row.section_id);
      if (!baseSection) {
        continue;
      }

      const facultySectionKey = `${row.faculty_id}|${row.section_id}`;
      const subjectsByStudent =
        studentSubjectsByFacultySection.get(facultySectionKey);
      const sectionStudents = (studentsBySection.get(row.section_id) || []).map(
        (student) => {
          const assignedSubjects = subjectsByStudent?.get(student.assignmentId);
          const subjects = assignedSubjects
            ? Array.from(assignedSubjects.values()).sort(
                (left, right) =>
                  left.courseCode.localeCompare(right.courseCode, undefined, {
                    numeric: true,
                    sensitivity: "base",
                  }) ||
                  left.descriptiveTitle.localeCompare(
                    right.descriptiveTitle,
                    undefined,
                    {
                      sensitivity: "base",
                    },
                  ),
              )
            : [];

          return {
            ...student,
            subjects,
          };
        },
      );

      const facultySections = sectionsByFaculty.get(row.faculty_id) || [];
      facultySections.push({
        ...baseSection,
        classScheduleCount: row._count.id,
        students: sectionStudents,
      });
      sectionsByFaculty.set(row.faculty_id, facultySections);
    }

    const departmentName = department?.name || "N/A";

    const formattedFaculty = facultyMembers.map((faculty: FacultyRecord) => {
      const sectionsForFaculty = (sectionsByFaculty.get(faculty.id) || []).sort(
        (left, right) =>
          compareAcademicYearDesc(left.academicYear, right.academicYear) ||
          String(left.sectionName || "").localeCompare(
            String(right.sectionName || ""),
            undefined,
            { numeric: true, sensitivity: "base" },
          ),
      );

      const totalStudents = sectionsForFaculty.reduce(
        (acc, section) => acc + section.students.length,
        0,
      );

      return {
        id: faculty.id,
        employeeId: faculty.employee_id,
        fullName: formatFullName(
          faculty.first_name,
          faculty.middle_name,
          faculty.last_name,
        ),
        department: departmentName,
        position: faculty.position || "Faculty",
        email: faculty.email,
        sections: sectionsForFaculty,
        summary: {
          totalSections: sectionsForFaculty.length,
          totalStudents,
        },
      };
    });

    const totalSections = formattedFaculty.reduce(
      (acc, faculty) => acc + faculty.summary.totalSections,
      0,
    );
    const totalStudents = formattedFaculty.reduce(
      (acc, faculty) => acc + faculty.summary.totalStudents,
      0,
    );

    return NextResponse.json({
      success: true,
      data: {
        roleView: userRole === ROLES.DEAN ? "dean" : "faculty",
        viewer: {
          id: viewerFaculty.id,
          employeeId: viewerFaculty.employee_id,
          fullName: formatFullName(
            viewerFaculty.first_name,
            viewerFaculty.middle_name,
            viewerFaculty.last_name,
          ),
          department: departmentName,
          roleLabel: userRole === ROLES.DEAN ? "Dean" : "Faculty",
        },
        department: {
          id: department?.id || departmentId,
          name: departmentName,
        },
        facultyMembers: formattedFaculty,
        summary: {
          totalFaculty: formattedFaculty.length,
          totalSections,
          totalStudents,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching students tab data:", error);
    return NextResponse.json(
      { error: "Failed to fetch students tab data." },
      { status: 500 },
    );
  }
}
