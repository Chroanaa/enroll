'use client';

import React, { useState, useEffect } from 'react';
import { SectionResponse, CreateSectionRequest } from '../../types/sectionTypes';
import { createSection } from '../../utils/sectionApi';
import { termValidator } from '../../utils/sectionService';
import { colors } from '../../colors';
import { Users, X, CheckCircle2, GraduationCap, Hash } from 'lucide-react';
import { useProgramsWithMajors } from '../../hooks/useProgramsWithMajors';
import { generateSectionName, fetchExistingSectionsByPrefix, generateSectionPrefix } from '../../utils/sectionNameGenerator';

interface CreateSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (section: SectionResponse) => void;
}

export function CreateSectionModal({
  isOpen,
  onClose,
  onSuccess
}: CreateSectionModalProps) {
  const normalizeSemesterValue = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (normalized === '1' || normalized === 'first' || normalized === 'first semester') return 'first';
    if (normalized === '2' || normalized === 'second' || normalized === 'second semester') return 'second';
    if (normalized === '3' || normalized === 'summer') return 'summer';
    return value;
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTerm, setCurrentTerm] = useState<{
    academicYear: string;
    semester: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    programMajorValue: '', // Combined program-major value (e.g., "1" or "1-5")
    yearLevel: '',
    sectionName: '',
    maxCapacity: '',
    academicYear: '',
    semester: ''
  });

  const { programs, loading: programsLoading } = useProgramsWithMajors();

  useEffect(() => {
    if (isOpen) {
      loadCurrentTerm();
    }
  }, [isOpen]);

  const loadCurrentTerm = async () => {
    try {
      const term = await termValidator.getCurrentTerm();
      setCurrentTerm(term);
      setFormData((prev) => ({
        ...prev,
        academicYear: term.academicYear.toString(),
        semester: normalizeSemesterValue(term.semester.toString())
      }));
    } catch (err) {
      console.error('Failed to load current term:', err);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    // Auto-generate section name when program-major or year level changes
    if (name === 'programMajorValue' || name === 'yearLevel') {
      const programMajorValue = name === 'programMajorValue' ? value : formData.programMajorValue;
      const yearLevel = name === 'yearLevel' ? value : formData.yearLevel;

      if (programMajorValue && yearLevel) {
        await generateAndSetSectionName(programMajorValue, parseInt(yearLevel));
      }
    }
  };

  const generateAndSetSectionName = async (programMajorValue: string, yearLevel: number) => {
    // Find the selected program-major combination
    const selected = programs.find((p) => p.value === programMajorValue);
    
    if (!selected) return;

    const { programCode, majorName } = selected;

    // Generate prefix
    const prefix = generateSectionPrefix(programCode, majorName, yearLevel);

    // Fetch existing sections with this prefix
    const existingSections = await fetchExistingSectionsByPrefix(prefix);

    // Generate the section name
    const sectionName = generateSectionName(
      programCode,
      majorName,
      yearLevel,
      existingSections
    );

    setFormData((prev) => ({
      ...prev,
      sectionName,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate form
      if (
        !formData.programMajorValue ||
        !formData.yearLevel ||
        !formData.sectionName ||
        !formData.maxCapacity ||
        !formData.academicYear ||
        !formData.semester
      ) {
        setError('All fields are required');
        setLoading(false);
        return;
      }

      // Extract programId from the combined value
      const selected = programs.find((p) => p.value === formData.programMajorValue);
      if (!selected) {
        setError('Invalid program selection');
        setLoading(false);
        return;
      }

      const request: CreateSectionRequest = {
        programId: selected.programId,
        yearLevel: parseInt(formData.yearLevel),
        academicYear: formData.academicYear,
        semester: formData.semester,
        sectionName: formData.sectionName,
        advisor: '', // Empty advisor field
        maxCapacity: parseInt(formData.maxCapacity)
      };

      const result = await createSection(request);
      onSuccess(result);
      onClose();
      
      // Reset form
      setFormData({
        programMajorValue: '',
        yearLevel: '',
        sectionName: '',
        maxCapacity: '',
        academicYear: currentTerm?.academicYear.toString() || '',
        semester: currentTerm?.semester ? normalizeSemesterValue(currentTerm.semester.toString()) : ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create section');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200"
        style={{
          backgroundColor: colors.paper,
          border: `1px solid ${colors.neutralBorder}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-3 flex items-center justify-between border-b"
          style={{
            backgroundColor: `${colors.primary}08`,
            borderColor: `${colors.primary}15`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${colors.secondary}20` }}
            >
              <Users className="w-5 h-5" style={{ color: colors.secondary }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: colors.primary }}>
                Create New Section
              </h2>
              <p className="text-xs text-gray-500">
                Fill in the details to create a new section
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div
              className="border rounded-lg p-3 text-sm"
              style={{
                backgroundColor: `${colors.danger}10`,
                borderColor: `${colors.danger}30`,
                color: colors.danger,
              }}
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold mb-1.5" style={{ color: colors.primary }}>
                <GraduationCap className="w-3.5 h-3.5" />
                Program - Major <span className="text-red-500">*</span>
              </label>
              <select
                name="programMajorValue"
                value={formData.programMajorValue}
                onChange={handleInputChange}
                disabled={programsLoading}
                className="w-full px-3 py-2 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0"
                style={{
                  outline: 'none',
                  color: colors.primary,
                  borderColor: colors.neutralBorder,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.secondary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.neutralBorder;
                  e.currentTarget.style.boxShadow = 'none';
                }}
                required
              >
                <option value="">
                  {programsLoading ? 'Loading programs...' : 'Select program - major'}
                </option>
                {programs.map((program) => (
                  <option key={program.value} value={program.value}>
                    {program.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold mb-1.5" style={{ color: colors.primary }}>
                <Hash className="w-3.5 h-3.5" />
                Year Level <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="yearLevel"
                placeholder="e.g., 1, 2, 3, 4"
                min="1"
                max="4"
                value={formData.yearLevel}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0"
                style={{
                  outline: 'none',
                  color: colors.primary,
                  borderColor: colors.neutralBorder,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.secondary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.neutralBorder;
                  e.currentTarget.style.boxShadow = 'none';
                }}
                required
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-semibold mb-1.5" style={{ color: colors.primary }}>
              Section Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="sectionName"
              placeholder="Auto-generated (e.g., BSIT1 - 1)"
              value={formData.sectionName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0 bg-gray-50"
              style={{
                outline: 'none',
                color: colors.primary,
                borderColor: colors.neutralBorder,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.secondary;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.neutralBorder;
                e.currentTarget.style.boxShadow = 'none';
              }}
              readOnly
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Section name is auto-generated based on Program-Major and Year Level
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-semibold mb-1.5" style={{ color: colors.primary }}>
              <Users className="w-3.5 h-3.5" />
              Max Capacity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="maxCapacity"
              min="1"
              placeholder="Maximum number of students"
              value={formData.maxCapacity}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0"
              style={{
                outline: 'none',
                color: colors.primary,
                borderColor: colors.neutralBorder,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.secondary;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.neutralBorder;
                e.currentTarget.style.boxShadow = 'none';
              }}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold mb-1.5" style={{ color: colors.primary }}>
                Academic Year <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="academicYear"
                placeholder="e.g., 2025-2026"
                value={formData.academicYear}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0"
                style={{
                  outline: 'none',
                  color: colors.primary,
                  borderColor: colors.neutralBorder,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.secondary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.neutralBorder;
                  e.currentTarget.style.boxShadow = 'none';
                }}
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold mb-1.5" style={{ color: colors.primary }}>
                Semester <span className="text-red-500">*</span>
              </label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0"
                style={{
                  outline: 'none',
                  color: colors.primary,
                  borderColor: colors.neutralBorder,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.secondary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.neutralBorder;
                  e.currentTarget.style.boxShadow = 'none';
                }}
                required
              >
                <option value="">Select Semester</option>
                <option value="first">First Semester</option>
                <option value="second">Second Semester</option>
                <option value="summer">Summer</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: colors.neutralBorder }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl transition-all font-medium flex items-center gap-2"
              style={{
                color: colors.primary,
                border: `1px solid ${colors.neutralBorder}`,
                backgroundColor: colors.paper,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.paper;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-white rounded-xl transition-all font-medium flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: colors.secondary,
                boxShadow: '0 4px 6px -1px rgba(149, 90, 39, 0.2)',
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Creating...' : 'Create Section'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
