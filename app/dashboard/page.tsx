"use client";
import React, { useState } from "react";
import Navigation from "../components/Navigation";
import Dashboard from "../components/Dashboard";
import StudentManagement from "../components/StudentManagement";
import CourseManagement from "../components/CourseManagement";
import EnrollmentManagement from "../components/enrollmentManagement";
import EnrollmentForm from "../components/EnrollmentForm";
import ForecastingAnalytics from "../components/ForecastingAnalytics";
import AssessmentManagement from "../components/AssessmentManagement";
import ReportManagement from "../components/ReportManagement";
import SchedulingManagement from "../components/SchedulingManagement";
import PaymentBillingManagement from "../components/PaymentBillingManagement";
import CurriculumManagement from "../components/curriculum";
import FileMaintenanceManagement from "../components/FileMaintenanceManagement";
import { Building, Section, Room, Department, Program, Major, Faculty, Fees, Subject } from "../components/fileMaintenance";
import ProtectedRoute from "../components/ProtectedRoute";

export default function DashboardPage() {
  const [currentView, setCurrentView] = useState("dashboard");

  const renderCurrentView = () => {
    switch (currentView) {
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
      case "forecast":
        return <ForecastingAnalytics />;
      case "assessment":
        return <AssessmentManagement />;
      case "reports":
        return <ReportManagement />;
      case "scheduling":
        return <SchedulingManagement />;
      case "payment-billing":
        return <PaymentBillingManagement />;
      case "curriculum":
        return <CurriculumManagement />;
      case "file-maintenance":
        return <FileMaintenanceManagement />;
      case "file-maintenance-building":
        return <Building />;
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
      case "file-maintenance-subject":
        return <Subject />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ProtectedRoute>
      <div className='flex h-screen bg-gray-50'>
        <Navigation currentView={currentView} onViewChange={setCurrentView} />
        <main className='flex-1 overflow-auto'>{renderCurrentView()}</main>
      </div>
    </ProtectedRoute>
  );
}
