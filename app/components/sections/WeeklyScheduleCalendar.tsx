'use client';

import React, { useState, useMemo } from 'react';
import { colors } from '../../colors';
import { Clock, AlertTriangle, Info } from 'lucide-react';

interface ScheduleBlock {
  id: number;
  curriculumCourseId: number;
  courseCode: string;
  courseTitle: string;
  facultyName: string;
  roomNumber: string;
  dayOfWeek: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
}

interface PreviewBlock {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  courseCode?: string;
}

interface WeeklyScheduleCalendarProps {
  schedules: ScheduleBlock[];
  previewBlock?: PreviewBlock | null;
  onTimeSlotClick?: (day: string, time: string) => void;
  readOnly?: boolean;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_MINUTES = 30;

// Generate time slots from 7:00 AM to 9:00 PM in 30-minute intervals
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      if (hour === END_HOUR && minute > 0) break;
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeStr);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Convert time string to minutes since midnight
const timeToMinutes = (timeStr: string): number => {
  const date = new Date(timeStr);
  return date.getHours() * 60 + date.getMinutes();
};

// Format time for display (12-hour format)
const formatTime = (timeStr: string): string => {
  const date = new Date(timeStr);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

// Check if two time ranges overlap
const hasTimeOverlap = (
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean => {
  return start1 < end2 && start2 < end1;
};

export function WeeklyScheduleCalendar({
  schedules,
  previewBlock,
  onTimeSlotClick,
  readOnly = false
}: WeeklyScheduleCalendarProps) {
  const [hoveredSlot, setHoveredSlot] = useState<{ day: string; time: string } | null>(null);
  const [hoveredSchedule, setHoveredSchedule] = useState<number | null>(null);

  // Detect conflicts for each schedule
  const scheduleConflicts = useMemo(() => {
    const conflicts = new Map<number, number[]>();
    
    schedules.forEach((schedule, index) => {
      const conflictsWith: number[] = [];
      const scheduleStart = timeToMinutes(schedule.startTime);
      const scheduleEnd = timeToMinutes(schedule.endTime);
      
      schedules.forEach((other, otherIndex) => {
        if (index === otherIndex) return;
        if (schedule.dayOfWeek !== other.dayOfWeek) return;
        
        const otherStart = timeToMinutes(other.startTime);
        const otherEnd = timeToMinutes(other.endTime);
        
        if (hasTimeOverlap(scheduleStart, scheduleEnd, otherStart, otherEnd)) {
          conflictsWith.push(otherIndex);
        }
      });
      
      if (conflictsWith.length > 0) {
        conflicts.set(index, conflictsWith);
      }
    });
    
    return conflicts;
  }, [schedules]);

  // Check if preview conflicts with existing schedules
  const previewConflicts = useMemo(() => {
    if (!previewBlock) return [];
    
    const previewStart = timeToMinutes(previewBlock.startTime);
    const previewEnd = timeToMinutes(previewBlock.endTime);
    
    return schedules
      .filter(schedule => {
        if (schedule.dayOfWeek !== previewBlock.dayOfWeek) return false;
        const scheduleStart = timeToMinutes(schedule.startTime);
        const scheduleEnd = timeToMinutes(schedule.endTime);
        return hasTimeOverlap(previewStart, previewEnd, scheduleStart, scheduleEnd);
      })
      .map(s => s.id);
  }, [previewBlock, schedules]);

  const hasConflicts = previewConflicts.length > 0;

  // Render schedule block
  const renderScheduleBlock = (schedule: ScheduleBlock, index: number) => {
    const startMinutes = timeToMinutes(schedule.startTime);
    const endMinutes = timeToMinutes(schedule.endTime);
    const duration = endMinutes - startMinutes;
    const slotHeight = 32;
    const height = (duration / SLOT_MINUTES) * slotHeight;
    
    const hasConflict = scheduleConflicts.has(index);
    const isPreviewConflict = previewBlock && previewConflicts.includes(schedule.id);
    const isHovered = hoveredSchedule === schedule.id;
    
    // Size categories
    const isTiny = height < 32;
    const isVerySmall = height >= 32 && height < 64;
    const isSmall = height >= 64 && height < 96;
    const isMedium = height >= 96 && height < 128;
    const isLarge = height >= 128;
    
    return (
      <div
        key={schedule.id}
        className="absolute left-0.5 right-0.5 rounded-lg shadow-sm transition-all duration-200 overflow-hidden group cursor-pointer"
        style={{
          height: `${height - 2}px`,
          backgroundColor: hasConflict || isPreviewConflict ? '#EF4444' : colors.secondary,
          zIndex: isHovered ? 20 : 10,
          transform: isHovered ? 'scale(1.01)' : 'scale(1)',
          boxShadow: isHovered 
            ? '0 4px 12px -2px rgba(0, 0, 0, 0.3)' 
            : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        }}
        onMouseEnter={() => setHoveredSchedule(schedule.id)}
        onMouseLeave={() => setHoveredSchedule(null)}
        title={`${schedule.courseCode}: ${schedule.courseTitle}\nFaculty: ${schedule.facultyName}\nRoom: ${schedule.roomNumber}\n${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`}
      >
        {/* Conflict stripe pattern */}
        {(hasConflict || isPreviewConflict) && (
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.5) 8px, rgba(255,255,255,0.5) 16px)',
            }}
          />
        )}
        
        <div className={`relative h-full flex flex-col items-center justify-center text-center text-white ${
          isTiny ? 'p-0.5' : 
          isVerySmall ? 'p-1.5' : 
          isSmall ? 'p-2' : 
          'p-2.5'
        }`}>
          {/* Course Code with Warning Icon */}
          <div className="flex items-center justify-center gap-1 w-full">
            {(hasConflict || isPreviewConflict) && (
              <AlertTriangle className={`flex-shrink-0 ${isTiny ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
            )}
            <div className={`font-bold truncate ${
              isTiny ? 'text-[11px]' : 
              isVerySmall ? 'text-sm' : 
              isSmall ? 'text-base' : 
              isMedium ? 'text-lg' : 
              'text-xl'
            }`}>
              {schedule.courseCode}
            </div>
          </div>
          
          {/* Always show all available details */}
          {!isTiny && (
            <div className={`w-full space-y-0.5 ${
              isVerySmall ? 'mt-0.5' : 
              isSmall ? 'mt-1' : 
              'mt-1.5'
            }`}>
              {/* Time Range - Always show */}
              <div className={`text-white/95 font-medium ${
                isVerySmall ? 'text-[10px]' : 
                isSmall ? 'text-xs' : 
                isMedium ? 'text-sm' : 
                'text-base'
              }`}>
                {formatTime(schedule.startTime).replace(' ', '')} - {formatTime(schedule.endTime).replace(' ', '')}
              </div>
              
              {/* Room - Always show */}
              <div className={`text-white/85 truncate ${
                isVerySmall ? 'text-[9px]' : 
                isSmall ? 'text-[10px]' : 
                isMedium ? 'text-xs' : 
                'text-sm'
              }`}>
                📍 {schedule.roomNumber}
              </div>
              
              {/* Faculty - Show for small and up */}
              {!isVerySmall && (
                <div className={`text-white/85 truncate ${
                  isSmall ? 'text-[10px]' : 
                  isMedium ? 'text-xs' : 
                  'text-sm'
                }`}>
                  👤 {schedule.facultyName}
                </div>
              )}
              
              {/* Course Title - Show for large blocks */}
              {isLarge && (
                <div className={`text-white/75 mt-1 line-clamp-2 ${
                  isMedium ? 'text-[10px]' : 'text-xs'
                }`}>
                  {schedule.courseTitle}
                </div>
              )}
            </div>
          )}
          
          {/* Enhanced Hover tooltip with full details */}
          {isHovered && (
            <div className="absolute left-full ml-2 top-0 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl z-50 w-64 pointer-events-none">
              <div className="font-bold mb-2 text-sm">{schedule.courseCode}</div>
              <div className="text-gray-300 mb-2 text-xs leading-snug">{schedule.courseTitle}</div>
              <div className="space-y-1 text-gray-400 text-[10px]">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-300">Faculty:</span>
                  <span className="flex-1">{schedule.facultyName}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-300">Room:</span>
                  <span className="flex-1">{schedule.roomNumber}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-300">Time:</span>
                  <span className="flex-1">{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
                </div>
              </div>
              {hasConflict && (
                <div className="mt-2 pt-2 border-t border-gray-700 text-red-400 flex items-center gap-1.5 text-[10px]">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span>Time conflict detected</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render preview block
  const renderPreviewBlock = () => {
    if (!previewBlock) return null;
    
    const startMinutes = timeToMinutes(previewBlock.startTime);
    const endMinutes = timeToMinutes(previewBlock.endTime);
    const duration = endMinutes - startMinutes;
    const slotHeight = 32; // Match the reduced slot height
    const height = (duration / SLOT_MINUTES) * slotHeight;
    
    return (
      <div
        className="absolute left-0.5 right-0.5 rounded-lg border-2 border-dashed transition-all duration-200"
        style={{
          height: `${height - 2}px`,
          backgroundColor: hasConflicts ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)',
          borderColor: hasConflicts ? '#EF4444' : '#3B82F6',
          zIndex: 5,
        }}
      >
        <div className="p-1.5 h-full flex flex-col justify-center items-center text-center">
          <div className="font-semibold text-xs leading-tight" style={{ color: hasConflicts ? '#DC2626' : '#2563EB' }}>
            {previewBlock.courseCode || 'Preview'}
          </div>
          <div className="text-[9px] mt-0.5 leading-tight" style={{ color: hasConflicts ? '#DC2626' : '#2563EB' }}>
            {formatTime(previewBlock.startTime).replace(' ', '')} - {formatTime(previewBlock.endTime).replace(' ', '')}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center justify-end gap-3 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10B981' }}></div>
          <span style={{ color: colors.neutral }}>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-dashed" style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)', borderColor: '#3B82F6' }}></div>
          <span style={{ color: colors.neutral }}>Preview</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }}></div>
          <span style={{ color: colors.neutral }}>Conflict</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div
        className="rounded-xl shadow-md border overflow-hidden"
        style={{
          backgroundColor: colors.paper,
          borderColor: colors.neutralBorder,
        }}
      >
        <div className="overflow-auto max-h-[calc(100vh-300px)]" style={{ scrollbarWidth: 'thin' }}>
          <div className="inline-block min-w-full">
            {/* Header Row - Sticky */}
            <div className="sticky top-0 z-30 flex" style={{ backgroundColor: colors.paper }}>
              {/* Time column header */}
              <div
                className="sticky left-0 z-40 w-16 flex-shrink-0 border-r border-b font-bold text-[10px] flex items-center justify-center py-2"
                style={{
                  backgroundColor: `${colors.primary}08`,
                  borderColor: colors.neutralBorder,
                  color: colors.primary,
                }}
              >
                TIME
              </div>
              
              {/* Day headers */}
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="flex-1 min-w-[140px] border-r border-b font-bold text-[10px] text-center py-2"
                  style={{
                    backgroundColor: `${colors.primary}08`,
                    borderColor: colors.neutralBorder,
                    color: colors.primary,
                  }}
                >
                  {day.toUpperCase()}
                </div>
              ))}
            </div>

            {/* Time slots */}
            {TIME_SLOTS.map((time, timeIndex) => {
              const [hour, minute] = time.split(':').map(Number);
              const displayTime = `${hour % 12 || 12}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
              
              return (
                <div key={time} className="flex">
                  {/* Time label - Sticky */}
                  <div
                    className="sticky left-0 z-20 w-16 flex-shrink-0 border-r border-b text-[9px] font-medium flex items-center justify-center py-2"
                    style={{
                      backgroundColor: colors.paper,
                      borderColor: colors.neutralBorder,
                      color: colors.neutral,
                      height: '32px',
                    }}
                  >
                    {displayTime}
                  </div>
                  
                  {/* Day cells */}
                  {DAYS.map((day) => {
                    const cellKey = `${day}-${time}`;
                    const isHovered = hoveredSlot?.day === day && hoveredSlot?.time === time;
                    
                    // Find schedules that start at this time slot
                    const cellSchedules = schedules.filter(schedule => {
                      if (schedule.dayOfWeek !== day) return false;
                      const scheduleStart = timeToMinutes(schedule.startTime);
                      const slotStart = hour * 60 + minute;
                      return scheduleStart === slotStart;
                    });
                    
                    // Check if preview starts at this time slot
                    const previewStartsHere = previewBlock && 
                      previewBlock.dayOfWeek === day &&
                      timeToMinutes(previewBlock.startTime) === (hour * 60 + minute);
                    
                    return (
                      <div
                        key={cellKey}
                        className="flex-1 min-w-[140px] border-r border-b relative transition-colors duration-150"
                        style={{
                          height: '32px',
                          backgroundColor: isHovered && !readOnly ? `${colors.secondary}05` : colors.paper,
                          borderColor: colors.neutralBorder,
                          cursor: readOnly ? 'default' : 'pointer',
                        }}
                        onMouseEnter={() => !readOnly && setHoveredSlot({ day, time })}
                        onMouseLeave={() => setHoveredSlot(null)}
                        onClick={() => !readOnly && onTimeSlotClick?.(day, time)}
                      >
                        {/* Render schedule blocks that start here */}
                        {cellSchedules.map((schedule, index) => 
                          renderScheduleBlock(schedule, schedules.indexOf(schedule))
                        )}
                        
                        {/* Render preview block if it starts here */}
                        {previewStartsHere && renderPreviewBlock()}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conflict Warning */}
      {hasConflicts && (
        <div
          className="rounded-lg border p-2.5 flex items-start gap-2"
          style={{
            backgroundColor: `${colors.danger}10`,
            borderColor: `${colors.danger}30`,
          }}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.danger }} />
          <div>
            <div className="font-semibold text-xs" style={{ color: colors.danger }}>
              Schedule Conflict Detected
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: colors.danger }}>
              The selected time slot overlaps with {previewConflicts.length} existing schedule(s). 
              Please choose a different time.
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div
        className="rounded-lg border p-2.5 flex items-start gap-2"
        style={{
          backgroundColor: `${colors.info}10`,
          borderColor: `${colors.info}30`,
        }}
      >
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: colors.info }} />
        <div className="text-[10px]" style={{ color: colors.info }}>
          <strong>Tips:</strong> Hover over schedule blocks to see full details. 
          Red blocks indicate time conflicts that must be resolved.
        </div>
      </div>
    </div>
  );
}
