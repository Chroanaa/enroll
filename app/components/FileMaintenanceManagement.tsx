"use client";
import React from "react";
import { Settings } from "lucide-react";
import { colors } from "../colors";

interface FileMaintenanceManagementProps {
  activeSubmenu?: string;
}

const FileMaintenanceManagement: React.FC<FileMaintenanceManagementProps> = ({ activeSubmenu }) => {
  const getSubmenuLabel = (id?: string) => {
    const labels: Record<string, string> = {
      building: "Building",
      section: "Section",
      room: "Room",
      department: "Department",
      faculty: "Faculty",
      fees: "Fees",
    };
    return labels[id || ""] || "File Maintenance";
  };

  return (
    <div className='p-4 sm:p-6 bg-gray-50 min-h-screen'>
      <div className='max-w-6xl mx-auto w-full'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold mb-2' style={{ color: colors.primary }}>
            {activeSubmenu ? getSubmenuLabel(activeSubmenu) : "File Maintenance"}
          </h1>
          <p style={{ color: colors.primary }}>
            {activeSubmenu 
              ? `Manage ${getSubmenuLabel(activeSubmenu).toLowerCase()} information and settings.`
              : "Maintain essential institutional data including rooms, buildings, programs, departments, faculty records, and fees. Select an option from the sidebar to get started."}
          </p>
        </div>

        <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center'>
          <Settings className='mx-auto h-16 w-16 text-gray-400 mb-4' />
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            {activeSubmenu ? `${getSubmenuLabel(activeSubmenu)} Management` : "File Maintenance Module"}
          </h3>
          <p className='text-gray-600'>
            {activeSubmenu 
              ? `${getSubmenuLabel(activeSubmenu)} management content will be displayed here.`
              : "This module maintains essential institutional data updated, including rooms, buildings, programs, departments, faculty records, and fees."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileMaintenanceManagement;


