"use client";
import React from "react";
import {
  BarChart3,
  Users,
  BookOpen,
  UserPlus,
  Calendar,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onViewChange,
}) => {
  const { user, logout } = useAuth();
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "students", label: "Students", icon: Users },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "enrollments", label: "Enrollments", icon: UserPlus },
    { id: "forecast", label: "Forecasting", icon: Calendar },
  ];

  return (
    <nav className='bg-[#E9D6A5]  text-[#955A27] border-r border-gray-200 w-16 md:w-64 min-h-screen p-2 md:p-4 flex flex-col'>
      {/* Logo / Branding */}
      <div className='mb-8 flex items-center justify-center md:justify-start gap-0 md:gap-3'>
        <div className='rounded-lg flex items-center justify-center'>
          <img
            src='/logo.png'
            className='object-contain rounded'
            alt=''
            width={50}
            height={50}
          />
        </div>
        <div className='hidden md:block'>
          <h1 className='font-bold '>ITerisian</h1>
          <p className='text-xs '>Enrollment System</p>
        </div>
      </div>

      {/* Nav Items */}
      <ul className='space-y-1 flex-1'>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center justify-center md:justify-start gap-0 md:gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentView === item.id
                    ? "bg-blue-50 text-[#955A27] border border-blue-200"
                    : "text-[#955A27] hover:bg-gray-50 hover:text-[#955A27]"
                }`}
              >
                <Icon className='w-5 h-5' />
                <span className='hidden md:inline'>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Quick Stats */}
      <div className='hidden md:block mt-8 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100'>
        <h3 className='font-semibold  text-sm mb-2'>Quick Stats</h3>
        <div className='space-y-2 text-xs'>
          <div className='flex justify-between'>
            <span className='text-[#955A27]'>Active Students</span>
            <span className='font-medium '>4</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-[#955A27]'>Total Courses</span>
            <span className='font-medium '>5</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-[#955A27]'>Enrollments</span>
            <span className='font-medium '>6</span>
          </div>
        </div>
      </div>

      {/* User Profile Section*/}
      <div className='mt-6 p-4 bg-white rounded-lg border border-gray-200'>
        <div className='flex items-center gap-3 mb-3'>
          <div className='w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center'></div>
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-medium truncate'>
              {user?.username || "User"}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className='w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200'
        >
          <LogOut className='w-4 h-4' />
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
