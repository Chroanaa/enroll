"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar, FileText, Loader2, Search } from "lucide-react";
import { colors } from "../../colors";
import { useAcademicTerm } from "../../hooks/useAcademicTerm";
import Pagination from "../common/Pagination";
import RegistrationPDFViewer from "../enrollment/RegistrationPDFViewer";
import BlueCardPDFViewer from "../enrollment/BlueCardPDFViewer";
import ErrorModal from "../common/ErrorModal";

type StudentRow = {
  studentNumber: string;
  studentName: string;
  programCode: string;
  yearLevel: number | null;
  enrolledSubjectCount: number;
};

type AssignmentResult = {
  studentNumber: string;
  subjectCount: number;
};

const RegistrationFormPrintReports: React.FC = () => {
  const { currentTerm } = useAcademicTerm();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openingStudentNumber, setOpeningStudentNumber] = useState<string | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{ open: boolean; type: "registration" | "blueCard" | null; data: any | null; loading: boolean }>({
    open: false,
    type: null,
    data: null,
    loading: false,
  });
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
    details: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const cardStyle: React.CSSProperties = {
    backgroundColor: "white",
    border: `1px solid ${colors.neutralBorder}`,
    boxShadow: `0 14px 32px ${colors.neutralBorder}55`,
  };

  const normalizedSemester = useMemo(() => {
    const value = String(currentTerm?.semesterCode || currentTerm?.semester || "").trim().toLowerCase();
    if (["1", "1st", "first", "first semester"].includes(value)) return "first";
    if (["2", "2nd", "second", "second semester"].includes(value)) return "second";
    if (["3", "3rd", "summer"].includes(value)) return "summer";
    return "second";
  }, [currentTerm]);

  const semesterNumber = useMemo(() => {
    if (normalizedSemester === "first") return 1;
    if (normalizedSemester === "second") return 2;
    return 3;
  }, [normalizedSemester]);

  const currentTermLabel = useMemo(() => {
    if (!currentTerm) return "Loading current term...";
    return `${currentTerm.semester} Semester, ${currentTerm.academicYear}`;
  }, [currentTerm]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const search = searchTerm.toLowerCase();
    return students.filter(
      (student) =>
        student.studentNumber.toLowerCase().includes(search) ||
        student.studentName.toLowerCase().includes(search) ||
        student.programCode.toLowerCase().includes(search),
    );
  }, [students, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  const loadDirectory = async () => {
    if (!currentTerm?.academicYear) return;

    setLoadingDirectory(true);
    try {
      const [studentsResponse, assignmentsResponse] = await Promise.all([
        fetch(
          `/api/auth/enrolled-subjects/students?academicYear=${encodeURIComponent(currentTerm.academicYear)}&semester=${semesterNumber}&includeDetails=true`,
        ),
        fetch(
          `/api/student-section?academicYear=${encodeURIComponent(currentTerm.academicYear)}&semester=${encodeURIComponent(normalizedSemester)}`,
        ),
      ]);

      const [studentsJson, assignmentsJson] = await Promise.all([
        studentsResponse.json(),
        assignmentsResponse.json(),
      ]);

      if (!studentsResponse.ok || !studentsJson?.success) {
        throw new Error(studentsJson?.error || "Failed to load students.");
      }
      if (!assignmentsResponse.ok) {
        throw new Error(assignmentsJson?.message || "Failed to load student section assignments.");
      }

      const assignmentRows = Array.isArray(assignmentsJson?.data)
        ? (assignmentsJson.data as AssignmentResult[])
        : [];
      const assignmentMap = new Map<string, AssignmentResult>();
      for (const row of assignmentRows) assignmentMap.set(row.studentNumber, row);

      const studentRows = Array.isArray(studentsJson?.data)
        ? (studentsJson.data as StudentRow[])
        : [];

      const filteredRows = studentRows.filter((student) => {
        const assignment = assignmentMap.get(student.studentNumber);
        return Number(student.enrolledSubjectCount) > 0 && Number(assignment?.subjectCount || 0) > 0;
      });

      setStudents(filteredRows);
    } catch (error) {
      setStudents([]);
      setErrorModal({
        isOpen: true,
        message: error instanceof Error ? error.message : "Failed to load student directory.",
        details: "",
      });
    } finally {
      setLoadingDirectory(false);
    }
  };

  useEffect(() => {
    loadDirectory().catch(() => {});
  }, [currentTerm?.academicYear, semesterNumber]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenForm = async (student: StudentRow, type: "registration" | "blueCard") => {
    if (!currentTerm?.academicYear) return;
    setOpeningStudentNumber(student.studentNumber);
    setPdfViewer({ open: true, type, data: null, loading: true });

    try {
      const params = new URLSearchParams({
        studentNumber: student.studentNumber,
        academicYear: currentTerm.academicYear,
        semester: normalizedSemester,
      });
      const response = await fetch(`/api/auth/enrollment/registration?${params.toString()}`);
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Failed to load print preview.");
      }
      setPdfViewer({ open: true, type, data: result.data ?? result, loading: false });
    } catch (error) {
      setPdfViewer({ open: false, type: null, data: null, loading: false });
      setErrorModal({
        isOpen: true,
        message: error instanceof Error ? error.message : "Failed to load print preview.",
        details: "",
      });
    } finally {
      setOpeningStudentNumber(null);
    }
  };

  return (
    <div className="min-h-screen p-6 font-sans" style={{ backgroundColor: colors.paper }}>
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" style={{ color: colors.primary }}>
              <FileText className="w-8 h-8" />
              Registration Forms
            </h1>
            <p className="mt-1" style={{ color: colors.tertiary }}>
              Select a student and open the registration form preview. Print audit is recorded only when Print is clicked.
            </p>
          </div>

          <div className="inline-flex items-center gap-3 rounded-xl px-4 py-3" style={cardStyle}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${colors.secondary}12`, color: colors.secondary }}>
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>
                Active Term
              </p>
              <p className="text-sm font-semibold" style={{ color: colors.primary }}>
                {currentTermLabel}
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-3xl overflow-hidden" style={cardStyle}>
          <div className="px-6 py-6 border-b" style={{ borderColor: colors.neutralBorder }}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between">
              <div>
              <h2 className="text-[22px] font-semibold leading-tight" style={{ color: colors.primary }}>
                  Student Directory
                </h2>
                <p className="mt-2 text-sm leading-6" style={{ color: colors.tertiary }}>
                  Showing students with enrolled subjects for the active term. Registration form preview includes student class list.
                </p>
              </div>

              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: colors.neutral }} />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by student ID, name, or program"
                  className="w-full rounded-2xl border py-3 pl-12 pr-4 text-[17px] outline-none transition-all"
                  style={{
                    borderColor: colors.neutralBorder,
                    backgroundColor: "white",
                    color: colors.primary,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead style={{ borderBottom: `1px solid ${colors.neutralBorder}` }}>
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: colors.tertiary }}>
                    Student ID
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: colors.tertiary }}>
                    Full Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: colors.tertiary }}>
                    Program
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: colors.tertiary }}>
                    Level
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: colors.tertiary }}>
                    Subjects
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold uppercase tracking-[0.22em]" style={{ color: colors.tertiary }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingDirectory ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-sm" style={{ color: colors.tertiary }}>
                      Loading students...
                    </td>
                  </tr>
                ) : paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-sm" style={{ color: colors.tertiary }}>
                      No students found for this term.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student) => (
                    <tr key={student.studentNumber} style={{ borderBottom: `1px solid ${colors.neutralBorder}` }}>
                      <td className="px-6 py-5 text-base font-semibold align-middle" style={{ color: colors.primary }}>
                        {student.studentNumber}
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <p className="text-base font-semibold leading-7" style={{ color: colors.primary }}>
                          {student.studentName}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-[16px] align-middle" style={{ color: colors.primary }}>
                        {student.programCode || "N/A"}
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <span
                          className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold"
                          style={{
                            backgroundColor: `${colors.secondary}14`,
                            color: colors.primary,
                          }}
                        >
                          {student.yearLevel ? `Year ${student.yearLevel}` : "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-[16px] font-semibold align-middle" style={{ color: colors.secondary }}>
                        {student.enrolledSubjectCount}
                      </td>
                      <td className="px-6 py-5 text-right align-middle">
                        <button
                          type="button"
                          disabled={openingStudentNumber === student.studentNumber}
                          onClick={() => handleOpenForm(student, "registration")}
                          className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-70"
                          style={{ backgroundColor: colors.secondary }}
                        >
                          {openingStudentNumber === student.studentNumber ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading Form...
                            </>
                          ) : (
                            "Print Registration Form"
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={openingStudentNumber === student.studentNumber}
                          onClick={() => handleOpenForm(student, "blueCard")}
                          className="ml-2 inline-flex min-w-[180px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-70"
                          style={{ backgroundColor: colors.primary }}
                        >
                          {openingStudentNumber === student.studentNumber ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            "Print Blue Card"
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredStudents.length}
            itemName="students"
            onPageChange={handlePageChange}
            onItemsPerPageChange={setItemsPerPage}
          />
        </section>
      </div>

      {pdfViewer.open && pdfViewer.loading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white px-6 py-4 text-sm font-medium" style={{ color: colors.primary }}>
            Loading print preview...
          </div>
        </div>
      ) : null}

      {pdfViewer.open && pdfViewer.type === "registration" && pdfViewer.data ? (
        <RegistrationPDFViewer
          data={pdfViewer.data}
          onClose={() => setPdfViewer({ open: false, type: null, data: null, loading: false })}
          auditContext="reports_registration_forms"
        />
      ) : null}

      {pdfViewer.open && pdfViewer.type === "blueCard" && pdfViewer.data ? (
        <BlueCardPDFViewer
          data={pdfViewer.data}
          onClose={() => setPdfViewer({ open: false, type: null, data: null, loading: false })}
          auditContext="reports_blue_card"
        />
      ) : null}

      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        details={errorModal.details}
        onClose={() => setErrorModal({ isOpen: false, message: "", details: "" })}
      />
    </div>
  );
};

export default RegistrationFormPrintReports;
