'use client';

import React, { useState, useEffect } from 'react';
import { SectionResponse } from '@/app/types/sectionTypes';
import {
  createClassSchedule,
  getClassSchedules,
  getSectionCurriculum
} from '@/app/utils/sectionApi';

interface ScheduleBuilderProps {
  section: SectionResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
];

export function ScheduleBuilder({
  section,
  isOpen,
  onClose
}: ScheduleBuilderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    curriculumCourseId: '',
    facultyId: '',
    roomId: '',
    dayOfWeek: '',
    startTime: '',
    endTime: ''
  });

  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && section) {
      loadScheduleData();
    }
  }, [isOpen, section]);

  const loadScheduleData = async () => {
    try {
      // Load curriculum for section
      const curricData = await getSectionCurriculum(
        section!.yearLevel,
        section!.semester
      );
      setCurriculum(curricData);

      // Load all faculty
      // This would be an API call in real implementation
      setFaculty([]);

      // Load all rooms
      // This would be an API call in real implementation
      setRooms([]);

      // Load existing schedules
      const scheduleData = await getClassSchedules({
        sectionId: section!.id,
        academicYear: section!.academicYear,
        semester: section!.semester
      });
      setSchedules(scheduleData);
    } catch (err) {
      console.error('Failed to load schedule data:', err);
      setError('Failed to load schedule data');
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (
        !formData.curriculumCourseId ||
        !formData.facultyId ||
        !formData.roomId ||
        !formData.dayOfWeek ||
        !formData.startTime ||
        !formData.endTime
      ) {
        setError('All fields are required');
        setLoading(false);
        return;
      }

      const startHour = parseInt(formData.startTime.split(':')[0]);
      const startMin = parseInt(formData.startTime.split(':')[1]);
      const endHour = parseInt(formData.endTime.split(':')[0]);
      const endMin = parseInt(formData.endTime.split(':')[1]);

      const startDate = new Date();
      startDate.setHours(startHour, startMin, 0);

      const endDate = new Date();
      endDate.setHours(endHour, endMin, 0);

      const schedule = await createClassSchedule({
        sectionId: section!.id,
        curriculumCourseId: parseInt(formData.curriculumCourseId),
        facultyId: parseInt(formData.facultyId),
        roomId: parseInt(formData.roomId),
        dayOfWeek: formData.dayOfWeek,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        academicYear: section!.academicYear,
        semester: section!.semester
      });

      setSchedules([...schedules, schedule]);
      setFormData({
        curriculumCourseId: '',
        facultyId: '',
        roomId: '',
        dayOfWeek: '',
        startTime: '',
        endTime: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add schedule');
    } finally {
      setLoading(false);
    }
  };

  if (!section || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold">Build Schedule - {section.sectionName}</h2>
          <p className="text-gray-600 text-sm">Create schedules for {section.academicYear} Sem {section.semester}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Add Schedule Form */}
          <form onSubmit={handleAddSchedule} className="space-y-4 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold">Add Class Schedule</h3>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Subject *</label>
                <select
                  value={formData.curriculumCourseId}
                  onChange={(e) =>
                    handleInputChange('curriculumCourseId', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select subject</option>
                  {curriculum.map((course) => (
                    <option key={course.id} value={course.id.toString()}>
                      {course.course_code} - {course.descriptive_title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Faculty *</label>
                <select
                  value={formData.facultyId}
                  onChange={(e) =>
                    handleInputChange('facultyId', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select faculty</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id.toString()}>
                      {f.first_name} {f.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Room *</label>
                <select
                  value={formData.roomId}
                  onChange={(e) =>
                    handleInputChange('roomId', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id.toString()}>
                      {room.room_number} (Cap: {room.capacity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Day *</label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) =>
                    handleInputChange('dayOfWeek', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select day</option>
                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Time *</label>
                <select
                  value={formData.startTime}
                  onChange={(e) =>
                    handleInputChange('startTime', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select start time</option>
                  {TIME_SLOTS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Time *</label>
                <select
                  value={formData.endTime}
                  onChange={(e) =>
                    handleInputChange('endTime', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select end time</option>
                  {TIME_SLOTS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Schedule'}
            </button>
          </form>

          {/* Weekly Schedule Grid */}
          <div>
            <h3 className="font-semibold mb-4">Weekly Schedule</h3>
            <div className="overflow-x-auto">
              <table className="w-full border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-4 py-2">Time</th>
                    {DAYS.map((day) => (
                      <th key={day} className="border px-4 py-2 min-w-32">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((time) => (
                    <tr key={time}>
                      <td className="border px-4 py-2 font-medium">{time}</td>
                      {DAYS.map((day) => {
                        const daySchedules = schedules.filter(
                          (s) => s.dayOfWeek === day
                        );
                        return (
                          <td
                            key={`${day}-${time}`}
                            className="border px-4 py-2 bg-gray-50"
                          >
                            {daySchedules.length > 0 && (
                              <div className="text-xs space-y-1">
                                {daySchedules.map((s) => (
                                  <div key={s.id} className="bg-blue-100 p-1 rounded">
                                    {s.startTime.split('T')[1].slice(0, 5)} -{' '}
                                    {s.endTime.split('T')[1].slice(0, 5)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scheduled Courses List */}
          {schedules.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4">Scheduled Courses</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Course</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Faculty</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Room</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Day</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((schedule) => (
                      <tr key={schedule.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4">{schedule.curriculumCourseId}</td>
                        <td className="px-6 py-4">{schedule.facultyId}</td>
                        <td className="px-6 py-4">{schedule.roomId}</td>
                        <td className="px-6 py-4">{schedule.dayOfWeek}</td>
                        <td className="px-6 py-4">
                          {schedule.startTime.split('T')[1].slice(0, 5)} -{' '}
                          {schedule.endTime.split('T')[1].slice(0, 5)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
