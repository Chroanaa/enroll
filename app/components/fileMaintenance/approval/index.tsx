"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw, Search } from "lucide-react";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SuccessModal from "../../common/SuccessModal";
import ErrorModal from "../../common/ErrorModal";

interface SubjectOverloadApproval {
  studentNumber: string;
  studentName: string;
  firstName?: string;
  lastName?: string;
  academicYear: string;
  semester: number;
  subjectCount: number;
  totalUnits: number;
  status: string;
  subjects?: ApprovalSubjectItem[];
}

interface SubjectDropApproval {
  id: string | number;
  studentNumber: string;
  studentName: string;
  firstName?: string;
  lastName?: string;
  academicYear: string;
  semester: number;
  courseCode: string;
  descriptiveTitle: string;
  status: string;
  requestedAt?: string | null;
  reason?: string | null;
  isStudentDrop?: boolean;
  subjectCount?: number;
  subjects?: ApprovalSubjectItem[];
}

interface CrossEnrollmentApproval {
  id: number;
  studentNumber: string;
  studentName: string;
  firstName?: string;
  lastName?: string;
  academicYear: string;
  semester: number;
  courseCode: string;
  descriptiveTitle: string;
  homeProgramCode?: string | null;
  homeProgramName?: string | null;
  hostProgramCode?: string | null;
  hostProgramName?: string | null;
  status: string;
  requestedAt?: string | null;
  reason?: string | null;
  unitsTotal?: number | null;
  subjects?: ApprovalSubjectItem[];
}

interface ApprovalSubjectItem {
  courseCode?: string | null;
  descriptiveTitle?: string | null;
  unitsTotal?: number | null;
  course_code?: string | null;
  descriptive_title?: string | null;
  units_total?: number | null;
}

interface ApprovalResponse {
  success: boolean;
  data?: {
    subjectOverloads: SubjectOverloadApproval[];
    subjectDrops: SubjectDropApproval[];
    crossEnrollmentRequests: CrossEnrollmentApproval[];
    shiftingRequests: SectionShiftApproval[];
    programShiftRequests: ProgramShiftApproval[];
    petitionSubjectRequests: PetitionSubjectApproval[];
  };
  error?: string;
}

interface SectionShiftApproval {
  id: number;
  studentNumber: string;
  studentName: string;
  firstName?: string;
  lastName?: string;
  academicYear: string;
  semester: string;
  fromSectionId: number;
  toSectionId: number;
  fromSectionName?: string | null;
  toSectionName?: string | null;
  status: string;
  requestedAt?: string | null;
  requestedBy?: number | null;
  requestedByRole?: number | null;
  requestedByName?: string | null;
  approvedBy?: number | null;
  approvedByRole?: number | null;
  approvedByName?: string | null;
  executedBy?: number | null;
  executedByRole?: number | null;
  executedByName?: string | null;
  approvedAt?: string | null;
  executedAt?: string | null;
  reason?: string | null;
}

interface ProgramShiftApproval {
  id: number;
  studentNumber: string;
  studentName: string;
  firstName?: string;
  lastName?: string;
  academicYear: string;
  semester: number;
  fromProgramCode?: string | null;
  fromProgramName?: string | null;
  fromMajorName?: string | null;
  toProgramCode?: string | null;
  toProgramName?: string | null;
  toMajorName?: string | null;
  status: string;
  requestedAt?: string | null;
  requestedByName?: string | null;
  reason?: string | null;
}

interface PetitionSubjectApproval {
  id: number;
  studentNumber: string;
  studentName: string;
  firstName?: string;
  lastName?: string;
  academicYear: string;
  semester: number;
  curriculumCourseId: number;
  subjectId?: number | null;
  requestedSubjectSemester?: number | null;
  requestedSubjectYearLevel?: number | null;
  courseCode: string;
  descriptiveTitle: string;
  unitsTotal?: number | null;
  petitionType?: string | null;
  status: string;
  requestedAt?: string | null;
  approvedAt?: string | null;
  reason?: string | null;
  subjects?: ApprovalSubjectItem[];
}

interface PetitionApprovalGroup {
  key: string;
  courseCode: string;
  descriptiveTitle: string;
  academicYear: string;
  semester: number;
  petitionType: string | null | undefined;
  unitsTotal: number | null | undefined;
  students: PetitionSubjectApproval[];
}

type PetitionConflictInfo = {
  message: string;
  lines: string[];
};

type ApprovalFilter =
  | "all"
  | "overload"
  | "drop"
  | "cross"
  | "shift"
  | "program-shift"
  | "petition";

type ApprovalRow = {
  key: string;
  type:
    | "overload"
    | "drop"
    | "student-drop"
    | "cross"
    | "shift"
    | "program-shift"
    | "petition";
  approvalId: string | number;
  studentNumber: string;
  studentName: string;
  firstName?: string;
  lastName?: string;
  academicYear: string;
  semester: number;
  detailsPrimary: string;
  detailsSecondary: string;
  termLabel: string;
  statusLabel: string;
  reason?: string | null;
  subjects?: ApprovalSubjectItem[];
  contextLine?: string;
};

type ConfirmationAction = "approve" | "reject";

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  border: `1px solid ${colors.neutralBorder}`,
  boxShadow: `0 10px 24px ${colors.neutralBorder}55`,
};

export default function ApprovalManagement() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<ApprovalFilter>("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    message: "",
  });
  const [confirmation, setConfirmation] = useState<ApprovalRow | null>(null);
  const [confirmationAction, setConfirmationAction] =
    useState<ConfirmationAction>("approve");
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
    details: "",
  });
  const [subjectOverloads, setSubjectOverloads] = useState<
    SubjectOverloadApproval[]
  >([]);
  const [subjectDrops, setSubjectDrops] = useState<SubjectDropApproval[]>([]);
  const [crossEnrollmentRequests, setCrossEnrollmentRequests] = useState<
    CrossEnrollmentApproval[]
  >([]);
  const [shiftingRequests, setShiftingRequests] = useState<SectionShiftApproval[]>([]);
  const [programShiftRequests, setProgramShiftRequests] = useState<ProgramShiftApproval[]>([]);
  const [petitionSubjectRequests, setPetitionSubjectRequests] = useState<
    PetitionSubjectApproval[]
  >([]);
  const [expandedPetitionGroups, setExpandedPetitionGroups] = useState<
    Record<string, boolean>
  >({});
  const [petitionConflictByRequestId, setPetitionConflictByRequestId] =
    useState<Record<number, PetitionConflictInfo>>({});

  const extractConflictLines = (
    details: any,
    fallbackCourseCode: string,
  ): string[] => {
    if (!Array.isArray(details?.conflicts)) return [];
    return details.conflicts.slice(0, 6).map((item: any) => {
      const candidate = `${item?.candidateCourseCode || fallbackCourseCode} ${item?.candidateDay || ""} ${item?.candidateStart || ""}-${item?.candidateEnd || ""}`
        .replace(/\s+/g, " ")
        .trim();
      const existing = `${item?.studentCourseCode || "existing"} ${item?.studentDay || ""} ${item?.studentStart || ""}-${item?.studentEnd || ""}`
        .replace(/\s+/g, " ")
        .trim();
      return `${candidate} vs ${existing}`;
    });
  };

  const fetchApprovals = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/approvals");
      const result: ApprovalResponse = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || "Failed to load approvals.");
      }

      setSubjectOverloads(result.data.subjectOverloads || []);
      setSubjectDrops(result.data.subjectDrops || []);
      setCrossEnrollmentRequests(result.data.crossEnrollmentRequests || []);
      setShiftingRequests(result.data.shiftingRequests || []);
      setProgramShiftRequests(result.data.programShiftRequests || []);
      setPetitionSubjectRequests(result.data.petitionSubjectRequests || []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load approvals.",
      );
      setSubjectOverloads([]);
      setSubjectDrops([]);
      setCrossEnrollmentRequests([]);
      setShiftingRequests([]);
      setProgramShiftRequests([]);
      setPetitionSubjectRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  useEffect(() => {
    const activeIds = new Set(
      petitionSubjectRequests
        .map((item) => Number(item.id))
        .filter((value) => Number.isFinite(value)),
    );
    setPetitionConflictByRequestId((prev) => {
      const next: Record<number, PetitionConflictInfo> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const id = Number(key);
        if (activeIds.has(id)) {
          next[id] = value;
        }
      });
      return next;
    });
  }, [petitionSubjectRequests]);

  const totalPendingItems = useMemo(
    () =>
      subjectOverloads.length +
      subjectDrops.length +
      crossEnrollmentRequests.length +
      shiftingRequests.length +
      programShiftRequests.length +
      petitionSubjectRequests.length,
    [
      crossEnrollmentRequests.length,
      programShiftRequests.length,
      shiftingRequests.length,
      subjectDrops.length,
      subjectOverloads.length,
      petitionSubjectRequests.length,
    ],
  );

  const approvalRows = useMemo<ApprovalRow[]>(() => {
    const overloadRows = subjectOverloads.map<ApprovalRow>((item) => ({
      key: `overload-${item.studentNumber}-${item.academicYear}-${item.semester}`,
      type: "overload",
      approvalId: `${item.studentNumber}-${item.academicYear}-${item.semester}`,
      studentNumber: item.studentNumber,
      studentName: item.studentName,
      firstName: item.firstName,
      lastName: item.lastName,
      academicYear: item.academicYear,
      semester: item.semester,
      detailsPrimary: "Subject Addition Beyond 27 Units",
      detailsSecondary: `${item.subjectCount} subjects • ${item.totalUnits} total units`,
      termLabel: `A.Y. ${item.academicYear} • Sem ${item.semester}`,
      statusLabel: "Pending",
      reason: null,
      subjects: item.subjects || [],
    }));

    const dropRows = subjectDrops.map<ApprovalRow>((item) => ({
      key: `${item.isStudentDrop ? "student-drop" : "drop"}-${item.id}`,
      type: item.isStudentDrop ? "student-drop" : "drop",
      approvalId: item.id,
      studentNumber: item.studentNumber,
      studentName: item.studentName,
      firstName: item.firstName,
      lastName: item.lastName,
      academicYear: item.academicYear,
      semester: item.semester,
      detailsPrimary: item.isStudentDrop
        ? "Student Drop Request"
        : item.courseCode,
      detailsSecondary: item.isStudentDrop
        ? `${item.subjectCount || item.subjects?.length || 0} subjects queued for dropping`
        : item.descriptiveTitle,
      termLabel: `A.Y. ${item.academicYear} • Sem ${item.semester}`,
      statusLabel: "Pending Approval",
      reason: item.reason,
      subjects: item.subjects || [],
    }));

    const crossRows = crossEnrollmentRequests.map<ApprovalRow>((item) => ({
      key: `cross-${item.id}`,
      type: "cross",
      approvalId: item.id,
      studentNumber: item.studentNumber,
      studentName: item.studentName,
      firstName: item.firstName,
      lastName: item.lastName,
      academicYear: item.academicYear,
      semester: item.semester,
      detailsPrimary: item.courseCode,
      detailsSecondary: item.descriptiveTitle,
      termLabel: `A.Y. ${item.academicYear} • Sem ${item.semester}`,
      statusLabel: "Pending Approval",
      reason: item.reason,
      subjects: item.subjects || [],
      contextLine: `Home ${item.homeProgramCode || item.homeProgramName || "N/A"} • Host ${item.hostProgramCode || item.hostProgramName || "N/A"}`,
    }));

    const shiftRows = shiftingRequests.map<ApprovalRow>((item) => ({
      key: `shift-${item.id}`,
      type: "shift",
      approvalId: item.id,
      studentNumber: item.studentNumber,
      studentName: item.studentName,
      firstName: item.firstName,
      lastName: item.lastName,
      academicYear: item.academicYear,
      semester: Number(item.semester === "first" ? 1 : item.semester === "second" ? 2 : 3),
      detailsPrimary: `${item.fromSectionName || `Section #${item.fromSectionId}`} -> ${item.toSectionName || `Section #${item.toSectionId}`}`,
      detailsSecondary: `Requested by ${item.requestedByName || "Registrar/Staff"}`,
      termLabel: `A.Y. ${item.academicYear} | ${item.semester}`,
      statusLabel: "Pending Approval",
      reason: item.reason,
      subjects: [],
    }));

    const programShiftRows = programShiftRequests.map<ApprovalRow>((item) => ({
      key: `program-shift-${item.id}`,
      type: "program-shift",
      approvalId: item.id,
      studentNumber: item.studentNumber,
      studentName: item.studentName,
      firstName: item.firstName,
      lastName: item.lastName,
      academicYear: item.academicYear,
      semester: item.semester,
      detailsPrimary: `${item.fromProgramCode || item.fromProgramName || "N/A"} -> ${item.toProgramCode || item.toProgramName || "N/A"}`,
      detailsSecondary: `Requested by ${item.requestedByName || "Registrar/Staff"}`,
      termLabel: `A.Y. ${item.academicYear} • Sem ${item.semester}`,
      statusLabel: "Pending Approval",
      reason: item.reason,
      subjects: [],
      contextLine: `From major: ${item.fromMajorName || "None"} • To major: ${item.toMajorName || "None"}`,
    }));

    const petitionRows = petitionSubjectRequests.map<ApprovalRow>((item) => ({
      key: `petition-${item.id}`,
      type: "petition",
      approvalId: item.id,
      studentNumber: item.studentNumber,
      studentName: item.studentName,
      firstName: item.firstName,
      lastName: item.lastName,
      academicYear: item.academicYear,
      semester: item.semester,
      detailsPrimary: item.courseCode,
      detailsSecondary: item.descriptiveTitle,
      termLabel: `A.Y. ${item.academicYear} • Sem ${item.semester}`,
      statusLabel: "Pending Approval",
      reason: item.reason,
      subjects: item.subjects || [],
      contextLine:
        item.petitionType === "last_semester"
          ? `Petition type: Last semester subject • Units: ${item.unitsTotal || 0}`
          : `Petition type: Currently not open • Units: ${item.unitsTotal || 0}`,
    }));

    return [
      ...overloadRows,
      ...dropRows,
      ...crossRows,
      ...shiftRows,
      ...programShiftRows,
      ...petitionRows,
    ];
  }, [
    crossEnrollmentRequests,
    petitionSubjectRequests,
    programShiftRequests,
    shiftingRequests,
    subjectDrops,
    subjectOverloads,
  ]);

  const filteredRows = useMemo(() => {
    let rows = approvalRows;

    if (filter === "overload") {
      rows = rows.filter((row) => row.type === "overload");
    } else if (filter === "drop") {
      rows = rows.filter(
        (row) => row.type === "drop" || row.type === "student-drop",
      );
    } else if (filter === "cross") {
      rows = rows.filter((row) => row.type === "cross");
    } else if (filter === "shift") {
      rows = rows.filter((row) => row.type === "shift");
    } else if (filter === "program-shift") {
      rows = rows.filter((row) => row.type === "program-shift");
    } else if (filter === "petition") {
      rows = rows.filter((row) => row.type === "petition");
    }

    const searchValue = studentSearch.trim().toLowerCase();
    if (searchValue) {
      rows = rows.filter((row) => {
        const studentName = String(row.studentName || "").toLowerCase();
        const studentNumber = String(row.studentNumber || "").toLowerCase();
        return (
          studentName.includes(searchValue) ||
          studentNumber.includes(searchValue)
        );
      });
    }

    return rows;
  }, [approvalRows, filter, studentSearch]);

  const petitionGroupedRows = useMemo(() => {
    const searchValue = studentSearch.trim().toLowerCase();
    const grouped = new Map<string, PetitionApprovalGroup>();

    for (const item of petitionSubjectRequests) {
      const groupKey = `${item.curriculumCourseId}-${item.academicYear}-${item.semester}`;
      const existing = grouped.get(groupKey);
      if (!existing) {
        grouped.set(groupKey, {
          key: groupKey,
          courseCode: item.courseCode,
          descriptiveTitle: item.descriptiveTitle,
          academicYear: item.academicYear,
          semester: item.semester,
          petitionType: item.petitionType,
          unitsTotal: item.unitsTotal,
          students: [item],
        });
      } else {
        existing.students.push(item);
      }
    }

    let rows = Array.from(grouped.values()).sort((a, b) => {
      if (a.academicYear !== b.academicYear) {
        return b.academicYear.localeCompare(a.academicYear);
      }
      if (a.semester !== b.semester) {
        return b.semester - a.semester;
      }
      return a.courseCode.localeCompare(b.courseCode);
    });

    if (searchValue) {
      rows = rows.filter((group) => {
        const subjectMatch =
          String(group.courseCode || "")
            .toLowerCase()
            .includes(searchValue) ||
          String(group.descriptiveTitle || "")
            .toLowerCase()
            .includes(searchValue);
        const studentMatch = group.students.some((student) => {
          const name = String(student.studentName || "").toLowerCase();
          const number = String(student.studentNumber || "").toLowerCase();
          return name.includes(searchValue) || number.includes(searchValue);
        });
        return subjectMatch || studentMatch;
      });
    }

    return rows;
  }, [petitionSubjectRequests, studentSearch]);

  const handleApprovePetitionGroup = async (
    group: PetitionApprovalGroup,
    options?: { overrideMinimum?: boolean },
  ) => {
    const overrideMinimum = Boolean(options?.overrideMinimum);
    const groupSubmittingKey = overrideMinimum
      ? `petition-group-approve-override-${group.key}`
      : `petition-group-approve-${group.key}`;
    setIsSubmitting(groupSubmittingKey);

    try {
      const approveTargets = group.students.filter((student) =>
        Number.isFinite(Number(student.id)),
      );

      if (approveTargets.length === 0) {
        throw new Error("No petition student requests found in this group.");
      }

      const approvedStudents: PetitionSubjectApproval[] = [];
      const conflictedStudents: Array<{
        student: PetitionSubjectApproval;
        error: string;
        details: string[];
      }> = [];
      const failedStudents: Array<{
        student: PetitionSubjectApproval;
        error: string;
      }> = [];

      for (const student of approveTargets) {
        const response = await fetch("/api/auth/approvals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "petition_subject",
            id: student.id,
            override_minimum: overrideMinimum,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result?.success) {
          approvedStudents.push(student);
          continue;
        }

        const isConflict = response.status === 409;
        const conflictDetails = extractConflictLines(result?.details, group.courseCode);

        if (isConflict) {
          conflictedStudents.push({
            student,
            error:
              result?.error ||
              `Schedule conflict for ${student.studentName || student.studentNumber}.`,
            details: conflictDetails,
          });
        } else {
          failedStudents.push({
            student,
            error:
              result?.error ||
              `Failed to approve petition request for ${student.studentNumber}.`,
          });
        }
      }

      if (approvedStudents.length > 0) {
        setPetitionConflictByRequestId((prev) => {
          const next = { ...prev };
          approvedStudents.forEach((student) => {
            delete next[Number(student.id)];
          });
          return next;
        });
        await fetchApprovals();
      }

      if (conflictedStudents.length > 0) {
        setPetitionConflictByRequestId((prev) => {
          const next = { ...prev };
          conflictedStudents.forEach((item) => {
            const requestId = Number(item.student.id);
            if (!Number.isFinite(requestId)) return;
            next[requestId] = {
              message: item.error,
              lines: item.details,
            };
          });
          return next;
        });
      }

      if (conflictedStudents.length === 0 && failedStudents.length === 0) {
        setSuccessModal({
          isOpen: true,
          message: overrideMinimum
            ? `Approved all ${approvedStudents.length} petition request(s) for ${group.courseCode} with minimum override.`
            : `Approved all ${approvedStudents.length} petition request(s) for ${group.courseCode}.`,
        });
        return;
      }

      const summaryParts: string[] = [];
      if (approvedStudents.length > 0) {
        summaryParts.push(`${approvedStudents.length} approved`);
      }
      if (conflictedStudents.length > 0) {
        summaryParts.push(`${conflictedStudents.length} conflict`);
      }
      if (failedStudents.length > 0) {
        summaryParts.push(`${failedStudents.length} failed`);
      }

      const conflictLine = conflictedStudents
        .slice(0, 6)
        .map((item) => {
          const studentLabel = `${item.student.studentName || "Student"} (${item.student.studentNumber})`;
          return item.details.length > 0
            ? `${studentLabel}: ${item.details.join(" | ")}`
            : `${studentLabel}: ${item.error}`;
        })
        .join(" || ");

      const failedLine = failedStudents
        .slice(0, 4)
        .map((item) => `${item.student.studentName || "Student"} (${item.student.studentNumber}): ${item.error}`)
        .join(" || ");

      setErrorModal({
        isOpen: true,
        message: `Petition batch finished for ${group.courseCode}: ${summaryParts.join(", ")}. Reject conflicted students, then approve again.`,
        details: [conflictLine, failedLine].filter(Boolean).join(" || "),
      });
    } catch (approvalError) {
      setErrorModal({
        isOpen: true,
        message:
          approvalError instanceof Error
            ? approvalError.message
            : "Failed to approve petition subject group.",
        details: "",
      });
    } finally {
      setIsSubmitting("");
    }
  };

  const handleApprove = async (row: ApprovalRow) => {
    setIsSubmitting(row.key);

    try {
      let payload: Record<string, string | number>;

      if (row.type === "overload") {
        payload = {
          type: "overload",
          studentNumber: row.studentNumber,
          academicYear: row.academicYear,
          semester: row.semester,
        };
      } else if (row.type === "shift") {
        payload = {
          type: "section_shift",
          id: row.approvalId,
        };
      } else if (row.type === "program-shift") {
        payload = {
          type: "program_shift",
          id: row.approvalId,
        };
      } else if (row.type === "petition") {
        payload = {
          type: "petition_subject",
          id: row.approvalId,
        };
      } else if (row.type === "student-drop") {
        payload = {
          type: "student_drop",
          studentNumber: row.studentNumber,
          academicYear: row.academicYear,
          semester: row.semester,
        };
      } else {
        payload = {
          type: row.type === "drop" ? "drop" : "cross_enrollment",
          id: row.approvalId,
        };
      }

      const response = await fetch("/api/auth/approvals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        if (row.type === "petition" && response.status === 409) {
          const conflictLines = extractConflictLines(result?.details, row.detailsPrimary);
          if (Number.isFinite(Number(row.approvalId))) {
            setPetitionConflictByRequestId((prev) => ({
              ...prev,
              [Number(row.approvalId)]: {
                message:
                  result.error ||
                  "Schedule conflict while approving petition subject.",
                lines: conflictLines,
              },
            }));
          }
          setErrorModal({
            isOpen: true,
            message:
              result.error ||
              "Cannot approve petition because the subject schedule conflicts with the student's current classes.",
            details: conflictLines.join(" || "),
          });
          return;
        }
        throw new Error(result.error || "Failed to approve request.");
      }

      setSuccessModal({
        isOpen: true,
        message: result.message || "Approval completed successfully.",
      });
      if (row.type === "petition" && Number.isFinite(Number(row.approvalId))) {
        setPetitionConflictByRequestId((prev) => {
          const next = { ...prev };
          delete next[Number(row.approvalId)];
          return next;
        });
      }
      await fetchApprovals();
    } catch (approvalError) {
      setErrorModal({
        isOpen: true,
        message:
          approvalError instanceof Error
            ? approvalError.message
            : "Failed to approve request.",
        details: "",
      });
    } finally {
      setIsSubmitting("");
    }
  };

  const handleReject = async (row: ApprovalRow) => {
    setIsSubmitting(row.key);

    try {
      let payload: Record<string, string | number>;

      if (row.type === "overload") {
        payload = {
          type: "reject_overload",
          studentNumber: row.studentNumber,
          academicYear: row.academicYear,
          semester: row.semester,
        };
      } else if (row.type === "student-drop") {
        payload = {
          type: "reject_student_drop",
          studentNumber: row.studentNumber,
          academicYear: row.academicYear,
          semester: row.semester,
        };
      } else if (row.type === "drop") {
        payload = {
          type: "reject_drop",
          id: row.approvalId,
        };
      } else if (row.type === "cross") {
        payload = {
          type: "reject_cross_enrollment",
          id: row.approvalId,
        };
      } else if (row.type === "shift") {
        payload = {
          type: "reject_section_shift",
          id: row.approvalId,
        };
      } else if (row.type === "petition") {
        payload = {
          type: "reject_petition_subject",
          id: row.approvalId,
        };
      } else {
        payload = {
          type: "reject_program_shift",
          id: row.approvalId,
        };
      }

      const response = await fetch("/api/auth/approvals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to reject request.");
      }

      setSuccessModal({
        isOpen: true,
        message: result.message || "Request rejected successfully.",
      });
      if (row.type === "petition" && Number.isFinite(Number(row.approvalId))) {
        setPetitionConflictByRequestId((prev) => {
          const next = { ...prev };
          delete next[Number(row.approvalId)];
          return next;
        });
      }
      await fetchApprovals();
    } catch (rejectError) {
      setErrorModal({
        isOpen: true,
        message:
          rejectError instanceof Error
            ? rejectError.message
            : "Failed to reject request.",
        details: "",
      });
    } finally {
      setIsSubmitting("");
    }
  };

  const handleOpenIrregularEnrollment = (row: ApprovalRow) => {
    const params = new URLSearchParams({
      studentNumber: row.studentNumber,
      academicYear: row.academicYear,
      semester: String(row.semester),
      from: "cross-enrollee-approval",
    });
    window.location.href = `/admin/irregular-enrollment?${params.toString()}`;
  };

  const renderConfirmationContent = () => {
    if (!confirmation) {
      return null;
    }

    const firstName = (confirmation.firstName || "").trim();
    const lastName = (confirmation.lastName || "").trim();
    const studentDisplayName =
      firstName || lastName
        ? [firstName, lastName].filter(Boolean).join(" ")
        : confirmation.studentName;
    const subjectItems = (confirmation.subjects || []).map((subject) => ({
      courseCode: subject.courseCode || subject.course_code || "N/A",
      descriptiveTitle:
        subject.descriptiveTitle || subject.descriptive_title || "No title",
      unitsTotal:
        subject.unitsTotal ?? subject.units_total ?? null,
    }));

    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] text-sm" style={{ color: colors.primary }}>
        <div
          className="rounded-xl border p-4 space-y-4"
          style={{
            borderColor: `${colors.accent}20`,
            backgroundColor: `${colors.paper}`,
          }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: colors.tertiary }}
          >
            Request Overview
          </p>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: colors.tertiary }}>
              Request Type
            </p>
            <p className="mt-1 font-semibold">
              {confirmation.type === "overload"
                ? "Subject Addition Beyond 27 Units"
                : confirmation.type === "drop" ||
                    confirmation.type === "student-drop"
                  ? "Subject Drop Approval"
                  : confirmation.type === "cross"
                    ? "Cross-Enrollee Approval"
                    : confirmation.type === "shift"
                      ? "Section Shift Approval"
                      : confirmation.type === "petition"
                        ? "Petition Subject Approval"
                      : "Program Shift Approval"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: colors.tertiary }}>
              Student
            </p>
            <div className="mt-1 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: colors.tertiary }}
                  >
                    First Name
                  </p>
                  <p className="mt-1 font-semibold">
                    {firstName || "N/A"}
                  </p>
                </div>
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: colors.tertiary }}
                  >
                    Last Name
                  </p>
                  <p className="mt-1 font-semibold">
                    {lastName || "N/A"}
                  </p>
                </div>
              </div>
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: colors.tertiary }}
                >
                  Student ID
                </p>
                <p className="mt-1 font-semibold">{confirmation.studentNumber}</p>
              </div>
              {!firstName && !lastName && studentDisplayName !== confirmation.studentNumber ? (
                <p className="text-xs" style={{ color: colors.tertiary }}>
                  {studentDisplayName}
                </p>
              ) : null}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: colors.tertiary }}>
              Details
            </p>
            <p className="mt-1 font-semibold">{confirmation.detailsPrimary}</p>
            <p style={{ color: colors.tertiary }}>{confirmation.detailsSecondary}</p>
            {confirmation.contextLine ? (
              <p className="mt-1 text-xs" style={{ color: colors.neutral }}>
                {confirmation.contextLine}
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: colors.tertiary }}>
              Term
            </p>
            <p className="mt-1 font-semibold">{confirmation.termLabel}</p>
          </div>
        </div>

        <div
          className="rounded-xl border p-4 space-y-4"
          style={{
            borderColor: `${colors.accent}20`,
            backgroundColor: "white",
          }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: colors.tertiary }}
          >
            Approval Details
          </p>
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ color: colors.tertiary }}
            >
              Reason
            </p>
            <p className="mt-2 leading-6" style={{ color: colors.primary }}>
              {confirmation.type === "drop" ||
                confirmation.type === "student-drop"
                ? confirmation.reason?.trim() || "No drop reason was provided."
                : confirmation.type === "cross"
                  ? confirmation.reason?.trim() ||
                    "No inter-program request reason was provided."
                : confirmation.type === "shift"
                  ? confirmation.reason?.trim() ||
                    "Section shift requested by registrar and awaiting admin/dean approval."
                : confirmation.type === "petition"
                  ? confirmation.reason?.trim() ||
                    "Petition subject requested due to last-semester subject or currently unavailable offering."
                : confirmation.type === "program-shift"
                  ? confirmation.reason?.trim() ||
                    "Program shift requested and awaiting admin/dean approval."
                : "This enrollment exceeded 27 total units and requires admin approval before it can proceed."}
            </p>
          </div>
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ color: colors.tertiary }}
            >
              {confirmation.type === "drop" ||
                confirmation.type === "student-drop"
                ? confirmation.type === "student-drop"
                  ? "Subjects To Drop"
                  : "Subject To Delete"
                : confirmation.type === "cross"
                  ? "Subject To Add"
                : confirmation.type === "shift"
                  ? "Section Movement"
                  : confirmation.type === "petition"
                    ? "Petition Subject"
                  : confirmation.type === "program-shift"
                    ? "Program Movement"
                    : "Student Subject Section"}
            </p>

            {subjectItems.length === 0 ? (
              <p className="mt-2 leading-6" style={{ color: colors.tertiary }}>
                No subject details were found for this request.
              </p>
            ) : (
              <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-2">
                {subjectItems.map((subject, index) => (
                  <div
                    key={`${subject.courseCode}-${index}`}
                    className="rounded-lg border px-3 py-3"
                    style={{
                      borderColor: `${colors.neutralBorder}`,
                      backgroundColor: `${colors.paper}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold" style={{ color: colors.primary }}>
                          {subject.courseCode}
                        </p>
                        <p
                          className="mt-1 text-xs leading-5"
                          style={{ color: colors.tertiary }}
                        >
                          {subject.descriptiveTitle}
                        </p>
                      </div>
                      {subject.unitsTotal !== null ? (
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                          style={{
                            backgroundColor: `${colors.secondary}12`,
                            color: colors.secondary,
                          }}
                        >
                          {subject.unitsTotal} units
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {confirmation.type === "cross" ? (
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: colors.tertiary }}
              >
                Next Step
              </p>
              <button
                type="button"
                onClick={() => handleOpenIrregularEnrollment(confirmation)}
                className="mt-2 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all"
                style={{ backgroundColor: colors.info }}
              >
                Open Manual / Irregular Enrollment
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colors.paper }}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ color: colors.primary }}
            >
              Approval Management
            </h1>
            <p className="mt-1 text-sm" style={{ color: colors.tertiary }}>
              Central review hub for overload, drop, inter-program, shift, and petition subject requests.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchApprovals}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: colors.secondary }}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl p-5" style={cardStyle}>
            <p className="text-sm font-semibold" style={{ color: colors.tertiary }}>
              Total Pending
            </p>
            <p className="mt-2 text-3xl font-bold" style={{ color: colors.primary }}>
              {totalPendingItems}
            </p>
          </div>
          <div className="rounded-2xl p-5" style={cardStyle}>
            <p className="text-sm font-semibold" style={{ color: colors.tertiary }}>
              Beyond 27 Units
            </p>
            <p className="mt-2 text-3xl font-bold" style={{ color: colors.primary }}>
              {subjectOverloads.length}
            </p>
          </div>
          <div className="rounded-2xl p-5" style={cardStyle}>
            <p className="text-sm font-semibold" style={{ color: colors.tertiary }}>
              Subject Drops
            </p>
            <p className="mt-2 text-3xl font-bold" style={{ color: colors.primary }}>
              {subjectDrops.length}
            </p>
          </div>
          <div className="rounded-2xl p-5" style={cardStyle}>
            <p className="text-sm font-semibold" style={{ color: colors.tertiary }}>
              Inter-Program
            </p>
            <p className="mt-2 text-3xl font-bold" style={{ color: colors.primary }}>
              {crossEnrollmentRequests.length}
            </p>
          </div>
          <div className="rounded-2xl p-5" style={cardStyle}>
            <p className="text-sm font-semibold" style={{ color: colors.tertiary }}>
              Section Shift
            </p>
            <p className="mt-2 text-3xl font-bold" style={{ color: colors.primary }}>
              {shiftingRequests.length}
            </p>
          </div>
          <div className="rounded-2xl p-5" style={cardStyle}>
            <p className="text-sm font-semibold" style={{ color: colors.tertiary }}>
              Program Shift
            </p>
            <p className="mt-2 text-3xl font-bold" style={{ color: colors.primary }}>
              {programShiftRequests.length}
            </p>
          </div>
          <div className="rounded-2xl p-5" style={cardStyle}>
            <p className="text-sm font-semibold" style={{ color: colors.tertiary }}>
              Petition Subjects
            </p>
            <p className="mt-2 text-3xl font-bold" style={{ color: colors.primary }}>
              {petitionGroupedRows.length}
            </p>
            <p className="mt-1 text-xs" style={{ color: colors.neutral }}>
              {petitionSubjectRequests.length} student requests
            </p>
          </div>
        </div>

        {error ? (
          <div
            className="flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm"
            style={{
              borderColor: `${colors.danger}25`,
              backgroundColor: `${colors.danger}08`,
              color: colors.danger,
            }}
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="rounded-2xl p-6" style={cardStyle}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold" style={{ color: colors.primary }}>
                Pending Approvals
              </h2>
              <p className="text-sm" style={{ color: colors.tertiary }}>
                Combined approval queue for overload, dropping, inter-program, shifting, and petition subject requests.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
              <div className="relative w-full lg:w-[320px]">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: colors.tertiary }}
                />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder="Search student name or number..."
                  className="w-full rounded-xl py-2.5 pl-10 pr-3 text-sm outline-none transition"
                  style={{
                    backgroundColor: "white",
                    border: `1px solid ${colors.neutralBorder}`,
                    color: colors.primary,
                  }}
                  onFocus={(event) => {
                    event.currentTarget.style.borderColor = colors.secondary;
                    event.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}15`;
                  }}
                  onBlur={(event) => {
                    event.currentTarget.style.borderColor = colors.neutralBorder;
                    event.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
              <div className="w-full lg:w-[220px]">
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as ApprovalFilter)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition"
                  style={{
                    backgroundColor: "white",
                    border: `1px solid ${colors.neutralBorder}`,
                    color: colors.primary,
                  }}
                  onFocus={(event) => {
                    event.currentTarget.style.borderColor = colors.secondary;
                    event.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}15`;
                  }}
                  onBlur={(event) => {
                    event.currentTarget.style.borderColor = colors.neutralBorder;
                    event.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="all">All Requests</option>
                  <option value="overload">Beyond 27 Units</option>
                  <option value="drop">Subject Drops</option>
                  <option value="cross">Inter-Program</option>
                  <option value="shift">Section Shift</option>
                  <option value="program-shift">Program Shift</option>
                  <option value="petition">Petition Subject</option>
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-sm" style={{ color: colors.tertiary }}>
              Loading approval items...
            </div>
          ) : filter === "petition" ? (
            petitionGroupedRows.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: colors.tertiary }}>
                No petition subject records found for the selected filter.
              </div>
            ) : (
              <div
                className="mt-6 overflow-x-auto rounded-xl border"
                style={{ borderColor: `${colors.accent}20` }}
              >
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: `${colors.accent}08` }}>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
                        Subject
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
                        Requests
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
                        Term
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
                        Student List
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {petitionGroupedRows.map((group, index) => {
                      const isExpanded = Boolean(expandedPetitionGroups[group.key]);
                      const petitionTypeLabel =
                        group.petitionType === "last_semester"
                          ? "Last semester subject"
                          : "Currently not open";
                      const groupConflictCount = group.students.filter((student) =>
                        Boolean(petitionConflictByRequestId[Number(student.id)]),
                      ).length;
                      return (
                        <React.Fragment key={`petition-group-${group.key}`}>
                          <tr
                            className="border-t"
                            style={{
                              borderColor: `${colors.accent}15`,
                              backgroundColor:
                                index % 2 === 0 ? "white" : `${colors.paper}40`,
                            }}
                          >
                            <td className="px-4 py-3 text-sm">
                              <span
                                className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                                style={{
                                  backgroundColor: `${colors.secondary}15`,
                                  color: colors.secondary,
                                }}
                              >
                                Petition Subject
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm" style={{ color: colors.primary }}>
                              <div className="font-semibold">{group.courseCode}</div>
                              <div className="text-xs" style={{ color: colors.tertiary }}>
                                {group.descriptiveTitle}
                              </div>
                              <div className="mt-1 text-[11px]" style={{ color: colors.neutral }}>
                                Petition type: {petitionTypeLabel} • Units: {group.unitsTotal || 0}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm" style={{ color: colors.primary }}>
                              <span
                                className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                                style={{
                                  backgroundColor: `${colors.info}15`,
                                  color: colors.info,
                                }}
                              >
                                {group.students.length} students
                              </span>
                              {groupConflictCount > 0 ? (
                                <div className="mt-1.5">
                                  <span
                                    className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                                    style={{
                                      backgroundColor: `${colors.danger}18`,
                                      color: colors.danger,
                                    }}
                                  >
                                    {groupConflictCount} conflict
                                    {groupConflictCount > 1 ? "s" : ""}
                                  </span>
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-sm" style={{ color: colors.primary }}>
                              {`A.Y. ${group.academicYear} • Sem ${group.semester}`}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleApprovePetitionGroup(group)}
                                  disabled={
                                    isSubmitting === `petition-group-approve-${group.key}` ||
                                    isSubmitting === `petition-group-approve-override-${group.key}`
                                  }
                                  className="rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
                                  style={{ backgroundColor: colors.secondary }}
                                >
                                  {isSubmitting === `petition-group-approve-${group.key}`
                                    ? "Approving All..."
                                    : "Approve All"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleApprovePetitionGroup(group, {
                                      overrideMinimum: true,
                                    })
                                  }
                                  disabled={
                                    isSubmitting === `petition-group-approve-${group.key}` ||
                                    isSubmitting === `petition-group-approve-override-${group.key}`
                                  }
                                  className="rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
                                  style={{ backgroundColor: colors.warning }}
                                >
                                  {isSubmitting ===
                                  `petition-group-approve-override-${group.key}`
                                    ? "Overriding..."
                                    : "Override Min"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedPetitionGroups((prev) => ({
                                      ...prev,
                                      [group.key]: !prev[group.key],
                                    }))
                                  }
                                  className="rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all"
                                  style={{ backgroundColor: colors.info }}
                                >
                                  {isExpanded ? "Hide Students" : "Show Students"}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded
                            ? group.students.map((student) => {
                                const studentRow: ApprovalRow = {
                                  key: `petition-${student.id}`,
                                  type: "petition",
                                  approvalId: student.id,
                                  studentNumber: student.studentNumber,
                                  studentName: student.studentName,
                                  firstName: student.firstName,
                                  lastName: student.lastName,
                                  academicYear: student.academicYear,
                                  semester: student.semester,
                                  detailsPrimary: student.courseCode,
                                  detailsSecondary: student.descriptiveTitle,
                                  termLabel: `A.Y. ${student.academicYear} • Sem ${student.semester}`,
                                  statusLabel: "Pending Approval",
                                  reason: student.reason,
                                  subjects: student.subjects || [],
                                  contextLine:
                                    student.petitionType === "last_semester"
                                      ? `Petition type: Last semester subject • Units: ${student.unitsTotal || 0}`
                                      : `Petition type: Currently not open • Units: ${student.unitsTotal || 0}`,
                                };
                                const conflictInfo =
                                  petitionConflictByRequestId[Number(student.id)];
                                return (
                                  <tr
                                    key={`petition-student-${student.id}`}
                                    className="border-t"
                                    style={{
                                      borderColor: `${colors.accent}15`,
                                      backgroundColor: `${colors.info}06`,
                                    }}
                                  >
                                    <td className="px-4 py-3 text-xs font-semibold" style={{ color: colors.info }}>
                                      Student
                                    </td>
                                    <td className="px-4 py-3 text-sm" style={{ color: colors.primary }}>
                                      <div className="font-semibold">{student.studentName}</div>
                                      <div className="text-xs" style={{ color: colors.tertiary }}>
                                        {student.studentNumber}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm" style={{ color: colors.primary }}>
                                      {student.reason ? (
                                        <span style={{ color: colors.neutral }}>{student.reason}</span>
                                      ) : (
                                        <span style={{ color: colors.tertiary }}>No reason provided</span>
                                      )}
                                      {conflictInfo ? (
                                        <div className="mt-2 space-y-1">
                                          <span
                                            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                                            style={{
                                              backgroundColor: `${colors.danger}18`,
                                              color: colors.danger,
                                            }}
                                          >
                                            Conflict
                                          </span>
                                          <div className="text-[11px] leading-5" style={{ color: colors.danger }}>
                                            {conflictInfo.lines.length > 0
                                              ? conflictInfo.lines.join(" | ")
                                              : conflictInfo.message}
                                          </div>
                                        </div>
                                      ) : null}
                                    </td>
                                    <td className="px-4 py-3 text-sm" style={{ color: colors.primary }}>
                                      {`A.Y. ${student.academicYear} • Sem ${student.semester}`}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setConfirmation(studentRow);
                                            setConfirmationAction("reject");
                                          }}
                                          disabled={isSubmitting === studentRow.key}
                                          className="rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
                                          style={{ backgroundColor: colors.danger }}
                                        >
                                          {isSubmitting === studentRow.key &&
                                          confirmationAction === "reject"
                                            ? "Rejecting..."
                                            : "Reject"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setConfirmation(studentRow);
                                            setConfirmationAction("approve");
                                          }}
                                          disabled={isSubmitting === studentRow.key}
                                          className="rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
                                          style={{ backgroundColor: colors.secondary }}
                                        >
                                          {isSubmitting === studentRow.key &&
                                          confirmationAction === "approve"
                                            ? "Approving..."
                                            : "Approve"}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            : null}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : filteredRows.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: colors.tertiary }}>
              No approval records found for the selected filter.
            </div>
          ) : (
            <div
              className="mt-6 overflow-x-auto rounded-xl border"
              style={{ borderColor: `${colors.accent}20` }}
            >
              <table className="min-w-full border-collapse">
                <thead>
                  <tr style={{ backgroundColor: `${colors.accent}08` }}>
                    <th
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide"
                      style={{ color: colors.primary }}
                    >
                      Type
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide"
                      style={{ color: colors.primary }}
                    >
                      Student
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide"
                      style={{ color: colors.primary }}
                    >
                      Details
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide"
                      style={{ color: colors.primary }}
                    >
                      Term
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide"
                      style={{ color: colors.primary }}
                    >
                      Status
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide"
                      style={{ color: colors.primary }}
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((item, index) => (
                    <tr
                      key={item.key}
                      className="border-t"
                      style={{
                        borderColor: `${colors.accent}15`,
                        backgroundColor: index % 2 === 0 ? "white" : `${colors.paper}40`,
                      }}
                    >
                      <td className="px-4 py-3 text-sm">
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                          style={{
                            backgroundColor:
                              item.type === "overload"
                                ? `${colors.warning}15`
                                : item.type === "drop" || item.type === "student-drop"
                                  ? `${colors.secondary}15`
                                  : item.type === "program-shift"
                                    ? `${colors.primary}15`
                                    : item.type === "petition"
                                      ? `${colors.secondary}15`
                                    : `${colors.info}15`,
                            color:
                              item.type === "overload"
                                ? colors.warning
                                : item.type === "drop" || item.type === "student-drop"
                                  ? colors.secondary
                                  : item.type === "program-shift"
                                    ? colors.primary
                                    : item.type === "petition"
                                      ? colors.secondary
                                    : colors.info,
                          }}
                        >
                          {item.type === "overload"
                              ? "Overload"
                              : item.type === "student-drop"
                                ? "Student Drop"
                                : item.type === "drop"
                                ? "Drop"
                                : item.type === "cross"
                                  ? "Inter-Program"
                                  : item.type === "shift"
                                    ? "Section Shift"
                                    : item.type === "petition"
                                      ? "Petition Subject"
                                      : "Program Shift"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: colors.primary }}>
                        <div className="font-semibold">{item.studentName}</div>
                        <div className="text-xs" style={{ color: colors.tertiary }}>
                          {item.studentNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: colors.primary }}>
                        <div className="font-semibold">{item.detailsPrimary}</div>
                        <div className="text-xs" style={{ color: colors.tertiary }}>
                          {item.detailsSecondary}
                        </div>
                        {item.contextLine ? (
                          <div className="mt-1 text-[11px]" style={{ color: colors.neutral }}>
                            {item.contextLine}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: colors.primary }}>
                        {item.termLabel}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                          style={{
                            backgroundColor: `${colors.secondary}15`,
                            color: colors.secondary,
                          }}
                        >
                          {item.statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmation(item);
                              setConfirmationAction("reject");
                            }}
                            disabled={isSubmitting === item.key}
                            className="rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
                            style={{ backgroundColor: colors.danger }}
                          >
                            {isSubmitting === item.key && confirmationAction === "reject"
                              ? "Rejecting..."
                              : "Reject"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmation(item);
                              setConfirmationAction("approve");
                            }}
                            disabled={isSubmitting === item.key}
                            className="rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
                            style={{ backgroundColor: colors.secondary }}
                          >
                            {isSubmitting === item.key && confirmationAction === "approve"
                              ? "Approving..."
                              : "Approve"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ConfirmationModal
          isOpen={Boolean(confirmation)}
          onClose={() => {
            setConfirmation(null);
            setConfirmationAction("approve");
          }}
          onConfirm={() => {
            if (confirmation) {
              const action =
                confirmationAction === "reject" ? handleReject : handleApprove;
              action(confirmation).finally(() => {
                setConfirmation(null);
                setConfirmationAction("approve");
              });
            }
          }}
          title={
            confirmationAction === "reject" ? "Reject Request" : "Approve Request"
          }
          description={
            confirmationAction === "reject"
              ? "Review the request details before rejecting this overload request."
              : "Review the request details before completing approval."
          }
          confirmText={
            confirmationAction === "reject" ? "Reject Request" : "Approve Request"
          }
          cancelText="Cancel"
          variant={confirmationAction === "reject" ? "danger" : "info"}
          isLoading={Boolean(confirmation) && isSubmitting === confirmation?.key}
          customContent={renderConfirmationContent()}
        />

        <SuccessModal
          isOpen={successModal.isOpen}
          onClose={() => setSuccessModal({ isOpen: false, message: "" })}
          message={successModal.message}
          autoClose={true}
          autoCloseDelay={2500}
        />

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
}
