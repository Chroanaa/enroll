"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  FolderKanban,
  Loader2,
  LucideIcon,
  Users,
} from "lucide-react";
import { colors } from "../colors";
import { useSession } from "next-auth/react";
import { isViewAllowed } from "../lib/rbac";

type HomeModule = {
  title: string;
  description: string;
  icon: LucideIcon;
  views: string[];
};

const modules: HomeModule[] = [
  {
    title: "Overview",
    description: "Open dashboards and reporting tools.",
    icon: BarChart3,
    views: [
      "dashboard",
      "reports",
      "forecast-billing",
      "reports-payments-dashboard",
      "reports-registration-forms",
      "reports-subject-dropping",
    ],
  },
  {
    title: "Student Services",
    description: "Access student and enrollment records.",
    icon: Users,
    views: [
      "students",
      "enrollment-form",
      "enrollments",
      "resident-enrollment",
      "courses",
    ],
  },
  {
    title: "Transactions",
    description: "Manage assessment, payment, and workflow actions.",
    icon: CreditCard,
    views: [
      "payment-billing",
      "assessment",
      "subject-dropping",
      "student-dropping",
      "cross-enrollee",
      "external-cross-enrollment",
      "shifting",
      "program-shifting",
      "refund",
    ],
  },
  {
    title: "Management",
    description: "Go to maintenance, scheduling, and setup tools.",
    icon: FolderKanban,
    views: [
      "section-management",
      "faculty-subject-management",
      "curriculum-program",
      "file-maintenance-approval",
      "file-maintenance-building",
      "file-maintenance-section",
      "file-maintenance-room",
      "file-maintenance-department",
      "file-maintenance-major",
      "file-maintenance-faculty",
      "file-maintenance-fees",
      "file-maintenance-discount",
      "file-maintenance-products",
      "file-maintenance-schools-programs",
      "file-maintenance-subject",
      "miscellaneous-fees",
      "account-management",
      "backups",
      "settings",
    ],
  },
];

const HomePage: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [loadingView, setLoadingView] = useState<string | null>(null);
  const userRole = Number((session?.user as any)?.role) || 0;

  const visibleModules = useMemo(
    () =>
      modules
        .map((module) => {
          const targetView = module.views.find((view) =>
            isViewAllowed(view, userRole),
          );

          return targetView ? { ...module, targetView } : null;
        })
        .filter((module): module is HomeModule & { targetView: string } =>
          Boolean(module),
        ),
    [userRole],
  );

  const navigateToView = (view: string) => {
    if (!isViewAllowed(view, userRole)) {
      return;
    }

    setLoadingView(view);
    router.push(`/dashboard?view=${encodeURIComponent(view)}`);
  };

  return (
    <div
      className='min-h-screen flex items-center justify-center'
      style={{ backgroundColor: colors.paper }}
    >
      <div className='w-full max-w-5xl px-6 py-16'>
        <div className='text-center mb-16'>
          <div
            className='mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full'
            style={{
              backgroundColor: "white",
              boxShadow: `0 8px 32px ${colors.primary}20`,
            }}
          >
            <Image
              src='/logo.png'
              alt='CSTA Logo'
              width={80}
              height={80}
              className='object-contain'
              priority
            />
          </div>

          <h1
            className='text-3xl font-semibold tracking-tight mb-3'
            style={{ color: colors.primary }}
          >
            Teresa Enrollment System
          </h1>

          <p className='text-gray-500 text-base max-w-md mx-auto'>
            Quick access to the main modules available for your role.
          </p>
        </div>

        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-16'>
          {visibleModules.map((module) => {
            const Icon = module.icon;
            const isLoading = loadingView === module.targetView;

            return (
              <div
                key={module.title}
                className='group p-5 rounded-2xl bg-white border cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5'
                style={{ borderColor: `${colors.tertiary}25` }}
                onClick={() => {
                  if (!loadingView) {
                    navigateToView(module.targetView);
                  }
                }}
              >
                <div
                  className='w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors'
                  style={{ backgroundColor: `${colors.primary}08` }}
                >
                  {isLoading ? (
                    <Loader2
                      className='w-5 h-5 animate-spin'
                      style={{ color: colors.primary }}
                    />
                  ) : (
                    <Icon
                      className='w-5 h-5'
                      style={{ color: colors.primary }}
                    />
                  )}
                </div>
                <p
                  className='font-medium text-sm'
                  style={{ color: colors.primary }}
                >
                  {module.title}
                </p>
                <p className='text-xs text-gray-400 mt-0.5'>
                  {isLoading ? "Opening module..." : module.description}
                </p>
              </div>
            );
          })}
        </div>

        <div
          className='rounded-2xl p-8 text-center'
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
          }}
        >
          <p className='text-white/80 text-sm mb-2'>Ready to get started?</p>
          <p className='text-white font-medium text-lg mb-5'>
            Select one of the main modules to continue
          </p>
          <div
            className='inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer'
            style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              color: "white",
            }}
            onClick={() => {
              if (!loadingView) {
                navigateToView("dashboard");
              }
            }}
          >
            <span>
              {loadingView === "dashboard"
                ? "Opening dashboard..."
                : "Open dashboard"}
            </span>
            {loadingView === "dashboard" ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <ArrowRight className='w-4 h-4' />
            )}
          </div>
        </div>

        <p className='text-center text-xs text-gray-400 mt-10'>
          Copyright {new Date().getFullYear()} Colegio de Sta. Teresa de Avila
        </p>
      </div>
    </div>
  );
};

export default HomePage;
