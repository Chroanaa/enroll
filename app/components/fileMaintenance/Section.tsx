"use client";
import React, { useState } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  FolderTree,
  Users,
  Hash,
  BookOpen,
  User,
  CheckCircle2,
  X,
} from "lucide-react";
import { mockSections } from "../../data/mockData";
import { Section, Course } from "../../types";
import { mockCourses } from "../../data/mockData";
import { colors } from "../../colors";

const SectionManagement: React.FC = () => {
  const [sections, setSections] = useState<Section[]>(
    mockSections.map((section) => ({
      ...section,
      courseName: mockCourses.find((c) => parseInt(c.id) === section.courseId)?.name || "",
    }))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredSections = sections.filter((section) => {
    const matchesSearch =
      section.section_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.advisor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.courseName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && section.status === 1) ||
      (statusFilter === "inactive" && section.status === 0);
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1:
        return "bg-emerald-100 text-emerald-800";
      case 0:
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const SectionForm: React.FC<{
    section: Section | null;
    onSave: (section: Section) => void;
    onCancel: () => void;
  }> = ({ section, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Section>>(
      section || {
        section_name: "",
        courseId: parseInt(mockCourses[0]?.id || "1"),
        advisor: "",
        student_count: 0,
        status: 1,
      }
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (formData.section_name && formData.courseId && formData.advisor !== undefined) {
        const courseName = mockCourses.find(
          (c) => parseInt(c.id) === formData.courseId
        )?.name || "";
        const sectionData: Section & { courseName?: string } = {
          ...formData,
          id: section?.id || Date.now(),
          section_name: formData.section_name!,
          courseId: formData.courseId!,
          advisor: formData.advisor || "",
          student_count: formData.student_count || 0,
          status: formData.status || 1,
          courseName,
        };
        onSave(sectionData as Section);
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
                <FolderTree className='w-5 h-5' style={{ color: colors.secondary }} />
              </div>
              <h2 
                className='text-xl font-bold'
                style={{ color: colors.primary }}
              >
                {section ? "Edit Section" : "Add New Section"}
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
                  <Hash className='w-4 h-4' style={{ color: colors.secondary }} />
                  Section Name <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={formData.section_name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, section_name: e.target.value.toUpperCase() })
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
                  <BookOpen className='w-4 h-4' style={{ color: colors.secondary }} />
                  Course <span className='text-red-500'>*</span>
                </label>
                <select
                  value={formData.courseId?.toString() || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, courseId: parseInt(e.target.value) })
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
                  {mockCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className='md:col-span-2'>
                <label 
                  className='flex items-center gap-2 text-sm font-medium mb-2'
                  style={{ color: colors.primary }}
                >
                  <User className='w-4 h-4' style={{ color: colors.secondary }} />
                  Advisor <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={formData.advisor || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, advisor: e.target.value })
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
                  <Users className='w-4 h-4' style={{ color: colors.secondary }} />
                  Student Count
                </label>
                <input
                  type='number'
                  min='0'
                  value={formData.student_count || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      student_count: parseInt(e.target.value) || 0,
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
                />
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
                  value={formData.status?.toString() || "1"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: parseInt(e.target.value),
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
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
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
                {section ? "Update Section" : "Add Section"}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveSection = (sectionData: Section) => {
    if (editingSection) {
      setSections((prev) =>
        prev.map((s) => (s.id === sectionData.id ? sectionData : s))
      );
      setEditingSection(null);
    } else {
      setSections((prev) => [...prev, sectionData]);
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteSection = (id: number) => {
    if (confirm("Are you sure you want to delete this section?")) {
      setSections((prev) => prev.filter((s) => s.id !== id));
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
            Section Management
          </h1>
          <p style={{ color: colors.primary }}>
            Manage section information and settings
          </p>
        </div>

        <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6'>
          <div className='flex flex-col md:flex-row gap-4'>
            <div className='flex-1 min-w-0'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                <input
                  type='text'
                  placeholder='Search sections by name, advisor, or course...'
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
                Add Section
              </button>
            </div>
          </div>
        </div>

        {/* Sections Table */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
          <div className='overflow-x-auto w-full'>
            <table className='w-full min-w-[900px]'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Section
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Course
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Advisor
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Student Count
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
                {filteredSections.length === 0 ? (
                  <tr>
                    <td colSpan={6} className='px-6 py-8 text-center text-gray-500'>
                      No sections found
                    </td>
                  </tr>
                ) : (
                  filteredSections.map((section) => (
                    <tr
                      key={section.id}
                      className='hover:bg-gray-50 transition-colors'
                    >
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          <div className='flex-shrink-0 h-10 w-10'>
                            <div
                              className='h-10 w-10 rounded-lg flex items-center justify-center'
                              style={{ backgroundColor: `${colors.primary}15` }}
                            >
                              <FolderTree
                                className='h-5 w-5'
                                style={{ color: colors.primary }}
                              />
                            </div>
                          </div>
                          <div className='ml-4'>
                            <div className='text-sm font-medium text-gray-900'>
                              {section.section_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4'>
                        <div className='text-sm text-gray-900'>
                          {section.courseName || "N/A"}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900'>
                          {section.advisor}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          <Users className='w-4 h-4 text-gray-400 mr-2' />
                          <span className='text-sm font-medium text-gray-900'>
                            {section.student_count}
                          </span>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            section.status
                          )}`}
                        >
                          {section.status === 1 ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <div className='flex justify-end gap-2'>
                          <button
                            onClick={() => setEditingSection(section)}
                            className='text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors'
                            title='Edit'
                          >
                            <Edit2 className='w-4 h-4' />
                          </button>
                          <button
                            onClick={() => handleDeleteSection(section.id)}
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

        {/* Add/Edit Section Form */}
        {(isAddModalOpen || editingSection) && (
          <SectionForm
            section={editingSection}
            onSave={handleSaveSection}
            onCancel={() => {
              setEditingSection(null);
              setIsAddModalOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default SectionManagement;
