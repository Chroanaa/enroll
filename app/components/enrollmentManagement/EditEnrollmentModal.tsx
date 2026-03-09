"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  X, User, Mail, Phone, MapPin, Calendar,
  GraduationCap, School, FileText, Save, AlertCircle, Loader2, CheckCircle,
} from "lucide-react";
import { colors } from "../../colors";
import ConfirmationModal from "../common/ConfirmationModal";
import { Enrollment } from "../../types";

interface EditEnrollmentModalProps {
  enrollment: Enrollment;
  onSaved: () => void; // called after successful save so parent can refresh table
  onCancel: () => void;
}

const EditEnrollmentModal: React.FC<EditEnrollmentModalProps> = ({
  enrollment,
  onSaved,
  onCancel,
}) => {
  const [formData, setFormData] = useState<any>({});
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [programs, setPrograms] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingMajors, setLoadingMajors] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const initialFormData = useRef<any>(null);
  const enrollmentId = useRef<any>(enrollment.id);

  const normalizeSex = (val: any): string => {
    if (!val) return "";
    return val.trim().toLowerCase();
  };

  const normalizeCivilStatus = (val: any): string => {
    if (!val) return "";
    return val.trim().toLowerCase();
  };

  const parseBirthplace = (val: any): string => {
    if (!val) return "";
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).join(", ");
      } catch { /* not JSON */ }
      return val;
    }
    if (Array.isArray(val)) return val.filter(Boolean).join(", ");
    return String(val);
  };

  const buildNormalized = (data: any, progs: any[]): any => {
    const cp = data.course_program;
    const matched = progs.find(
      (p: any) => p.code === cp || String(p.id) === String(cp) || p.name === cp
    );
    return {
      ...data,
      sex: normalizeSex(data.sex),
      civil_status: normalizeCivilStatus(data.civil_status),
      birthplace: parseBirthplace(data.birthplace),
      birthdate: data.birthdate ? String(data.birthdate).split("T")[0] : "",
      admission_date: data.admission_date ? String(data.admission_date).split("T")[0] : "",
      course_program: matched ? String(matched.id) : cp || "",
      year_level: data.year_level ? String(data.year_level) : "",
      major_id: data.major_id ? String(data.major_id) : "",
      academic_status: data.academic_status || "regular",
    };
  };

  // Fetch fresh enrollment data from API by ID
  const fetchFreshEnrollment = async (): Promise<any | null> => {
    try {
      const res = await fetch("/api/auth/enroll");
      if (!res.ok) return null;
      const json = await res.json();
      const list = Array.isArray(json) ? json : json.data || [];
      return list.find((e: any) => String(e.id) === String(enrollmentId.current)) || null;
    } catch {
      return null;
    }
  };

  // Load programs once, then normalize enrollment data
  const initForm = async (enrollmentData: any) => {
    setLoadingPrograms(true);
    setInitialized(false);
    try {
      // Fetch fresh enrollment data from server so sex/civil_status/program are up-to-date
      const fresh = await fetchFreshEnrollment();
      const data = fresh || enrollmentData;

      let progs = programs;
      if (progs.length === 0) {
        const res = await fetch("/api/auth/program");
        if (!res.ok) throw new Error("Failed to fetch programs");
        const list = await res.json();
        progs = Array.isArray(list) ? list : list.data || [];
        setPrograms(progs);
      }

      const normalized = buildNormalized(data, progs);
      setFormData(normalized);
      initialFormData.current = { ...normalized };

      const matchedProg = progs.find((p: any) => String(p.id) === normalized.course_program);
      if (matchedProg) {
        await fetchMajorsByProgramId(matchedProg.id);
      }
    } catch (err) {
      console.error("Error initializing edit modal:", err);
    } finally {
      setLoadingPrograms(false);
      setInitialized(true);
    }
  };

  useEffect(() => {
    initForm(enrollment);
  }, []); // only on mount — refresh is handled manually after save

  const fetchMajorsByProgramId = async (programId: number) => {
    setLoadingMajors(true);
    try {
      const res = await fetch(`/api/auth/major/by-program/${programId}`);
      setMajors(res.ok ? (await res.json()) || [] : []);
    } catch {
      setMajors([]);
    } finally {
      setLoadingMajors(false);
    }
  };

  const hasChanges = () => {
    if (!initialFormData.current) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialFormData.current);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleProgramChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const programId = e.target.value;
    const selectedProgram = programs.find((p: any) => String(p.id) === programId);
    setFormData((prev: any) => ({
      ...prev,
      course_program: programId,
      department: selectedProgram?.department_id || prev.department,
      major_id: "",
    }));
    setMajors([]);
    if (selectedProgram) await fetchMajorsByProgramId(selectedProgram.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasChanges()) setShowSaveConfirmation(true);
    else onCancel();
  };

  const performSave = async () => {
    setShowSaveConfirmation(false);
    setSaving(true);

    // Build payload with only changed fields
    const changes: any = { id: formData.id };
    Object.keys(formData).forEach((key) => {
      if (initialFormData.current && formData[key] !== initialFormData.current[key]) {
        if (["year_level", "major_id", "department"].includes(key)) {
          changes[key] = formData[key] ? parseInt(String(formData[key])) : null;
        } else {
          changes[key] = formData[key];
        }
      }
    });

    try {
      const res = await fetch("/api/auth/enroll", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update enrollment");
      }

      // Fetch fresh data and re-initialize the form
      const fresh = await fetchFreshEnrollment();
      if (fresh) {
        const normalized = buildNormalized(fresh, programs);
        setFormData(normalized);
        initialFormData.current = { ...normalized };

        // Reload majors if program is set
        const matchedProg = programs.find((p: any) => String(p.id) === normalized.course_program);
        if (matchedProg) await fetchMajorsByProgramId(matchedProg.id);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Notify parent to refresh the table
      onSaved();
    } catch (err: any) {
      alert(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges()) setShowCancelWarning(true);
    else onCancel();
  };

  const inputStyle = "w-full rounded-xl px-4 py-2.5 border transition-all focus:outline-none focus:ring-2";
  const borderStyle = { borderColor: colors.tertiary + "30" };

  if (!initialized) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
        <div className="rounded-2xl shadow-2xl p-8 bg-white flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.primary }} />
          <span style={{ color: colors.primary }}>Loading enrollment data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={handleCancel}>
      <div className="rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh]" style={{ backgroundColor: "white" }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b" style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)` }}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Edit Enrollment</h2>
              <p className="text-white/80 text-sm">Update student enrollment information</p>
            </div>
          </div>
          <button onClick={handleCancel} className="p-2 rounded-full hover:bg-white/20 transition-colors text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Save success banner */}
        {saveSuccess && (
          <div className="flex items-center gap-2 px-6 py-3 bg-green-50 border-b border-green-200 text-green-700 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Changes saved successfully. Form updated with latest data.
          </div>
        )}

        {/* Form Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: colors.primary }}>
                <User className="w-5 h-5" /> Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>First Name <span className="text-red-500">*</span></label>
                  <input type="text" name="first_name" value={formData.first_name || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Middle Name</label>
                  <input type="text" name="middle_name" value={formData.middle_name || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Last Name <span className="text-red-500">*</span></label>
                  <input type="text" name="family_name" value={formData.family_name || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle} required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}><Mail className="w-4 h-4 inline mr-1" />Email Address</label>
                  <input type="email" name="email_address" value={formData.email_address || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}><Phone className="w-4 h-4 inline mr-1" />Contact Number</label>
                  <input type="tel" name="contact_number" value={formData.contact_number || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Sex</label>
                  <select name="sex" value={formData.sex || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Civil Status</label>
                  <select name="civil_status" value={formData.civil_status || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle}>
                    <option value="">Select</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="widowed">Widowed</option>
                    <option value="separated">Separated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}><Calendar className="w-4 h-4 inline mr-1" />Birthdate</label>
                  <input type="date" name="birthdate" value={formData.birthdate || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle} />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Birthplace</label>
                <input type="text" name="birthplace" value={formData.birthplace || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle} />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}><MapPin className="w-4 h-4 inline mr-1" />Complete Address</label>
                <textarea name="complete_address" value={formData.complete_address || ""} onChange={handleInputChange} rows={2} className={inputStyle} style={borderStyle} />
              </div>
            </div>

            {/* Academic Information */}
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: colors.primary }}>
                <GraduationCap className="w-5 h-5" /> Academic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Student Number</label>
                  <input type="text" name="student_number" value={formData.student_number || ""} className={`${inputStyle} bg-gray-50`} style={borderStyle} readOnly />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Admission Status</label>
                  <select name="admission_status" value={formData.admission_status || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle}>
                    <option value="">Select</option>
                    <option value="new">New</option>
                    <option value="transferee">Transferee</option>
                    <option value="resident">Resident</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Program <span className="text-red-500">*</span></label>
                  {loadingPrograms ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border" style={borderStyle}><Loader2 className="w-4 h-4 animate-spin" /> Loading programs...</div>
                  ) : (
                    <select name="course_program" value={formData.course_program || ""} onChange={handleProgramChange} className={inputStyle} style={borderStyle} required>
                      <option value="">Select Program</option>
                      {programs.map((prog: any) => (
                        <option key={prog.id} value={String(prog.id)}>{prog.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Major</label>
                  {loadingMajors ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border" style={borderStyle}><Loader2 className="w-4 h-4 animate-spin" /> Loading majors...</div>
                  ) : (
                    <select name="major_id" value={formData.major_id || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle} disabled={majors.length === 0}>
                      <option value="">{majors.length === 0 ? "No majors available" : "Select Major (Optional)"}</option>
                      {majors.map((major: any) => (
                        <option key={major.id} value={String(major.id)}>{major.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Year Level</label>
                  <select name="year_level" value={formData.year_level || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle}>
                    <option value="">Select</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="5">5th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Term/Semester</label>
                  <select name="term" value={formData.term || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle}>
                    <option value="">Select</option>
                    <option value="first">First Semester</option>
                    <option value="second">Second Semester</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Academic Year</label>
                  <input type="text" name="academic_year" value={formData.academic_year || ""} onChange={handleInputChange} placeholder="e.g., 2024-2025" className={inputStyle} style={borderStyle} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Admission Date</label>
                  <input type="date" name="admission_date" value={formData.admission_date || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Academic Status</label>
                  <select name="academic_status" value={formData.academic_status || "regular"} onChange={handleInputChange} className={inputStyle} style={borderStyle}>
                    <option value="regular">Regular</option>
                    <option value="irregular">Irregular</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Educational Background */}
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: colors.primary }}>
                <School className="w-5 h-5" /> Educational Background
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Last School Attended</label>
                  <input type="text" name="last_school_attended" value={formData.last_school_attended || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Previous School Year</label>
                  <input type="text" name="previous_school_year" value={formData.previous_school_year || ""} onChange={handleInputChange} placeholder="e.g., 2023-2024" className={inputStyle} style={borderStyle} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>SHS Program</label>
                  <input type="text" name="program_shs" value={formData.program_shs || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Remarks</label>
                  <input type="text" name="remarks" value={formData.remarks || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle} />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: colors.primary }}>
                <AlertCircle className="w-5 h-5" /> Emergency Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Contact Name</label>
                  <input type="text" name="emergency_contact_name" value={formData.emergency_contact_name || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Relationship</label>
                  <input type="text" name="emergency_relationship" value={formData.emergency_relationship || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>Contact Number</label>
                  <input type="tel" name="emergency_contact_number" value={formData.emergency_contact_number || ""} onChange={handleInputChange} className={inputStyle} style={borderStyle} />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t" style={{ borderColor: colors.tertiary + "20" }}>
              <button type="button" onClick={handleCancel} className="px-6 py-3 rounded-xl transition-all font-medium flex items-center gap-2 hover:bg-gray-100" style={{ color: colors.primary, border: `1px solid ${colors.tertiary}30` }}>
                <X className="w-4 h-4" />Cancel
              </button>
              <button type="submit" disabled={saving} className="px-6 py-3 text-white rounded-xl transition-all font-medium flex items-center gap-2 shadow-lg disabled:opacity-60"
                style={{ backgroundColor: colors.secondary }}
                onMouseEnter={(e) => { if (!saving) e.currentTarget.style.backgroundColor = colors.primary; }}
                onMouseLeave={(e) => { if (!saving) e.currentTarget.style.backgroundColor = colors.secondary; }}
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Changes</>}
              </button>
            </div>
          </form>
        </div>

        <ConfirmationModal isOpen={showSaveConfirmation} onClose={() => setShowSaveConfirmation(false)} onConfirm={performSave} title="Save Changes" message="Are you sure you want to save changes to this enrollment?" description="The enrollment information will be updated with the new details." confirmText="Save Changes" cancelText="Cancel" variant="info" />
        <ConfirmationModal isOpen={showCancelWarning} onClose={() => setShowCancelWarning(false)} onConfirm={() => { setShowCancelWarning(false); onCancel(); }} title="Unsaved Changes" message="You have unsaved changes. Are you sure you want to leave?" description="Your changes will be lost if you continue without saving." confirmText="Leave Without Saving" cancelText="Stay and Edit" variant="warning" />
      </div>
    </div>
  );
};

export default EditEnrollmentModal;
