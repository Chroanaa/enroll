"use client";
import React, { useState } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Network,
  Hash,
  Building2,
  User,
  FileText,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  Department,
  mockDepartments,
  Building,
  mockBuildings,
} from "../../data/mockData";
import { colors } from "../../colors";

const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>(
    mockDepartments.map((dept) => ({
      ...dept,
      buildingName: dept.buildingId
        ? mockBuildings.find((b) => b.id === dept.buildingId)?.name || ""
        : "",
    }))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredDepartments = departments.filter((dept) => {
    const matchesSearch =
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.head?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || dept.status === statusFilter;
    return matchesSearch && matchesStatus;
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

  const DepartmentForm: React.FC<{
    department: Department | null;
    onSave: (department: Department) => void;
    onCancel: () => void;
  }> = ({ department, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Department>>(
      department || {
        code: "",
        name: "",
        description: "",
        buildingId: mockBuildings[0]?.id,
        head: "",
        status: "active",
      }
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (formData.code && formData.name) {
        const buildingName = formData.buildingId
          ? mockBuildings.find((b) => b.id === formData.buildingId)?.name || ""
          : "";
        const departmentData: Partial<Department> = {
          ...formData,
          code: formData.code.toUpperCase()!,
          name: formData.name!,
          description: formData.description || "",
          buildingId: formData.buildingId,
          buildingName,
          head: formData.head || "",
          status: (formData.status as "active" | "inactive") || "active",
        };
        fetch("/api/auth/department", {
          method: "POST",
          body: JSON.stringify(departmentData),
        });
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
            backgroundColor: "white",
            border: `1px solid ${colors.accent}30`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className='px-6 py-4 rounded-t-2xl flex items-center justify-between'
            style={{
              backgroundColor: `${colors.secondary}10`,
              borderBottom: `1px solid ${colors.accent}30`,
            }}
          >
            <div className='flex items-center gap-3'>
              <div
                className='p-2 rounded-lg'
                style={{ backgroundColor: `${colors.secondary}20` }}
              >
                <Network
                  className='w-5 h-5'
                  style={{ color: colors.secondary }}
                />
              </div>
              <h2
                className='text-xl font-bold'
                style={{ color: colors.primary }}
              >
                {department ? "Edit Department" : "Add New Department"}
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
                <div>
                  <label
                    className='flex items-center gap-2 text-sm font-medium mb-2'
                    style={{ color: colors.primary }}
                  >
                    <Hash
                      className='w-4 h-4'
                      style={{ color: colors.secondary }}
                    />
                    Department Code <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={formData.code || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    className='w-full rounded-lg px-3 py-2 transition-all'
                    style={{
                      border: `1px solid ${colors.tertiary}60`,
                      backgroundColor: "white",
                      color: colors.primary,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = `${colors.tertiary}60`;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    required
                  />
                </div>

                <div>
                  <label
                    className='flex items-center gap-2 text-sm font-medium mb-2'
                    style={{ color: colors.primary }}
                  >
                    <Network
                      className='w-4 h-4'
                      style={{ color: colors.secondary }}
                    />
                    Department Name <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className='w-full rounded-lg px-3 py-2 transition-all'
                    style={{
                      border: `1px solid ${colors.tertiary}60`,
                      backgroundColor: "white",
                      color: colors.primary,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = `${colors.tertiary}60`;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    required
                  />
                </div>

                <div className='md:col-span-2'>
                  <label
                    className='flex items-center gap-2 text-sm font-medium mb-2'
                    style={{ color: colors.primary }}
                  >
                    <FileText
                      className='w-4 h-4'
                      style={{ color: colors.secondary }}
                    />
                    Description
                  </label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className='w-full rounded-lg px-3 py-2 transition-all'
                    style={{
                      border: `1px solid ${colors.tertiary}60`,
                      backgroundColor: "white",
                      color: colors.primary,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = `${colors.tertiary}60`;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    rows={3}
                  />
                </div>

                <div>
                  <label
                    className='flex items-center gap-2 text-sm font-medium mb-2'
                    style={{ color: colors.primary }}
                  >
                    <Building2
                      className='w-4 h-4'
                      style={{ color: colors.secondary }}
                    />
                    Building
                  </label>
                  <select
                    value={formData.buildingId || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        buildingId: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    className='w-full rounded-lg px-3 py-2 transition-all'
                    style={{
                      border: `1px solid ${colors.tertiary}60`,
                      backgroundColor: "white",
                      color: colors.primary,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = `${colors.tertiary}60`;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <option value=''>Select Building (Optional)</option>
                    {mockBuildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name} ({building.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className='flex items-center gap-2 text-sm font-medium mb-2'
                    style={{ color: colors.primary }}
                  >
                    <User
                      className='w-4 h-4'
                      style={{ color: colors.secondary }}
                    />
                    Department Head
                  </label>
                  <input
                    type='text'
                    value={formData.head || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, head: e.target.value })
                    }
                    className='w-full rounded-lg px-3 py-2 transition-all'
                    style={{
                      border: `1px solid ${colors.tertiary}60`,
                      backgroundColor: "white",
                      color: colors.primary,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = `${colors.tertiary}60`;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>

                <div>
                  <label
                    className='flex items-center gap-2 text-sm font-medium mb-2'
                    style={{ color: colors.primary }}
                  >
                    <CheckCircle2
                      className='w-4 h-4'
                      style={{ color: colors.secondary }}
                    />
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
                      backgroundColor: "white",
                      color: colors.primary,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = `${colors.tertiary}60`;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <option value='active'>Active</option>
                    <option value='inactive'>Inactive</option>
                  </select>
                </div>
              </div>

              <div
                className='flex justify-end gap-3 pt-4 mt-6 border-t'
                style={{ borderColor: `${colors.accent}30` }}
              >
                <button
                  type='button'
                  onClick={onCancel}
                  className='px-6 py-2.5 rounded-lg transition-colors font-medium flex items-center gap-2'
                  style={{
                    color: colors.primary,
                    border: `1px solid ${colors.tertiary}60`,
                    backgroundColor: "white",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${colors.accent}15`;
                    e.currentTarget.style.borderColor = colors.tertiary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "white";
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
                  {department ? "Update Department" : "Add Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveDepartment = (departmentData: Department) => {
    if (editingDepartment) {
      setDepartments((prev) =>
        prev.map((d) => (d.id === departmentData.id ? departmentData : d))
      );
      setEditingDepartment(null);
    } else {
      setDepartments((prev) => [...prev, departmentData]);
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteDepartment = (id: number) => {
    if (confirm("Are you sure you want to delete this department?")) {
      setDepartments((prev) => prev.filter((d) => d.id !== id));
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
            Department Management
          </h1>
          <p style={{ color: colors.primary }}>
            Manage department information and settings
          </p>
        </div>

        <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6'>
          <div className='flex flex-col md:flex-row gap-4'>
            <div className='flex-1 min-w-0'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                <input
                  type='text'
                  placeholder='Search departments by name, code, or head...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
            </div>

            <div className='flex gap-3'>
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
                Add Department
              </button>
            </div>
          </div>
        </div>

        {/* Departments Table */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
          <div className='overflow-x-auto w-full'>
            <table className='w-full min-w-[900px]'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Department
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Code
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Building
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Head
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
                {filteredDepartments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className='px-6 py-8 text-center text-gray-500'
                    >
                      No departments found
                    </td>
                  </tr>
                ) : (
                  filteredDepartments.map((dept) => (
                    <tr
                      key={dept.id}
                      className='hover:bg-gray-50 transition-colors'
                    >
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          <div className='flex-shrink-0 h-10 w-10'>
                            <div
                              className='h-10 w-10 rounded-lg flex items-center justify-center'
                              style={{ backgroundColor: `${colors.primary}15` }}
                            >
                              <Network
                                className='h-5 w-5'
                                style={{ color: colors.primary }}
                              />
                            </div>
                          </div>
                          <div className='ml-4'>
                            <div className='text-sm font-medium text-gray-900'>
                              {dept.name}
                            </div>
                            {dept.description && (
                              <div className='text-sm text-gray-500'>
                                {dept.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm font-medium text-gray-900'>
                          {dept.code}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900'>
                          {dept.buildingName || "N/A"}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900'>
                          {dept.head || "N/A"}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            dept.status
                          )}`}
                        >
                          {dept.status}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <div className='flex justify-end gap-2'>
                          <button
                            onClick={() => setEditingDepartment(dept)}
                            className='text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors'
                            title='Edit'
                          >
                            <Edit2 className='w-4 h-4' />
                          </button>
                          <button
                            onClick={() => handleDeleteDepartment(dept.id)}
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

        {/* Add/Edit Department Form */}
        {(isAddModalOpen || editingDepartment) && (
          <DepartmentForm
            department={editingDepartment}
            onSave={handleSaveDepartment}
            onCancel={() => {
              setEditingDepartment(null);
              setIsAddModalOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default DepartmentManagement;
