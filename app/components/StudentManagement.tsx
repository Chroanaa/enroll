"use client";
import React, { useState } from "react";
import {
  Search,
  Plus,
  CreditCard as Edit,
  Trash2,
  GraduationCap,
  Mail,
  User,
} from "lucide-react";
import { Student } from "../types";
import { mockStudents } from "../data/mockData";

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive" | "graduated"
  >("all");
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.major.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || student.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "graduated":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getGPAColor = (gpa: number) => {
    if (gpa >= 3.5) return "text-emerald-600";
    if (gpa >= 3.0) return "text-yellow-600";
    return "text-red-600";
  };

  const StudentForm: React.FC<{
    student?: Student;
    onSave: (student: Student) => void;
    onCancel: () => void;
  }> = ({ student, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Student>>(
      student || {
        firstName: "",
        lastName: "",
        email: "",
        dateOfBirth: "",
        enrollmentDate: "",
        status: "active",
        gpa: 0,
        major: "",
      }
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (formData.firstName && formData.lastName && formData.email) {
        onSave({
          ...formData,
          id: student?.id || Date.now().toString(),
        } as Student);
      }
    };

    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
        <div className='bg-white rounded-xl max-w-md w-full p-6'>
          <h2 className='text-xl font-bold text-gray-900 mb-4'>
            {student ? "Edit Student" : "Add New Student"}
          </h2>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  First Name
                </label>
                <input
                  type='text'
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Last Name
                </label>
                <input
                  type='text'
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  required
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Email
              </label>
              <input
                type='email'
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                required
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Date of Birth
                </label>
                <input
                  type='date'
                  value={formData.dateOfBirth}
                  onChange={(e) =>
                    setFormData({ ...formData, dateOfBirth: e.target.value })
                  }
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
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
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as Student["status"],
                    })
                  }
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                >
                  <option value='active'>Active</option>
                  <option value='inactive'>Inactive</option>
                  <option value='graduated'>Graduated</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  GPA
                </label>
                <input
                  type='number'
                  min='0'
                  max='4'
                  step='0.1'
                  value={formData.gpa}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gpa: parseFloat(e.target.value),
                    })
                  }
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Major
              </label>
              <input
                type='text'
                value={formData.major}
                onChange={(e) =>
                  setFormData({ ...formData, major: e.target.value })
                }
                className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
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
                {student ? "Update" : "Add"} Student
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const handleSaveStudent = (studentData: Student) => {
    if (editingStudent) {
      setStudents((prev) =>
        prev.map((s) => (s.id === studentData.id ? studentData : s))
      );
      setEditingStudent(null);
    } else {
      setStudents((prev) => [...prev, studentData]);
      setIsAddingStudent(false);
    }
  };

  const handleDeleteStudent = (studentId: string) => {
    if (window.confirm("Are you sure you want to delete this student?")) {
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    }
  };

  return (
    <div className='p-4 sm:p-6 bg-gray-50 min-h-screen'>
      <div className='max-w-6xl mx-auto w-full'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-gray-900 mb-2'>
            Student Management
          </h1>
          <p className='text-gray-600'>
            Manage student records and information
          </p>
        </div>

        <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6'>
          <div className='flex flex-col md:flex-row gap-4'>
            <div className='flex-1 min-w-0'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                <input
                  type='text'
                  placeholder='Search students by name, email, or major...'
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
                <option value='graduated'>Graduated</option>
              </select>

              <button
                onClick={() => setIsAddingStudent(true)}
                className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
              >
                <Plus className='w-4 h-4' />
                Add Student
              </button>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
          <div className='overflow-x-auto w-full'>
            <table className='w-full min-w-[600px]'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Student
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Major
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    GPA
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Status
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Enrollment Date
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className='hover:bg-gray-50 transition-colors'
                  >
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <div className='flex-shrink-0 h-10 w-10'>
                          <div className='h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center'>
                            <User className='h-5 w-5 text-blue-600' />
                          </div>
                        </div>
                        <div className='ml-4'>
                          <div className='text-sm font-medium text-gray-900'>
                            {student.firstName} {student.lastName}
                          </div>
                          <div className='text-sm text-gray-500 flex items-center'>
                            <Mail className='w-3 h-3 mr-1' />
                            {student.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center'>
                        <GraduationCap className='w-4 h-4 text-gray-400 mr-2' />
                        <span className='text-sm text-gray-900'>
                          {student.major}
                        </span>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`text-sm font-medium ${getGPAColor(
                          student.gpa
                        )}`}
                      >
                        {student.gpa.toFixed(1)}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          student.status
                        )}`}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {new Date(student.enrollmentDate).toLocaleDateString()}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <div className='flex justify-end gap-2'>
                        <button
                          onClick={() => setEditingStudent(student)}
                          className='text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors'
                        >
                          <Edit className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
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

          {filteredStudents.length === 0 && (
            <div className='text-center py-12'>
              <User className='mx-auto h-12 w-12 text-gray-400' />
              <h3 className='mt-2 text-sm font-medium text-gray-900'>
                No students found
              </h3>
              <p className='mt-1 text-sm text-gray-500'>
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Get started by adding a new student."}
              </p>
            </div>
          )}
        </div>

        {/* Add/Edit Student Form */}
        {isAddingStudent && (
          <StudentForm
            onSave={handleSaveStudent}
            onCancel={() => setIsAddingStudent(false)}
          />
        )}

        {editingStudent && (
          <StudentForm
            student={editingStudent}
            onSave={handleSaveStudent}
            onCancel={() => setEditingStudent(null)}
          />
        )}
      </div>
    </div>
  );
};

export default StudentManagement;
