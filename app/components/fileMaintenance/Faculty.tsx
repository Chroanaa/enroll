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
} from "lucide-react";
import { Faculty, mockFaculty, Department, mockDepartments } from "../../data/mockData";
import { colors } from "../../colors";

const FacultyManagement: React.FC = () => {
  const [faculty, setFaculty] = useState<Faculty[]>(
    mockFaculty.map((fac) => ({
      ...fac,
      departmentName: mockDepartments.find((d) => d.id === fac.departmentId)?.name || "",
    }))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredFaculty = faculty.filter((fac) => {
    const matchesSearch =
      fac.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.departmentName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || fac.status === statusFilter;
    const matchesPosition = positionFilter === "all" || fac.position === positionFilter;
    return matchesSearch && matchesStatus && matchesPosition;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
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
        employeeId: "",
        firstName: "",
        lastName: "",
        middleName: "",
        email: "",
        phone: "",
        departmentId: (mockDepartments[0]?.id as number) || 1,
        position: "instructor",
        specialization: "",
        status: "active",
      }
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (formData.employeeId && formData.firstName && formData.lastName && formData.email && formData.departmentId) {
        const departmentName = mockDepartments.find((d) => (d.id as number) === formData.departmentId)?.name || "";
        const facultyData: Faculty = {
          ...formData,
          id: faculty?.id || Date.now(),
          employeeId: formData.employeeId!,
          firstName: formData.firstName!,
          lastName: formData.lastName!,
          middleName: formData.middleName || "",
          email: formData.email!,
          phone: formData.phone || "",
          departmentId: formData.departmentId!,
          departmentName,
          position: (formData.position as Faculty["position"]) || "instructor",
          specialization: formData.specialization || "",
          status: (formData.status as "active" | "inactive") || "active",
        };
        onSave(facultyData);
      }
    };

    return (
      <div 
        className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
        style={{ backgroundColor: `${colors.primary}20` }}
        onClick={onCancel}
      >
        <div 
          className='rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col'
          style={{
            backgroundColor: 'white',
            border: `1px solid ${colors.accent}30`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className='px-6 py-4 rounded-t-2xl flex items-center justify-between'
            style={{ 
              backgroundColor: `${colors.secondary}10`,
              borderBottom: `1px solid ${colors.accent}30`
            }}
          >
            <div className='flex items-center gap-3'>
              <div 
                className='p-2 rounded-lg'
                style={{ backgroundColor: `${colors.secondary}20` }}
              >
                <Users2 className='w-5 h-5' style={{ color: colors.secondary }} />
              </div>
              <h2 
                className='text-xl font-bold'
                style={{ color: colors.primary }}
              >
                {faculty ? "Edit Faculty" : "Add New Faculty"}
              </h2>
            </div>
            <button
              onClick={onCancel}
              className='p-1 rounded-lg hover:bg-gray-100 transition-colors'
              style={{ color: colors.tertiary }}
            >
              <X className='w-5 h-5' />
            </button>
          </div>
          <div className='p-6 overflow-y-auto flex-1'>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='md:col-span-2'>
                <label 
                  className='flex items-center gap-2 text-sm font-medium mb-2'
                  style={{ color: colors.primary }}
                >
                  <Hash className='w-4 h-4' style={{ color: colors.secondary }} />
                  Employee ID <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={formData.employeeId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeId: e.target.value.toUpperCase() })
                  }
                  className='w-full rounded-lg px-3 py-2 transition-all'
                  style={{
                    border: `1px solid ${colors.tertiary}60`,
                    backgroundColor: 'white',
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = `${colors.tertiary}60`;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required
                />
              </div>

              <div>
                <label 
                  className='flex items-center gap-2 text-sm font-medium mb-2'
                  style={{ color: colors.primary }}
                >
                  <User className='w-4 h-4' style={{ color: colors.secondary }} />
                  First Name <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={formData.firstName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className='w-full rounded-lg px-3 py-2 transition-all'
                  style={{
                    border: `1px solid ${colors.tertiary}60`,
                    backgroundColor: 'white',
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = `${colors.tertiary}60`;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required
                />
              </div>

              <div>
                <label 
                  className='flex items-center gap-2 text-sm font-medium mb-2'
                  style={{ color: colors.primary }}
                >
                  <User className='w-4 h-4' style={{ color: colors.secondary }} />
                  Last Name <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={formData.lastName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className='w-full rounded-lg px-3 py-2 transition-all'
                  style={{
                    border: `1px solid ${colors.tertiary}60`,
                    backgroundColor: 'white',
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = `${colors.tertiary}60`;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required
                />
              </div>

              <div className='md:col-span-2'>
                <label 
                  className='flex items-center gap-2 text-sm font-medium mb-2'
                  style={{ color: colors.primary }}
                >
                  <User className='w-4 h-4' style={{ color: colors.secondary }} />
                  Middle Name
                </label>
                <input
                  type='text'
                  value={formData.middleName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, middleName: e.target.value })
                  }
                  className='w-full rounded-lg px-3 py-2 transition-all'
                  style={{
                    border: `1px solid ${colors.tertiary}60`,
                    backgroundColor: 'white',
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = `${colors.tertiary}60`;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label 
                  className='flex items-center gap-2 text-sm font-medium mb-2'
                  style={{ color: colors.primary }}
                >
                  <Mail className='w-4 h-4' style={{ color: colors.secondary }} />
                  Email <span className='text-red-500'>*</span>
                </label>
                <input
                  type='email'
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className='w-full rounded-lg px-3 py-2 transition-all'
                  style={{
                    border: `1px solid ${colors.tertiary}60`,
                    backgroundColor: 'white',
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = `${colors.tertiary}60`;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required
                />
              </div>

              <div>
                <label 
                  className='flex items-center gap-2 text-sm font-medium mb-2'
                  style={{ color: colors.primary }}
                >
                  <Phone className='w-4 h-4' style={{ color: colors.secondary }} />
                  Phone
                </label>
                <input
                  type='tel'
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className='w-full rounded-lg px-3 py-2 transition-all'
                  style={{
                    border: `1px solid ${colors.tertiary}60`,
                    backgroundColor: 'white',
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = `${colors.tertiary}60`;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div className='md:col-span-2'>
                <label 
                  className='flex items-center gap-2 text-sm font-medium mb-2'
                  style={{ color: colors.primary }}
                >
                  <Building2 className='w-4 h-4' style={{ color: colors.secondary }} />
                  Department <span className='text-red-500'>*</span>
                </label>
                <select
                  value={formData.departmentId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, departmentId: parseInt(e.target.value) })
                  }
                  className='w-full rounded-lg px-3 py-2 transition-all'
                  style={{
                    border: `1px solid ${colors.tertiary}60`,
                    backgroundColor: 'white',
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = `${colors.tertiary}60`;
                    e.currentTarget.style.boxShadow = 'none';
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
                  className='flex items-center gap-2 text-sm font-medium mb-2'
                  style={{ color: colors.primary }}
                >
                  <Briefcase className='w-4 h-4' style={{ color: colors.secondary }} />
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
                  className='w-full rounded-lg px-3 py-2 transition-all'
                  style={{
                    border: `1px solid ${colors.tertiary}60`,
                    backgroundColor: 'white',
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = `${colors.tertiary}60`;
                    e.currentTarget.style.boxShadow = 'none';
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
                  className='flex items-center gap-2 text-sm font-medium mb-2'
                  style={{ color: colors.primary }}
                >
                  <CheckCircle2 className='w-4 h-4' style={{ color: colors.secondary }} />
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
                  className='w-full rounded-lg px-3 py-2 transition-all'
                  style={{
                    border: `1px solid ${colors.tertiary}60`,
                    backgroundColor: 'white',
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = `${colors.tertiary}60`;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value='active'>Active</option>
                  <option value='inactive'>Inactive</option>
                </select>
              </div>

              <div className='md:col-span-2'>
                <label 
                  className='flex items-center gap-2 text-sm font-medium mb-2'
                  style={{ color: colors.primary }}
                >
                  <GraduationCap className='w-4 h-4' style={{ color: colors.secondary }} />
                  Specialization
                </label>
                <input
                  type='text'
                  value={formData.specialization || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, specialization: e.target.value })
                  }
                  className='w-full rounded-lg px-3 py-2 transition-all'
                  style={{
                    border: `1px solid ${colors.tertiary}60`,
                    backgroundColor: 'white',
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = `${colors.tertiary}60`;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div className='flex justify-end gap-3 pt-4 mt-6 border-t' style={{ borderColor: `${colors.accent}30` }}>
              <button
                type='button'
                onClick={onCancel}
                className='px-6 py-2.5 rounded-lg transition-colors font-medium flex items-center gap-2'
                style={{ 
                  color: colors.primary,
                  border: `1px solid ${colors.tertiary}60`,
                  backgroundColor: 'white',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${colors.accent}15`;
                  e.currentTarget.style.borderColor = colors.tertiary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = `${colors.tertiary}60`;
                }}
              >
                <X className='w-4 h-4' />
                Cancel
              </button>
              <button
                type='submit'
                className='px-6 py-2.5 text-white rounded-lg transition-colors font-medium flex items-center gap-2'
                style={{ backgroundColor: colors.secondary }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = colors.primary)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = colors.secondary)
                }
              >
                <CheckCircle2 className='w-4 h-4' />
                {faculty ? "Update Faculty" : "Add Faculty"}
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
    <div className='p-4 sm:p-6 bg-gray-50 min-h-screen'>
      <div className='max-w-7xl mx-auto w-full'>
        <div className='mb-6'>
          <h1
            className='text-2xl font-bold mb-2'
            style={{ color: colors.primary }}
          >
            Faculty Management
          </h1>
          <p style={{ color: colors.primary }}>
            Manage faculty information and settings
          </p>
        </div>

        <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6'>
          <div className='flex flex-col md:flex-row gap-4'>
            <div className='flex-1 min-w-0'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                <input
                  type='text'
                  placeholder='Search faculty by name, employee ID, email, or department...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
            </div>

            <div className='flex gap-3'>
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                <option value='all'>All Positions</option>
                <option value='professor'>Professor</option>
                <option value='associate professor'>Associate Professor</option>
                <option value='assistant professor'>Assistant Professor</option>
                <option value='instructor'>Instructor</option>
                <option value='lecturer'>Lecturer</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                <option value='all'>All Status</option>
                <option value='active'>Active</option>
                <option value='inactive'>Inactive</option>
              </select>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className='flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors'
                style={{ backgroundColor: colors.secondary }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = colors.primary)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = colors.secondary)
                }
              >
                <Plus className='w-4 h-4' />
                Add Faculty
              </button>
            </div>
          </div>
        </div>

        {/* Faculty Table */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
          <div className='overflow-x-auto w-full'>
            <table className='w-full min-w-[1000px]'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Faculty
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Employee ID
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Contact
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Department
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Position
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Status
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {filteredFaculty.length === 0 ? (
                  <tr>
                    <td colSpan={7} className='px-6 py-8 text-center text-gray-500'>
                      No faculty found
                    </td>
                  </tr>
                ) : (
                  filteredFaculty.map((fac) => (
                    <tr
                      key={fac.id}
                      className='hover:bg-gray-50 transition-colors'
                    >
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          <div className='flex-shrink-0 h-10 w-10'>
                            <div
                              className='h-10 w-10 rounded-full flex items-center justify-center'
                              style={{ backgroundColor: `${colors.primary}15` }}
                            >
                              <Users2
                                className='h-5 w-5'
                                style={{ color: colors.primary }}
                              />
                            </div>
                          </div>
                          <div className='ml-4'>
                            <div className='text-sm font-medium text-gray-900'>
                              {fac.firstName} {fac.middleName} {fac.lastName}
                            </div>
                            {fac.specialization && (
                              <div className='text-sm text-gray-500'>
                                {fac.specialization}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm font-medium text-gray-900'>
                          {fac.employeeId}
                        </span>
                      </td>
                      <td className='px-6 py-4'>
                        <div className='text-sm text-gray-900 flex items-center gap-1 mb-1'>
                          <Mail className='w-3 h-3' />
                          {fac.email}
                        </div>
                        {fac.phone && (
                          <div className='text-sm text-gray-500 flex items-center gap-1'>
                            <Phone className='w-3 h-3' />
                            {fac.phone}
                          </div>
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900'>
                          {fac.departmentName || "N/A"}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPositionColor(
                            fac.position
                          )}`}
                        >
                          {fac.position}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            fac.status
                          )}`}
                        >
                          {fac.status}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <div className='flex justify-end gap-2'>
                          <button
                            onClick={() => setEditingFaculty(fac)}
                            className='text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors'
                            title='Edit'
                          >
                            <Edit2 className='w-4 h-4' />
                          </button>
                          <button
                            onClick={() => handleDeleteFaculty(fac.id)}
                            className='text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors'
                            title='Delete'
                          >
                            <Trash2 className='w-4 h-4' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
