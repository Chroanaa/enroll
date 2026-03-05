'use client';

import React, { useState, useMemo } from 'react';
import { colors } from '../../colors';
import { AlertTriangle, Info, Trash2, ZoomIn, ZoomOut, Edit2 } from 'lucide-react';

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
  onDeleteSchedule?: (schedule: ScheduleBlock) => void;
  onEditFaculty?: (schedule: ScheduleBlock) => void;
  readOnly?: boolean;
  canEditFaculty?: boolean;
  visibleDays?: string[];
}

const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_MINUTES = 30;

// Zoom levels configuration
const ZOOM_LEVELS = [
  { level: 0.6, label: '60%', slotHeight: 18, minWidth: 90, fontSize: { tiny: 7, small: 8, base: 9 } },
  { level: 0.8, label: '80%', slotHeight: 24, minWidth: 110, fontSize: { tiny: 8, small: 9, base: 10 } },
  { level: 1.0, label: '100%', slotHeight: 28, minWidth: 120, fontSize: { tiny: 9, small: 10, base: 11 } },
  { level: 1.2, label: '120%', slotHeight: 34, minWidth: 140, fontSize: { tiny: 10, small: 11, base: 12 } },
  { level: 1.5, label: '150%', slotHeight: 42, minWidth: 160, fontSize: { tiny: 11, small: 12, base: 14 } },
];

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
  onDeleteSchedule,
  onEditFaculty,
  readOnly = false,
  canEditFaculty = false,
  visibleDays = DEFAULT_DAYS
}: WeeklyScheduleCalendarProps) {
  const [hoveredSlot, setHoveredSlot] = useState<{ day: string; time: string } | null>(null);
  
  const DAYS = visibleDays;
  const [hoveredSchedule, setHoveredSchedule] = useState<number | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<ScheduleBlock | null>(null);
  const [zoomIndex, setZoomIndex] = useState(2); // Default to 100%
  
  const currentZoom = ZOOM_LEVELS[zoomIndex];
  const slotHeight = currentZoom.slotHeight;
  const minColumnWidth = currentZoom.minWidth;

  const handleZoomIn = () => {
    if (zoomIndex < ZOOM_LEVELS.length - 1) {
      setZoomIndex(zoomIndex + 1);
    }
  };

  const handleZoomOut = () => {
    if (zoomIndex > 0) {
      setZoomIndex(zoomIndex - 1);
    }
  };

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
        // Only flag as conflict if same room (different rooms can have classes at same time)
        if (schedule.roomNumber !== other.roomNumber) return;
        
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
    const height = (duration / SLOT_MINUTES) * slotHeight;
    
    const hasConflict = scheduleConflicts.has(index);
    const isPreviewConflict = previewBlock && previewConflicts.includes(schedule.id);
    const isHovered = hoveredSchedule === schedule.id;
    const isSelectedForDelete = selectedForDelete?.id === schedule.id;
    
    // Size categories based on actual pixel height (adjusted for zoom)
    const baseHeight = slotHeight;
    const isTiny = height <= baseHeight;
    const isVerySmall = height <= baseHeight * 2;
    const isSmall = height <= baseHeight * 3;
    const isMedium = height <= baseHeight * 4;
    const isLarge = height > baseHeight * 4;

    const handleBlockClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (deleteMode && !readOnly) {
        setSelectedForDelete(schedule);
      } else if (editMode && canEditFaculty) {
        onEditFaculty?.(schedule);
      }
    };
    
    return (
      <div
        key={schedule.id}
        className={`absolute left-0.5 right-0.5 rounded-lg shadow-sm transition-all duration-200 overflow-hidden group ${
          (deleteMode && !readOnly) || (editMode && canEditFaculty) ? 'cursor-pointer' : 'cursor-pointer'
        }`}
        style={{
          height: `${height - 2}px`,
          backgroundColor: deleteMode 
            ? (isHovered || isSelectedForDelete ? '#DC2626' : '#EF4444') 
            : editMode && canEditFaculty
            ? (isHovered ? '#1D4ED8' : '#2563EB')
            : (hasConflict || isPreviewConflict ? '#EF4444' : colors.primary),
          zIndex: isHovered ? 20 : 10,
          transform: isHovered ? 'scale(1.01)' : 'scale(1)',
          boxShadow: isHovered 
            ? '0 4px 12px -2px rgba(58, 35, 19, 0.4)' 
            : '0 1px 3px 0 rgba(58, 35, 19, 0.15)',
          border: isSelectedForDelete ? '2px solid #991B1B' : 'none',
        }}
        onMouseEnter={() => setHoveredSchedule(schedule.id)}
        onMouseLeave={() => setHoveredSchedule(null)}
        onClick={handleBlockClick}
        title={deleteMode 
          ? `Click to delete: ${schedule.courseCode}` 
          : editMode && canEditFaculty
          ? `Click to edit: ${schedule.courseCode}`
          : `${schedule.courseCode}: ${schedule.courseTitle}\nFaculty: ${schedule.facultyName}\nRoom: ${schedule.roomNumber}\n${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`
        }
      >
        {/* Delete mode overlay */}
        {deleteMode && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Trash2 className={`text-white ${isTiny ? 'w-3 h-3' : 'w-4 h-4'}`} />
          </div>
        )}
        
        {/* Edit mode overlay */}
        {editMode && canEditFaculty && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Edit2 className={`text-white ${isTiny ? 'w-3 h-3' : 'w-4 h-4'}`} />
          </div>
        )}
        
        {/* Conflict stripe pattern */}
        {!deleteMode && (hasConflict || isPreviewConflict) && (
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.5) 8px, rgba(255,255,255,0.5) 16px)',
            }}
          />
        )}
        
        <div className="relative h-full flex flex-col items-center justify-center text-center text-white p-1 overflow-hidden">
          {/* Tiny (30min): Only course code */}
          {isTiny && (
            <div className="flex items-center justify-center gap-0.5 w-full">
              {(hasConflict || isPreviewConflict) && (
                <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
              )}
              <span className="font-bold text-[10px] truncate">{schedule.courseCode}</span>
            </div>
          )}
          
          {/* Very Small (1hr): Course code + time */}
          {!isTiny && isVerySmall && (
            <>
              <div className="flex items-center justify-center gap-0.5 w-full">
                {(hasConflict || isPreviewConflict) && (
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                )}
                <span className="font-bold text-xs truncate">{schedule.courseCode}</span>
              </div>
              <div className="text-[9px] text-white/90 truncate w-full">
                {formatTime(schedule.startTime).replace(' ', '')} - {formatTime(schedule.endTime).replace(' ', '')}
              </div>
              <div className="text-[8px] text-white/80 truncate w-full">
                📍 {schedule.roomNumber} • 👤 {schedule.facultyName.split(' ')[0]}
              </div>
            </>
          )}
          
          {/* Small (1.5hr): Code, time, room, faculty on separate lines */}
          {!isVerySmall && isSmall && (
            <>
              <div className="flex items-center justify-center gap-1 w-full">
                {(hasConflict || isPreviewConflict) && (
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                )}
                <span className="font-bold text-sm truncate">{schedule.courseCode}</span>
              </div>
              <div className="text-[10px] text-white/90 truncate w-full">
                {formatTime(schedule.startTime).replace(' ', '')} - {formatTime(schedule.endTime).replace(' ', '')}
              </div>
              <div className="text-[9px] text-white/80 truncate w-full">
                📍 {schedule.roomNumber}
              </div>
              <div className="text-[9px] text-white/80 truncate w-full">
                👤 {schedule.facultyName}
              </div>
            </>
          )}
          
          {/* Medium (2hr): Code, time, room, faculty with more space */}
          {!isSmall && isMedium && (
            <>
              <div className="flex items-center justify-center gap-1 w-full">
                {(hasConflict || isPreviewConflict) && (
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                )}
                <span className="font-bold text-base truncate">{schedule.courseCode}</span>
              </div>
              <div className="text-[11px] text-white/90 truncate w-full mt-0.5">
                {formatTime(schedule.startTime).replace(' ', '')} - {formatTime(schedule.endTime).replace(' ', '')}
              </div>
              <div className="text-[10px] text-white/80 truncate w-full">
                📍 {schedule.roomNumber}
              </div>
              <div className="text-[10px] text-white/80 truncate w-full">
                👤 {schedule.facultyName}
              </div>
              <div className="text-[9px] text-white/70 truncate w-full mt-0.5">
                {schedule.courseTitle}
              </div>
            </>
          )}
          
          {/* Large (2.5hr+): All details including title */}
          {isLarge && (
            <>
              <div className="flex items-center justify-center gap-1 w-full">
                {(hasConflict || isPreviewConflict) && (
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span className="font-bold text-lg truncate">{schedule.courseCode}</span>
              </div>
              <div className="text-sm text-white/90 truncate w-full mt-1">
                {formatTime(schedule.startTime).replace(' ', '')} - {formatTime(schedule.endTime).replace(' ', '')}
              </div>
              <div className="text-xs text-white/80 truncate w-full">
                📍 {schedule.roomNumber}
              </div>
              <div className="text-xs text-white/80 truncate w-full">
                👤 {schedule.facultyName}
              </div>
              <div className="text-[10px] text-white/70 line-clamp-2 w-full mt-1">
                {schedule.courseTitle}
              </div>
            </>
          )}
          
          {/* Enhanced Hover tooltip with full details */}
          {isHovered && !deleteMode && (
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
                  <span>Room conflict: Same room has overlapping schedule</span>
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
    const height = (duration / SLOT_MINUTES) * slotHeight;
    
    return (
      <div
        className="absolute left-0.5 right-0.5 rounded-lg border-2 border-dashed transition-all duration-200"
        style={{
          height: `${height - 2}px`,
          backgroundColor: hasConflicts ? 'rgba(239, 68, 68, 0.3)' : 'rgba(179, 116, 74, 0.3)',
          borderColor: hasConflicts ? '#EF4444' : colors.tertiary,
          zIndex: 5,
        }}
      >
        <div className="p-1.5 h-full flex flex-col justify-center items-center text-center">
          <div className="font-semibold text-xs leading-tight" style={{ color: hasConflicts ? '#DC2626' : colors.secondary }}>
            {previewBlock.courseCode || 'Preview'}
          </div>
          <div className="text-[9px] mt-0.5 leading-tight" style={{ color: hasConflicts ? '#DC2626' : colors.secondary }}>
            {formatTime(previewBlock.startTime).replace(' ', '')} - {formatTime(previewBlock.endTime).replace(' ', '')}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with Delete Mode Toggle, Edit Faculty Toggle, and Zoom Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Delete Mode Toggle */}
          {!readOnly && onDeleteSchedule && (
            <button
              onClick={() => {
                setDeleteMode(!deleteMode);
                setEditMode(false);
                setSelectedForDelete(null);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                deleteMode 
                  ? 'bg-red-700 text-white shadow-md' 
                  : 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
              }`}
              title={deleteMode ? 'Exit Delete Mode' : 'Delete Mode'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium">{deleteMode ? 'Exit Delete' : 'Delete Mode'}</span>
            </button>
          )}

          {/* Edit Mode Toggle (for draft/active sections) */}
          {canEditFaculty && onEditFaculty && (
            <button
              onClick={() => {
                setEditMode(!editMode);
                setDeleteMode(false);
                setSelectedForDelete(null);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                editMode 
                  ? 'bg-blue-700 text-white shadow-md' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              }`}
              title={editMode ? 'Exit Edit Mode' : 'Edit Mode'}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium">{editMode ? 'Exit Edit' : 'Edit Mode'}</span>
            </button>
          )}
          
          {/* Zoom Controls */}
          <div 
            className="flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{ backgroundColor: 'rgba(253, 251, 248, 0.8)', border: '1px solid rgba(179, 116, 74, 0.1)' }}
          >
            <button
              onClick={handleZoomOut}
              disabled={zoomIndex === 0}
              className="p-1 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50"
              style={{ color: colors.tertiary }}
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span 
              className="text-[10px] font-medium min-w-[36px] text-center"
              style={{ color: colors.primary }}
            >
              {currentZoom.label}
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              className="p-1 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/50"
              style={{ color: colors.tertiary }}
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        {/* Legend */}
        <div 
          className="flex items-center gap-3 text-[10px] px-2.5 py-1.5 rounded-lg"
          style={{ backgroundColor: 'rgba(253, 251, 248, 0.8)', border: '1px solid rgba(179, 116, 74, 0.1)' }}
        >
          {deleteMode && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }}></div>
              <span style={{ color: colors.danger, fontWeight: 500 }}>Click to delete</span>
            </div>
          )}
          {editMode && canEditFaculty && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#2563EB' }}></div>
              <span style={{ color: '#2563EB', fontWeight: 500 }}>Click to edit schedule</span>
            </div>
          )}
          {!deleteMode && !editMode && (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.primary }}></div>
                <span style={{ color: colors.primary }}>Scheduled</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border-2 border-dashed" style={{ backgroundColor: 'rgba(179, 116, 74, 0.2)', borderColor: colors.tertiary }}></div>
                <span style={{ color: colors.primary }}>Preview</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }}></div>
                <span style={{ color: colors.primary }}>Conflict</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Mode Warning */}
      {deleteMode && (
        <div
          className="rounded-lg p-3 flex items-center gap-2.5"
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          <Trash2 className="w-4 h-4 flex-shrink-0" style={{ color: colors.danger }} />
          <div className="text-xs" style={{ color: '#B91C1C' }}>
            <strong>Delete Mode Active:</strong> Click on any schedule block to remove it.
          </div>
        </div>
      )}

      {/* Edit Mode Info */}
      {editMode && canEditFaculty && (
        <div
          className="rounded-lg p-3 flex items-center gap-2.5"
          style={{
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            border: `1px solid rgba(37, 99, 235, 0.2)`,
          }}
        >
          <Edit2 className="w-4 h-4 flex-shrink-0" style={{ color: '#2563EB' }} />
          <div className="text-xs" style={{ color: '#1E40AF' }}>
            <strong>Edit Mode:</strong> Click on any schedule block to edit faculty, room, day, and time.
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {selectedForDelete && (
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{
            backgroundColor: '#FDFCFA',
            border: '1px solid rgba(179, 116, 74, 0.12)',
            boxShadow: '0 2px 6px rgba(58, 35, 19, 0.05)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-lg"
              style={{ backgroundColor: '#FEE2E2' }}
            >
              <Trash2 className="w-5 h-5" style={{ color: colors.danger }} />
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: colors.primary }}>
                Delete {selectedForDelete.courseCode}?
              </div>
              <div className="text-xs mt-0.5" style={{ color: colors.neutral }}>
                {selectedForDelete.dayOfWeek} • {formatTime(selectedForDelete.startTime)} - {formatTime(selectedForDelete.endTime)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedForDelete(null)}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-gray-100"
              style={{ 
                border: `1px solid ${colors.tertiary}30`,
                color: colors.primary,
                backgroundColor: colors.paper,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onDeleteSchedule?.(selectedForDelete);
                setSelectedForDelete(null);
              }}
              className="px-4 py-2 rounded-lg text-xs font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: colors.danger }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: '#FDFCFA',
          border: '1px solid rgba(179, 116, 74, 0.12)',
          boxShadow: '0 2px 8px rgba(58, 35, 19, 0.05), 0 1px 3px rgba(58, 35, 19, 0.03)',
        }}
      >
        <div className="overflow-auto max-h-[calc(100vh-300px)]" style={{ scrollbarWidth: 'thin' }}>
          <div className="inline-block min-w-full">
            {/* Header Row - Sticky */}
            <div className="sticky top-0 z-30 flex" style={{ backgroundColor: 'rgba(253, 251, 248, 0.98)' }}>
              {/* Time column header */}
              <div
                className="sticky left-0 z-40 flex-shrink-0 font-semibold flex items-center justify-center"
                style={{
                  width: '52px',
                  backgroundColor: 'rgba(253, 251, 248, 0.98)',
                  borderRight: '1px solid rgba(179, 116, 74, 0.08)',
                  borderBottom: '1px solid rgba(179, 116, 74, 0.12)',
                  color: colors.tertiary,
                  fontSize: `${currentZoom.fontSize.small}px`,
                  padding: `${Math.max(6, slotHeight * 0.3)}px 0`,
                }}
              >
                TIME
              </div>
              
              {/* Day headers */}
              {DAYS.map((day, idx) => (
                <div
                  key={day}
                  className="flex-1 font-semibold text-center"
                  style={{
                    minWidth: `${minColumnWidth}px`,
                    backgroundColor: 'rgba(253, 251, 248, 0.98)',
                    borderRight: idx < DAYS.length - 1 ? '1px solid rgba(179, 116, 74, 0.06)' : 'none',
                    borderBottom: '1px solid rgba(179, 116, 74, 0.12)',
                    color: colors.primary,
                    letterSpacing: '0.05em',
                    fontSize: `${currentZoom.fontSize.small}px`,
                    padding: `${Math.max(6, slotHeight * 0.3)}px 0`,
                  }}
                >
                  {day.toUpperCase()}
                </div>
              ))}
            </div>

            {/* Time slots */}
            {TIME_SLOTS.map((time) => {
              const [hour, minute] = time.split(':').map(Number);
              const displayTime = `${hour % 12 || 12}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
              const isHourMark = minute === 0;
              
              return (
                <div key={time} className="flex">
                  {/* Time label - Sticky */}
                  <div
                    className="sticky left-0 z-20 flex-shrink-0 font-medium flex items-center justify-center"
                    style={{
                      width: '52px',
                      backgroundColor: '#FDFCFA',
                      borderRight: '1px solid rgba(179, 116, 74, 0.06)',
                      borderBottom: isHourMark ? '1px solid rgba(179, 116, 74, 0.1)' : '1px solid rgba(179, 116, 74, 0.04)',
                      color: isHourMark ? colors.tertiary : colors.neutral,
                      height: `${slotHeight}px`,
                      fontSize: `${currentZoom.fontSize.tiny}px`,
                    }}
                  >
                    {isHourMark ? displayTime : ''}
                  </div>
                  
                  {/* Day cells */}
                  {DAYS.map((day, dayIdx) => {
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
                        className="flex-1 relative transition-colors duration-150"
                        style={{
                          minWidth: `${minColumnWidth}px`,
                          height: `${slotHeight}px`,
                          backgroundColor: isHovered && !readOnly ? 'rgba(212, 165, 116, 0.08)' : '#FDFCFA',
                          borderRight: dayIdx < DAYS.length - 1 ? '1px solid rgba(179, 116, 74, 0.05)' : 'none',
                          borderBottom: isHourMark ? '1px solid rgba(179, 116, 74, 0.1)' : '1px solid rgba(179, 116, 74, 0.04)',
                          cursor: readOnly ? 'default' : 'pointer',
                        }}
                        onMouseEnter={() => !readOnly && setHoveredSlot({ day, time })}
                        onMouseLeave={() => setHoveredSlot(null)}
                        onClick={() => !readOnly && onTimeSlotClick?.(day, time)}
                      >
                        {/* Render schedule blocks that start here */}
                        {cellSchedules.map((schedule) => 
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
          className="rounded-lg p-3 flex items-start gap-2.5"
          style={{
            backgroundColor: '#FEF2F2',
            border: `1px solid ${colors.danger}25`,
            boxShadow: '0 1px 2px rgba(239, 68, 68, 0.05)',
          }}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.danger }} />
          <div>
            <div className="font-semibold text-xs" style={{ color: '#B91C1C' }}>
              Schedule Conflict Detected
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: '#DC2626' }}>
              The selected time slot overlaps with {previewConflicts.length} existing schedule(s). 
              Please choose a different time.
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      {!deleteMode && (
        <div
          className="rounded-lg p-3 flex items-start gap-2.5"
          style={{
            backgroundColor: 'rgba(253, 251, 248, 0.6)',
            border: '1px solid rgba(179, 116, 74, 0.1)',
          }}
        >
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: colors.tertiary }} />
          <div className="text-[10px]" style={{ color: colors.neutral }}>
            <strong style={{ color: colors.primary }}>Tips:</strong> Hover over schedule blocks to see full details. 
            Red blocks indicate time conflicts that must be resolved.
          </div>
        </div>
      )}
    </div>
  );
}
