"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  BarChart3,
  Users,
  BookOpen,
  UserPlus,
  Calendar,
  LogOut,
  User,
  FileText,
  Calculator,
  FileBarChart,
  CalendarClock,
  CreditCard,
  GraduationCap,
  Settings,
  ChevronDown,
  ChevronRight,
  Building2,
  Network,
  Users2,
  DollarSign,
  DoorOpen,
  FolderTree,
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
  const [isFileMaintenanceOpen, setIsFileMaintenanceOpen] = useState(false);
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);
  const prevViewRef = useRef<string>("");

  const fileMaintenanceSubItems = [
    { id: "file-maintenance-building", label: "Building", icon: Building2 },
    { id: "file-maintenance-section", label: "Section", icon: FolderTree },
    { id: "file-maintenance-room", label: "Room", icon: DoorOpen },
    { id: "file-maintenance-department", label: "Department", icon: Network },
    { id: "file-maintenance-major", label: "Major", icon: BookOpen },
    { id: "file-maintenance-faculty", label: "Faculty", icon: Users2 },
    { id: "file-maintenance-fees", label: "Fees", icon: DollarSign },
    { id: "file-maintenance-subject", label: "Subject", icon: BookOpen },
  ];

  const curriculumSubItems = [
    { id: "curriculum-program", label: "Program", icon: GraduationCap },
  ];

  const navGroups = [
    {
      category: "Academic",
      items: [
        { id: "students", label: "Students", icon: Users },
        { id: "courses", label: "Courses", icon: BookOpen },
        { id: "enrollments", label: "Enrollments", icon: UserPlus },
        { id: "enrollment-form", label: "Enrollment Form", icon: FileText },
        {
          id: "curriculum",
          label: "Curriculum",
          icon: GraduationCap,
          hasSubmenu: true,
        },
        { id: "scheduling", label: "Scheduling", icon: CalendarClock },
      ],
    },
    {
      category: "System",
      items: [
        { id: "dashboard", label: "Dashboard", icon: BarChart3 },
        {
          id: "file-maintenance",
          label: "File Maintenance",
          icon: Settings,
          hasSubmenu: true,
        },
        { id: "reports", label: "Reports", icon: FileBarChart },
        { id: "forecast", label: "Forecasting", icon: Calendar },
      ],
    },
    {
      category: "Payment",
      items: [
        { id: "assessment", label: "Assessment", icon: Calculator },
        { id: "payment-billing", label: "Payment & Billing", icon: CreditCard },
      ],
    },
  ];

  // Check if current view is a file maintenance sub-item
  const isFileMaintenanceActive = currentView.startsWith("file-maintenance");
  const prevWasFileMaintenance =
    prevViewRef.current.startsWith("file-maintenance");

  // Check if current view is a curriculum sub-item
  const isCurriculumActive = currentView.startsWith("curriculum");
  const prevWasCurriculum =
    prevViewRef.current.startsWith("curriculum");

  // Auto-expand file maintenance only when navigating TO a sub-item from a non-file-maintenance view
  useEffect(() => {
    if (
      isFileMaintenanceActive &&
      !prevWasFileMaintenance &&
      !isFileMaintenanceOpen
    ) {
      setIsFileMaintenanceOpen(true);
    }
    prevViewRef.current = currentView;
  }, [
    currentView,
    isFileMaintenanceActive,
    prevWasFileMaintenance,
    isFileMaintenanceOpen,
  ]);

  // Auto-expand curriculum only when navigating TO a sub-item from a non-curriculum view
  useEffect(() => {
    if (
      isCurriculumActive &&
      !prevWasCurriculum &&
      !isCurriculumOpen &&
      currentView !== "curriculum"
    ) {
      setIsCurriculumOpen(true);
    }
    prevViewRef.current = currentView;
  }, [
    currentView,
    isCurriculumActive,
    prevWasCurriculum,
    isCurriculumOpen,
  ]);
  return (
    <nav
      className='border-r w-16 md:w-64 h-screen p-2 md:p-4 flex flex-col overflow-hidden'
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
            ITERESIAN
          </h1>
          <p className='text-xs' style={{ color: colors.paper, opacity: 0.9 }}>
            Enrollment System
          </p>
        </div>
      </div>

      {/* Nav Items with Scrollbar */}
      <div
        className='flex-1 overflow-y-auto overflow-x-hidden pr-1 nav-scroll'
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: `${colors.paper}40 transparent`,
        }}
      >
        <ul className='space-y-4'>
          {navGroups.map((group) => (
            <li key={group.category}>
              {/* Group Header */}
              <div className='hidden md:block mb-2 px-3'>
                <h3
                  className='text-xs font-semibold uppercase tracking-wider'
                  style={{ color: colors.paper, opacity: 0.6 }}
                >
                  {group.category}
                </h3>
              </div>

              {/* Group Items */}
              <ul className='space-y-1'>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isFileMaintenance = item.id === "file-maintenance";
                  const isCurriculum = item.id === "curriculum";
                  const isActive = isFileMaintenance
                    ? isFileMaintenanceActive
                    : isCurriculum
                    ? isCurriculumActive
                    : currentView === item.id;

                  return (
                    <li key={item.id}>
                      <div className='relative w-full'>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            // Check if click was on the chevron area
                            const target = e.target as HTMLElement;
                            const isChevronClick = target.closest('.chevron-toggle');
                            
                            if (isChevronClick) {
                              if (isFileMaintenance) {
                                setIsFileMaintenanceOpen(!isFileMaintenanceOpen);
                              } else if (isCurriculum) {
                                setIsCurriculumOpen(!isCurriculumOpen);
                              }
                            } else {
                              if (isFileMaintenance && item.hasSubmenu) {
                                setIsFileMaintenanceOpen(!isFileMaintenanceOpen);
                              } else if (isCurriculum && item.hasSubmenu) {
                                // For Curriculum, clicking the main button navigates to curriculum view
                                onViewChange(item.id);
                              } else {
                                onViewChange(item.id);
                              }
                            }
                          }}
                          className='w-full flex items-center justify-center md:justify-start gap-0 md:gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative'
                          style={
                            isActive
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
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor = `${colors.paper}20`;
                              e.currentTarget.style.opacity = "1";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                              e.currentTarget.style.opacity = "0.8";
                            }
                          }}
                        >
                          <Icon className='w-5 h-5' />
                          <span className='hidden md:inline flex-1 text-left'>
                            {item.label}
                          </span>
                          {((isFileMaintenance || isCurriculum) && item.hasSubmenu) && (
                            <span className='hidden md:inline chevron-toggle cursor-pointer flex items-center justify-center'>
                              {(isFileMaintenance && isFileMaintenanceOpen) || (isCurriculum && isCurriculumOpen) ? (
                                <ChevronDown className='w-4 h-4' />
                              ) : (
                                <ChevronRight className='w-4 h-4' />
                              )}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* File Maintenance Submenu */}
                      {isFileMaintenance &&
                        item.hasSubmenu &&
                        isFileMaintenanceOpen && (
                          <ul className='ml-0 md:ml-4 mt-1 space-y-1'>
                            {fileMaintenanceSubItems.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const isSubActive = currentView === subItem.id;
                              return (
                                <li key={subItem.id}>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onViewChange(subItem.id);
                                    }}
                                    className='w-full flex items-center justify-center md:justify-start gap-0 md:gap-3 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200'
                                    style={
                                      isSubActive
                                        ? {
                                            backgroundColor: `${colors.secondary}40`,
                                            color: colors.paper,
                                            border: `1px solid ${colors.secondary}`,
                                          }
                                        : {
                                            color: colors.paper,
                                            backgroundColor: "transparent",
                                            border: "1px solid transparent",
                                            opacity: 0.7,
                                          }
                                    }
                                    onMouseEnter={(e) => {
                                      if (!isSubActive) {
                                        e.currentTarget.style.backgroundColor = `${colors.paper}20`;
                                        e.currentTarget.style.opacity = "1";
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSubActive) {
                                        e.currentTarget.style.backgroundColor =
                                          "transparent";
                                        e.currentTarget.style.opacity = "0.7";
                                      }
                                    }}
                                  >
                                    <SubIcon className='w-4 h-4' />
                                    <span className='hidden md:inline'>
                                      {subItem.label}
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                      {/* Curriculum Submenu */}
                      {isCurriculum &&
                        item.hasSubmenu &&
                        isCurriculumOpen && (
                          <ul className='ml-0 md:ml-4 mt-1 space-y-1'>
                            {curriculumSubItems.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const isSubActive = currentView === subItem.id;
                              return (
                                <li key={subItem.id}>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onViewChange(subItem.id);
                                    }}
                                    className='w-full flex items-center justify-center md:justify-start gap-0 md:gap-3 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200'
                                    style={
                                      isSubActive
                                        ? {
                                            backgroundColor: `${colors.secondary}40`,
                                            color: colors.paper,
                                            border: `1px solid ${colors.secondary}`,
                                          }
                                        : {
                                            color: colors.paper,
                                            backgroundColor: "transparent",
                                            border: "1px solid transparent",
                                            opacity: 0.7,
                                          }
                                    }
                                    onMouseEnter={(e) => {
                                      if (!isSubActive) {
                                        e.currentTarget.style.backgroundColor = `${colors.paper}20`;
                                        e.currentTarget.style.opacity = "1";
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSubActive) {
                                        e.currentTarget.style.backgroundColor =
                                          "transparent";
                                        e.currentTarget.style.opacity = "0.7";
                                      }
                                    }}
                                  >
                                    <SubIcon className='w-4 h-4' />
                                    <span className='hidden md:inline'>
                                      {subItem.label}
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
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
