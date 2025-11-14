"use client";
import React from "react";
import { Calculator } from "lucide-react";
import { colors } from "../colors";

const AssessmentManagement: React.FC = () => {
  return (
    <div className='p-4 sm:p-6 bg-gray-50 min-h-screen'>
      <div className='max-w-6xl mx-auto w-full'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold mb-2' style={{ color: colors.primary }}>
            Assessment Management
          </h1>
          <p style={{ color: colors.primary }}>
            Record and handle student tuition details based on enrolled courses, unit costs, and applicable miscellaneous fees
          </p>
        </div>

        <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center'>
          <Calculator className='mx-auto h-16 w-16 text-gray-400 mb-4' />
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            Assessment Module
          </h3>
          <p className='text-gray-600'>
            This module records and handles student tuition details based on enrolled courses, unit costs, and applicable miscellaneous fees. 
            The computation is done manually to ensure accurate documentation and consistent reflection of all assessment records within the system.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssessmentManagement;


