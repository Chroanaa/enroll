"use client";
import React, { useState } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Users2,
  Mail,
  Phone,
  Hash,
  User,
  Building2,
  Briefcase,
  GraduationCap,
  CheckCircle2,
  X,
  Filter,
} from "lucide-react";
import {
  Faculty,
  mockFaculty,
  mockDepartments,
} from "../../data/mockData";
import { colors } from "../../colors";

const FacultyManagement: React.FC = () => {
  const [faculty, setFaculty] = useState<Faculty[]>(
    mockFaculty.map((fac) => ({
      ...fac,
      departmentName:
        mockDepartments.find((d) => d.id === fac.department_id)?.name || "",
    }))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredFaculty = faculty.filter((fac) => {
    const matchesSearch =
      fac.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.departmentName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || fac.status === statusFilter;
    const matchesPosition =
      positionFilter === "all" || fac.position === positionFilter;
    return matchesSearch && matchesStatus && matchesPosition;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return {
          bg: "#ECFDF5",
          text: "#047857",
          border: "#A7F3D0",
        };
      case "inactive":
        return {
          bg: "#F3F4F6",
          text: "#374151",
          border: "#E5E7EB",
        };
      default:
        return {
          bg: "#F3F4F6",
          text: "#374151",
          border: "#E5E7EB",
        };
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case "professor":
        return "bg-purple-100 text-purple-800";
      case "associate professor":
        return "bg-blue-100 text-blue-800";
      case "assistant professor":
        return "bg-green-100 text-green-800";
      case "instructor":
        return "bg-yellow-100 text-yellow-800";
      case "lecturer":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const FacultyForm: React.FC<{
    faculty: Faculty | null;
    onSave: (faculty: Faculty) => void;
    onCancel: () => void;
  }> = ({ faculty, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Faculty>>(
      faculty || {
        employee_id: "",
        first_name: "",
        last_name: "",
        middle_name: "",
        email: "",
        phone: "",
        department_id: (mockDepartments[0]?.id as number) || 1,
        position: "instructor",
        specialization: "",
        status: "active",
      }
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (
        formData.employee_id &&
        formData.first_name &&
        formData.last_name &&
        formData.email &&
        formData.department_id
      ) {
        const facultyData: Partial<Faculty> = {
          ...formData,
          employee_id: formData.employee_id!,
          first_name: formData.first_name!,
          last_name: formData.last_name!,
          middle_name: formData.middle_name || "",
          email: formData.email!,
          phone: formData.phone || "",
          department_id: formData.department_id!,
          position: (formData.position as Faculty["position"]) || "instructor",
          specialization: formData.specialization || "",
          status: (formData.status as "active" | "inactive") || "active",
        };
        fetch("/api/auth/faculty", {
          method: "POST",
          body: JSON.stringify(facultyData),
        });

        onSave({
          ...facultyData,
          id: faculty?.id || Math.random(),
          departmentName: mockDepartments.find(d => d.id === facultyData.department_id)?.name || ""
        } as Faculty);
      }
    };

    return (
      <div
        className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={onCancel}
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
              onClick={onCancel}
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
                    value={formData.employee_id || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employee_id: e.target.value.toUpperCase(),
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
                    placeholder="e.g. FAC-2024-001"
                    required
                  />
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
                    {mockDepartments.map((dept) => (
                      <option key={dept.id} value={dept.id as number}>
                        {dept.name}
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
                    <option value='associate professor'>
                      Associate Professor
                    </option>
                    <option value='assistant professor'>
                      Assistant Professor
                    </option>
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
                  onClick={onCancel}
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
        </div>
      </div>
    );
  };

  const handleSaveFaculty = (facultyData: Faculty) => {
    if (editingFaculty) {
      setFaculty((prev) =>
        prev.map((f) => (f.id === facultyData.id ? facultyData : f))
      );
      setEditingFaculty(null);
    } else {
      setFaculty((prev) => [...prev, facultyData]);
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteFaculty = (id: number) => {
    if (confirm("Are you sure you want to delete this faculty member?")) {
      setFaculty((prev) => prev.filter((f) => f.id !== id));
    }
  };

  return (
    <div
      className='min-h-screen p-6 font-sans'
      style={{ backgroundColor: colors.paper }}
    >
      <div className='max-w-7xl mx-auto w-full space-y-6'>
        {/* Header */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <h1
              className='text-3xl font-bold tracking-tight'
              style={{ color: colors.primary }}
            >
              Faculty Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Manage faculty members and their assignments
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
            style={{ backgroundColor: colors.secondary }}
          >
            <Plus className='w-5 h-5' />
            <span className='font-medium'>Add Faculty</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className='bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between'>
          <div className='relative flex-1 w-full md:max-w-md'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
            <input
              type='text'
              placeholder='Search faculty...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-offset-0 transition-all'
              style={{ outline: "none" }}
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

          <div className='flex flex-wrap items-center gap-3 w-full md:w-auto'>
            <div className='flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50'>
              <Filter className='w-4 h-4 text-gray-500' />
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className='bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer'
                style={{ outline: "none" }}
              >
                <option value='all'>All Positions</option>
                <option value='professor'>Professor</option>
                <option value='associate professor'>Associate Professor</option>
                <option value='assistant professor'>Assistant Professor</option>
                <option value='instructor'>Instructor</option>
                <option value='lecturer'>Lecturer</option>
              </select>
            </div>

            <div className='flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50'>
              <Filter className='w-4 h-4 text-gray-500' />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className='bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer'
                style={{ outline: "none" }}
              >
                <option value='all'>All Status</option>
                <option value='active'>Active</option>
                <option value='inactive'>Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Faculty Table */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[1000px]'>
              <thead>
                <tr
                  style={{
                    backgroundColor: `${colors.primary}05`,
                    borderBottom: `1px solid ${colors.primary}10`,
                  }}
                >
                  <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                    Faculty
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                    Employee ID
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                    Contact
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                    Department
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                    Position
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                    Status
                  </th>
                  <th className='px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-600'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {filteredFaculty.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className='px-6 py-12 text-center text-gray-500'
                    >
                      <div className='flex flex-col items-center justify-center gap-3'>
                        <div
                          className='p-3 rounded-full'
                          style={{ backgroundColor: `${colors.primary}05` }}
                        >
                          <Users2
                            className='w-6 h-6'
                            style={{ color: colors.primary }}
                          />
                        </div>
                        <p className='font-medium'>No faculty found</p>
                        <p className='text-sm text-gray-400'>
                          Try adjusting your search or filters
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredFaculty.map((fac) => {
                    const statusStyles = getStatusColor(fac.status);
                    return (
                      <tr
                        key={fac.id}
                        className='group hover:bg-gray-50/50 transition-colors'
                      >
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='flex items-center'>
                            <div className='flex-shrink-0 h-10 w-10'>
                              <div
                                className='h-10 w-10 rounded-full flex items-center justify-center shadow-sm'
                                style={{
                                  backgroundColor: "white",
                                  border: `1px solid ${colors.primary}10`,
                                }}
                              >
                                <Users2
                                  className='h-5 w-5'
                                  style={{ color: colors.primary }}
                                />
                              </div>
                            </div>
                            <div className='ml-4'>
                              <div
                                className='text-xl font-semibold'
                                style={{ color: colors.primary }}
                              >
                                {fac.first_name} {fac.middle_name} {fac.last_name}
                              </div>
                              {fac.specialization && (
                                <div className='text-xs text-gray-500 mt-0.5 truncate max-w-[200px]'>
                                  {fac.specialization}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='flex items-center gap-2'>
                            <Hash className='w-3.5 h-3.5 text-gray-400' />
                            <span className='text-sm font-medium text-gray-700'>
                              {fac.employee_id}
                            </span>
                          </div>
                        </td>
                        <td className='px-6 py-4'>
                          <div className='flex flex-col gap-1'>
                            <div className='flex items-center gap-2 text-sm text-gray-600'>
                              <Mail className='w-3.5 h-3.5 text-gray-400' />
                              {fac.email}
                            </div>
                            {fac.phone && (
                              <div className='flex items-center gap-2 text-sm text-gray-500'>
                                <Phone className='w-3.5 h-3.5 text-gray-400' />
                                {fac.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='flex items-center gap-2'>
                            <Building2 className='w-3.5 h-3.5 text-gray-400' />
                            <span className='text-sm text-gray-600'>
                              {fac.departmentName || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPositionColor(
                              fac.position
                            )}`}
                          >
                            {fac.position.charAt(0).toUpperCase() +
                              fac.position.slice(1)}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <span
                            className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border'
                            style={{
                              backgroundColor: statusStyles.bg,
                              color: statusStyles.text,
                              borderColor: statusStyles.border,
                            }}
                          >
                            <span
                              className='w-1.5 h-1.5 rounded-full mr-1.5'
                              style={{ backgroundColor: statusStyles.text }}
                            />
                            {fac.status.charAt(0).toUpperCase() +
                              fac.status.slice(1)}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                          <div className='flex justify-end gap-2'>
                            <button
                              onClick={() => setEditingFaculty(fac)}
                              className='p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-blue-600'
                              title='Edit'
                            >
                              <Edit2 className='w-4 h-4' />
                            </button>
                            <button
                              onClick={() => handleDeleteFaculty(fac.id)}
                              className='p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-red-600'
                              title='Delete'
                            >
                              <Trash2 className='w-4 h-4' />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Faculty Form */}
        {(isAddModalOpen || editingFaculty) && (
          <FacultyForm
            faculty={editingFaculty}
            onSave={handleSaveFaculty}
            onCancel={() => {
              setEditingFaculty(null);
              setIsAddModalOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default FacultyManagement;
