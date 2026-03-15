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
  Database,
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
  Percent,
  Receipt,
  UserCog,
  House,
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
  const { data: session, status } = useSession();

  // Default to ADMIN role (1) if session not loaded yet
  const userRole = Number((session?.user as any)?.role) || ROLES.ADMIN;

  const [isFileMaintenanceOpen, setIsFileMaintenanceOpen] = useState(false);
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const prevViewRef = useRef<string>("");

  const fileMaintenanceSubItems = useMemo(
    () => [
      {
        id: "students",
        label: "Students",
        icon: Users,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.FACULTY],
      },
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
        id: "file-maintenance-discount",
        label: "Discount",
        icon: Percent,
        allowedRoles: [ROLES.ADMIN, ROLES.CASHIER],
      },
      {
        id: "file-maintenance-products",
        label: "Products",
        icon: Package,
        allowedRoles: [ROLES.ADMIN, ROLES.CASHIER],
      },
      {
        id: "file-maintenance-schools-programs",
        label: "Schools & Programs",
        icon: GraduationCap,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
      },
      {
        id: "file-maintenance-subject",
        label: "Subject",
        icon: BookOpen,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.FACULTY],
      },
      {
        id: "miscellaneous-fees",
        label: "Miscellaneous Fees",
        icon: Receipt,
        allowedRoles: [ROLES.ADMIN, ROLES.CASHIER],
      },
      {
        id: "account-management",
        label: "Account Management",
        icon: UserCog,
        allowedRoles: [ROLES.ADMIN],
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

  const transactionSubItems = useMemo(
    () => [
      {
        id: "enrollment-form",
        label: "Enrollment Form",
        icon: FileText,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
      },
      {
        id: "assessment",
        label: "Assessment",
        icon: Calculator,
        allowedRoles: [ROLES.ADMIN, ROLES.CASHIER],
      },
      {
        id: "resident-enrollment",
        label: "Resident",
        icon: Users2,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
      },
      {
        id: "payment-billing",
        label: "Payment",
        icon: CreditCard,
        allowedRoles: [ROLES.ADMIN, ROLES.CASHIER],
      },
    ],
    [],
  );

  const reportSubItems = useMemo(
    () => [
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
        id: "forecast-billing",
        label: "Forecasting",
        icon: TrendingUp,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
      },
      {
        id: "enrollments",
        label: "Enrollment",
        icon: UserPlus,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
      },
      {
        id: "section-management",
        label: "Section Management",
        icon: FolderTree,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
      },
      {
        id: "faculty-subject-management",
        label: "Faculty Management",
        icon: Users2,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
      },
      {
        id: "reports",
        label: "Audit Trail",
        icon: FileBarChart,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR],
      },
      {
        id: "reports-payments-dashboard",
        label: "Payments Dashboard",
        icon: DollarSign,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.CASHIER],
      },
    ],
    [],
  );

  const navGroups = useMemo(
    () => [
      {
        category: "",
        items: [
          {
            id: "home",
            label: "Home",
            icon: House,
            allowedRoles: [
              ROLES.ADMIN,
              ROLES.REGISTRAR,
              ROLES.CASHIER,
              ROLES.FACULTY,
            ],
          },
          {
            id: "transaction",
            label: "Transaction",
            icon: CreditCard,
            hasSubmenu: true,
            allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.CASHIER],
          },
          {
            id: "curriculum",
            label: "Curriculum",
            icon: GraduationCap,
            hasSubmenu: true,
            allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.FACULTY],
          },
        ],
      },
      {
        category: "",
        items: [
          {
            id: "report",
            label: "Reports",
            icon: FileBarChart,
            hasSubmenu: true,
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
            id: "backups",
            label: "Backups",
            icon: Database,
            allowedRoles: [ROLES.ADMIN],
          },
          {
            id: "settings",
            label: "Settings",
            icon: Settings,
            allowedRoles: [ROLES.ADMIN],
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

          if (item.id === "transaction") {
            const visibleSubItems = transactionSubItems.filter((sub) =>
              sub.allowedRoles.includes(userRole),
            );
            return visibleSubItems.length > 0;
          }

          if (item.id === "report") {
            const visibleSubItems = reportSubItems.filter((sub) =>
              sub.allowedRoles.includes(userRole),
            );
            return visibleSubItems.length > 0;
          }

          return true;
        });

        return { ...group, items: visibleItems };
      })
      .filter((group) => group.items.length > 0);
  }, [
    navGroups,
    fileMaintenanceSubItems,
    curriculumSubItems,
    transactionSubItems,
    reportSubItems,
    userRole,
  ]);

  // Filter sub-items for rendering
  const visibleSubItems = fileMaintenanceSubItems.filter((item) =>
    item.allowedRoles.includes(userRole),
  );

  const visibleCurriculumSubItems = curriculumSubItems.filter((item) =>
    item.allowedRoles.includes(userRole),
  );
  const visibleTransactionSubItems = transactionSubItems.filter((item) =>
    item.allowedRoles.includes(userRole),
  );
  const visibleReportSubItems = reportSubItems.filter((item) =>
    item.allowedRoles.includes(userRole),
  );

  const isFileMaintenanceActive = currentView.startsWith("file-maintenance");
  const isCurriculumActive = currentView.startsWith("curriculum");
  const isTransactionActive = transactionSubItems.some(
    (item) => item.id === currentView,
  );
  const isReportActive = reportSubItems.some((item) => item.id === currentView);
  const prevWasFileMaintenance =
    prevViewRef.current.startsWith("file-maintenance");
  const prevWasCurriculum = prevViewRef.current.startsWith("curriculum");
  const prevWasTransaction = transactionSubItems.some(
    (item) => item.id === prevViewRef.current,
  );
  const prevWasReport = reportSubItems.some(
    (item) => item.id === prevViewRef.current,
  );

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
    if (isTransactionActive && !prevWasTransaction && !isTransactionOpen) {
      setIsTransactionOpen(true);
    }
    if (isReportActive && !prevWasReport && !isReportOpen) {
      setIsReportOpen(true);
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
    isTransactionActive,
    prevWasTransaction,
    isTransactionOpen,
    isReportActive,
    prevWasReport,
    isReportOpen,
  ]);

  return (
    <nav
      className='border-r w-64 h-screen p-4 flex flex-col overflow-hidden relative z-50'
      style={{ backgroundColor: colors.primary }}
    >
      {/* Logo Section */}
      <div className='mb-8 flex items-center justify-start gap-3'>
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
        <div>
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
              {group.category && (
                <div className='mb-2 px-3'>
                  <h3
                    className='text-xs font-semibold uppercase tracking-wider'
                    style={{ color: colors.paper, opacity: 0.6 }}
                  >
                    {group.category}
                  </h3>
                </div>
              )}
              <ul className='space-y-1'>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isFileMaintenance = item.id === "file-maintenance";
                  const isCurriculum = item.id === "curriculum";
                  const isTransaction = item.id === "transaction";
                  const isReport = item.id === "report";
                  const isActive = isFileMaintenance
                    ? isFileMaintenanceActive
                    : isCurriculum
                      ? isCurriculumActive
                      : isTransaction
                        ? isTransactionActive
                        : isReport
                          ? isReportActive
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
                              } else if (isTransaction) {
                                setIsTransactionOpen(!isTransactionOpen);
                              } else if (isReport) {
                                setIsReportOpen(!isReportOpen);
                              }
                            } else {
                              if (isFileMaintenance && item.hasSubmenu) {
                                setIsFileMaintenanceOpen(
                                  !isFileMaintenanceOpen,
                                );
                              } else if (isCurriculum && item.hasSubmenu) {
                                // For Curriculum, clicking the main button navigates to curriculum view
                                onViewChange(item.id);
                              } else if (isTransaction && item.hasSubmenu) {
                                setIsTransactionOpen(!isTransactionOpen);
                              } else if (isReport && item.hasSubmenu) {
                                setIsReportOpen(!isReportOpen);
                              } else {
                                onViewChange(item.id);
                              }
                            }
                          }}
                          className='w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative'
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
                          <span className='flex-1 text-left'>{item.label}</span>
                          {(isFileMaintenance ||
                            isCurriculum ||
                            isTransaction ||
                            isReport) &&
                            item.hasSubmenu && (
                              <span className='chevron-toggle cursor-pointer flex items-center justify-center'>
                                {(isFileMaintenance && isFileMaintenanceOpen) ||
                                (isCurriculum && isCurriculumOpen) ||
                                (isTransaction && isTransactionOpen) ||
                                (isReport && isReportOpen) ? (
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
                                      console.log(
                                        "Submenu item clicked:",
                                        subItem.id,
                                      );
                                      console.log(
                                        "onViewChange type:",
                                        typeof onViewChange,
                                      );
                                      console.log(
                                        "Calling onViewChange with:",
                                        subItem.id,
                                      );
                                      onViewChange(subItem.id);
                                      console.log(
                                        "onViewChange called successfully",
                                      );
                                    }}
                                    className='w-full flex items-center justify-start gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200'
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
                                    <span>{subItem.label}</span>
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
                                  className='w-full flex items-center justify-start gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200'
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
                                  <span>{subItem.label}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {/* Transaction Submenu */}
                      {isTransaction &&
                        item.hasSubmenu &&
                        isTransactionOpen && (
                          <ul className='ml-0 md:ml-4 mt-1 space-y-1'>
                            {visibleTransactionSubItems.map((subItem) => {
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
                                    className='w-full flex items-center justify-start gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200'
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
                                    <span>{subItem.label}</span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                      {/* Report Submenu */}
                      {isReport && item.hasSubmenu && isReportOpen && (
                        <ul className='ml-0 md:ml-4 mt-1 space-y-1'>
                          {visibleReportSubItems.map((subItem) => {
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
                                  className='w-full flex items-center justify-start gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200'
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
                                  <span>{subItem.label}</span>
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
