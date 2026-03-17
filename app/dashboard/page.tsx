"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import CrossEnrollmentManagement from "../components/CrossEnrollmentManagement";
import ReportManagement from "../components/ReportManagement";
import PaymentsDashboard from "../components/reports/PaymentsDashboard";
import SchedulingManagement from "../components/SchedulingManagement";
import PaymentBillingManagement from "../components/PaymentBillingManagement";
import StudentPaymentCheckoutPage from "../components/paymentBilling/StudentPaymentCheckoutPage";
import StudentFinancialDetailPage from "../components/paymentBilling/StudentFinancialDetailPage";
import CurriculumManagement from "../components/curriculum";
import FileMaintenanceManagement from "../components/FileMaintenanceManagement";
import Settings from "../components/Settings";
import AccountManagement from "../components/AccountManagement";
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
} from "../components/fileMaintenance";
import MiscellaneousFees from "../components/MiscellaneousFees";
import ProtectedRoute from "../components/ProtectedRoute";
import SectionManagement from "../admin/sections/page";
import FacultySubjectManagement from "../admin/faculty-subject-management/page";
import { useSession } from "next-auth/react";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [currentView, setCurrentView] = useState("home");
  const { data: session } = useSession();
  const userRole = Number((session?.user as any)?.role) || 0;

  console.log("DashboardContent render - currentView:", currentView);

  // Read view from URL params on mount
  useEffect(() => {
    const view = searchParams.get("view");
    if (view) {
      setCurrentView(view);
    }
  }, [searchParams]);

  const handleViewChange = (view: string) => {
    console.log("handleViewChange called with:", view);
    setCurrentView(view);
  };

  const renderCurrentView = () => {
    console.log("renderCurrentView - currentView:", currentView);
    switch (currentView) {
      case "home":
        return <HomePage />;
      case "dashboard":
        return <Dashboard />;
      case "students":
        return <StudentManagement onViewChange={setCurrentView} />;
      case "courses":
        return <CourseManagement />;
      case "enrollments":
        return <EnrollmentManagement />;
      case "enrollment-form":
        return <EnrollmentForm />;
      case "resident-enrollment":
        return <ResidentPortalContent />;
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
      case "payment-billing":
        return <PaymentBillingManagement />;
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
      case "file-maintenance-schools-programs":
        return <SchoolsPrograms />;
      case "miscellaneous-fees":
        return <MiscellaneousFees />;
      case "account-management":
        return <AccountManagement />;
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
