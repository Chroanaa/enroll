"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navigation from "../components/Navigation";
import HomePage from "../components/HomePage";
import Dashboard from "../components/Dashboard";
import StudentManagement from "../components/StudentManagement";
import CourseManagement from "../components/CourseManagement";
import EnrollmentManagement from "../components/enrollmentManagement";
import EnrollmentForm from "../components/EnrollmentForm";
import ResidentPortalContent from "../resident/ResidentPortalContent";
import ForecastingAnalytics from "../components/ForecastingAnalytics";
import StudentForecastDashboard from "../components/StudentForecastDashboard";
import AssessmentManagement from "../components/AssessmentManagement";
import SubjectDroppingManagement from "../components/SubjectDroppingManagement";
import StudentDroppingManagement from "../components/StudentDroppingManagement";
import CrossEnrollmentManagement from "../components/CrossEnrollmentManagement";
import ExternalCrossEnrollmentManagement from "../components/ExternalCrossEnrollmentManagement";
import ShiftingManagement from "../components/ShiftingManagement";
import ProgramShiftingManagement from "../components/ProgramShiftingManagement";
import ReportManagement from "../components/ReportManagement";
import PaymentsDashboard from "../components/reports/PaymentsDashboard";
import RegistrationFormPrintReports from "../components/reports/RegistrationFormPrintReports";
import SubjectDropReports from "../components/reports/SubjectDropReports";
import CrossEnrollmentReports from "../components/reports/CrossEnrollmentReports";
import ProgramShiftingReports from "../components/reports/ProgramShiftingReports";
import SectionShiftingReports from "../components/reports/SectionShiftingReports";
import RefundReports from "../components/reports/RefundReports";
import SchedulingManagement from "../components/SchedulingManagement";
import PaymentBillingManagement from "../components/PaymentBillingManagement";
import RefundManagement from "../components/RefundManagement";
import StudentPaymentCheckoutPage from "../components/paymentBilling/StudentPaymentCheckoutPage";
import StudentFinancialDetailPage from "../components/paymentBilling/StudentFinancialDetailPage";
import CurriculumManagement from "../components/curriculum";
import FileMaintenanceManagement from "../components/FileMaintenanceManagement";
import Settings from "../components/Settings";
import AccountManagement from "../components/AccountManagement";
import BackupManagement from "../components/BackupManagement";
import {
  Approval,
  Building,
  Section,
  Room,
  Department,
  Program,
  Major,
  Faculty,
  Fees,
  Discount,
  Subject,
  Products,
  SchoolsPrograms,
  PaymentMethods,
} from "../components/fileMaintenance";
import MiscellaneousFees from "../components/MiscellaneousFees";
import ProtectedRoute from "../components/ProtectedRoute";
import SectionManagement from "../admin/sections/page";
import FacultySubjectManagement from "../admin/faculty-subject-management/page";
import { useSession } from "next-auth/react";
import { isViewAllowed } from "../lib/rbac";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentView, setCurrentView] = useState("home");
  const { data: session } = useSession();
  const userRole = Number((session?.user as any)?.role) || 0;

  const getSafeView = (view: string | null | undefined) => {
    const fallback = isViewAllowed("dashboard", userRole)
      ? "dashboard"
      : "home";
    if (!view) {
      return fallback;
    }

    return isViewAllowed(view, userRole) ? view : fallback;
  };

  // Read view from URL params on mount
  useEffect(() => {
    const view = searchParams.get("view");
    setCurrentView(getSafeView(view));
  }, [searchParams, userRole]);

  const handleViewChange = (view: string) => {
    const safeView = getSafeView(view);
    setCurrentView(safeView);
    router.push(`/dashboard?view=${encodeURIComponent(safeView)}`);
  };

  const renderCurrentView = () => {
    if (!isViewAllowed(currentView, userRole)) {
      return isViewAllowed("dashboard", userRole) ? (
        <Dashboard />
      ) : (
        <HomePage />
      );
    }

    switch (currentView) {
      case "home":
        return <HomePage />;
      case "dashboard":
        return <Dashboard />;
      case "students":
        return <StudentManagement onViewChange={handleViewChange} />;
      case "courses":
        return <CourseManagement />;
      case "enrollments":
        return <EnrollmentManagement />;
      case "enrollment-form":
        return <EnrollmentForm />;
      case "resident-enrollment":
        return <ResidentPortalContent />;
      case "forecast":
        return <ForecastingAnalytics />;
      case "forecast-billing":
        return <StudentForecastDashboard />;
      case "assessment":
        return <AssessmentManagement />;
      case "subject-dropping":
        return <SubjectDroppingManagement />;
      case "student-dropping":
        return <StudentDroppingManagement />;
      case "cross-enrollee":
        return <CrossEnrollmentManagement mode="inter-program" />;
      case "external-cross-enrollment":
        return <ExternalCrossEnrollmentManagement />;
      case "petition-subject":
        return <CrossEnrollmentManagement mode="petition" />;
      case "shifting":
        return <ShiftingManagement />;
      case "program-shifting":
        return <ProgramShiftingManagement />;
      case "reports":
        return <ReportManagement />;
      case "reports-payments-dashboard":
        return <PaymentsDashboard />;
      case "reports-registration-forms":
        return <RegistrationFormPrintReports />;
      case "reports-subject-dropping":
        return <SubjectDropReports />;
      case "reports-cross-enrollment":
        return <CrossEnrollmentReports />;
      case "reports-program-shifting":
        return <ProgramShiftingReports />;
      case "reports-section-shifting":
        return <SectionShiftingReports />;
      case "reports-refund":
        return <RefundReports />;
      case "scheduling":
        return <SchedulingManagement />;
      case "payment-billing":
        return <PaymentBillingManagement />;
      case "refund":
        return <RefundManagement />;
      case "student-payment-checkout":
        return <StudentPaymentCheckoutPage />;
      case "student-financial-detail":
        return <StudentFinancialDetailPage />;
      case "section-management":
        return <SectionManagement />;
      case "faculty-subject-management":
        return <FacultySubjectManagement />;
      case "curriculum":
        return <CurriculumManagement />;
      case "file-maintenance":
        return <FileMaintenanceManagement />;
      case "file-maintenance-building":
        return <Building />;
      case "file-maintenance-approval":
        return <Approval />;
      case "file-maintenance-section":
        return <Section />;
      case "file-maintenance-room":
        return <Room />;
      case "file-maintenance-department":
        return <Department />;
      case "curriculum-program":
        return <Program />;
      case "file-maintenance-major":
        return <Major />;
      case "file-maintenance-faculty":
        return <Faculty />;
      case "file-maintenance-fees":
        return <Fees />;
      case "file-maintenance-discount":
        return <Discount />;
      case "file-maintenance-products":
        return <Products />;
      case "file-maintenance-subject":
        return <Subject />;
      case "file-maintenance-payment-methods":
        return <PaymentMethods />;
      case "file-maintenance-schools-programs":
        return <SchoolsPrograms />;
      case "miscellaneous-fees":
        return <MiscellaneousFees />;
      case "account-management":
        return <AccountManagement />;
      case "backups":
        return <BackupManagement />;
      case "settings":
        return <Settings />;
      default:
        return <HomePage />;
    }
  };

  return (
    <ProtectedRoute>
      <div className='flex h-screen bg-gray-50'>
        <Navigation
          key={`nav-${userRole}`}
          currentView={currentView}
          onViewChange={handleViewChange}
        />
        <main className='flex-1 overflow-auto'>{renderCurrentView()}</main>
      </div>
    </ProtectedRoute>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
