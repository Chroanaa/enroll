'use client';

import React, { useState, useEffect } from 'react';
import { colors } from '../../../colors';
import { Loader2 } from 'lucide-react';
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

export default function FacultyCalendarView({
  facultyId,
  academicYear,
  semester,
}: FacultyCalendarViewProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [facultyName, setFacultyName] = useState('');

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

  return (
    <div
      className="p-6 rounded-xl"
      style={{
        backgroundColor: colors.paper,
        border: `1px solid ${colors.tertiary}20`,
      }}
    >
      <WeeklyScheduleCalendar
        schedules={schedules}
        readOnly={true}
      />
    </div>
  );
}
