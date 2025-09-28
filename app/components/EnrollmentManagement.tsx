"use client";
import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  CreditCard as Edit,
  Trash2,
  UserPlus,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
} from "lucide-react";
import { Enrollment, Student, Course } from "../types";
import { mockEnrollments, mockStudents, mockCourses } from "../data/mockData";

const EnrollmentManagement: React.FC = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>(mockEnrollments);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "enrolled" | "completed" | "dropped" | "pending"
  >("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [isAddingEnrollment, setIsAddingEnrollment] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(
    null
  );

  const enrichedEnrollments = useMemo(() => {
    return enrollments.map((enrollment) => {
      const student = mockStudents.find((s) => s.id === enrollment.studentId);
      const course = mockCourses.find((c) => c.id === enrollment.courseId);
      return {
        ...enrollment,
        student,
        course,
      };
    });
  }, [enrollments]);

  const filteredEnrollments = enrichedEnrollments.filter((enrollment) => {
    const matchesSearch =
      enrollment.student?.firstName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      enrollment.student?.lastName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      enrollment.course?.code
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      enrollment.course?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || enrollment.status === statusFilter;
    const matchesCourse =
      courseFilter === "all" || enrollment.courseId === courseFilter;

    return matchesSearch && matchesStatus && matchesCourse;
  });

  const stats = useMemo(() => {
    const total = enrollments.length;
    const enrolled = enrollments.filter((e) => e.status === "enrolled").length;
    const completed = enrollments.filter(
      (e) => e.status === "completed"
    ).length;
    const pending = enrollments.filter((e) => e.status === "pending").length;
    const dropped = enrollments.filter((e) => e.status === "dropped").length;

    return { total, enrolled, completed, pending, dropped };
  }, [enrollments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "enrolled":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-emerald-100 text-emerald-800";
      case "dropped":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "enrolled":
        return <UserPlus className='w-4 h-4' />;
      case "completed":
        return <CheckCircle className='w-4 h-4' />;
      case "dropped":
        return <XCircle className='w-4 h-4' />;
      case "pending":
        return <Clock className='w-4 h-4' />;
      default:
        return <Clock className='w-4 h-4' />;
    }
  };

  const EnrollmentForm: React.FC<{
    enrollment?: Enrollment;
    onSave: (enrollment: Enrollment) => void;
    onCancel: () => void;
  }> = ({ enrollment, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Enrollment>>(
      enrollment || {
        studentId: "",
        courseId: "",
        enrollmentDate: new Date().toISOString().split("T")[0],
        status: "pending",
        grade: "",
      }
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (formData.studentId && formData.courseId) {
        onSave({
          ...formData,
          id: enrollment?.id || Date.now().toString(),
        } as Enrollment);
      }
    };

    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
        <div className='bg-white rounded-xl max-w-md w-full p-6'>
          <h2 className='text-xl font-bold text-gray-900 mb-4'>
            {enrollment ? "Edit Enrollment" : "New Enrollment"}
          </h2>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Student
              </label>
              <select
                value={formData.studentId}
                onChange={(e) =>
                  setFormData({ ...formData, studentId: e.target.value })
                }
                className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                required
              >
                <option value=''>Select a student</option>
                {mockStudents
                  .filter((s) => s.status === "active")
                  .map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} - {student.major}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Course
              </label>
              <select
                value={formData.courseId}
                onChange={(e) =>
                  setFormData({ ...formData, courseId: e.target.value })
                }
                className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                required
              >
                <option value=''>Select a course</option>
                {mockCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Enrollment Date
                </label>
                <input
                  type='date'
                  value={formData.enrollmentDate}
                  onChange={(e) =>
                    setFormData({ ...formData, enrollmentDate: e.target.value })
                  }
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as Enrollment["status"],
                    })
                  }
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                >
                  <option value='pending'>Pending</option>
                  <option value='enrolled'>Enrolled</option>
                  <option value='completed'>Completed</option>
                  <option value='dropped'>Dropped</option>
                </select>
              </div>
            </div>

            {formData.status === "completed" && (
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Grade
                </label>
                <select
                  value={formData.grade || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, grade: e.target.value })
                  }
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                >
                  <option value=''>Select grade</option>
                  <option value='A+'>A+</option>
                  <option value='A'>A</option>
                  <option value='A-'>A-</option>
                  <option value='B+'>B+</option>
                  <option value='B'>B</option>
                  <option value='B-'>B-</option>
                  <option value='C+'>C+</option>
                  <option value='C'>C</option>
                  <option value='C-'>C-</option>
                  <option value='D'>D</option>
                  <option value='F'>F</option>
                </select>
              </div>
            )}

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
                {enrollment ? "Update" : "Create"} Enrollment
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const handleSaveEnrollment = (enrollmentData: Enrollment) => {
    if (editingEnrollment) {
      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollmentData.id ? enrollmentData : e))
      );
      setEditingEnrollment(null);
    } else {
      setEnrollments((prev) => [...prev, enrollmentData]);
      setIsAddingEnrollment(false);
    }
  };

  const handleDeleteEnrollment = (enrollmentId: string) => {
    if (window.confirm("Are you sure you want to delete this enrollment?")) {
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
    }
  };

  const handleStatusChange = (
    enrollmentId: string,
    newStatus: Enrollment["status"]
  ) => {
    setEnrollments((prev) =>
      prev.map((e) => (e.id === enrollmentId ? { ...e, status: newStatus } : e))
    );
  };

  return (
    <div className='p-4 sm:p-6 bg-gray-50 min-h-screen'>
      <div className='max-w-7xl mx-auto w-full'>
        {/* Header */}
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-gray-900 mb-2'>
            Enrollment Management
          </h1>
          <p className='text-gray-600'>
            Manage student course enrollments and track progress
          </p>
        </div>

        {/* Stats Cards */}
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6'>
          <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-gray-600'>Total</p>
                <p className='text-2xl font-bold text-gray-900'>
                  {stats.total}
                </p>
              </div>
              <UserPlus className='w-8 h-8 text-gray-400' />
            </div>
          </div>
          <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-blue-600'>Enrolled</p>
                <p className='text-2xl font-bold text-blue-900'>
                  {stats.enrolled}
                </p>
              </div>
              <CheckCircle className='w-8 h-8 text-blue-400' />
            </div>
          </div>
          <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-emerald-600'>Completed</p>
                <p className='text-2xl font-bold text-emerald-900'>
                  {stats.completed}
                </p>
              </div>
              <CheckCircle className='w-8 h-8 text-emerald-400' />
            </div>
          </div>
          <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-yellow-600'>Pending</p>
                <p className='text-2xl font-bold text-yellow-900'>
                  {stats.pending}
                </p>
              </div>
              <Clock className='w-8 h-8 text-yellow-400' />
            </div>
          </div>
          <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-red-600'>Dropped</p>
                <p className='text-2xl font-bold text-red-900'>
                  {stats.dropped}
                </p>
              </div>
              <XCircle className='w-8 h-8 text-red-400' />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6'>
          <div className='flex flex-col md:flex-row gap-4'>
            <div className='flex-1'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                <input
                  type='text'
                  placeholder='Search by student name or course...'
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
                <option value='enrolled'>Enrolled</option>
                <option value='completed'>Completed</option>
                <option value='pending'>Pending</option>
                <option value='dropped'>Dropped</option>
              </select>

              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                <option value='all'>All Courses</option>
                {mockCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setIsAddingEnrollment(true)}
                className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
              >
                <Plus className='w-4 h-4' />
                New Enrollment
              </button>
            </div>
          </div>
        </div>

        {/* Enrollments Table */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
          <div className='overflow-x-auto w-full'>
            <table className='w-full'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Student
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Course
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Status
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Enrollment Date
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Grade
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {filteredEnrollments.map((enrollment) => (
                  <tr
                    key={enrollment.id}
                    className='hover:bg-gray-50 transition-colors'
                  >
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm font-medium text-gray-900'>
                        {enrollment.student?.firstName}{" "}
                        {enrollment.student?.lastName}
                      </div>
                      <div className='text-sm text-gray-500'>
                        {enrollment.student?.major}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm font-medium text-gray-900'>
                        {enrollment.course?.code}
                      </div>
                      <div className='text-sm text-gray-500'>
                        {enrollment.course?.name}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <select
                          value={enrollment.status}
                          onChange={(e) =>
                            handleStatusChange(
                              enrollment.id,
                              e.target.value as Enrollment["status"]
                            )
                          }
                          className={`text-xs font-semibold rounded-full px-2 py-1 border-0 ${getStatusColor(
                            enrollment.status
                          )} focus:ring-2 focus:ring-blue-500`}
                        >
                          <option value='pending'>Pending</option>
                          <option value='enrolled'>Enrolled</option>
                          <option value='completed'>Completed</option>
                          <option value='dropped'>Dropped</option>
                        </select>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      {enrollment.grade ? (
                        <span className='text-sm font-medium text-gray-900'>
                          {enrollment.grade}
                        </span>
                      ) : (
                        <span className='text-sm text-gray-400'>-</span>
                      )}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <div className='flex justify-end gap-2'>
                        <button
                          onClick={() => setEditingEnrollment(enrollment)}
                          className='text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors'
                        >
                          <Edit className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => handleDeleteEnrollment(enrollment.id)}
                          className='text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors'
                        >
                          <Trash2 className='w-4 h-4' />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredEnrollments.length === 0 && (
            <div className='text-center py-12'>
              <UserPlus className='mx-auto h-12 w-12 text-gray-400' />
              <h3 className='mt-2 text-sm font-medium text-gray-900'>
                No enrollments found
              </h3>
              <p className='mt-1 text-sm text-gray-500'>
                {searchTerm || statusFilter !== "all" || courseFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Get started by creating a new enrollment."}
              </p>
            </div>
          )}
        </div>

        {/* Add/Edit Enrollment Form */}
        {isAddingEnrollment && (
          <EnrollmentForm
            onSave={handleSaveEnrollment}
            onCancel={() => setIsAddingEnrollment(false)}
          />
        )}

        {editingEnrollment && (
          <EnrollmentForm
            enrollment={editingEnrollment}
            onSave={handleSaveEnrollment}
            onCancel={() => setEditingEnrollment(null)}
          />
        )}
      </div>
    </div>
  );
};

export default EnrollmentManagement;
