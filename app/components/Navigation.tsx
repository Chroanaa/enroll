"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  BarChart3,
  Users,
  BookOpen,
  UserPlus,
  Calendar,
  LogOut,
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
  TrendingUp,
  Package,
} from "lucide-react";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { colors } from "../colors";

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

// 1. UPDATE: Define Roles using Integers (IDs)
const ROLES = {
  ADMIN: 1,
  CASHIER: 2,
  FACULTY: 3,
  REGISTRAR: 4,
};

const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onViewChange,
}) => {
  const { data: session } = useSession();

  const userRole = Number((session?.user as any)?.role) || 0;

  const [isFileMaintenanceOpen, setIsFileMaintenanceOpen] = useState(false);
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);
  const prevViewRef = useRef<string>("");

  const fileMaintenanceSubItems = useMemo(
    () => [
      {
        id: "file-maintenance-building",
        label: "Building",
        icon: Building2,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
      },
      {
        id: "file-maintenance-section",
        label: "Section",
        icon: FolderTree,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
      },
      {
        id: "file-maintenance-room",
        label: "Room",
        icon: DoorOpen,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
      },
      {
        id: "file-maintenance-department",
        label: "Department",
        icon: Network,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
      },
      {
        id: "file-maintenance-major",
        label: "Major",
        icon: BookOpen,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
      },
      {
        id: "file-maintenance-faculty",
        label: "Faculty",
        icon: Users2,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
      },
      {
        id: "file-maintenance-fees",
        label: "Fees",
        icon: DollarSign,
        allowedRoles: [ROLES.ADMIN, ROLES.CASHIER],
      },
      {
        id: "file-maintenance-products",
        label: "Products",
        icon: Package,
        allowedRoles: [ROLES.ADMIN, ROLES.CASHIER],
      },
      {
        id: "file-maintenance-subject",
        label: "Subject",
        icon: BookOpen,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.FACULTY],
      },
    ],
    [],
  );

  const curriculumSubItems = useMemo(
    () => [
      {
        id: "curriculum-program",
        label: "Program",
        icon: GraduationCap,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
      },
    ],
    [],
  );

  const navGroups = useMemo(
    () => [
      {
        category: "Academic",
        items: [
          {
            id: "students",
            label: "Students",
            icon: Users,
            allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.FACULTY],
          },
          {
            id: "courses",
            label: "Courses",
            icon: BookOpen,
            allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.FACULTY],
          },
          {
            id: "enrollments",
            label: "Enrollments",
            icon: UserPlus,
            allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
          },
          {
            id: "enrollment-form",
            label: "Enrollment Form",
            icon: FileText,
            allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
          },
          {
            id: "resident-enrollment",
            label: "Resident Enrollment",
            icon: UserPlus,
            allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
          },
          {
            id: "curriculum",
            label: "Curriculum",
            icon: GraduationCap,
            hasSubmenu: true,
            allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.FACULTY],
          },
          {
            id: "scheduling",
            label: "Scheduling",
            icon: CalendarClock,
            allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.FACULTY],
          },
        ],
      },
      {
        category: "System",
        items: [
          {
            id: "dashboard",
            label: "Dashboard",
            icon: BarChart3,
            allowedRoles: [
              ROLES.ADMIN,
              ROLES.REGISTRAR,
              ROLES.CASHIER,
              ROLES.FACULTY,
            ],
          },
          {
            id: "file-maintenance",
            label: "File Maintenance",
            icon: Settings,
            hasSubmenu: true,
            allowedRoles: [
              ROLES.ADMIN,
              ROLES.REGISTRAR,
              ROLES.CASHIER,
              ROLES.FACULTY,
            ],
          },
          {
            id: "reports",
            label: "Reports",
            icon: FileBarChart,
            allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
          },

          {
            id: "forecast-billing",
            label: "Student Forecast",
            icon: TrendingUp,
            allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
          },
        ],
      },
      {
        category: "Payment",
        items: [
          {
            id: "assessment",
            label: "Assessment",
            icon: Calculator,
            allowedRoles: [ROLES.ADMIN, ROLES.CASHIER],
          },
          {
            id: "payment-billing",
            label: "Payment & Billing",
            icon: CreditCard,
            allowedRoles: [ROLES.ADMIN, ROLES.CASHIER],
          },
        ],
      },
    ],
    [],
  );

  // 5. Filtering Logic (remains largely the same, but compares numbers now)
  const filteredNavGroups = useMemo(() => {
    if (!userRole) return [];

    return navGroups
      .map((group) => {
        const visibleItems = group.items.filter((item) => {
          // Check if role ID is in the allowed array
          if (!item.allowedRoles.includes(userRole)) return false;

          if (item.id === "file-maintenance") {
            const visibleSubItems = fileMaintenanceSubItems.filter((sub) =>
              sub.allowedRoles.includes(userRole),
            );
            return visibleSubItems.length > 0;
          }

          if (item.id === "curriculum") {
            const visibleSubItems = curriculumSubItems.filter((sub) =>
              sub.allowedRoles.includes(userRole),
            );
            return visibleSubItems.length > 0;
          }

          return true;
        });

        return { ...group, items: visibleItems };
      })
      .filter((group) => group.items.length > 0);
  }, [navGroups, fileMaintenanceSubItems, curriculumSubItems, userRole]);

  // Filter sub-items for rendering
  const visibleSubItems = fileMaintenanceSubItems.filter((item) =>
    item.allowedRoles.includes(userRole),
  );

  const visibleCurriculumSubItems = curriculumSubItems.filter((item) =>
    item.allowedRoles.includes(userRole),
  );

  const isFileMaintenanceActive = currentView.startsWith("file-maintenance");
  const isCurriculumActive = currentView.startsWith("curriculum");
  const prevWasFileMaintenance =
    prevViewRef.current.startsWith("file-maintenance");
  const prevWasCurriculum = prevViewRef.current.startsWith("curriculum");

  useEffect(() => {
    if (
      isFileMaintenanceActive &&
      !prevWasFileMaintenance &&
      !isFileMaintenanceOpen
    ) {
      setIsFileMaintenanceOpen(true);
    }
    if (isCurriculumActive && !prevWasCurriculum && !isCurriculumOpen) {
      setIsCurriculumOpen(true);
    }
    prevViewRef.current = currentView;
  }, [
    currentView,
    isFileMaintenanceActive,
    prevWasFileMaintenance,
    isFileMaintenanceOpen,
    isCurriculumActive,
    prevWasCurriculum,
    isCurriculumOpen,
  ]);

  return (
    <nav
      className='border-r w-16 md:w-64 h-screen p-2 md:p-4 flex flex-col overflow-hidden'
      style={{ backgroundColor: colors.primary }}
    >
      {/* Logo Section */}
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

      {/* Nav Scroll */}
      <div
        className='flex-1 overflow-y-auto overflow-x-hidden pr-1 nav-scroll'
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: `${colors.paper}40 transparent`,
        }}
      >
        <ul className='space-y-4'>
          {filteredNavGroups.map((group) => (
            <li key={group.category}>
              <div className='hidden md:block mb-2 px-3'>
                <h3
                  className='text-xs font-semibold uppercase tracking-wider'
                  style={{ color: colors.paper, opacity: 0.6 }}
                >
                  {group.category}
                </h3>
              </div>
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
                            const isChevronClick =
                              target.closest(".chevron-toggle");

                            if (isChevronClick) {
                              if (isFileMaintenance) {
                                setIsFileMaintenanceOpen(
                                  !isFileMaintenanceOpen,
                                );
                              } else if (isCurriculum) {
                                setIsCurriculumOpen(!isCurriculumOpen);
                              }
                            } else {
                              if (isFileMaintenance && item.hasSubmenu) {
                                setIsFileMaintenanceOpen(
                                  !isFileMaintenanceOpen,
                                );
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
                          {(isFileMaintenance || isCurriculum) &&
                            item.hasSubmenu && (
                              <span className='hidden md:inline chevron-toggle cursor-pointer flex items-center justify-center'>
                                {(isFileMaintenance && isFileMaintenanceOpen) ||
                                (isCurriculum && isCurriculumOpen) ? (
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
                            {visibleSubItems.map((subItem) => {
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
                      {isCurriculum && item.hasSubmenu && isCurriculumOpen && (
                        <ul className='ml-0 md:ml-4 mt-1 space-y-1'>
                          {visibleCurriculumSubItems.map((subItem) => {
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

      {/* User Profile */}
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
              {session?.user?.name || "User"}
            </p>
            <p
              className='text-xs truncate'
              style={{ color: colors.paper, opacity: 0.8 }}
            >
              {/* Display ID or map it back to text for display purposes only */}
              {userRole === 1 && "Administrator"}
              {userRole === 2 && "Cashier"}
              {userRole === 3 && "Faculty"}
              {userRole === 4 && "Registrar"}
              {!userRole && "Guest"}
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
