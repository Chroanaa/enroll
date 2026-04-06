import { prisma } from "@/app/lib/prisma";

export type ExternalCrossEnrollmentApprovalLetterData = {
  requestId: number;
  studentNumber: string;
  studentName: string;
  studentEmail: string | null;
  programDisplay: string;
  majorDisplay: string | null;
  yearLevel: number | null;
  externalSchoolName: string;
  subjectCode: string;
  subjectTitle: string;
  unitsTotal: number;
  academicYear: string;
  semester: number;
  approvedAt: Date | null;
  approvedByName: string | null;
};

export async function getExternalCrossEnrollmentApprovalLetterData(
  requestId: number,
): Promise<ExternalCrossEnrollmentApprovalLetterData | null> {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      req.id,
      req.student_number,
      req.external_school_name,
      req.subject_code,
      req.subject_title,
      req.units_total,
      req.academic_year,
      req.semester,
      req.approved_at,
      enr.first_name,
      enr.middle_name,
      enr.family_name,
      enr.email_address,
      enr.course_program,
      enr.major_id,
      enr.year_level,
      prog.code AS program_code,
      prog.name AS program_name,
      maj.code AS major_code,
      maj.name AS major_name,
      approver.firstname AS approver_firstname,
      approver.middlename AS approver_middlename,
      approver.lastname AS approver_lastname
    FROM student_external_cross_enrollment_requests req
    LEFT JOIN LATERAL (
      SELECT e.first_name, e.middle_name, e.family_name, e.email_address, e.course_program, e.major_id, e.year_level
      FROM enrollment e
      WHERE e.student_number = req.student_number
      ORDER BY e.id DESC
      LIMIT 1
    ) enr ON TRUE
    LEFT JOIN program prog
      ON prog.code = enr.course_program
      OR prog.name = enr.course_program
    LEFT JOIN major maj
      ON maj.id = enr.major_id
    LEFT JOIN users approver
      ON approver.id = req.approved_by
    WHERE req.id = ${requestId}
      AND LOWER(req.status) = 'approved'
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  const studentName = [
    row.first_name,
    row.middle_name,
    row.family_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const approvedByName = [
    row.approver_firstname,
    row.approver_middlename,
    row.approver_lastname,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    requestId: Number(row.id),
    studentNumber: String(row.student_number || ""),
    studentName: studentName || String(row.student_number || "Student"),
    studentEmail: row.email_address ? String(row.email_address) : null,
    programDisplay:
      row.program_code && row.program_name
        ? `${row.program_code} - ${row.program_name}`
        : String(row.course_program || "N/A"),
    majorDisplay:
      row.major_code && row.major_name
        ? `${row.major_code} - ${row.major_name}`
        : row.major_name
          ? String(row.major_name)
          : null,
    yearLevel: row.year_level === null || row.year_level === undefined ? null : Number(row.year_level),
    externalSchoolName: String(row.external_school_name || ""),
    subjectCode: String(row.subject_code || ""),
    subjectTitle: String(row.subject_title || ""),
    unitsTotal: Number(row.units_total || 0),
    academicYear: String(row.academic_year || ""),
    semester: Number(row.semester || 0),
    approvedAt: row.approved_at ? new Date(row.approved_at) : null,
    approvedByName: approvedByName || null,
  };
}

export function buildExternalCrossEnrollmentApprovalProgramLabel(
  data: ExternalCrossEnrollmentApprovalLetterData,
) {
  return data.majorDisplay
    ? `${data.programDisplay} / ${data.majorDisplay}`
    : data.programDisplay;
}

export function buildExternalCrossEnrollmentApprovalNarrativeHtml(
  data: ExternalCrossEnrollmentApprovalLetterData,
) {
  const yearLevelText = data.yearLevel ? `Year ${data.yearLevel}` : "current year level";
  const programLabel = buildExternalCrossEnrollmentApprovalProgramLabel(data);
  const unitsLabel = `${data.unitsTotal} unit${data.unitsTotal === 1 ? "" : "s"}`;

  return `This is to formally certify that <strong>${data.studentName}</strong>, bearing student number <strong>${data.studentNumber}</strong>, enrolled in the program <strong>${programLabel}</strong> and currently classified under <strong>${yearLevelText}</strong>, is hereby granted approval to take the subject <strong>${data.subjectCode} - ${data.subjectTitle}</strong> with an equivalent academic load of <strong>${unitsLabel}</strong> through external cross-enrollment at <strong>${data.externalSchoolName}</strong> for <strong>Academic Year ${data.academicYear}, Semester ${data.semester}</strong>. This approval is issued after review of the student's academic requirement, subject availability, and institutional endorsement for the requested arrangement. The student is authorized to present this document to the receiving school as proof that the home institution recognizes and permits the external enrollment of the stated subject, subject to the receiving school's admission, scheduling, and documentation requirements. All academic records, completion evidence, and corresponding grades must be submitted back to the home institution for evaluation, validation, and posting in accordance with school policies and the registrar's procedures.`;
}
