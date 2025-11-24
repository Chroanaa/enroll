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
  Filter,
} from "lucide-react";
import { mockSections } from "../../data/mockData";
import { Section, Course } from "../../types";
import { mockCourses } from "../../data/mockData";
import { colors } from "../../colors";

const SectionManagement: React.FC = () => {
  const [sections, setSections] = useState<Section[]>(
    mockSections.map((section) => ({
      ...section,
      courseName:
        mockCourses.find((c) => parseInt(c.id) === section.course_id)?.name ||
        "",
    }))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredSections = sections.filter((section) => {
    const matchesSearch =
      section.section_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.advisor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (section as any).courseName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || section.status === statusFilter;
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

  const SectionForm: React.FC<{
    section: Section | null;
    onSave: (section: Section) => void;
    onCancel: () => void;
  }> = ({ section, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Section>>(
      section || {
        section_name: "",
        course_id: parseInt(mockCourses[0]?.id || "1"),
        advisor: "",
        student_count: 0,
        status: "active",
      }
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (
        formData.section_name &&
        formData.course_id &&
        formData.advisor !== undefined
      ) {
        const courseName =
          mockCourses.find((c) => parseInt(c.id) === formData.course_id)
            ?.name || "";
        const sectionData: Partial<Section> & { courseName?: string } = {
          ...formData,
          section_name: formData.section_name!,
          course_id: formData.course_id!,
          advisor: formData.advisor || "",
          student_count: formData.student_count || 0,
          status: formData.status || "active",
        };
        fetch("/api/auth/section", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sectionData),
        });
        onSave({
          ...sectionData,
          id: section?.id || Math.random(),
          courseName: courseName,
        } as Section);
      }
    };

    return (
      <div
        className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={onCancel}
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
                <FolderTree
                  className='w-5 h-5'
                  style={{ color: colors.secondary }}
                />
              </div>
              <div>
                <h2
                  className='text-xl font-bold'
                  style={{ color: colors.primary }}
                >
                  {section ? "Edit Section" : "Add New Section"}
                </h2>
                <p className='text-sm text-gray-500'>
                  {section
                    ? "Update section details"
                    : "Create a new section record"}
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
                <div>
                  <label
                    className='flex items-center gap-2 text-sm font-semibold mb-2'
                    style={{ color: colors.primary }}
                  >
                    <Hash className='w-4 h-4 text-gray-400' />
                    Section Name <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={formData.section_name || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        section_name: e.target.value.toUpperCase(),
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
                    placeholder="e.g. A"
                    required
                  />
                </div>

                <div>
                  <label
                    className='flex items-center gap-2 text-sm font-semibold mb-2'
                    style={{ color: colors.primary }}
                  >
                    <BookOpen className='w-4 h-4 text-gray-400' />
                    Course <span className='text-red-500'>*</span>
                  </label>
                  <select
                    value={formData.course_id?.toString() || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        course_id: parseInt(e.target.value),
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
                    {mockCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='md:col-span-2'>
                  <label
                    className='flex items-center gap-2 text-sm font-semibold mb-2'
                    style={{ color: colors.primary }}
                  >
                    <User className='w-4 h-4 text-gray-400' />
                    Advisor <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={formData.advisor || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, advisor: e.target.value })
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
                    placeholder="e.g. Dr. John Doe"
                    required
                  />
                </div>

                <div>
                  <label
                    className='flex items-center gap-2 text-sm font-semibold mb-2'
                    style={{ color: colors.primary }}
                  >
                    <Users className='w-4 h-4 text-gray-400' />
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
                    value={formData.status?.toString() || "active"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value,
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
                    <option value={"active"}>Active</option>
                    <option value={"inactive"}>Inactive</option>
                  </select>
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
                  {section ? "Save Changes" : "Add Section"}
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
              Section Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Manage section information and settings
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
            style={{ backgroundColor: colors.secondary }}
          >
            <Plus className='w-5 h-5' />
            <span className='font-medium'>Add Section</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className='bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between'>
          <div className='relative flex-1 w-full md:max-w-md'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
            <input
              type='text'
              placeholder='Search sections...'
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

        {/* Sections Table */}
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
                    Section
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                    Course
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                    Advisor
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-600'>
                    Student Count
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
                {filteredSections.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className='px-6 py-12 text-center text-gray-500'
                    >
                      <div className='flex flex-col items-center justify-center gap-3'>
                        <div
                          className='p-3 rounded-full'
                          style={{ backgroundColor: `${colors.primary}05` }}
                        >
                          <FolderTree
                            className='w-6 h-6'
                            style={{ color: colors.primary }}
                          />
                        </div>
                        <p className='font-medium'>No sections found</p>
                        <p className='text-sm text-gray-400'>
                          Try adjusting your search or filters
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSections.map((section) => {
                    const statusStyles = getStatusColor(section.status);
                    return (
                      <tr
                        key={section.id}
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
                                <FolderTree
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
                                {section.section_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className='px-6 py-4'>
                          <div className='flex items-center gap-2'>
                            <BookOpen className='w-3.5 h-3.5 text-gray-400' />
                            <span className='text-sm text-gray-600'>
                              {(section as any).courseName || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='flex items-center gap-2'>
                            <User className='w-3.5 h-3.5 text-gray-400' />
                            <span className='text-sm text-gray-600'>
                              {section.advisor || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='flex items-center gap-2'>
                            <Users className='w-3.5 h-3.5 text-gray-400' />
                            <span className='text-sm font-medium text-gray-700'>
                              {section.student_count}
                            </span>
                          </div>
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
                            {section.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                          <div className='flex justify-end gap-2'>
                            <button
                              onClick={() => setEditingSection(section)}
                              className='p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all text-blue-600'
                              title='Edit'
                            >
                              <Edit2 className='w-4 h-4' />
                            </button>
                            <button
                              onClick={() => handleDeleteSection(section.id)}
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
