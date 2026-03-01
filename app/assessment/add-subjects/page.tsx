"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Save,
} from "lucide-react";
import ProtectedRoute from "../../components/ProtectedRoute";
import Navigation from "../../components/Navigation";
import { colors } from "../../colors";
import { useAcademicTerm } from "../../hooks/useAcademicTerm";
import SuccessModal from "../../components/common/SuccessModal";
import ErrorModal from "../../components/common/ErrorModal";
import ConfirmationModal from "../../components/common/ConfirmationModal";

type CurriculumCourse = {
  id: number; // curriculum_course.id
  curriculum_id: number;
  subject_id?: number | null;
  course_code: string;
  descriptive_title: string;
  units_lec?: number | null;
  units_lab?: number | null;
  units_total: number;
  prerequisite?: string | null; // already resolved to codes by API
  year_level: number;
  semester: number; // 1 or 2
};

type CurriculumResponse = {
  success: boolean;
  data: {
    curriculum: {
      id: number;
      program_name: string;
      program_code: string;
      effective_year: string;
    };
    courses: CurriculumCourse[];
  };
};

type EnrolledSubjectsResponse = {
  success: boolean;
  data: Array<{
    curriculum_course_id: number;
    course_code: string;
  }>;
};

const isValidStudentNumber = (studentNum: string) =>
  studentNum.trim().length >= 5;

const yearLabel = (year: number) => {
  switch (year) {
    case 1:
      return "FIRST YEAR";
    case 2:
      return "SECOND YEAR";
    case 3:
      return "THIRD YEAR";
    case 4:
      return "FOURTH YEAR";
    case 5:
      return "FIFTH YEAR";
    default:
      return `${year} YEAR`;
  }
};

const parsePrereqCodes = (prereq: string | null | undefined) => {
  if (!prereq) return [];
  // API guarantees no raw JSON; still protect against any accidental JSON-like string.
  const trimmed = prereq.trim();
  if (trimmed.startsWith("{")) return [];
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

function AssessmentAddSubjectsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTerm } = useAcademicTerm();

  // Handle sidebar navigation
  const handleViewChange = (view: string) => {
    // Navigate to dashboard with the selected view
    router.push(`/dashboard?view=${view}`);
  };

  const initialStudentNumber = useMemo(
    () => searchParams.get("studentNumber") ?? "",
    [searchParams],
  );

  const [studentNumber, setStudentNumber] = useState(initialStudentNumber);
  const [studentName, setStudentName] = useState("");
  const [programId, setProgramId] = useState<number | null>(null);

  const [curriculumMeta, setCurriculumMeta] = useState<{
    program_name: string;
    program_code: string;
    effective_year: string;
  } | null>(null);

  const [courses, setCourses] = useState<CurriculumCourse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [addedCourseIds, setAddedCourseIds] = useState<Set<number>>(new Set());
  const [addedCourseCodes, setAddedCourseCodes] = useState<Set<string>>(
    new Set(),
  );

  // Track pending subjects to be saved (not yet persisted)
  const [pendingCourseIds, setPendingCourseIds] = useState<Set<number>>(
    new Set(),
  );
  const [pendingCourseCodes, setPendingCourseCodes] = useState<Set<string>>(
    new Set(),
  );

  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const semesterNum = useMemo(() => {
    if (!currentTerm) return null;
    return currentTerm.semester === "First" ? 1 : 2;
  }, [currentTerm]);

  const academicYear = currentTerm?.academicYear ?? null;

  const grouped = useMemo(() => {
    const byYear = new Map<
      number,
      { first: CurriculumCourse[]; second: CurriculumCourse[] }
    >();
    for (const c of courses) {
      if (!byYear.has(c.year_level))
        byYear.set(c.year_level, { first: [], second: [] });
      const bucket = byYear.get(c.year_level)!;
      if (c.semester === 1) bucket.first.push(c);
      if (c.semester === 2) bucket.second.push(c);
    }
    const sortedYears = Array.from(byYear.keys()).sort((a, b) => a - b);
    return sortedYears.map((y) => ({
      year: y,
      first: byYear
        .get(y)!
        .first.sort((a, b) => a.course_code.localeCompare(b.course_code)),
      second: byYear
        .get(y)!
        .second.sort((a, b) => a.course_code.localeCompare(b.course_code)),
    }));
  }, [courses]);

  const fetchAllData = async (studentNum: string) => {
    if (
      !isValidStudentNumber(studentNum) ||
      !currentTerm ||
      !semesterNum ||
      !academicYear
    )
      return;

    setIsLoading(true);
    setError("");
    setCurriculumMeta(null);
    setCourses([]);
    setAddedCourseIds(new Set());
    setAddedCourseCodes(new Set());
    setPendingCourseIds(new Set());
    setPendingCourseCodes(new Set());

    try {
      // 1) Fetch student -> programId
      const studentRes = await fetch(`/api/students/${studentNum.trim()}`);
      if (!studentRes.ok) {
        const e = await studentRes.json().catch(() => ({}));
        throw new Error(e.error || "Student not found");
      }
      const studentData = await studentRes.json();
      setStudentName(
        [
          studentData.first_name,
          studentData.middle_name,
          studentData.last_name,
          studentData.suffix,
        ]
          .filter(Boolean)
          .join(" "),
      );

      const pid = studentData?.program?.id;
      if (!pid) throw new Error("Student program not found");
      setProgramId(pid);

      // 2) Fetch curriculum subjects for both semesters (grouping requires both)
      const [sem1Res, sem2Res] = await Promise.all([
        fetch(`/api/auth/curriculum/subjects?programId=${pid}&semester=1`),
        fetch(`/api/auth/curriculum/subjects?programId=${pid}&semester=2`),
      ]);

      const sem1Json: CurriculumResponse = await sem1Res.json();
      const sem2Json: CurriculumResponse = await sem2Res.json();

      if (!sem1Res.ok)
        throw new Error(
          (sem1Json as any)?.error || "Failed to fetch curriculum (Sem 1)",
        );
      if (!sem2Res.ok)
        throw new Error(
          (sem2Json as any)?.error || "Failed to fetch curriculum (Sem 2)",
        );

      // Prefer meta from sem1, fallback to sem2
      const meta = sem1Json.data?.curriculum ?? sem2Json.data?.curriculum;
      if (meta) {
        setCurriculumMeta({
          program_name: meta.program_name,
          program_code: meta.program_code,
          effective_year: meta.effective_year,
        });
      }

      const mergedCourses = [
        ...(sem1Json.data?.courses ?? []),
        ...(sem2Json.data?.courses ?? []),
      ];
      setCourses(mergedCourses);

      // 3) Fetch currently-added subjects for the student's current term (disable duplicates)
      const enrolledRes = await fetch(
        `/api/auth/enrolled-subjects?studentNumber=${encodeURIComponent(studentNum.trim())}&academicYear=${encodeURIComponent(
          academicYear,
        )}&semester=${semesterNum}`,
      );

      if (enrolledRes.ok) {
        const enrolledJson: EnrolledSubjectsResponse = await enrolledRes.json();
        if (enrolledJson?.success && Array.isArray(enrolledJson.data)) {
          const ids = new Set<number>();
          const codes = new Set<string>();
          enrolledJson.data.forEach((s) => {
            ids.add(s.curriculum_course_id);
            if (s.course_code) codes.add(s.course_code);
          });
          setAddedCourseIds(ids);
          setAddedCourseCodes(codes);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced fetch (do not fetch until student number is valid)
  useEffect(() => {
    if (!studentNumber.trim()) {
      setStudentName("");
      setProgramId(null);
      setCurriculumMeta(null);
      setCourses([]);
      setError("");
      setAddedCourseIds(new Set());
      setAddedCourseCodes(new Set());
      setPendingCourseIds(new Set());
      setPendingCourseCodes(new Set());
      return;
    }

    const t = setTimeout(() => {
      if (isValidStudentNumber(studentNumber)) fetchAllData(studentNumber);
    }, 400);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentNumber, currentTerm?.academicYear, currentTerm?.semester]);

  const canAddCourse = (course: CurriculumCourse) => {
    // Check both already saved and pending subjects
    if (
      addedCourseIds.has(course.id) ||
      addedCourseCodes.has(course.course_code) ||
      pendingCourseIds.has(course.id) ||
      pendingCourseCodes.has(course.course_code)
    ) {
      return { ok: false, reason: "Already added" };
    }
    const prereqCodes = parsePrereqCodes(course.prerequisite ?? null);
    if (prereqCodes.length === 0) return { ok: true, reason: "" };

    // Check prerequisites in both saved and pending subjects
    const allCodesSet = new Set([...addedCourseCodes, ...pendingCourseCodes]);
    const missing = prereqCodes.filter((code) => !allCodesSet.has(code));
    if (missing.length > 0) {
      return {
        ok: false,
        reason: `Prerequisite not satisfied: ${missing.join(", ")}`,
      };
    }
    return { ok: true, reason: "" };
  };

  const handleAdd = (course: CurriculumCourse) => {
    const eligibility = canAddCourse(course);
    if (!eligibility.ok) return;

    // Add to pending state (not saved yet)
    setPendingCourseIds((prev) => new Set(prev).add(course.id));
    setPendingCourseCodes((prev) => new Set(prev).add(course.course_code));
  };

  const handleSave = () => {
    if (pendingCourseIds.size === 0) {
      setModalMessage("No subjects to save.");
      setShowErrorModal(true);
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmSave = async () => {
    if (!currentTerm || !academicYear || !semesterNum || !programId) return;

    setShowConfirmModal(false);
    setIsSaving(true);

    try {
      // Combine already saved subjects with pending subjects
      const allSubjectsToSave = courses.filter((c) => {
        return addedCourseIds.has(c.id) || pendingCourseIds.has(c.id);
      });

      const response = await fetch("/api/auth/enrolled-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNumber: studentNumber.trim(),
          programId,
          academicYear,
          semester: semesterNum,
          subjects: allSubjectsToSave.map((c) => ({
            id: c.id,
            curriculum_course_id: c.id,
            subject_id: c.subject_id ?? null,
            year_level: c.year_level,
            units_total: c.units_total,
          })),
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to save subjects");
      }

      // Move pending to saved
      setAddedCourseIds((prev) => new Set([...prev, ...pendingCourseIds]));
      setAddedCourseCodes((prev) => new Set([...prev, ...pendingCourseCodes]));
      setPendingCourseIds(new Set());
      setPendingCourseCodes(new Set());

      setModalMessage(
        `Successfully saved ${pendingCourseIds.size} subject(s)!`,
      );
      setShowSuccessModal(true);
    } catch (e) {
      setModalMessage(
        e instanceof Error ? e.message : "Failed to save subjects",
      );
      setShowErrorModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  const headerSubtitle = useMemo(() => {
    if (!curriculumMeta) return "";
    const pieces = [
      curriculumMeta.program_name || curriculumMeta.program_code,
      curriculumMeta.effective_year
        ? `Effective AY ${curriculumMeta.effective_year}`
        : "",
    ].filter(Boolean);
    return pieces.join(" • ");
  }, [curriculumMeta]);

  return (
    <ProtectedRoute>
      <div className='flex h-screen overflow-hidden'>
        {/* Navigation Sidebar */}
        <Navigation currentView='assessment' onViewChange={handleViewChange} />

        {/* Main Content */}
        <div
          className='flex-1 overflow-y-auto'
          style={{ background: colors.paper }}
        >
          <div className='max-w-7xl mx-auto px-4 sm:px-6 py-6'>
            {/* Page Header */}
            <div
              className='rounded-xl p-5 mb-5'
              style={{
                backgroundColor: "white",
                boxShadow:
                  "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
                border: "1px solid rgba(58, 35, 19, 0.2)",
              }}
            >
              <div className='flex items-center justify-between gap-4'>
                <div className='min-w-0'>
                  <button
                    onClick={() => {
                      // Navigate back to Assessment Management with student number and tab
                      const params = new URLSearchParams();
                      if (studentNumber.trim()) {
                        params.set("studentNumber", studentNumber.trim());
                      }
                      params.set("tab", "subjects");
                      router.push(
                        `/dashboard?view=assessment&${params.toString()}`,
                      );
                    }}
                    className='inline-flex items-center gap-1.5 text-xs font-semibold mb-1'
                    style={{ color: colors.secondary }}
                  >
                    <ArrowLeft className='w-4 h-4' />
                    Back
                  </button>
                  <div className='flex items-baseline gap-3'>
                    <h1
                      className='text-2xl font-bold tracking-tight'
                      style={{ color: colors.primary }}
                    >
                      Add Subjects
                    </h1>
                    <p
                      className='text-sm font-medium truncate'
                      style={{ color: colors.tertiary }}
                    >
                      {headerSubtitle || "Search student"}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  {pendingCourseIds.size > 0 && (
                    <div
                      className='px-4 py-2 rounded-xl border'
                      style={{
                        backgroundColor: colors.accent + "10",
                        borderColor: colors.accent + "30",
                      }}
                    >
                      <span
                        className='text-sm font-semibold'
                        style={{ color: colors.primary }}
                      >
                        Pending:{" "}
                        <strong style={{ color: colors.secondary }}>
                          {pendingCourseIds.size}
                        </strong>
                      </span>
                    </div>
                  )}
                  {pendingCourseIds.size > 0 && (
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className='flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm'
                      style={{
                        backgroundColor: isSaving
                          ? colors.tertiary + "50"
                          : colors.secondary,
                        color: "white",
                        cursor: isSaving ? "not-allowed" : "pointer",
                      }}
                    >
                      {isSaving ? (
                        <>
                          <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className='w-4 h-4' />
                          Save Subjects
                        </>
                      )}
                    </button>
                  )}
                  <div className='text-right shrink-0'>
                    {curriculumMeta?.program_code && (
                      <div
                        className='text-base font-bold'
                        style={{ color: colors.primary }}
                      >
                        {curriculumMeta.program_code}
                      </div>
                    )}
                    {curriculumMeta?.effective_year && (
                      <div
                        className='text-xs font-semibold'
                        style={{ color: colors.tertiary }}
                      >
                        AY {curriculumMeta.effective_year}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className='mt-4 grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div>
                  <label
                    className='block text-xs font-bold uppercase mb-1.5'
                    style={{ color: colors.tertiary }}
                  >
                    Student Number
                  </label>
                  <input
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    placeholder='Student No.'
                    className='w-full px-3 py-2 text-sm rounded-lg border bg-white/50 transition-all duration-200 outline-none'
                    style={{
                      borderColor: error ? "#ef4444" : colors.tertiary + "30",
                      color: colors.primary,
                    }}
                  />
                  {!studentNumber.trim() ? null : !isValidStudentNumber(
                      studentNumber,
                    ) ? (
                    <p
                      className='text-xs mt-1'
                      style={{ color: colors.tertiary }}
                    >
                      Invalid number
                    </p>
                  ) : null}
                </div>
                <div>
                  <label
                    className='block text-xs font-bold uppercase mb-1.5'
                    style={{ color: colors.tertiary }}
                  >
                    Student Name
                  </label>
                  <div
                    className='w-full px-3 py-2 text-sm rounded-lg border truncate'
                    style={{
                      borderColor: colors.tertiary + "20",
                      color: colors.primary,
                      backgroundColor: colors.paper,
                    }}
                  >
                    {studentName || "—"}
                  </div>
                </div>
                <div>
                  <label
                    className='block text-xs font-bold uppercase mb-1.5'
                    style={{ color: colors.tertiary }}
                  >
                    Current Term
                  </label>
                  <div
                    className='w-full px-3 py-2 text-sm rounded-lg border truncate'
                    style={{
                      borderColor: colors.tertiary + "20",
                      color: colors.primary,
                      backgroundColor: colors.paper,
                    }}
                  >
                    {currentTerm
                      ? `${currentTerm.semester}, ${currentTerm.academicYear}`
                      : "—"}
                  </div>
                </div>
              </div>

              {error && (
                <div
                  className='mt-3 p-3 rounded-lg border flex items-center gap-2'
                  style={{
                    borderColor: "#ef444430",
                    backgroundColor: "#ef444405",
                  }}
                >
                  <AlertTriangle
                    className='w-5 h-5'
                    style={{ color: "#ef4444" }}
                  />
                  <div
                    className='text-sm font-semibold'
                    style={{ color: "#ef4444" }}
                  >
                    {error}
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            {isLoading ? (
              <div className='text-center py-12'>
                <div className='animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto'></div>
                <p className='text-sm text-gray-500 mt-2'>
                  Loading curriculum subjects...
                </p>
              </div>
            ) : !isValidStudentNumber(studentNumber) ? (
              <div className='text-center py-12'>
                <p
                  className='text-sm font-medium'
                  style={{ color: colors.tertiary }}
                >
                  Enter a valid student number to view subjects.
                </p>
              </div>
            ) : grouped.length === 0 ? (
              <div className='text-center py-12'>
                <p
                  className='text-sm font-medium'
                  style={{ color: colors.tertiary }}
                >
                  No curriculum subjects found.
                </p>
              </div>
            ) : (
              <div className='space-y-8 pb-10'>
                {grouped.map(({ year, first, second }) => (
                  <section key={year} className='space-y-4'>
                    {/* Year header */}
                    <div
                      className='sticky top-0 z-10 py-2'
                      style={{
                        background: colors.paper,
                      }}
                    >
                      <div
                        className='rounded-lg px-4 py-2.5 shadow-sm border'
                        style={{
                          backgroundColor: "white",
                          boxShadow: "0 1px 2px 0 rgba(58, 35, 19, 0.05)",
                          border: "1px solid rgba(58, 35, 19, 0.1)",
                        }}
                      >
                        <div
                          className='text-sm font-black tracking-wide'
                          style={{ color: colors.primary }}
                        >
                          {yearLabel(year)}
                        </div>
                      </div>
                    </div>

                    {/* Two-column semester grid */}
                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                      {[
                        { label: "First Semester", items: first },
                        { label: "Second Semester", items: second },
                      ].map((sem) => (
                        <div
                          key={sem.label}
                          className='rounded-xl shadow-sm border overflow-hidden'
                          style={{
                            backgroundColor: "white",
                            boxShadow:
                              "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
                            border: "1px solid rgba(58, 35, 19, 0.2)",
                          }}
                        >
                          <div
                            className='px-4 py-3 border-b flex justify-between items-center'
                            style={{
                              borderColor: colors.accent + "10",
                              backgroundColor: colors.accent + "06",
                            }}
                          >
                            <div
                              className='text-sm font-bold'
                              style={{ color: colors.primary }}
                            >
                              {sem.label}
                            </div>
                            <div
                              className='text-xs font-semibold'
                              style={{ color: colors.tertiary }}
                            >
                              {sem.items.length} subject
                              {sem.items.length === 1 ? "" : "s"}
                            </div>
                          </div>

                          <div className='p-3 space-y-2'>
                            {sem.items.length === 0 ? (
                              <div
                                className='text-sm p-2'
                                style={{ color: colors.tertiary }}
                              >
                                No subjects
                              </div>
                            ) : (
                              sem.items.map((course) => {
                                const eligibility = canAddCourse(course);
                                const prereqCodes = parsePrereqCodes(
                                  course.prerequisite ?? null,
                                );
                                const showPrereq = prereqCodes.length > 0;
                                const isAlreadySaved = addedCourseIds.has(
                                  course.id,
                                );
                                const isPending = pendingCourseIds.has(
                                  course.id,
                                );

                                return (
                                  <div
                                    key={course.id}
                                    className='rounded-lg border p-3 transition-all'
                                    style={{
                                      borderColor: colors.accent + "18",
                                      backgroundColor: eligibility.ok
                                        ? "white"
                                        : colors.paper,
                                    }}
                                  >
                                    <div className='flex items-center justify-between gap-3'>
                                      <div className='min-w-0 flex-1'>
                                        <div className='flex items-center gap-2'>
                                          <div
                                            className='text-base font-extrabold'
                                            style={{ color: colors.primary }}
                                          >
                                            {course.course_code}
                                          </div>
                                          {isAlreadySaved && (
                                            <CheckCircle2
                                              className='w-4 h-4'
                                              style={{
                                                color: colors.secondary,
                                              }}
                                            />
                                          )}
                                          {isPending && (
                                            <span
                                              className='px-2 py-0.5 text-xs font-semibold rounded'
                                              style={{
                                                backgroundColor: "#FEF3C7",
                                                color: "#92400e",
                                              }}
                                            >
                                              Pending
                                            </span>
                                          )}
                                        </div>
                                        <div
                                          className='text-sm font-medium truncate'
                                          style={{ color: colors.tertiary }}
                                        >
                                          {course.descriptive_title}
                                        </div>

                                        <div
                                          className='flex items-center gap-2 mt-1.5 text-xs'
                                          style={{ color: colors.tertiary }}
                                        >
                                          <span
                                            className='font-semibold'
                                            style={{ color: colors.primary }}
                                          >
                                            {course.units_total} Units
                                          </span>
                                          <span className='opacity-70'>
                                            ({course.units_lec}Lec/
                                            {course.units_lab}Lab)
                                          </span>
                                          {showPrereq && (
                                            <>
                                              <span className='opacity-50'>
                                                •
                                              </span>
                                              <span
                                                className='truncate max-w-[150px]'
                                                title={prereqCodes.join(", ")}
                                              >
                                                Pre: {prereqCodes.join(", ")}
                                              </span>
                                            </>
                                          )}
                                        </div>

                                        {/* Prerequisite Warning */}
                                        {!eligibility.ok &&
                                          eligibility.reason && (
                                            <div
                                              className='mt-3 p-3 rounded-lg border flex gap-3 items-start'
                                              style={{
                                                backgroundColor: "#FFFBEB", // Amber-50 equivalent
                                                borderColor:
                                                  "rgba(211, 163, 81, 0.3)", // colors.warning with opacity
                                              }}
                                            >
                                              <div className='shrink-0 mt-0.5'>
                                                <AlertTriangle
                                                  className='w-4 h-4'
                                                  style={{
                                                    color: colors.warning,
                                                  }}
                                                />
                                              </div>
                                              <div className='flex-1 min-w-0'>
                                                <div
                                                  className='text-xs font-bold uppercase tracking-wide mb-0.5'
                                                  style={{
                                                    color: colors.secondary,
                                                  }}
                                                >
                                                  {eligibility.reason.includes(
                                                    "Prerequisite",
                                                  )
                                                    ? "Prerequisites Missing"
                                                    : "Notice"}
                                                </div>
                                                <div
                                                  className='text-xs font-medium leading-relaxed'
                                                  style={{
                                                    color: colors.primary,
                                                  }}
                                                >
                                                  {eligibility.reason.replace(
                                                    "Prerequisite not satisfied: ",
                                                    "",
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                      </div>

                                      <div className='shrink-0'>
                                        <button
                                          onClick={() => handleAdd(course)}
                                          disabled={!eligibility.ok}
                                          className='inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all'
                                          style={{
                                            backgroundColor: eligibility.ok
                                              ? colors.secondary
                                              : colors.tertiary + "20",
                                            color: eligibility.ok
                                              ? "white"
                                              : colors.tertiary,
                                            cursor: eligibility.ok
                                              ? "pointer"
                                              : "not-allowed",
                                          }}
                                          title={
                                            eligibility.ok
                                              ? "Add subject"
                                              : eligibility.reason
                                          }
                                        >
                                          <Plus className='w-5 h-5' />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={modalMessage}
        autoClose={true}
        autoCloseDelay={2000}
      />

      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={modalMessage}
      />

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmSave}
        title='Save Subjects'
        message={`Are you sure you want to save ${pendingCourseIds.size} subject(s)?`}
        confirmText='Save'
        variant='success'
        isLoading={isSaving}
      />
    </ProtectedRoute>
  );
}

export default function AssessmentAddSubjectsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AssessmentAddSubjectsContent />
    </Suspense>
  );
}
