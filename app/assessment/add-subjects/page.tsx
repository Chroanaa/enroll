"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, CheckCircle2, AlertTriangle } from "lucide-react";
import ProtectedRoute from "../../components/ProtectedRoute";
import Navigation from "../../components/Navigation";
import { colors } from "../../colors";
import { useAcademicTerm } from "../../hooks/useAcademicTerm";

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

const isValidStudentNumber = (studentNum: string) => studentNum.trim().length >= 5;

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

export default function AssessmentAddSubjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTerm } = useAcademicTerm();

  // Navigation state
  const [currentView, setCurrentView] = useState("assessment");

  const initialStudentNumber = useMemo(
    () => searchParams.get("studentNumber") ?? "",
    [searchParams]
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
  const [addedCourseCodes, setAddedCourseCodes] = useState<Set<string>>(new Set());

  const semesterNum = useMemo(() => {
    if (!currentTerm) return null;
    return currentTerm.semester === "First" ? 1 : 2;
  }, [currentTerm]);

  const academicYear = currentTerm?.academicYear ?? null;

  const grouped = useMemo(() => {
    const byYear = new Map<number, { first: CurriculumCourse[]; second: CurriculumCourse[] }>();
    for (const c of courses) {
      if (!byYear.has(c.year_level)) byYear.set(c.year_level, { first: [], second: [] });
      const bucket = byYear.get(c.year_level)!;
      if (c.semester === 1) bucket.first.push(c);
      if (c.semester === 2) bucket.second.push(c);
    }
    const sortedYears = Array.from(byYear.keys()).sort((a, b) => a - b);
    return sortedYears.map((y) => ({
      year: y,
      first: byYear.get(y)!.first.sort((a, b) => a.course_code.localeCompare(b.course_code)),
      second: byYear.get(y)!.second.sort((a, b) => a.course_code.localeCompare(b.course_code)),
    }));
  }, [courses]);

  const fetchAllData = async (studentNum: string) => {
    if (!isValidStudentNumber(studentNum) || !currentTerm || !semesterNum || !academicYear) return;

    setIsLoading(true);
    setError("");
    setCurriculumMeta(null);
    setCourses([]);
    setAddedCourseIds(new Set());
    setAddedCourseCodes(new Set());

    try {
      // 1) Fetch student -> programId
      const studentRes = await fetch(`/api/students/${studentNum.trim()}`);
      if (!studentRes.ok) {
        const e = await studentRes.json().catch(() => ({}));
        throw new Error(e.error || "Student not found");
      }
      const studentData = await studentRes.json();
      setStudentName(
        [studentData.first_name, studentData.middle_name, studentData.last_name, studentData.suffix]
          .filter(Boolean)
          .join(" ")
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

      if (!sem1Res.ok) throw new Error((sem1Json as any)?.error || "Failed to fetch curriculum (Sem 1)");
      if (!sem2Res.ok) throw new Error((sem2Json as any)?.error || "Failed to fetch curriculum (Sem 2)");

      // Prefer meta from sem1, fallback to sem2
      const meta = sem1Json.data?.curriculum ?? sem2Json.data?.curriculum;
      if (meta) {
        setCurriculumMeta({
          program_name: meta.program_name,
          program_code: meta.program_code,
          effective_year: meta.effective_year,
        });
      }

      const mergedCourses = [...(sem1Json.data?.courses ?? []), ...(sem2Json.data?.courses ?? [])];
      setCourses(mergedCourses);

      // 3) Fetch currently-added subjects for the student's current term (disable duplicates)
      const enrolledRes = await fetch(
        `/api/auth/enrolled-subjects?studentNumber=${encodeURIComponent(studentNum.trim())}&academicYear=${encodeURIComponent(
          academicYear
        )}&semester=${semesterNum}`
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
      return;
    }

    const t = setTimeout(() => {
      if (isValidStudentNumber(studentNumber)) fetchAllData(studentNumber);
    }, 400);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentNumber, currentTerm?.academicYear, currentTerm?.semester]);

  const canAddCourse = (course: CurriculumCourse) => {
    if (addedCourseIds.has(course.id) || addedCourseCodes.has(course.course_code)) {
      return { ok: false, reason: "Already added" };
    }
    const prereqCodes = parsePrereqCodes(course.prerequisite ?? null);
    if (prereqCodes.length === 0) return { ok: true, reason: "" };
    const missing = prereqCodes.filter((code) => !addedCourseCodes.has(code));
    if (missing.length > 0) {
      return { ok: false, reason: `Prerequisite not satisfied: ${missing.join(", ")}` };
    }
    return { ok: true, reason: "" };
  };

  const handleAdd = async (course: CurriculumCourse) => {
    if (!currentTerm || !academicYear || !semesterNum || !programId) return;
    const eligibility = canAddCourse(course);
    if (!eligibility.ok) return;

    // Optimistic UI: mark added immediately
    setAddedCourseIds((prev) => new Set(prev).add(course.id));
    setAddedCourseCodes((prev) => new Set(prev).add(course.course_code));

    try {
      // Persist by writing enrolled subjects for the term.
      // We use curriculum course objects; API maps subject.curriculum_course_id || subject.id.
      const allAdded = courses.filter((c) => {
        // after optimistic update, include both previously-added and new
        return addedCourseIds.has(c.id) || c.id === course.id;
      });

      const response = await fetch("/api/auth/enrolled-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNumber: studentNumber.trim(),
          programId,
          academicYear,
          semester: semesterNum,
          subjects: allAdded.map((c) => ({
            id: c.id, // will be treated as curriculum_course_id by API
            curriculum_course_id: c.id,
            subject_id: c.subject_id ?? null,
            year_level: c.year_level,
            units_total: c.units_total,
          })),
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to save added subject");
      }
    } catch (e) {
      // Rollback optimistic update on failure
      setAddedCourseIds((prev) => {
        const n = new Set(prev);
        n.delete(course.id);
        return n;
      });
      setAddedCourseCodes((prev) => {
        const n = new Set(prev);
        n.delete(course.course_code);
        return n;
      });
      setError(e instanceof Error ? e.message : "Failed to add subject");
    }
  };

  const headerSubtitle = useMemo(() => {
    if (!curriculumMeta) return "";
    const pieces = [
      curriculumMeta.program_name || curriculumMeta.program_code,
      curriculumMeta.effective_year ? `Effective AY ${curriculumMeta.effective_year}` : "",
    ].filter(Boolean);
    return pieces.join(" • ");
  }, [curriculumMeta]);

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        {/* Navigation Sidebar */}
        <Navigation currentView={currentView} onViewChange={setCurrentView} />

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto" style={{ background: colors.paper }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Page Header */}
          <div
            className="rounded-2xl shadow-lg p-6 mb-6"
            style={{
              backgroundColor: "white",
              border: `1px solid ${colors.accent}30`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <button
                  onClick={() => router.back()}
                  className="inline-flex items-center gap-2 text-sm font-semibold mb-3"
                  style={{ color: colors.secondary }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Assessment
                </button>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: colors.primary }}>
                  Add Subjects
                </h1>
                <p className="text-sm mt-1 font-medium" style={{ color: colors.tertiary }}>
                  {headerSubtitle || "Search a student number to load curriculum subjects"}
                </p>
              </div>
              <div className="text-right">
                {curriculumMeta?.program_code && (
                  <div className="text-sm font-bold" style={{ color: colors.primary }}>
                    {curriculumMeta.program_code}
                  </div>
                )}
                {curriculumMeta?.effective_year && (
                  <div className="text-xs font-semibold mt-1" style={{ color: colors.tertiary }}>
                    Effective AY {curriculumMeta.effective_year}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-2" style={{ color: colors.tertiary }}>
                  Student Number
                </label>
                <input
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder="Enter student number"
                  className="w-full px-4 py-3 rounded-xl border bg-white/50 transition-all duration-200 outline-none"
                  style={{
                    borderColor: error ? "#ef4444" : colors.tertiary + "30",
                    color: colors.primary,
                  }}
                />
                {!studentNumber.trim() ? null : !isValidStudentNumber(studentNumber) ? (
                  <p className="text-xs mt-1" style={{ color: colors.tertiary }}>
                    Enter a complete student number to load data.
                  </p>
                ) : null}
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-2" style={{ color: colors.tertiary }}>
                  Student Name
                </label>
                <div
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{ borderColor: colors.tertiary + "20", color: colors.primary, backgroundColor: colors.paper }}
                >
                  {studentName || "—"}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-2" style={{ color: colors.tertiary }}>
                  Current Term
                </label>
                <div
                  className="w-full px-4 py-3 rounded-xl border"
                  style={{ borderColor: colors.tertiary + "20", color: colors.primary, backgroundColor: colors.paper }}
                >
                  {currentTerm ? `${currentTerm.semester} Semester, ${currentTerm.academicYear}` : "—"}
                </div>
              </div>
            </div>

            {error && (
              <div
                className="mt-4 p-4 rounded-xl border flex items-start gap-3"
                style={{ borderColor: "#ef444430", backgroundColor: "#ef444405" }}
              >
                <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: "#ef4444" }} />
                <div className="text-sm font-semibold" style={{ color: "#ef4444" }}>
                  {error}
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading curriculum subjects...</p>
            </div>
          ) : !isValidStudentNumber(studentNumber) ? (
            <div className="text-center py-12">
              <p className="text-sm font-medium" style={{ color: colors.tertiary }}>
                Enter a valid student number to view subjects.
              </p>
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm font-medium" style={{ color: colors.tertiary }}>
                No curriculum subjects found.
              </p>
            </div>
          ) : (
            <div className="space-y-8 pb-10">
              {grouped.map(({ year, first, second }) => (
                <section key={year} className="space-y-4">
                  {/* Year header */}
                  <div
                    className="sticky top-0 z-10 py-3"
                    style={{
                      background: colors.paper,
                    }}
                  >
                    <div
                      className="rounded-xl px-4 py-3 shadow-sm border"
                      style={{
                        backgroundColor: "white",
                        borderColor: colors.accent + "20",
                      }}
                    >
                      <div className="text-sm font-black tracking-wide" style={{ color: colors.primary }}>
                        {yearLabel(year)}
                      </div>
                    </div>
                  </div>

                  {/* Two-column semester grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[
                      { label: "First Semester", items: first },
                      { label: "Second Semester", items: second },
                    ].map((sem) => (
                      <div
                        key={sem.label}
                        className="rounded-2xl shadow-sm border overflow-hidden"
                        style={{
                          backgroundColor: "white",
                          borderColor: colors.accent + "20",
                        }}
                      >
                        <div
                          className="px-5 py-4 border-b"
                          style={{ borderColor: colors.accent + "10", backgroundColor: colors.accent + "06" }}
                        >
                          <div className="text-sm font-bold" style={{ color: colors.primary }}>
                            {sem.label}
                          </div>
                          <div className="text-xs font-semibold mt-1" style={{ color: colors.tertiary }}>
                            {sem.items.length} subject{sem.items.length === 1 ? "" : "s"}
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          {sem.items.length === 0 ? (
                            <div className="text-sm" style={{ color: colors.tertiary }}>
                              No subjects
                            </div>
                          ) : (
                            sem.items.map((course) => {
                              const eligibility = canAddCourse(course);
                              const prereqCodes = parsePrereqCodes(course.prerequisite ?? null);
                              const showPrereq = prereqCodes.length > 0;

                              return (
                                <div
                                  key={course.id}
                                  className="rounded-xl border p-4"
                                  style={{
                                    borderColor: colors.accent + "18",
                                    backgroundColor: eligibility.ok ? "white" : colors.paper,
                                  }}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <div className="text-sm font-extrabold" style={{ color: colors.primary }}>
                                          {course.course_code}
                                        </div>
                                        {addedCourseIds.has(course.id) && (
                                          <span
                                            className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                                            style={{ backgroundColor: colors.secondary + "15", color: colors.secondary }}
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Added
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-sm mt-1 font-medium" style={{ color: colors.tertiary }}>
                                        {course.descriptive_title}
                                      </div>

                                      <div className="mt-3 grid grid-cols-5 gap-2 text-xs font-semibold" style={{ color: colors.tertiary }}>
                                        <div>
                                          <div className="uppercase tracking-wide">Lec</div>
                                          <div className="text-sm font-bold" style={{ color: colors.primary }}>
                                            {course.units_lec ?? 0}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="uppercase tracking-wide">Lab</div>
                                          <div className="text-sm font-bold" style={{ color: colors.primary }}>
                                            {course.units_lab ?? 0}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="uppercase tracking-wide">Total</div>
                                          <div className="text-sm font-bold" style={{ color: colors.primary }}>
                                            {course.units_total ?? 0}
                                          </div>
                                        </div>
                                        <div className="col-span-2">
                                          <div className="uppercase tracking-wide">Prerequisite</div>
                                          <div className="text-sm font-bold" style={{ color: colors.primary }}>
                                            {showPrereq ? prereqCodes.join(", ") : "None"}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="shrink-0">
                                      <button
                                        onClick={() => handleAdd(course)}
                                        disabled={!eligibility.ok}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                                        style={{
                                          backgroundColor: eligibility.ok ? colors.secondary : colors.tertiary + "30",
                                          color: eligibility.ok ? "white" : colors.tertiary,
                                          cursor: eligibility.ok ? "pointer" : "not-allowed",
                                        }}
                                        title={eligibility.ok ? "Add subject" : eligibility.reason}
                                      >
                                        <Plus className="w-4 h-4" />
                                        Add
                                      </button>
                                      {!eligibility.ok && eligibility.reason && (
                                        <div className="text-xs mt-2 font-semibold text-right" style={{ color: colors.tertiary }}>
                                          {eligibility.reason}
                                        </div>
                                      )}
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
    </ProtectedRoute>
  );
}


