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
  UserMinus,
  CheckSquare,
} from "lucide-react";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { colors } from "../colors";
import { ROLES, isViewAllowed } from "../lib/rbac";

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

type NavLeafItem = {
  id: string;
  label: string;
  icon: any;
};

const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onViewChange,
}) => {
  const { data: session } = useSession();

  const userRole = session?.user?.role
    ? Number((session.user as any).role)
    : null;
  const resolvedUserRole = userRole ?? -1;

  const [isFileMaintenanceOpen, setIsFileMaintenanceOpen] = useState(false);
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const prevViewRef = useRef<string>("");

  const canAccessView = (view: string) => isViewAllowed(view, resolvedUserRole);

  const fileMaintenanceSubItems = useMemo<NavLeafItem[]>(
    () => [
      {
        id: "enrollment-form",
        label: "Student Information",
        icon: Users,
      },
      {
        id: "students",
        label: "Students",
        icon: Users,
      },
      {
        id: "file-maintenance-approval",
        label: "Approval",
        icon: CheckSquare,
      },
      {
        id: "file-maintenance-building",
        label: "Building",
        icon: Building2,
      },
      {
        id: "file-maintenance-section",
        label: "Section",
        icon: FolderTree,
      },
      {
        id: "file-maintenance-room",
        label: "Room",
        icon: DoorOpen,
      },
      {
        id: "file-maintenance-department",
        label: "Department",
        icon: Network,
      },
      {
        id: "file-maintenance-major",
        label: "Major",
        icon: BookOpen,
      },
      {
        id: "file-maintenance-faculty",
        label: "Faculty",
        icon: Users2,
      },
      {
        id: "file-maintenance-fees",
        label: "Fees",
        icon: DollarSign,
      },
      {
        id: "file-maintenance-discount",
        label: "Discount",
        icon: Percent,
      },
      {
        id: "file-maintenance-products",
        label: "Products",
        icon: Package,
        allowedRoles: [ROLES.ADMIN, ROLES.CASHIER],
      },
      {
        id: "miscellaneous-fees",
        label: "Miscellaneous Fees",
        icon: Receipt,
        allowedRoles: [ROLES.ADMIN, ROLES.CASHIER],
      },
      {
        id: "file-maintenance-schools-programs",
        label: "Schools & Programs",
        icon: GraduationCap,
      },
      {
        id: "file-maintenance-subject",
        label: "Subject",
        icon: BookOpen,
      },
      {
        id: "miscellaneous-fees",
        label: "Miscellaneous Fees",
        icon: Receipt,
      },
      {
        id: "account-management",
        label: "Account Management",
        icon: UserCog,
      },
    ],
    [],
  );

  const curriculumSubItems = useMemo<NavLeafItem[]>(
    () => [
      {
        id: "curriculum-program",
        label: "Program",
        icon: GraduationCap,
      },
    ],
    [],
  );

  const transactionSubItems = useMemo<NavLeafItem[]>(
    () => [
      {
        id: "enrollments",
        label: "Enrollment",
        icon: UserPlus,
      },
      {
        id: "assessment",
        label: "Assessment",
        icon: Calculator,
      },
      {
        id: "subject-dropping",
        label: "Subject Dropping",
        icon: UserMinus,
      },
      {
        id: "student-dropping",
        label: "Student Dropping",
        icon: UserMinus,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.DEAN],
      },
      {
        id: "cross-enrollee",
        label: "Cross Enrollee",
        icon: BookOpen,
      },
      {
        id: "shifting",
        label: "Section Shifting",
        icon: CalendarClock,
      },
      {
        id: "resident-enrollment",
        label: "Resident",
        icon: Users2,
      },
      {
        id: "payment-billing",
        label: "Payment",
        icon: CreditCard,
      },
      {
        id: "refund",
        label: "Refund",
        icon: DollarSign,
        allowedRoles: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.CASHIER],
      },
    ],
    [],
  );

  const reportSubItems = useMemo<NavLeafItem[]>(
    () => [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: BarChart3,
      },
      {
        id: "forecast-billing",
        label: "Forecasting",
        icon: TrendingUp,
      },
      {
        id: "section-management",
        label: "Scheduling Management",
        icon: FolderTree,
      },
      {
        id: "faculty-subject-management",
        label: "Faculty Management",
        icon: Users2,
      },
      {
        id: "reports",
        label: "Audit Trail",
        icon: FileBarChart,
      },
      {
        id: "reports-payments-dashboard",
        label: "Financial Analytics",
        icon: DollarSign,
      },
      {
        id: "reports-registration-forms",
        label: "Registration Forms",
        icon: FileText,
      },
    ],
    [],
  );

  const navGroups = useMemo(
    () => [
      {
        id: "primary",
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
              ROLES.DEAN,
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
            allowedRoles: [
              ROLES.ADMIN,
              ROLES.REGISTRAR,
              ROLES.FACULTY,
              ROLES.DEAN,
            ],
          },
        ],
      },
      {
        id: "secondary",
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
              ROLES.DEAN,
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
              ROLES.DEAN,
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
    if (userRole === null) return [];

    return navGroups
      .map((group) => {
        const visibleItems = group.items.filter((item) => {
          if (item.id === "file-maintenance") {
            const visibleSubItems = fileMaintenanceSubItems.filter((sub) =>
              canAccessView(sub.id),
            );
            return visibleSubItems.length > 0;
          }

          if (item.id === "curriculum") {
            const visibleSubItems = curriculumSubItems.filter((sub) =>
              canAccessView(sub.id),
            );
            return visibleSubItems.length > 0;
          }

          if (item.id === "transaction") {
            const visibleSubItems = transactionSubItems.filter((sub) =>
              canAccessView(sub.id),
            );
            return visibleSubItems.length > 0;
          }

          if (item.id === "report") {
            const visibleSubItems = reportSubItems.filter((sub) =>
              canAccessView(sub.id),
            );
            return visibleSubItems.length > 0;
          }

          return canAccessView(item.id);
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
    resolvedUserRole,
    userRole,
  ]);

  const dedupedNavGroups = useMemo(() => {
    const seenItemIds = new Set<string>();

    return filteredNavGroups
      .map((group) => {
        const uniqueItems = group.items.filter((item) => {
          if (seenItemIds.has(item.id)) return false;
          seenItemIds.add(item.id);
          return true;
        });

        return { ...group, items: uniqueItems };
      })
      .filter((group) => group.items.length > 0);
  }, [filteredNavGroups]);

  // Filter sub-items for rendering
  const visibleSubItems = fileMaintenanceSubItems.filter((item) =>
    canAccessView(item.id),
  );

  const visibleCurriculumSubItems = curriculumSubItems.filter((item) =>
    canAccessView(item.id),
  );
  const visibleTransactionSubItems = transactionSubItems.filter((item) =>
    canAccessView(item.id),
  );
  const visibleReportSubItems = reportSubItems.filter((item) =>
    canAccessView(item.id),
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
          {dedupedNavGroups.map((group) => (
            <li key={group.id}>
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
              {userRole === 5 && "Dean"}
              {userRole === null && "Guest"}
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
