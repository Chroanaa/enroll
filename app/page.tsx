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
import CrossEnrollmentManagement from "./components/CrossEnrollmentManagement";
import ReportManagement from "./components/ReportManagement";
import PaymentsDashboard from "./components/reports/PaymentsDashboard";
import SchedulingManagement from "./components/SchedulingManagement";
import PaymentBillingManagement from "./components/PaymentBillingManagement";
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

const ROLES = {
  ADMIN: 1,
  CASHIER: 2,
  FACULTY: 3,
  REGISTRAR: 4,
};

const VIEW_ROLES: Record<string, number[]> = {
  home: [ROLES.ADMIN, ROLES.CASHIER, ROLES.FACULTY, ROLES.REGISTRAR],
  dashboard: [ROLES.ADMIN, ROLES.CASHIER, ROLES.FACULTY, ROLES.REGISTRAR],
  students: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.FACULTY],
  courses: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.FACULTY],
  enrollments: [ROLES.ADMIN, ROLES.REGISTRAR],
  "enrollment-form": [ROLES.ADMIN, ROLES.REGISTRAR],
  "resident-enrollment": [ROLES.ADMIN, ROLES.REGISTRAR],
  forecast: [ROLES.ADMIN, ROLES.REGISTRAR],
  "forecast-billing": [ROLES.ADMIN, ROLES.REGISTRAR],
  assessment: [ROLES.ADMIN, ROLES.CASHIER],
  "subject-dropping": [ROLES.ADMIN, ROLES.REGISTRAR],
  "cross-enrollee": [ROLES.ADMIN, ROLES.REGISTRAR],
  reports: [ROLES.ADMIN, ROLES.REGISTRAR],
  "reports-payments-dashboard": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.CASHIER],
  scheduling: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.FACULTY],
  "section-management": [ROLES.ADMIN, ROLES.REGISTRAR],
  "faculty-subject-management": [ROLES.ADMIN, ROLES.REGISTRAR],
  "payment-billing": [ROLES.ADMIN, ROLES.CASHIER],
  curriculum: [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.FACULTY],
  "curriculum-program": [ROLES.ADMIN, ROLES.REGISTRAR],
  "file-maintenance-building": [ROLES.ADMIN, ROLES.REGISTRAR],
  "file-maintenance-approval": [ROLES.ADMIN],
  "file-maintenance-section": [ROLES.ADMIN, ROLES.REGISTRAR],
  "file-maintenance-room": [ROLES.ADMIN, ROLES.REGISTRAR],
  "file-maintenance-department": [ROLES.ADMIN, ROLES.REGISTRAR],
  "file-maintenance-major": [ROLES.ADMIN, ROLES.REGISTRAR],
  "file-maintenance-faculty": [ROLES.ADMIN, ROLES.REGISTRAR],
  "file-maintenance-fees": [ROLES.ADMIN, ROLES.CASHIER],
  "file-maintenance-discount": [ROLES.ADMIN, ROLES.CASHIER],
  "file-maintenance-products": [ROLES.ADMIN, ROLES.CASHIER],
  "file-maintenance-schools-programs": [ROLES.ADMIN, ROLES.REGISTRAR],
  "file-maintenance-subject": [ROLES.ADMIN, ROLES.REGISTRAR, ROLES.FACULTY],
  "miscellaneous-fees": [ROLES.ADMIN, ROLES.CASHIER],
  "account-management": [ROLES.ADMIN],
  backups: [ROLES.ADMIN],
  settings: [ROLES.ADMIN],
};





function App() {
  const [currentView, setCurrentView] = useState("home");
  const { data: session, status } = useSession();
  const router = useRouter();

  const userRole = Number((session?.user as any)?.role) || ROLES.ADMIN;

  const isViewAllowed = (view: string): boolean => {
    const allowed = VIEW_ROLES[view];
    if (!allowed) return false;
    return allowed.includes(userRole);
  };

  const handleViewChange = (view: string) => {
    if (isViewAllowed(view)) {
      setCurrentView(view);
    } else {
      setCurrentView("dashboard");
    }
  };

  const renderCurrentView = () => {
    if (!isViewAllowed(currentView)) {
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
      case "cross-enrollee":
        return <CrossEnrollmentManagement />;
      case "reports":
        return <ReportManagement />;
      case "reports-payments-dashboard":
        return <PaymentsDashboard />;
      case "scheduling":
        return <SchedulingManagement />;
      case "section-management":
        return <SectionManagementPage />;
      case "faculty-subject-management":
        return <FacultySubjectManagementPage />;
      case "payment-billing":
        return <PaymentBillingManagement />;
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
        <div className='flex h-screen bg-gray-50'>
          <Navigation
            key={`nav-${userRole}`}
            currentView={currentView}
            onViewChange={handleViewChange}
          />
          <main className='flex-1 overflow-auto'>{renderCurrentView()}</main>
        </div>
      </ProtectedRoute>
    </AuthProvider>
  );
}
export default App;
