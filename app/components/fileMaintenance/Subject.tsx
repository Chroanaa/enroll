"use client";
import React, { useState, useRef } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Hash,
  FileText,
  GraduationCap,
  Building2,
  CheckCircle2,
  X,
  Filter,
} from "lucide-react";
import { Subject } from "../../types";
import {
  mockSubjects,
  mockDepartments,
} from "../../data/mockData";
import { colors } from "../../colors";
import ConfirmationModal from "../common/ConfirmationModal";

const SubjectManagement: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>(
    mockSubjects.map((subject) => ({
      ...subject,
      departmentName:
        mockDepartments.find((d) => d.id === subject.department_id)?.name || "",
    }))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    subjectId: number | null;
    subjectName: string;
  }>({
    isOpen: false,
    subjectId: null,
    subjectName: "",
  });

  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch =
      subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.departmentName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || subject.status === statusFilter;
    return matchesSearch && matchesStatus;
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

  const SubjectForm: React.FC<{
    subject: Subject | null;
    onSave: (subject: Subject) => void;
    onCancel: () => void;
  }> = ({ subject, onSave, onCancel }) => {
    const initialFormData = useRef<Partial<Subject>>(
      subject || {
        code: "",
        name: "",
        description: "",
        units: 3,
        department_id: mockDepartments[0]?.id || 1,
        prerequisites: "",
        status: "active",
      }
    );

    const [formData, setFormData] = useState<Partial<Subject>>(
      initialFormData.current
    );
    const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
    const [showCancelWarning, setShowCancelWarning] = useState(false);

    const hasChanges = () => {
      if (!subject) return false;
      return (
        formData.code !== initialFormData.current.code ||
        formData.name !== initialFormData.current.name ||
        formData.description !== initialFormData.current.description ||
        formData.units !== initialFormData.current.units ||
        formData.department_id !== initialFormData.current.department_id ||
        formData.prerequisites !== initialFormData.current.prerequisites ||
        formData.status !== initialFormData.current.status
      );
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (formData.code && formData.name && formData.units) {
        if (subject && hasChanges()) {
          setShowSaveConfirmation(true);
        } else {
          performSave();
        }
      }
    };

    const performSave = () => {
      if (formData.code && formData.name && formData.units) {
        const departmentName =
          mockDepartments.find((d) => d.id === formData.department_id)?.name ||
          "";
        const subjectData: Partial<Subject> = {
          ...formData,
          code: formData.code.toUpperCase()!,
          name: formData.name!,
          description: formData.description || "",
          units: formData.units!,
          department_id: formData.department_id!,
          prerequisites: formData.prerequisites || "",
          status: (formData.status as "active" | "inactive") || "active",
        };
        fetch("/api/auth/subject", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subjectData),
        });
        onSave({
          ...subjectData,
          id: subject?.id || Math.random(),
          departmentName: departmentName,
        } as Subject);
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
          className='rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200'
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
                <BookOpen
                  className='w-5 h-5'
                  style={{ color: colors.secondary }}
                />
              </div>
              <div>
                <h2
                  className='text-xl font-bold'
                  style={{ color: colors.primary }}
                >
                  {subject ? "Edit Subject" : "Add New Subject"}
                </h2>
                <p className='text-sm text-gray-500'>
                  {subject
                    ? "Update subject details"
                    : "Create a new subject record"}
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
                <div>
                  <label
                    className='flex items-center gap-2 text-sm font-semibold mb-2'
                    style={{ color: colors.primary }}
                  >
                    <Hash className='w-4 h-4 text-gray-400' />
                    Subject Code <span className='text-red-500'>*</span>
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
                    className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                    style={{
                      border: "1px solid #E5E7EB",
                      outline: "none",
                      color: "#6B5B4F",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#E5E7EB";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    placeholder="e.g. MATH101"
                    required
                  />
                </div>

                <div>
                  <label
                    className='flex items-center gap-2 text-sm font-semibold mb-2'
                    style={{ color: colors.primary }}
                  >
                    <BookOpen className='w-4 h-4 text-gray-400' />
                    Subject Name <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                    style={{
                      border: "1px solid #E5E7EB",
                      outline: "none",
                      color: "#6B5B4F",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#E5E7EB";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    placeholder="e.g. Calculus I"
                    required
                  />
                </div>

                <div className='md:col-span-2'>
                  <label
                    className='flex items-center gap-2 text-sm font-semibold mb-2'
                    style={{ color: colors.primary }}
                  >
                    <FileText className='w-4 h-4 text-gray-400' />
                    Description
                  </label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                    style={{
                      border: "1px solid #E5E7EB",
                      outline: "none",
                      color: "#6B5B4F",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#E5E7EB";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    rows={3}
                    placeholder="Brief description of the subject..."
                  />
                </div>

                <div>
                  <label
                    className='flex items-center gap-2 text-sm font-semibold mb-2'
                    style={{ color: colors.primary }}
                  >
                    <GraduationCap className='w-4 h-4 text-gray-400' />
                    Units <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='number'
                    min='1'
                    max='6'
                    value={formData.units || 3}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        units: parseInt(e.target.value) || 3,
                      })
                    }
                    className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                    style={{
                      border: "1px solid #E5E7EB",
                      outline: "none",
                      color: "#6B5B4F",
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
                      color: "#6B5B4F",
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
                    {mockDepartments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name} ({department.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className='flex items-center gap-2 text-sm font-semibold mb-2'
                    style={{ color: colors.primary }}
                  >
                    <FileText className='w-4 h-4 text-gray-400' />
                    Prerequisites
                  </label>
                  <input
                    type='text'
                    value={formData.prerequisites || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, prerequisites: e.target.value })
                    }
                    className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                    style={{
                      border: "1px solid #E5E7EB",
                      outline: "none",
                      color: "#6B5B4F",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#E5E7EB";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    placeholder="e.g. MATH101, CS101"
                  />
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
                      color: "#6B5B4F",
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
                  {subject ? "Save Changes" : "Add Subject"}
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
            message={`Are you sure you want to save changes to "${formData.name || subject?.name}"?`}
            description='The subject information will be updated with the new details.'
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

  const handleSaveSubject = (subjectData: Subject) => {
    if (editingSubject) {
      setSubjects((prev) =>
        prev.map((s) => (s.id === subjectData.id ? subjectData : s))
      );
      setEditingSubject(null);
    } else {
      setSubjects((prev) => [...prev, subjectData]);
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteSubject = (id: number) => {
    const subject = subjects.find((s) => s.id === id);
    if (subject) {
      setDeleteConfirmation({
        isOpen: true,
        subjectId: id,
        subjectName: subject.name,
      });
    }
  };

  const confirmDeleteSubject = () => {
    if (deleteConfirmation.subjectId) {
      setSubjects((prev) =>
        prev.filter((s) => s.id !== deleteConfirmation.subjectId)
      );
      setDeleteConfirmation({
        isOpen: false,
        subjectId: null,
        subjectName: "",
      });
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
              Subject Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Manage academic subjects and their details
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
            style={{ backgroundColor: colors.secondary }}
          >
            <Plus className='w-5 h-5' />
            <span className='font-medium'>Add Subject</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className='bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between'>
          <div className='relative flex-1 w-full md:max-w-md'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
            <input
              type='text'
              placeholder='Search subjects...'
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

          <div className='flex items-center gap-3 w-full md:w-auto'>
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

        {/* Subjects Table */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[900px]'>
              <thead>
                <tr
                  style={{
                    backgroundColor: `${colors.primary}05`,
                    borderBottom: `1px solid ${colors.primary}10`,
                  }}
                >
                  <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                    Subject
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                    Code
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                    Department
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                    Units
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                    Prerequisites
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
                {filteredSubjects.length === 0 ? (
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
                          <BookOpen
                            className='w-6 h-6'
                            style={{ color: colors.primary }}
                          />
                        </div>
                        <p className='font-medium'>No subjects found</p>
                        <p className='text-sm text-gray-400'>
                          Try adjusting your search or filters
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((subject) => {
                    const statusStyles = getStatusColor(subject.status);
                    return (
                      <tr
                        key={subject.id}
                        className='group hover:bg-gray-50/50 transition-colors'
                      >
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='flex items-center'>
                            <div className='flex-shrink-0 h-10 w-10'>
                              <div
                                className='h-10 w-10 rounded-xl flex items-center justify-center shadow-sm'
                                style={{
                                  backgroundColor: "white",
                                  border: `1px solid ${colors.primary}10`,
                                }}
                              >
                                <BookOpen
                                  className='h-5 w-5'
                                  style={{ color: colors.primary }}
                                />
                              </div>
                            </div>
                            <div className='ml-4'>
                              <div
                                className='text-sm font-semibold'
                                style={{ color: colors.primary }}
                              >
                                {subject.name}
                              </div>
                              {subject.description && (
                                <div className='text-xs text-gray-500 mt-0.5 truncate max-w-[200px]'>
                                  {subject.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='flex items-center gap-2'>
                            <Hash className='w-3.5 h-3.5 text-gray-400' />
                            <span className='text-sm font-medium text-gray-700'>
                              {subject.code}
                            </span>
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='flex items-center gap-2'>
                            <Building2 className='w-3.5 h-3.5 text-gray-400' />
                            <span className='text-sm text-gray-600'>
                              {subject.departmentName || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='flex items-center gap-2'>
                            <GraduationCap className='w-3.5 h-3.5 text-gray-400' />
                            <span className='text-sm font-medium text-gray-700'>
                              {subject.units}
                            </span>
                          </div>
                        </td>
                        <td className='px-6 py-4'>
                          <span className='text-sm text-gray-600'>
                            {subject.prerequisites || "None"}
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
                            {subject.status.charAt(0).toUpperCase() +
                              subject.status.slice(1)}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                          <div className='flex justify-end gap-2'>
                            <button
                              onClick={() => setEditingSubject(subject)}
                              className='p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-blue-600'
                              title='Edit'
                            >
                              <Edit2 className='w-4 h-4' />
                            </button>
                            <button
                              onClick={() => handleDeleteSubject(subject.id)}
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

        {/* Add/Edit Subject Form */}
        {(isAddModalOpen || editingSubject) && (
          <SubjectForm
            subject={editingSubject}
            onSave={handleSaveSubject}
            onCancel={() => {
              setEditingSubject(null);
              setIsAddModalOpen(false);
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={deleteConfirmation.isOpen}
          onClose={() =>
            setDeleteConfirmation({
              isOpen: false,
              subjectId: null,
              subjectName: "",
            })
          }
          onConfirm={confirmDeleteSubject}
          title='Delete Subject'
          message={`Are you sure you want to delete "${deleteConfirmation.subjectName}"?`}
          description='This action cannot be undone. All associated data will be permanently removed.'
          confirmText='Delete Subject'
          cancelText='Cancel'
          variant='danger'
        />
      </div>
    </div>
  );
};

export default SubjectManagement;

