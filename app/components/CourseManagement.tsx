"use client";
import React, { useState } from "react";
import {
  Search,
  Plus,
  CreditCard as Edit,
  Trash2,
  BookOpen,
  Users,
  GraduationCap,
  User,
} from "lucide-react";
import { Course } from "../types";

import { colors } from "../colors";

const CourseManagement: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const getCapacityColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-yellow-600";
    return "text-emerald-600";
  };

  const getCapacityBg = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return "bg-red-100";
    if (percentage >= 75) return "bg-yellow-100";
    return "bg-emerald-100";
  };

  const CourseForm: React.FC<{
    course?: Course;
    onSave: (course: Course) => void;
    onCancel: () => void;
  }> = ({ course, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Course>(
      course || {
        id: "",
        code: "",
        name: "",
        credits: 3,
        instructor: "",
        semester: "",
        maxCapacity: 50,
        currentEnrollment: 0,
        department: 0,
      }
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (formData.code && formData.name && formData.instructor) {
        onSave({
          ...formData,
          id: course?.id || Date.now().toString(),
        } as Course);
      }
    };

    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
        <div className='bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto'>
          <h2 className='text-xl font-bold text-gray-900 mb-4'>
            {course ? "Edit Course" : "Add New Course"}
          </h2>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Course Code
                </label>
                <input
                  type='text'
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  placeholder='e.g., CS101'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Credits
                </label>
                <input
                  type='number'
                  min='1'
                  max='6'
                  value={formData.credits}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      credits: parseInt(e.target.value),
                    })
                  }
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  required
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Course Name
              </label>
              <input
                type='text'
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                placeholder='e.g., Introduction to Computer Science'
                required
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Instructor
              </label>
              <input
                type='text'
                value={formData.instructor}
                onChange={(e) =>
                  setFormData({ ...formData, instructor: e.target.value })
                }
                className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                placeholder='e.g., Dr. Smith'
                required
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Semester
                </label>
                <input
                  type='text'
                  value={formData.semester}
                  onChange={(e) =>
                    setFormData({ ...formData, semester: e.target.value })
                  }
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  placeholder='e.g., Fall 2024'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Department
                </label>
                <input
                  type='text'
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      department: parseInt(e.target.value),
                    })
                  }
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  placeholder='e.g., Computer Science'
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Max Capacity
                </label>
                <input
                  type='number'
                  min='1'
                  value={formData.maxCapacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxCapacity: parseInt(e.target.value),
                    })
                  }
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Current Enrollment
                </label>
                <input
                  type='number'
                  min='0'
                  value={formData.currentEnrollment}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      currentEnrollment: parseInt(e.target.value),
                    })
                  }
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
            </div>

            <div className='flex justify-end gap-3 pt-4'>
              <button
                type='button'
                onClick={onCancel}
                className='px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
              >
                Cancel
              </button>
              <button
                type='submit'
                className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
              >
                {course ? "Update" : "Add"} Course
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const handleSaveCourse = (courseData: Course) => {
    if (editingCourse) {
      setCourses((prev) =>
        prev?.map((c) => (c.id === courseData.id ? courseData : c))
      );
      setEditingCourse(null);
    } else {
      setCourses((prev) => [...(prev ?? []), courseData]);
      setIsAddingCourse(false);
    }
  };

  const handleDeleteCourse = (courseId: string) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      setCourses((prev) => prev?.filter((c) => c.id !== courseId));
    }
  };

  return (
    <div className='p-4 sm:p-6 bg-gray-50 min-h-screen'>
      <div className='max-w-6xl mx-auto w-full'>
        {/* Header */}
        <div className='mb-6'>
          <h1
            className='text-2xl font-bold mb-2'
            style={{ color: colors.primary }}
          >
            Course Management
          </h1>
          <p style={{ color: colors.primary }}>
            Manage courses and their enrollment capacity
          </p>
        </div>

        {/* Controls */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6'>
          <div className='flex flex-col md:flex-row gap-4'>
            <div className='flex-1 min-w-0'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                <input
                  type='text'
                  placeholder='Search courses by code, name, or instructor...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
            </div>

            <div className='flex gap-3'>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                <option value='all'>All Departments</option>
              </select>

              <button
                onClick={() => setIsAddingCourse(true)}
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
                Add Course
              </button>
            </div>
          </div>
        </div>

        {/* Add/Edit Course Form */}
        {isAddingCourse && (
          <CourseForm
            onSave={handleSaveCourse}
            onCancel={() => setIsAddingCourse(false)}
          />
        )}

        {editingCourse && (
          <CourseForm
            course={editingCourse}
            onSave={handleSaveCourse}
            onCancel={() => setEditingCourse(null)}
          />
        )}
      </div>
    </div>
  );
};

export default CourseManagement;
