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
  FileText,
} from "lucide-react";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { colors } from "../colors";

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onViewChange,
}) => {
  const { data: session } = useSession();
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "students", label: "Students", icon: Users },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "enrollments", label: "Enrollments", icon: UserPlus },
    { id: "enrollment-form", label: "Enrollment Form", icon: FileText },
    { id: "forecast", label: "Forecasting", icon: Calendar },
  ];
  return (
    <nav
      className='border-r w-16 md:w-64 min-h-screen p-2 md:p-4 flex flex-col'
      style={{ backgroundColor: colors.primary }}
    >
      {/* Logo / Branding */}
      <div className='mb-8 flex items-center justify-center md:justify-start gap-0 md:gap-3'>
        <div
          className='w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden'
          style={{ borderRadius: "100%" }}
        >
          <Image
            src='/logo.png'
            alt='ITERISIAN Logo'
            width={100}
            height={100}
            className='object-contain'
            priority
          />
        </div>
        <div className='hidden md:block'>
          <h1 className='font-bold' style={{ color: colors.paper }}>
            ITERISIAN
          </h1>
          <p className='text-xs' style={{ color: colors.paper, opacity: 0.9 }}>
            Enrollment System
          </p>
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
                className='w-full flex items-center justify-center md:justify-start gap-0 md:gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200'
                style={
                  currentView === item.id
                    ? {
                        backgroundColor: `${colors.secondary}30`,
                        color: colors.paper,
                        border: `1px solid ${colors.secondary}`,
                      }
                    : {
                        color: colors.paper,
                        backgroundColor: "transparent",
                        border: "1px solid transparent",
                        opacity: 0.8,
                      }
                }
                onMouseEnter={(e) => {
                  if (currentView !== item.id) {
                    e.currentTarget.style.backgroundColor = `${colors.paper}20`;
                    e.currentTarget.style.opacity = "1";
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentView !== item.id) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.opacity = "0.8";
                  }
                }}
              >
                <Icon className='w-5 h-5' />
                <span className='hidden md:inline'>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Quick Stats */}
      <div
        className='hidden md:block mt-8 p-4 rounded-lg border'
        style={{
          backgroundColor: `${colors.paper}10`,
          borderColor: `${colors.paper}30`,
        }}
      >
        <h3
          className='font-semibold text-sm mb-2'
          style={{ color: colors.paper }}
        >
          Quick Stats
        </h3>
        <div className='space-y-2 text-xs'>
          <div className='flex justify-between'>
            <span style={{ color: colors.paper, opacity: 0.8 }}>
              Active Students
            </span>
            <span className='font-medium' style={{ color: colors.paper }}>
              4
            </span>
          </div>
          <div className='flex justify-between'>
            <span style={{ color: colors.paper, opacity: 0.8 }}>
              Total Courses
            </span>
            <span className='font-medium' style={{ color: colors.paper }}>
              5
            </span>
          </div>
          <div className='flex justify-between'>
            <span style={{ color: colors.paper, opacity: 0.8 }}>
              Enrollments
            </span>
            <span className='font-medium' style={{ color: colors.paper }}>
              6
            </span>
          </div>
        </div>
      </div>

      {/* User Profile Section*/}
      <div
        className='mt-6 p-4 rounded-lg border'
        style={{
          backgroundColor: `${colors.paper}10`,
          borderColor: `${colors.paper}30`,
        }}
      >
        <div className='flex items-center gap-3 mb-3'>
          <div className='w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center'></div>
          <div className='flex-1 min-w-0'>
            <p
              className='text-sm font-medium truncate'
              style={{ color: colors.paper }}
            >
              {session?.user?.username || session?.user?.name || "User"}
            </p>
            <p
              className='text-xs truncate'
              style={{ color: colors.paper, opacity: 0.8 }}
            >
              Administrator
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className='w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200'
          style={{ color: colors.paper }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#EF4444";
            e.currentTarget.style.backgroundColor = `${colors.paper}30`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = colors.paper;
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <LogOut className='w-4 h-4' />
          Sign Out
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
