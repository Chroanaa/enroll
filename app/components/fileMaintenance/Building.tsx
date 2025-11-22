"use client";
import React, { useState } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Building2,
  Hash,
  FileText,
  MapPin,
  Layers,
  CheckCircle2,
  X,
} from "lucide-react";
import { Building, mockBuildings } from "../../data/mockData";
import { colors } from "../../colors";

const BuildingManagement: React.FC = () => {
  const [buildings, setBuildings] = useState<Building[]>(mockBuildings);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredBuildings = buildings.filter((building) => {
    const matchesSearch =
      building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || building.status === statusFilter;
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

  const BuildingForm: React.FC<{
    building: Building | null;
    onSave: (building: Building) => void;
    onCancel: () => void;
  }> = ({ building, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Building>>(
      building || {
        name: "",
        code: "",
        description: "",
        address: "",
        floor_count: 1,
        status: "active",
      }
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (formData.name && formData.code) {
        const buildingData: Partial<Building> = {
          ...formData,
          name: formData.name!,
          code: formData.code!,
          description: formData.description || "",
          address: formData.address || "",
          floor_count: formData.floor_count || 1,
          status: (formData.status as "active" | "inactive") || "active",
        };
        fetch("/api/auth/building", {
          method: "POST",
          body: JSON.stringify(buildingData),
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
                <Building2
                  className='w-5 h-5'
                  style={{ color: colors.secondary }}
                />
              </div>
              <h2
                className='text-xl font-bold'
                style={{ color: colors.primary }}
              >
                {building ? "Edit Building" : "Add New Building"}
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
                    <Building2
                      className='w-4 h-4'
                      style={{ color: colors.secondary }}
                    />
                    Building Name <span className='text-red-500'>*</span>
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
                      e.target.style.borderColor = colors.secondary;
                      e.target.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = `${colors.tertiary}60`;
                      e.target.style.boxShadow = "none";
                    }}
                    required
                  />
                </div>

                <div>
                  <label
                    className='flex items-center gap-2 text-sm font-medium mb-2'
                    style={{ color: colors.primary }}
                  >
                    <Hash
                      className='w-4 h-4'
                      style={{ color: colors.secondary }}
                    />
                    Building Code <span className='text-red-500'>*</span>
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
                      e.target.style.borderColor = colors.secondary;
                      e.target.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = `${colors.tertiary}60`;
                      e.target.style.boxShadow = "none";
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
                      e.target.style.borderColor = colors.secondary;
                      e.target.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = `${colors.tertiary}60`;
                      e.target.style.boxShadow = "none";
                    }}
                    rows={3}
                  />
                </div>

                <div className='md:col-span-2'>
                  <label
                    className='flex items-center gap-2 text-sm font-medium mb-2'
                    style={{ color: colors.primary }}
                  >
                    <MapPin
                      className='w-4 h-4'
                      style={{ color: colors.secondary }}
                    />
                    Address
                  </label>
                  <input
                    type='text'
                    value={formData.address || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className='w-full rounded-lg px-3 py-2 transition-all'
                    style={{
                      border: `1px solid ${colors.tertiary}60`,
                      backgroundColor: "white",
                      color: colors.primary,
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = colors.secondary;
                      e.target.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = `${colors.tertiary}60`;
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                <div>
                  <label
                    className='flex items-center gap-2 text-sm font-medium mb-2'
                    style={{ color: colors.primary }}
                  >
                    <Layers
                      className='w-4 h-4'
                      style={{ color: colors.secondary }}
                    />
                    Floor Count <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='number'
                    min='1'
                    value={formData.floor_count || 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        floor_count: parseInt(e.target.value) || 1,
                      })
                    }
                    className='w-full rounded-lg px-3 py-2 transition-all'
                    style={{
                      border: `1px solid ${colors.tertiary}60`,
                      backgroundColor: "white",
                      color: colors.primary,
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = colors.secondary;
                      e.target.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = `${colors.tertiary}60`;
                      e.target.style.boxShadow = "none";
                    }}
                    required
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
                      e.target.style.borderColor = colors.secondary;
                      e.target.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = `${colors.tertiary}60`;
                      e.target.style.boxShadow = "none";
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
                  {building ? "Update Building" : "Add Building"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveBuilding = (buildingData: Building) => {
    if (editingBuilding) {
      setBuildings((prev) =>
        prev.map((b) => (b.id === buildingData.id ? buildingData : b))
      );
      setEditingBuilding(null);
    } else {
      setBuildings((prev) => [...prev, buildingData]);
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteBuilding = (id: number) => {
    if (confirm("Are you sure you want to delete this building?")) {
      setBuildings((prev) => prev.filter((b) => b.id !== id));
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
            Building Management
          </h1>
          <p style={{ color: colors.primary }}>
            Manage building information and settings
          </p>
        </div>

        <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6'>
          <div className='flex flex-col md:flex-row gap-4'>
            <div className='flex-1 min-w-0'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                <input
                  type='text'
                  placeholder='Search buildings by name, code, or address...'
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
                Add Building
              </button>
            </div>
          </div>
        </div>

        {/* Buildings Table */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
          <div className='overflow-x-auto w-full'>
            <table className='w-full min-w-[800px]'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Building
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Code
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Address
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Floors
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
                {filteredBuildings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className='px-6 py-8 text-center text-gray-500'
                    >
                      No buildings found
                    </td>
                  </tr>
                ) : (
                  filteredBuildings.map((building) => (
                    <tr
                      key={building.id}
                      className='hover:bg-gray-50 transition-colors'
                    >
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          <div className='flex-shrink-0 h-10 w-10'>
                            <div
                              className='h-10 w-10 rounded-lg flex items-center justify-center'
                              style={{ backgroundColor: `${colors.primary}15` }}
                            >
                              <Building2
                                className='h-5 w-5'
                                style={{ color: colors.primary }}
                              />
                            </div>
                          </div>
                          <div className='ml-4'>
                            <div className='text-sm font-medium text-gray-900'>
                              {building.name}
                            </div>
                            {building.description && (
                              <div className='text-sm text-gray-500'>
                                {building.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm font-medium text-gray-900'>
                          {building.code}
                        </span>
                      </td>
                      <td className='px-6 py-4'>
                        <div className='text-sm text-gray-900'>
                          {building.address || "N/A"}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900'>
                          {building.floor_count}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            building.status
                          )}`}
                        >
                          {building.status}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <div className='flex justify-end gap-2'>
                          <button
                            onClick={() => setEditingBuilding(building)}
                            className='text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors'
                            title='Edit'
                          >
                            <Edit2 className='w-4 h-4' />
                          </button>
                          <button
                            onClick={() => handleDeleteBuilding(building.id)}
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

        {/* Add/Edit Building Form */}
        {(isAddModalOpen || editingBuilding) && (
          <BuildingForm
            building={editingBuilding}
            onSave={handleSaveBuilding}
            onCancel={() => {
              setEditingBuilding(null);
              setIsAddModalOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default BuildingManagement;
