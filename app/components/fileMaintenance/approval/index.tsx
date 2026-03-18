"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
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
  id: number;
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

type ApprovalFilter = "all" | "overload" | "drop" | "cross" | "shift";

type ApprovalRow = {
  key: string;
  type: "overload" | "drop" | "cross" | "shift";
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
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    message: "",
  });
  const [confirmation, setConfirmation] = useState<ApprovalRow | null>(null);
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const totalPendingItems = useMemo(
    () =>
      subjectOverloads.length +
      subjectDrops.length +
      crossEnrollmentRequests.length +
      shiftingRequests.length,
    [
      crossEnrollmentRequests.length,
      shiftingRequests.length,
      subjectDrops.length,
      subjectOverloads.length,
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
      key: `drop-${item.id}`,
      type: "drop",
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

    return [...overloadRows, ...dropRows, ...crossRows, ...shiftRows];
  }, [crossEnrollmentRequests, shiftingRequests, subjectDrops, subjectOverloads]);

  const filteredRows = useMemo(() => {
    if (filter === "overload") {
      return approvalRows.filter((row) => row.type === "overload");
    }

    if (filter === "drop") {
      return approvalRows.filter((row) => row.type === "drop");
    }

    if (filter === "cross") {
      return approvalRows.filter((row) => row.type === "cross");
    }
    if (filter === "shift") {
      return approvalRows.filter((row) => row.type === "shift");
    }

    return approvalRows;
  }, [approvalRows, filter]);

  const handleApprove = async (row: ApprovalRow) => {
    setIsSubmitting(row.key);

    try {
      const payload =
        row.type === "overload"
          ? {
              type: "overload",
              studentNumber: row.studentNumber,
              academicYear: row.academicYear,
              semester: row.semester,
            }
          : row.type === "shift"
            ? {
                type: "section_shift",
                id: row.approvalId,
              }
            : {
              type: row.type === "drop" ? "drop" : "cross_enrollment",
              id: row.approvalId,
            };

      const response = await fetch("/api/auth/approvals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to approve request.");
      }

      setSuccessModal({
        isOpen: true,
        message: result.message || "Approval completed successfully.",
      });
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
      <div className="grid gap-4 lg:grid-cols-2 text-sm" style={{ color: colors.primary }}>
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
                : confirmation.type === "drop"
                  ? "Subject Drop Approval"
                  : confirmation.type === "cross"
                    ? "Cross-Enrollee Approval"
                    : "Section Shift Approval"}
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
              {confirmation.type === "drop"
                ? confirmation.reason?.trim() || "No drop reason was provided."
                : confirmation.type === "cross"
                  ? confirmation.reason?.trim() ||
                    "No cross-enrollee reason was provided."
                : confirmation.type === "shift"
                  ? confirmation.reason?.trim() ||
                    "Section shift requested by registrar and awaiting admin/dean approval."
                  : "This enrollment exceeded 27 total units and requires admin approval before it can proceed."}
            </p>
          </div>
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ color: colors.tertiary }}
            >
              {confirmation.type === "drop"
                ? "Subject To Delete"
                : confirmation.type === "cross"
                  ? "Subject To Add"
                  : confirmation.type === "shift"
                    ? "Section Movement"
                    : "Student Subject Section"}
            </p>

            {subjectItems.length === 0 ? (
              <p className="mt-2 leading-6" style={{ color: colors.tertiary }}>
                No subject details were found for this request.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
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
              Central review hub for requests that need approval before they can proceed.
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
              Cross Enrollee
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
                Combined approval queue for overload requests, subject drops, and cross-enrollee requests.
              </p>
            </div>

            <div className="w-full max-w-[220px]">
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
                <option value="cross">Cross Enrollee</option>
                <option value="shift">Section Shift</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-sm" style={{ color: colors.tertiary }}>
              Loading approval items...
            </div>
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
                                : item.type === "drop"
                                  ? `${colors.secondary}15`
                                  : `${colors.info}15`,
                            color:
                              item.type === "overload"
                                ? colors.warning
                                : item.type === "drop"
                                  ? colors.secondary
                                  : colors.info,
                          }}
                        >
                          {item.type === "overload"
                              ? "Overload"
                              : item.type === "drop"
                                ? "Drop"
                                : item.type === "cross"
                                  ? "Cross Enrollee"
                                  : "Section Shift"}
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
                        <button
                          type="button"
                          onClick={() => setConfirmation(item)}
                          disabled={isSubmitting === item.key}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
                          style={{ backgroundColor: colors.secondary }}
                        >
                          {isSubmitting === item.key ? "Approving..." : "Approve"}
                        </button>
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
          onClose={() => setConfirmation(null)}
          onConfirm={() => {
            if (confirmation) {
              handleApprove(confirmation).finally(() => {
                setConfirmation(null);
              });
            }
          }}
          title="Approve Request"
          description="Review the request details before completing approval."
          confirmText="Approve Request"
          cancelText="Cancel"
          variant="info"
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
