"use client";
import React from "react";
import { CalendarClock } from "lucide-react";
import { colors } from "../colors";

const SchedulingManagement: React.FC = () => {
  return (
    <div className='p-4 sm:p-6 bg-gray-50 min-h-screen'>
      <div className='max-w-6xl mx-auto w-full'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold mb-2' style={{ color: colors.primary }}>
            Scheduling Management
          </h1>
          <p style={{ color: colors.primary }}>
            Create class schedules, assign faculty to sections, and manage room availability
          </p>
        </div>

        <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center'>
          <CalendarClock className='mx-auto h-16 w-16 text-gray-400 mb-4' />
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            Scheduling Module
          </h3>
          <p className='text-gray-600'>
            This module provides a structured process for creating class schedules, assigning faculty to sections, and managing room availability.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SchedulingManagement;


