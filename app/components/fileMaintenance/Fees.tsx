"use client";
import React, { useState } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  Hash,
  FileText,
  Tag,
  Calendar,
  GraduationCap,
  CheckCircle2,
  X,
} from "lucide-react";
import { Fee, mockFees } from "../../data/mockData";
import { colors } from "../../colors";

const FeesManagement: React.FC = () => {
  const [fees, setFees] = useState<Fee[]>(mockFees);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredFees = fees.filter((fee) => {
    const matchesSearch =
      fee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.academicYear.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || fee.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || fee.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "tuition":
        return "bg-blue-100 text-blue-800";
      case "miscellaneous":
        return "bg-purple-100 text-purple-800";
      case "laboratory":
        return "bg-green-100 text-green-800";
      case "library":
        return "bg-yellow-100 text-yellow-800";
      case "other":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const FeesForm: React.FC<{
    fee: Fee | null;
    onSave: (fee: Fee) => void;
    onCancel: () => void;
  }> = ({ fee, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Fee>>(
      fee || {
        code: "",
        name: "",
        description: "",
        amount: 0,
        category: "miscellaneous",
        academicYear: "2024-2025",
        semester: "1st",
        status: "active",
      }
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (formData.code && formData.name && formData.amount !== undefined) {
        const feeData: Fee = {
          ...formData,
          id: fee?.id || Date.now(),
          code: formData.code.toUpperCase()!,
          name: formData.name!,
          description: formData.description || "",
          amount: formData.amount!,
          category: (formData.category as Fee["category"]) || "miscellaneous",
          academicYear: formData.academicYear || "2024-2025",
          semester: formData.semester || "1st",
          status: (formData.status as "active" | "inactive") || "active",
        };
        onSave(feeData);
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
                <DollarSign className='w-5 h-5' style={{ color: colors.secondary }} />
              </div>
              <h2 
                className='text-xl font-bold'
                style={{ color: colors.primary }}
              >
                {fee ? "Edit Fee" : "Add New Fee"}
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
                  Fee Code <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={formData.code || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
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
                  <DollarSign className='w-4 h-4' style={{ color: colors.secondary }} />
                  Fee Name <span className='text-red-500'>*</span>
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
                  <FileText className='w-4 h-4' style={{ color: colors.secondary }} />
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
                  rows={3}
                />
              </div>

              <div>
                <label 
                  className='flex items-center gap-2 text-sm font-medium mb-2'
                  style={{ color: colors.primary }}
                >
                  <DollarSign className='w-4 h-4' style={{ color: colors.secondary }} />
                  Amount (PHP) <span className='text-red-500'>*</span>
                </label>
                <input
                  type='number'
                  min='0'
                  step='0.01'
                  value={formData.amount || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
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
                  <Tag className='w-4 h-4' style={{ color: colors.secondary }} />
                  Category <span className='text-red-500'>*</span>
                </label>
                <select
                  value={formData.category || "miscellaneous"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as Fee["category"],
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
                  <option value='tuition'>Tuition</option>
                  <option value='miscellaneous'>Miscellaneous</option>
                  <option value='laboratory'>Laboratory</option>
                  <option value='library'>Library</option>
                  <option value='other'>Other</option>
                </select>
              </div>

              <div>
                <label 
                  className='flex items-center gap-2 text-sm font-medium mb-2'
                  style={{ color: colors.primary }}
                >
                  <Calendar className='w-4 h-4' style={{ color: colors.secondary }} />
                  Academic Year <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={formData.academicYear || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, academicYear: e.target.value })
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
                  placeholder='e.g., 2024-2025'
                  required
                />
              </div>

              <div>
                <label 
                  className='flex items-center gap-2 text-sm font-medium mb-2'
                  style={{ color: colors.primary }}
                >
                  <GraduationCap className='w-4 h-4' style={{ color: colors.secondary }} />
                  Semester
                </label>
                <select
                  value={formData.semester || "1st"}
                  onChange={(e) =>
                    setFormData({ ...formData, semester: e.target.value })
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
                  <option value='1st'>1st Semester</option>
                  <option value='2nd'>2nd Semester</option>
                  <option value='Summer'>Summer</option>
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
                {fee ? "Update Fee" : "Add Fee"}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveFee = (feeData: Fee) => {
    if (editingFee) {
      setFees((prev) =>
        prev.map((f) => (f.id === feeData.id ? feeData : f))
      );
      setEditingFee(null);
    } else {
      setFees((prev) => [...prev, feeData]);
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteFee = (id: number) => {
    if (confirm("Are you sure you want to delete this fee?")) {
      setFees((prev) => prev.filter((f) => f.id !== id));
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
            Fees Management
          </h1>
          <p style={{ color: colors.primary }}>
            Manage fees information and settings
          </p>
        </div>

        <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6'>
          <div className='flex flex-col md:flex-row gap-4'>
            <div className='flex-1 min-w-0'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                <input
                  type='text'
                  placeholder='Search fees by name, code, or academic year...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
            </div>

            <div className='flex gap-3'>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                <option value='all'>All Categories</option>
                <option value='tuition'>Tuition</option>
                <option value='miscellaneous'>Miscellaneous</option>
                <option value='laboratory'>Laboratory</option>
                <option value='library'>Library</option>
                <option value='other'>Other</option>
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
                Add Fee
              </button>
            </div>
          </div>
        </div>

        {/* Fees Table */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
          <div className='overflow-x-auto w-full'>
            <table className='w-full min-w-[900px]'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Fee
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Code
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Category
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Amount
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Academic Year
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Semester
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
                {filteredFees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className='px-6 py-8 text-center text-gray-500'>
                      No fees found
                    </td>
                  </tr>
                ) : (
                  filteredFees.map((fee) => (
                    <tr
                      key={fee.id}
                      className='hover:bg-gray-50 transition-colors'
                    >
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          <div className='flex-shrink-0 h-10 w-10'>
                            <div
                              className='h-10 w-10 rounded-lg flex items-center justify-center'
                              style={{ backgroundColor: `${colors.primary}15` }}
                            >
                              <DollarSign
                                className='h-5 w-5'
                                style={{ color: colors.primary }}
                              />
                            </div>
                          </div>
                          <div className='ml-4'>
                            <div className='text-sm font-medium text-gray-900'>
                              {fee.name}
                            </div>
                            {fee.description && (
                              <div className='text-sm text-gray-500'>
                                {fee.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm font-medium text-gray-900'>
                          {fee.code}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(
                            fee.category
                          )}`}
                        >
                          {fee.category}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm font-medium text-gray-900'>
                          {formatCurrency(fee.amount)}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900'>
                          {fee.academicYear}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900'>
                          {fee.semester || "N/A"}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            fee.status
                          )}`}
                        >
                          {fee.status}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <div className='flex justify-end gap-2'>
                          <button
                            onClick={() => setEditingFee(fee)}
                            className='text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors'
                            title='Edit'
                          >
                            <Edit2 className='w-4 h-4' />
                          </button>
                          <button
                            onClick={() => handleDeleteFee(fee.id)}
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

        {/* Add/Edit Fee Form */}
        {(isAddModalOpen || editingFee) && (
          <FeesForm
            fee={editingFee}
            onSave={handleSaveFee}
            onCancel={() => {
              setEditingFee(null);
              setIsAddModalOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default FeesManagement;
