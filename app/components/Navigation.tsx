"use client";
import React from "react";
import { BarChart3, Users, BookOpen, UserPlus, Calendar } from "lucide-react";

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onViewChange,
}) => {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "students", label: "Students", icon: Users },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "enrollments", label: "Enrollments", icon: UserPlus },
    { id: "forecast", label: "Forecasting", icon: Calendar },
  ];

  return (
    <nav className='bg-white border-r border-gray-200 w-64 min-h-screen p-4'>
      <div className='mb-8'>
        <div className='flex items-center gap-3'>
          <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center'>
            <BarChart3 className='w-5 h-5 text-white' />
          </div>
          <div>
            <h1 className='font-bold text-gray-900'>EduAnalytics</h1>
            <p className='text-xs text-gray-500'>Enrollment System</p>
          </div>
        </div>
      </div>

      <ul className='space-y-1'>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentView === item.id
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className='w-5 h-5' />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>

      <div className='mt-8 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100'>
        <h3 className='font-semibold text-gray-900 text-sm mb-2'>
          Quick Stats
        </h3>
        <div className='space-y-2 text-xs'>
          <div className='flex justify-between'>
            <span className='text-gray-600'>Active Students</span>
            <span className='font-medium text-gray-900'>4</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-gray-600'>Total Courses</span>
            <span className='font-medium text-gray-900'>5</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-gray-600'>Enrollments</span>
            <span className='font-medium text-gray-900'>6</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
