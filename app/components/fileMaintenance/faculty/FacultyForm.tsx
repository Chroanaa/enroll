"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Users2,
  Hash,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  GraduationCap,
  CheckCircle2,
  X,
} from "lucide-react";
import { Faculty, Department } from "../../../types";
import { getDepartments } from "@/app/utils/departmentUtils";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";

interface FacultyFormProps {
  faculty: Faculty | null;
  onSave: (faculty: Faculty) => void;
  onCancel: () => void;
}

const generateFacultyPreviewId = (): string => {
  const year = new Date().getFullYear();
  const random6 = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `FAC${year}-${random6}`;
};

const FacultyForm: React.FC<FacultyFormProps> = ({
  faculty,
  onSave,
  onCancel,
}) => {
  const [generatedEmployeeId] = useState<string>(() =>
    faculty?.employee_id || generateFacultyPreviewId()
  );
  const initialFormData = useRef<Partial<Faculty>>(
    faculty || {
      employee_id: generatedEmployeeId,
      first_name: "",
      last_name: "",
      middle_name: "",
      email: "",
      phone: "",
      department_id: 1,
      employment_status: "partime",
      mother_unit: "",
      position: "instructor",
      degree: "",
      specialization: "",
      status: "active",
    }
  );

  const [formData, setFormData] = useState<Partial<Faculty>>(
    initialFormData.current
  );
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showCancelWarning, setShowCancelWarning] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await getDepartments();
        setDepartments(Array.isArray(data) ? data : Object.values(data));
      } catch (error) {
        console.error("Error fetching departments:", error);
        setDepartments([]);
      }
    };
    fetchDepartments();
  }, []);

  const hasChanges = () => {
    if (!faculty) return false;
    return (
      formData.employee_id !== initialFormData.current.employee_id ||
      formData.first_name !== initialFormData.current.first_name ||
      formData.last_name !== initialFormData.current.last_name ||
      formData.middle_name !== initialFormData.current.middle_name ||
      formData.email !== initialFormData.current.email ||
      formData.phone !== initialFormData.current.phone ||
      formData.department_id !== initialFormData.current.department_id ||
      formData.employment_status !== initialFormData.current.employment_status ||
      formData.mother_unit !== initialFormData.current.mother_unit ||
      formData.position !== initialFormData.current.position ||
      formData.degree !== initialFormData.current.degree ||
      formData.specialization !== initialFormData.current.specialization ||
      formData.status !== initialFormData.current.status
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasCoreRequiredFields = Boolean(
      formData.first_name &&
      formData.last_name &&
      formData.email &&
      formData.department_id,
    );
    const hasRequiredEmployeeIdForEdit = faculty ? Boolean(formData.employee_id) : true;

    if (
      hasCoreRequiredFields &&
      hasRequiredEmployeeIdForEdit
    ) {
      if (faculty && hasChanges()) {
        setShowSaveConfirmation(true);
      } else {
        performSave();
      }
    }
  };

  const performSave = () => {
    const hasCoreRequiredFields = Boolean(
      formData.first_name &&
      formData.last_name &&
      formData.email &&
      formData.department_id,
    );
    const hasRequiredEmployeeIdForEdit = faculty ? Boolean(formData.employee_id) : true;

    if (
      hasCoreRequiredFields &&
      hasRequiredEmployeeIdForEdit
    ) {
      const facultyData: Partial<Faculty> = {
        employee_id: faculty ? formData.employee_id! : generatedEmployeeId,
        first_name: formData.first_name!,
        last_name: formData.last_name!,
        middle_name: formData.middle_name || "",
        email: formData.email!,
        phone: formData.phone || "",
        department_id: formData.department_id!,
        employment_status:
          (formData.employment_status as Faculty["employment_status"]) ||
          "partime",
        mother_unit: formData.mother_unit || "",
        position: (formData.position as Faculty["position"]) || "instructor",
        degree: formData.degree || "",
        specialization: formData.specialization || "",
        status: (formData.status as "active" | "inactive") || "active",
      };
      // Let the parent component handle the API call
      onSave({
        ...facultyData,
        id: faculty?.id || Math.random(),
      } as Faculty);
      setShowSaveConfirmation(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges()) {
      setShowCancelWarning(true);
    } else {
      onCancel();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelWarning(false);
    onCancel();
  };

  return (
    <div
      className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={handleCancel}
    >
      <div
        className='rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200'
        style={{
          backgroundColor: "white",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className='px-6 py-4 flex items-center justify-between border-b'
          style={{
            backgroundColor: `${colors.primary}08`,
            borderColor: `${colors.primary}15`,
          }}
        >
          <div className='flex items-center gap-3'>
            <div
              className='p-2 rounded-lg'
              style={{ backgroundColor: `${colors.secondary}20` }}
            >
              <Users2
                className='w-5 h-5'
                style={{ color: colors.secondary }}
              />
            </div>
            <div>
              <h2
                className='text-xl font-bold'
                style={{ color: colors.primary }}
              >
                {faculty ? "Edit Faculty" : "Add New Faculty"}
              </h2>
              <p className='text-sm text-gray-500'>
                {faculty
                  ? "Update faculty member details"
                  : "Register a new faculty member"}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className='p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-6 overflow-y-auto custom-scrollbar'>
          <form onSubmit={handleSubmit} className='space-y-5'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
              <div className='md:col-span-2'>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <Hash className='w-4 h-4 text-gray-400' />
                  Employee ID <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={faculty ? (formData.employee_id || "") : generatedEmployeeId}
                  readOnly
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                    backgroundColor: "#F9FAFB",
                    color: colors.neutral,
                  }}
                  placeholder="Auto-generated on save"
                />
                {!faculty && (
                  <p className='text-xs mt-1' style={{ color: colors.neutral }}>
                    Faculty ID is auto-generated and reserved using format: FAC{new Date().getFullYear()}-######
                  </p>
                )}
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <User className='w-4 h-4 text-gray-400' />
                  First Name <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={formData.first_name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  required
                />
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <User className='w-4 h-4 text-gray-400' />
                  Last Name <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={formData.last_name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  required
                />
              </div>

              <div className='md:col-span-2'>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <User className='w-4 h-4 text-gray-400' />
                  Middle Name
                </label>
                <input
                  type='text'
                  value={formData.middle_name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, middle_name: e.target.value })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <Mail className='w-4 h-4 text-gray-400' />
                  Email <span className='text-red-500'>*</span>
                </label>
                <input
                  type='email'
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  required
                />
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <Phone className='w-4 h-4 text-gray-400' />
                  Phone
                </label>
                <input
                  type='tel'
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div className='md:col-span-2'>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <Building2 className='w-4 h-4 text-gray-400' />
                  Department <span className='text-red-500'>*</span>
                </label>
                <select
                  value={formData.department_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      department_id: parseInt(e.target.value),
                    })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0 bg-white'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  required
                >
                  <option value=''>Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <Briefcase className='w-4 h-4 text-gray-400' />
                  Employment Status <span className='text-red-500'>*</span>
                </label>
                <select
                  value={formData.employment_status || "partime"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      employment_status: e.target.value as Faculty["employment_status"],
                    })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0 bg-white'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  required
                >
                  <option value='partime'>Partime</option>
                  <option value='full time'>Full Time</option>
                </select>
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <Briefcase className='w-4 h-4 text-gray-400' />
                  Position <span className='text-red-500'>*</span>
                </label>
                <select
                  value={formData.position || "instructor"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      position: e.target.value as Faculty["position"],
                    })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0 bg-white'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value='professor'>Professor</option>
                  <option value='associate professor'>Associate Professor</option>
                  <option value='assistant professor'>Assistant Professor</option>
                  <option value='instructor'>Instructor</option>
                  <option value='lecturer'>Lecturer</option>
                </select>
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <CheckCircle2 className='w-4 h-4 text-gray-400' />
                  Status <span className='text-red-500'>*</span>
                </label>
                <select
                  value={formData.status || "active"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0 bg-white'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value='active'>Active</option>
                  <option value='inactive'>Inactive</option>
                </select>
              </div>

              <div className='md:col-span-2'>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <Building2 className='w-4 h-4 text-gray-400' />
                  Mother Unit
                </label>
                <input
                  type='text'
                  value={formData.mother_unit || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mother_unit: e.target.value,
                    })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  placeholder='e.g. College of Computing Studies'
                />
              </div>

              <div className='md:col-span-2'>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <GraduationCap className='w-4 h-4 text-gray-400' />
                  Degree
                </label>
                <input
                  type='text'
                  value={formData.degree || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      degree: e.target.value,
                    })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  placeholder='e.g. MSCS, PhD in Education'
                />
              </div>

              <div className='md:col-span-2'>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <GraduationCap className='w-4 h-4 text-gray-400' />
                  Specialization
                </label>
                <input
                  type='text'
                  value={formData.specialization || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specialization: e.target.value,
                    })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  placeholder="e.g. Artificial Intelligence, Data Science"
                />
              </div>
            </div>

            <div
              className='flex justify-end gap-3 pt-6 mt-6 border-t'
              style={{ borderColor: `${colors.primary}10` }}
            >
              <button
                type='button'
                onClick={handleCancel}
                className='px-6 py-2.5 rounded-xl transition-all font-medium flex items-center gap-2 hover:bg-gray-100'
                style={{
                  color: colors.primary,
                  border: "1px solid #E5E7EB",
                }}
              >
                Cancel
              </button>
              <button
                type='submit'
                className='px-6 py-2.5 text-white rounded-xl transition-all font-medium flex items-center gap-2 shadow-lg shadow-blue-900/20'
                style={{ backgroundColor: colors.secondary }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = colors.primary)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = colors.secondary)
                }
              >
                <CheckCircle2 className='w-4 h-4' />
                {faculty ? "Save Changes" : "Add Faculty"}
              </button>
            </div>
          </form>
        </div>

        {/* Save Confirmation Modal */}
        <ConfirmationModal
          isOpen={showSaveConfirmation}
          onClose={() => setShowSaveConfirmation(false)}
          onConfirm={performSave}
          title='Save Changes'
          message={`Are you sure you want to save changes to "${formData.first_name || faculty?.first_name} ${formData.last_name || faculty?.last_name}"?`}
          description='The faculty information will be updated with the new details.'
          confirmText='Save Changes'
          cancelText='Cancel'
          variant='info'
        />

        {/* Cancel Warning Modal */}
        <ConfirmationModal
          isOpen={showCancelWarning}
          onClose={() => setShowCancelWarning(false)}
          onConfirm={handleConfirmCancel}
          title='Unsaved Changes'
          message='You have unsaved changes. Are you sure you want to leave?'
          description='Your changes will be lost if you continue without saving.'
          confirmText='Leave Without Saving'
          cancelText='Stay and Edit'
          variant='warning'
        />
      </div>
    </div>
  );
};

export default FacultyForm;



