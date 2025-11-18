"use client";
import React, { useState } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  DoorOpen,
  Hash,
  Building2,
  Layers,
  Users,
  CheckCircle2,
  X,
} from "lucide-react";
import { Room, mockRooms, Building, mockBuildings } from "../../data/mockData";
import { colors } from "../../colors";

const RoomManagement: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>(
    mockRooms.map((room) => ({
      ...room,
      buildingName: mockBuildings.find((b) => b.id === room.buildingId)?.name || "",
    }))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "occupied" | "maintenance">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.buildingName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || room.status === statusFilter;
    const matchesType = typeFilter === "all" || room.roomType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-emerald-100 text-emerald-800";
      case "occupied":
        return "bg-blue-100 text-blue-800";
      case "maintenance":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "classroom":
        return "bg-blue-100 text-blue-800";
      case "laboratory":
        return "bg-purple-100 text-purple-800";
      case "office":
        return "bg-gray-100 text-gray-800";
      case "library":
        return "bg-green-100 text-green-800";
      case "auditorium":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const RoomForm: React.FC<{
    room: Room | null;
    onSave: (room: Room) => void;
    onCancel: () => void;
  }> = ({ room, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Room>>(
      room || {
        roomNumber: "",
        buildingId: mockBuildings[0]?.id || 1,
        capacity: 30,
        roomType: "classroom",
        floor: 1,
        status: "available",
      }
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (formData.roomNumber && formData.buildingId) {
        const buildingName = mockBuildings.find((b) => b.id === formData.buildingId)?.name || "";
        const roomData: Room = {
          ...formData,
          id: room?.id || Date.now(),
          roomNumber: formData.roomNumber!,
          buildingId: formData.buildingId!,
          buildingName,
          capacity: formData.capacity || 30,
          roomType: (formData.roomType as Room["roomType"]) || "classroom",
          floor: formData.floor || 1,
          status: (formData.status as Room["status"]) || "available",
        };
        onSave(roomData);
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
                <DoorOpen className='w-5 h-5' style={{ color: colors.secondary }} />
              </div>
              <h2 
                className='text-xl font-bold'
                style={{ color: colors.primary }}
              >
                {room ? "Edit Room" : "Add New Room"}
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
                  Room Number <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={formData.roomNumber || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, roomNumber: e.target.value.toUpperCase() })
                  }
                  className='w-full rounded-lg px-3 py-2 transition-all'
                  style={{
                    border: `1px solid ${colors.tertiary}60`,
                    backgroundColor: 'white',
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.secondary;
                    e.target.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = `${colors.tertiary}60`;
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                />
              </div>

              <div>
                <label 
                  className='flex items-center gap-2 text-sm font-medium mb-2'
                  style={{ color: colors.primary }}
                >
                  <Building2 className='w-4 h-4' style={{ color: colors.secondary }} />
                  Building <span className='text-red-500'>*</span>
                </label>
                <select
                  value={formData.buildingId || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, buildingId: parseInt(e.target.value) })
                  }
                  className='w-full rounded-lg px-3 py-2 transition-all'
                  style={{
                    border: `1px solid ${colors.tertiary}60`,
                    backgroundColor: 'white',
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.secondary;
                    e.target.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = `${colors.tertiary}60`;
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                >
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
                  <DoorOpen className='w-4 h-4' style={{ color: colors.secondary }} />
                  Room Type <span className='text-red-500'>*</span>
                </label>
                <select
                  value={formData.roomType || "classroom"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      roomType: e.target.value as Room["roomType"],
                    })
                  }
                  className='w-full rounded-lg px-3 py-2 transition-all'
                  style={{
                    border: `1px solid ${colors.tertiary}60`,
                    backgroundColor: 'white',
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.secondary;
                    e.target.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = `${colors.tertiary}60`;
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value='classroom'>Classroom</option>
                  <option value='laboratory'>Laboratory</option>
                  <option value='office'>Office</option>
                  <option value='library'>Library</option>
                  <option value='auditorium'>Auditorium</option>
                  <option value='other'>Other</option>
                </select>
              </div>

              <div>
                <label 
                  className='flex items-center gap-2 text-sm font-medium mb-2'
                  style={{ color: colors.primary }}
                >
                  <Layers className='w-4 h-4' style={{ color: colors.secondary }} />
                  Floor <span className='text-red-500'>*</span>
                </label>
                <input
                  type='number'
                  min='1'
                  value={formData.floor || 1}
                  onChange={(e) =>
                    setFormData({ ...formData, floor: parseInt(e.target.value) || 1 })
                  }
                  className='w-full rounded-lg px-3 py-2 transition-all'
                  style={{
                    border: `1px solid ${colors.tertiary}60`,
                    backgroundColor: 'white',
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.secondary;
                    e.target.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = `${colors.tertiary}60`;
                    e.target.style.boxShadow = 'none';
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
                  Capacity <span className='text-red-500'>*</span>
                </label>
                <input
                  type='number'
                  min='1'
                  value={formData.capacity || 30}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: parseInt(e.target.value) || 30 })
                  }
                  className='w-full rounded-lg px-3 py-2 transition-all'
                  style={{
                    border: `1px solid ${colors.tertiary}60`,
                    backgroundColor: 'white',
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.secondary;
                    e.target.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = `${colors.tertiary}60`;
                    e.target.style.boxShadow = 'none';
                  }}
                  required
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
                  value={formData.status || "available"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as Room["status"],
                    })
                  }
                  className='w-full rounded-lg px-3 py-2 transition-all'
                  style={{
                    border: `1px solid ${colors.tertiary}60`,
                    backgroundColor: 'white',
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.secondary;
                    e.target.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = `${colors.tertiary}60`;
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value='available'>Available</option>
                  <option value='occupied'>Occupied</option>
                  <option value='maintenance'>Maintenance</option>
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
                {room ? "Update Room" : "Add Room"}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveRoom = (roomData: Room) => {
    if (editingRoom) {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomData.id ? roomData : r))
      );
      setEditingRoom(null);
    } else {
      setRooms((prev) => [...prev, roomData]);
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteRoom = (id: number) => {
    if (confirm("Are you sure you want to delete this room?")) {
      setRooms((prev) => prev.filter((r) => r.id !== id));
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
            Room Management
          </h1>
          <p style={{ color: colors.primary }}>
            Manage room information and settings
          </p>
        </div>

        <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6'>
          <div className='flex flex-col md:flex-row gap-4'>
            <div className='flex-1 min-w-0'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                <input
                  type='text'
                  placeholder='Search rooms by number or building...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
            </div>

            <div className='flex gap-3'>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                <option value='all'>All Types</option>
                <option value='classroom'>Classroom</option>
                <option value='laboratory'>Laboratory</option>
                <option value='office'>Office</option>
                <option value='library'>Library</option>
                <option value='auditorium'>Auditorium</option>
                <option value='other'>Other</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                <option value='all'>All Status</option>
                <option value='available'>Available</option>
                <option value='occupied'>Occupied</option>
                <option value='maintenance'>Maintenance</option>
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
                Add Room
              </button>
            </div>
          </div>
        </div>

        {/* Rooms Table */}
        <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
          <div className='overflow-x-auto w-full'>
            <table className='w-full min-w-[900px]'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Room
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Building
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Type
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Floor
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Capacity
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
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={7} className='px-6 py-8 text-center text-gray-500'>
                      No rooms found
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room) => (
                    <tr
                      key={room.id}
                      className='hover:bg-gray-50 transition-colors'
                    >
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          <div className='flex-shrink-0 h-10 w-10'>
                            <div
                              className='h-10 w-10 rounded-lg flex items-center justify-center'
                              style={{ backgroundColor: `${colors.primary}15` }}
                            >
                              <DoorOpen
                                className='h-5 w-5'
                                style={{ color: colors.primary }}
                              />
                            </div>
                          </div>
                          <div className='ml-4'>
                            <div className='text-sm font-medium text-gray-900'>
                              {room.roomNumber}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900'>
                          {room.buildingName || "N/A"}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(
                            room.roomType
                          )}`}
                        >
                          {room.roomType}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900'>{room.floor}</span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='text-sm text-gray-900'>{room.capacity}</span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            room.status
                          )}`}
                        >
                          {room.status}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <div className='flex justify-end gap-2'>
                          <button
                            onClick={() => setEditingRoom(room)}
                            className='text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors'
                            title='Edit'
                          >
                            <Edit2 className='w-4 h-4' />
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(room.id)}
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

        {/* Add/Edit Room Form */}
        {(isAddModalOpen || editingRoom) && (
          <RoomForm
            room={editingRoom}
            onSave={handleSaveRoom}
            onCancel={() => {
              setEditingRoom(null);
              setIsAddModalOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default RoomManagement;
