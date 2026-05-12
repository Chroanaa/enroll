"use client";
import React, { useState } from "react";
import Navigation from "./components/Navigation";
import HomePage from "./components/HomePage";
import Dashboard from "./components/Dashboard";
import StudentManagement from "./components/StudentManagement";
import CourseManagement from "./components/CourseManagement";
import EnrollmentManagement from "./components/enrollmentManagement";
import EnrollmentForm from "./components/EnrollmentForm";
import ForecastingAnalytics from "./components/ForecastingAnalytics";
import StudentForecastDashboard from "./components/StudentForecastDashboard";
import AssessmentManagement from "./components/AssessmentManagement";
import SubjectDroppingManagement from "./components/SubjectDroppingManagement";
import StudentDroppingManagement from "./components/StudentDroppingManagement";
import CrossEnrollmentManagement from "./components/CrossEnrollmentManagement";
import ExternalCrossEnrollmentManagement from "./components/ExternalCrossEnrollmentManagement";
import ShiftingManagement from "./components/ShiftingManagement";
import ProgramShiftingManagement from "./components/ProgramShiftingManagement";
import ReportManagement from "./components/ReportManagement";
import PaymentsDashboard from "./components/reports/PaymentsDashboard";
import RegistrationFormPrintReports from "./components/reports/RegistrationFormPrintReports";
import SubjectDropReports from "./components/reports/SubjectDropReports";
import CrossEnrollmentReports from "./components/reports/CrossEnrollmentReports";
import ProgramShiftingReports from "./components/reports/ProgramShiftingReports";
import SectionShiftingReports from "./components/reports/SectionShiftingReports";
import RefundReports from "./components/reports/RefundReports";
import SchedulingManagement from "./components/SchedulingManagement";
import PaymentBillingManagement from "./components/PaymentBillingManagement";
import RefundManagement from "./components/RefundManagement";
import CurriculumManagement from "./components/curriculum";
import ResidentPortalContent from "./resident/ResidentPortalContent";
import SectionManagementPage from "./admin/sections/page";
import FacultySubjectManagementPage from "./admin/faculty-subject-management/page";
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
} from "./components/fileMaintenance";
import MiscellaneousFees from "./components/MiscellaneousFees";
import AccountManagement from "./components/AccountManagement";
import BackupManagement from "./components/BackupManagement";
import Settings from "./components/Settings";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { formatProgramDisplay } from "./utils/programUtils";
import { ROLES, isViewAllowed } from "./lib/rbac";

function App() {
  const [currentView, setCurrentView] = useState("home");
  const { data: session, status } = useSession();
  const router = useRouter();

  const userRole = Number((session?.user as any)?.role) || 0;

  const handleViewChange = (view: string) => {
    const safeView = isViewAllowed(view, userRole) ? view : "dashboard";
    setCurrentView(safeView);
    router.push(`/dashboard?view=${encodeURIComponent(safeView)}`);
  };

  const renderCurrentView = () => {
    if (!isViewAllowed(currentView, userRole)) {
      return <Dashboard />;
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
      case "section-management":
        return <SectionManagementPage />;
      case "faculty-subject-management":
        return <FacultySubjectManagementPage />;
      case "payment-billing":
        return <PaymentBillingManagement />;
      case "refund":
        return <RefundManagement />;
      case "curriculum":
        return <CurriculumManagement />;
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
      case "file-maintenance-schools-programs":
        return <SchoolsPrograms />;
      case "file-maintenance-subject":
        return <Subject />;
      case "file-maintenance-payment-methods":
        return <PaymentMethods />;
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
  if (status === "loading") {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-gray-600'>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <ProtectedRoute>
        <div className='fixed inset-0 flex overflow-hidden bg-gray-50'>
          <Navigation
            key={`nav-${userRole}`}
            currentView={currentView}
            onViewChange={handleViewChange}
          />
          <main className='min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden'>
            {renderCurrentView()}
          </main>
        </div>
      </ProtectedRoute>
    </AuthProvider>
  );
}
export default App;
