'use client';

import React, { useState, useEffect } from 'react';
import { colors } from '../../../colors';
import { Loader2, Calendar } from 'lucide-react';
import { WeeklyScheduleCalendar } from '../../../components/sections/WeeklyScheduleCalendar';

interface Schedule {
  id: number;
  curriculumCourseId: number;
  courseCode: string;
  courseTitle: string;
  facultyName: string;
  roomNumber: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

interface FacultyCalendarViewProps {
  facultyId: number;
  academicYear: string;
  semester: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function FacultyCalendarView({
  facultyId,
  academicYear,
  semester,
}: FacultyCalendarViewProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [facultyName, setFacultyName] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [includeSaturday, setIncludeSaturday] = useState(true);

  useEffect(() => {
    fetchSchedules();
    fetchFacultyName();
  }, [facultyId, academicYear, semester]);

  const fetchFacultyName = async () => {
    try {
      const response = await fetch('/api/auth/faculty');
      if (!response.ok) throw new Error('Failed to fetch faculty');
      const data = await response.json();
      const faculty = data.find((f: any) => f.id === facultyId);
      if (faculty) {
        setFacultyName(`${faculty.first_name} ${faculty.last_name}`);
      }
    } catch (error) {
      console.error('Error fetching faculty name:', error);
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/class-schedule?facultyId=${facultyId}&academicYear=${academicYear}&semester=${semester}`
      );
      if (!response.ok) throw new Error('Failed to fetch schedules');
      const result = await response.json();
      
      const formattedSchedules = result.data.map((schedule: any) => ({
        id: schedule.id,
        curriculumCourseId: schedule.curriculumCourseId,
        courseCode: schedule.courseCode,
        courseTitle: schedule.courseTitle,
        facultyName: facultyName || 'Faculty',
        roomNumber: schedule.room?.room_number || 'N/A',
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      }));
      
      setSchedules(formattedSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
      </div>
    );
  }

  // Filter schedules based on selected day
  const filteredSchedules = selectedDay === 'all' 
    ? schedules 
    : schedules.filter(s => s.dayOfWeek === selectedDay);

  // Determine which days to show in calendar
  const visibleDays = includeSaturday 
    ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div
        className="p-4 rounded-xl"
        style={{
          backgroundColor: 'white',
          border: `1px solid ${colors.neutralBorder}`,
        }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: colors.primary }} />
            <label className="text-sm font-medium" style={{ color: colors.primary }}>
              Filter by Day:
            </label>
          </div>
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all"
            style={{
              backgroundColor: 'white',
              borderColor: colors.neutralBorder,
              color: colors.primary,
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = colors.secondary)}
            onBlur={(e) => (e.currentTarget.style.borderColor = colors.neutralBorder)}
          >
            <option value="all">All Days</option>
            {DAYS_OF_WEEK.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 ml-auto">
            <input
              type="checkbox"
              id="includeSaturday"
              checked={includeSaturday}
              onChange={(e) => setIncludeSaturday(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
            />
            <label
              htmlFor="includeSaturday"
              className="text-sm font-medium cursor-pointer"
              style={{ color: colors.primary }}
            >
              Include Saturday
            </label>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div
        className="p-6 rounded-xl"
        style={{
          backgroundColor: 'white',
          border: `1px solid ${colors.neutralBorder}`,
        }}
      >
        <WeeklyScheduleCalendar
          schedules={filteredSchedules}
          readOnly={true}
          visibleDays={visibleDays}
        />
      </div>
    </div>
  );
}
