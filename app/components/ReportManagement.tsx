"use client";
import React from "react";
import { FileBarChart } from "lucide-react";
import { colors } from "../colors";

const ReportManagement: React.FC = () => {
  return (
    <div className='p-4 sm:p-6 bg-gray-50 min-h-screen'>
      <div className='max-w-6xl mx-auto w-full'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold mb-2' style={{ color: colors.primary }}>
            Report Management
          </h1>
          <p style={{ color: colors.primary }}>
            Generate essential academic and financial reports for documentation, monitoring, and decision-making
          </p>
        </div>

        <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center'>
          <FileBarChart className='mx-auto h-16 w-16 text-gray-400 mb-4' />
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            Report Module
          </h3>
          <p className='text-gray-600'>
            This module generates essential academic and financial reports such as registration forms, class lists, enrollment summaries, 
            and financial reports per school year, helping the administration, faculty, and accounting departments access organized 
            records for documentation, monitoring, and decision-making.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportManagement;


