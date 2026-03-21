"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  CheckCircle2,
  RotateCcw,
  CircleX,
  Save,
  Loader2,
} from "lucide-react";
import { colors } from "../../colors";
import { Enrollment } from "../../types";
import { EnrollmentFormData } from "../../hooks/useEnrollmentForm";
import { PAGE_COMPONENTS, PAGE_TITLES } from "../enrollment/pageComponents";
import { getDepartments } from "../../utils/departmentUtils";
import { getPrograms } from "../../utils/programUtils";

interface EnrollmentVerificationModalProps {
  enrollment: Enrollment;
  onClose: () => void;
  onVerified: () => Promise<void> | void;
  onSaved?: () => Promise<void> | void;
}

const verificationBadgeStyles: Record<
  string,
  { bg: string; text: string; border: string; label: string }
> = {
  pending: {
    bg: "#FEF3C7",
    text: "#92400E",
    border: "#FDE68A",
    label: "Pending",
  },
  approved: {
    bg: "#DCFCE7",
    text: "#166534",
    border: "#86EFAC",
    label: "Approved",
  },
  rejected: {
    bg: "#FEE2E2",
    text: "#991B1B",
    border: "#FECACA",
    label: "Rejected",
  },
  needs_revision: {
    bg: "#DBEAFE",
    text: "#1E40AF",
    border: "#93C5FD",
    label: "Needs Revision",
  },
};

const emptyFormData: EnrollmentFormData = {
  admission_date: "",
  admission_status: "",
  term: "",
  department: 0,
  course_program: "",
  major_id: 0,
  year_level: 1,
  photo: null,
  requirements: [],
  student_number: "",
  family_name: "",
  first_name: "",
  middle_name: "",
  sex: "",
  civil_status: "",
  birthdate: "",
  birthplace: [],
  complete_address: "",
  address_province: "",
  address_city: "",
  address_detail: "",
  contact_number: "",
  email_address: "",
  emergency_contact_name: "",
  emergency_relationship: "",
  emergency_contact_number: "",
  last_school_attended: "",
  previous_school_year: "",
  program_shs: "",
  remarks: "",
  status: 0,
  academic_year: "",
};

function parseBirthplace(value: any): string[] {
  const sanitizePair = (pair: any[]): string[] => [
    String(pair?.[0] || "").trim(),
    String(pair?.[1] || "").trim(),
  ];

  if (Array.isArray(value)) return sanitizePair(value);

  if (value && typeof value === "object") {
    const province =
      value.province ?? value.birthplace_province ?? value.address_province;
    const city = value.city ?? value.municipality ?? value.birthplace_city;
    if (province || city) {
      return [String(province || "").trim(), String(city || "").trim()];
    }
  }

  if (typeof value === "string" && value.trim()) {
    let current: any = value.trim();

    // Handle nested/double-encoded JSON strings.
    for (let i = 0; i < 3; i += 1) {
      if (typeof current !== "string") break;
      const text = current.trim();
      if (
        !(text.startsWith("[") || text.startsWith("{") || text.startsWith('"'))
      ) {
        break;
      }
      try {
        current = JSON.parse(text);
      } catch {
        break;
      }
    }

    if (Array.isArray(current)) {
      return sanitizePair(current);
    }

    if (current && typeof current === "object") {
      const province =
        current.province ??
        current.birthplace_province ??
        current.address_province;
      const city =
        current.city ?? current.municipality ?? current.birthplace_city;
      if (province || city) {
        return [String(province || "").trim(), String(city || "").trim()];
      }
    }

    // PostgreSQL array style: {"METRO MANILA","QUEZON CITY"}
    if (current.startsWith("{") && current.endsWith("}")) {
      const inner = current.slice(1, -1);
      const parts = inner
        .split(",")
        .map((v: string) => v.replace(/^"+|"+$/g, "").trim())
        .filter(Boolean);
      if (parts.length >= 2) return [parts[0], parts[1]];
      if (parts.length === 1) return [parts[0], ""];
    }

    const parts = current
      .split(",")
      .map((v: string) => v.trim())
      .filter(Boolean);
    if (parts.length >= 2) return [parts[0], parts.slice(1).join(", ")];
    if (parts.length === 1) return [parts[0], ""];
  }

  return ["", ""];
}

function parseAddressParts(value: any): {
  detail: string;
  city: string;
  province: string;
} {
  const text = String(value || "").trim();
  if (!text) return { detail: "", city: "", province: "" };

  const parts = text
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (parts.length >= 3) {
    return {
      detail: parts.slice(0, -2).join(", "),
      city: parts[parts.length - 2],
      province: parts[parts.length - 1],
    };
  }
  if (parts.length === 2) {
    return { detail: "", city: parts[0], province: parts[1] };
  }
  return { detail: parts[0], city: "", province: "" };
}

function parseRequirements(value: any): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((v) => typeof v === "string");
      }
    } catch {
      return [value];
    }
  }
  return [];
}

export default function EnrollmentVerificationModal({
  enrollment,
  onClose,
  onVerified,
  onSaved,
}: EnrollmentVerificationModalProps) {
  const [activeTab, setActiveTab] = useState<number>(1);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaveHovered, setIsSaveHovered] = useState(false);
  const [fieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<EnrollmentFormData>(emptyFormData);
  const initialFormRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [selectedProgramHasMajors, setSelectedProgramHasMajors] =
    useState(false);

  const currentVerification =
    enrollment.verification_status && enrollment.verification_status.length > 0
      ? enrollment.verification_status
      : "pending";
  const verificationStyle =
    verificationBadgeStyles[currentVerification] ||
    verificationBadgeStyles.pending;

  const fullName = useMemo(
    () =>
      `${enrollment.first_name || ""} ${enrollment.middle_name || ""} ${
        enrollment.family_name || ""
      }`
        .replace(/\s+/g, " ")
        .trim(),
    [enrollment],
  );

  const filteredCoursePrograms = useMemo(() => {
    return programs
      .filter(
        (program) =>
          String(program.status).toLowerCase() === "active" ||
          program.status === 1,
      )
      .map((program) => ({
        id: program.id,
        name: program.name,
        department_id: program.department_id,
      }));
  }, [programs]);

  useEffect(() => {
    const init = async () => {
      try {
        const [departmentData, programData] = await Promise.all([
          getDepartments(),
          getPrograms(),
        ]);
        const departmentList = Array.isArray(departmentData)
          ? departmentData
          : Object.values(departmentData || {});
        const programList = Array.isArray(programData)
          ? programData
          : Object.values(programData || {});
        setDepartments(departmentList);
        setPrograms(programList);
      } catch (err) {
        console.error("Failed loading departments/programs", err);
      }

      const birthplace = parseBirthplace((enrollment as any).birthplace);
      const parsedAddress = parseAddressParts(
        (enrollment as any).complete_address,
      );
      const derivedBirthplace: string[] =
        birthplace[0] || birthplace[1]
          ? birthplace
          : [parsedAddress.province, parsedAddress.city];
      const requirements = parseRequirements((enrollment as any).requirements);
      const nextData: EnrollmentFormData = {
        ...emptyFormData,
        student_number: (enrollment as any).student_number || "",
        family_name: enrollment.family_name || "",
        first_name: enrollment.first_name || "",
        middle_name: enrollment.middle_name || "",
        sex: String((enrollment as any).sex || "").toLowerCase(),
        civil_status: String(
          (enrollment as any).civil_status || "",
        ).toLowerCase(),
        birthdate: (enrollment as any).birthdate
          ? new Date((enrollment as any).birthdate).toISOString().slice(0, 10)
          : "",
        birthplace: derivedBirthplace,
        complete_address: (enrollment as any).complete_address || "",
        address_province:
          (enrollment as any).address_province ||
          parsedAddress.province ||
          derivedBirthplace[0] ||
          "",
        address_city:
          (enrollment as any).address_city ||
          parsedAddress.city ||
          derivedBirthplace[1] ||
          "",
        address_detail:
          (enrollment as any).address_detail || parsedAddress.detail || "",
        contact_number: (enrollment as any).contact_number || "",
        email_address: (enrollment as any).email_address || "",
        emergency_contact_name:
          (enrollment as any).emergency_contact_name || "",
        emergency_relationship:
          (enrollment as any).emergency_relationship || "",
        emergency_contact_number:
          (enrollment as any).emergency_contact_number || "",
        last_school_attended: (enrollment as any).last_school_attended || "",
        previous_school_year: (enrollment as any).previous_school_year || "",
        program_shs: (enrollment as any).program_shs || "",
        remarks: (enrollment as any).remarks || "",
        admission_date: (enrollment as any).admission_date
          ? new Date((enrollment as any).admission_date)
              .toISOString()
              .slice(0, 10)
          : "",
        admission_status: (enrollment as any).admission_status || "",
        term: String((enrollment as any).term || "").toLowerCase(),
        course_program: String(
          (enrollment as any).program_id ||
            (enrollment as any).course_program ||
            "",
        ),
        major_id: Number((enrollment as any).major_id || 0),
        year_level: Number((enrollment as any).year_level || 1),
        academic_year: (enrollment as any).academic_year || "",
        department: Number((enrollment as any).department || 0),
        requirements,
      };

      setFormData(nextData);
      initialFormRef.current = JSON.stringify(nextData);
      setPhotoPreview((enrollment as any).photo || null);
    };
    init();
  }, [enrollment]);

  useEffect(() => {
    const loadMajors = async () => {
      if (!formData.course_program) {
        setMajors([]);
        setSelectedProgramHasMajors(false);
        return;
      }
      try {
        const programId = Number(formData.course_program);
        if (!Number.isFinite(programId) || programId <= 0) return;
        const res = await fetch(`/api/auth/major/by-program/${programId}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setMajors(list);
        setSelectedProgramHasMajors(list.length > 0);
      } catch {
        setMajors([]);
        setSelectedProgramHasMajors(false);
      }
    };
    loadMajors();
  }, [formData.course_program]);

  const getTodayDate = () => {
    const today = new Date();
    return today.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleInputChange = (
    field: keyof EnrollmentFormData,
    value: string | string[],
  ) => {
    let processedValue: any = value;
    if (field === "birthplace" && typeof value === "string") {
      try {
        processedValue = JSON.parse(value);
      } catch {
        processedValue = [];
      }
    }
    setFormData((prev) => ({ ...prev, [field]: processedValue }));
  };

  const handleCheckboxChange = (value: string) => {
    setFormData((prev) => {
      const currentArray = prev.requirements || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item) => item !== value)
        : [...currentArray, value];
      return { ...prev, requirements: newArray };
    });
  };

  const handleProgramChange = (programId: number) => {
    const selectedProgram = programs.find((p: any) => p.id === programId);
    setFormData((prev) => ({
      ...prev,
      course_program: String(programId),
      major_id: 0,
      department: selectedProgram?.department_id || prev.department,
    }));
  };

  const handleMajorChange = (majorId: number) => {
    const selectedMajor = majors.find((m: any) => m.id === majorId);
    if (!selectedMajor) return;
    const selectedProgram = programs.find(
      (p: any) => p.id === selectedMajor.program_id,
    );
    setFormData((prev) => ({
      ...prev,
      major_id: majorId,
      course_program: String(selectedMajor.program_id),
      department: selectedProgram?.department_id || prev.department,
    }));
  };

  const handleDepartmentChange = (departmentId: number) => {
    setFormData((prev) => ({
      ...prev,
      department: departmentId,
      course_program: "",
      major_id: 0,
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormData((prev) => ({ ...prev, photo: file }));
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
  };

  const removePhoto = () => {
    setFormData((prev) => ({ ...prev, photo: null }));
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(formData) !== initialFormRef.current;
  }, [formData]);

  const saveChanges = async (refreshList = true): Promise<boolean> => {
    if (!hasChanges) return true;
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const payload: any = {
        id: Number(enrollment.id),
        student_number: formData.student_number || null,
        admission_date: formData.admission_date || null,
        admission_status: formData.admission_status || null,
        term: formData.term || null,
        department: formData.department || null,
        course_program: formData.course_program || null,
        major_id: formData.major_id || null,
        year_level: formData.year_level || null,
        requirements: formData.requirements || [],
        family_name: formData.family_name || null,
        first_name: formData.first_name || null,
        middle_name: formData.middle_name || null,
        sex: formData.sex || null,
        civil_status: formData.civil_status || null,
        birthdate: formData.birthdate || null,
        birthplace: JSON.stringify(formData.birthplace || []),
        complete_address: formData.complete_address || null,
        contact_number: formData.contact_number || null,
        email_address: formData.email_address || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_relationship: formData.emergency_relationship || null,
        emergency_contact_number: formData.emergency_contact_number || null,
        last_school_attended: formData.last_school_attended || null,
        previous_school_year: formData.previous_school_year || null,
        academic_year: formData.academic_year || null,
        program_shs: formData.program_shs || null,
        remarks: formData.remarks || null,
      };

      let res: Response;
      if (formData.photo instanceof File) {
        const submitData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          if (key === "requirements" && Array.isArray(value)) {
            submitData.append(key, JSON.stringify(value));
            return;
          }
          submitData.append(key, String(value));
        });
        submitData.append("photo", formData.photo);

        res = await fetch("/api/auth/enroll", {
          method: "PUT",
          body: submitData,
        });
      } else {
        res = await fetch("/api/auth/enroll", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save enrollment changes.");
      }
      initialFormRef.current = JSON.stringify(formData);
      setSaveMessage("Changes saved.");
      if (refreshList && onSaved) {
        await onSaved();
      }
      return true;
    } catch (e: any) {
      setError(e.message || "Failed to save enrollment changes.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const verify = async (verification_status: string) => {
    setError(null);
    setLoadingAction(verification_status);
    try {
      const saved = await saveChanges(false);
      if (!saved) return;

      const res = await fetch(`/api/auth/enroll/${enrollment.id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verification_status,
          verification_notes: notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update verification status.");
      }
      await onVerified();
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to update verification status.");
    } finally {
      setLoadingAction(null);
    }
  };

  const CurrentComponent = PAGE_COMPONENTS[activeTab];

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm'
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className='w-full max-w-7xl h-[92vh] rounded-2xl shadow-2xl bg-white flex flex-col overflow-hidden'
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className='px-6 py-4 border-b flex items-center justify-between'
          style={{
            borderColor: `${colors.primary}20`,
            backgroundColor: `${colors.primary}08`,
          }}
        >
          <div>
            <h2 className='text-xl font-bold' style={{ color: colors.primary }}>
              Edit Student Information
            </h2>
            <p className='text-sm text-gray-600'>
              {fullName || "Unnamed Student"}
            </p>
          </div>
          <button
            onClick={onClose}
            className='p-2 rounded-full hover:bg-white/80 text-gray-500'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div
          className='px-6 py-3 border-b flex items-center gap-3'
          style={{ borderColor: `${colors.primary}15` }}
        >
          <span
            className='inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border'
            style={{
              backgroundColor: verificationStyle.bg,
              color: verificationStyle.text,
              borderColor: verificationStyle.border,
            }}
          >
            Verification: {verificationStyle.label}
          </span>
          <span className='text-sm text-gray-600'>
            Verified by:{" "}
            {(enrollment as any).verified_by_name || "Not yet verified"}
          </span>
        </div>

        <div
          className='px-6 py-3 border-b bg-white'
          style={{ borderColor: `${colors.primary}15` }}
        >
          <div className='flex flex-wrap gap-2'>
            {[1, 2, 3, 4, 5].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className='px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all'
                style={{
                  backgroundColor:
                    activeTab === tab ? `${colors.secondary}18` : "white",
                  color: activeTab === tab ? colors.primary : "#6B7280",
                  borderColor:
                    activeTab === tab ? `${colors.secondary}55` : "#E5E7EB",
                }}
              >
                {PAGE_TITLES[tab - 1]}
              </button>
            ))}
          </div>
        </div>

        <div className='flex-1 px-6 py-4 overflow-hidden'>
          <div className='h-full overflow-y-auto'>
            {CurrentComponent ? (
              <CurrentComponent
                formData={formData}
                handleInputChange={handleInputChange}
                handleDepartmentChange={handleDepartmentChange}
                handleProgramChange={handleProgramChange}
                handleMajorChange={handleMajorChange}
                handleCheckboxChange={handleCheckboxChange}
                filteredCoursePrograms={filteredCoursePrograms}
                departments={departments.map((d: any) => ({
                  id: d.id,
                  name: d.name,
                  code: d.code || "",
                }))}
                majors={majors.map((m: any) => ({
                  id: m.id,
                  name: m.name,
                  code: m.code || "",
                  program_id: m.program_id,
                }))}
                selectedProgramHasMajors={selectedProgramHasMajors}
                photoPreview={photoPreview}
                fileInputRef={fileInputRef}
                handlePhotoUpload={handlePhotoUpload}
                removePhoto={removePhoto}
                handlePhotoError={() => setPhotoPreview(null)}
                getTodayDate={getTodayDate}
                fieldErrors={fieldErrors}
                duplicateError={null}
                isCheckingDuplicate={false}
              />
            ) : null}
          </div>
        </div>

        <div
          className='px-6 py-3 border-t bg-white'
          style={{ borderColor: `${colors.primary}15` }}
        >
          <label className='block text-sm font-semibold text-gray-700 mb-2'>
            Verification Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className='w-full rounded-xl border px-4 py-2 text-sm'
            rows={2}
            placeholder='Add notes for registrar verification...'
          />
          {saveMessage && (
            <p className='text-sm text-emerald-600 mt-2'>{saveMessage}</p>
          )}
          {error && <p className='text-sm text-red-600 mt-2'>{error}</p>}
        </div>

        <div
          className='px-6 py-4 border-t flex flex-wrap justify-between items-center gap-2'
          style={{ borderColor: `${colors.primary}15` }}
        >
          <button
            onClick={() => {
              void saveChanges();
            }}
            disabled={saving || !hasChanges}
            onMouseEnter={() => setIsSaveHovered(true)}
            onMouseLeave={() => setIsSaveHovered(false)}
            className='px-4 py-2 rounded-lg text-sm font-semibold border disabled:opacity-60 inline-flex items-center gap-1 transition-colors'
            style={{
              backgroundColor: isSaveHovered
                ? colors.primary
                : colors.secondary,
              borderColor: isSaveHovered ? colors.primary : colors.secondary,
              color: "white",
            }}
          >
            {saving ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Save className='w-4 h-4' />
            )}
            Save Changes
          </button>
          <div className='flex flex-wrap justify-end gap-2'>
            <button
              onClick={() => verify("needs_revision")}
              disabled={Boolean(loadingAction) || saving}
              className='px-4 py-2 rounded-lg text-sm font-semibold border text-blue-700 bg-blue-50 border-blue-200 disabled:opacity-60'
            >
              <span className='inline-flex items-center gap-1'>
                <RotateCcw className='w-4 h-4' />
                {loadingAction === "needs_revision"
                  ? "Saving..."
                  : "Needs Revision"}
              </span>
            </button>
            <button
              onClick={() => verify("rejected")}
              disabled={Boolean(loadingAction) || saving}
              className='px-4 py-2 rounded-lg text-sm font-semibold border text-red-700 bg-red-50 border-red-200 disabled:opacity-60'
            >
              <span className='inline-flex items-center gap-1'>
                <CircleX className='w-4 h-4' />
                {loadingAction === "rejected" ? "Saving..." : "Reject"}
              </span>
            </button>
            <button
              onClick={() => verify("approved")}
              disabled={Boolean(loadingAction) || saving}
              className='px-4 py-2 rounded-lg text-sm font-semibold border text-emerald-700 bg-emerald-50 border-emerald-200 disabled:opacity-60'
            >
              <span className='inline-flex items-center gap-1'>
                <CheckCircle2 className='w-4 h-4' />
                {loadingAction === "approved" ? "Saving..." : "Approve"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
