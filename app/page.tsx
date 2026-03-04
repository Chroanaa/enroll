"use client";
import React, { useState } from "react";
import Navigation from "./components/Navigation";
import Dashboard from "./components/Dashboard";
import StudentManagement from "./components/StudentManagement";
import CourseManagement from "./components/CourseManagement";
import EnrollmentManagement from "./components/enrollmentManagement";
import EnrollmentForm from "./components/EnrollmentForm";
import ForecastingAnalytics from "./components/ForecastingAnalytics";
import StudentForecastDashboard from "./components/StudentForecastDashboard";
import AssessmentManagement from "./components/AssessmentManagement";
import ReportManagement from "./components/ReportManagement";
import SchedulingManagement from "./components/SchedulingManagement";
import PaymentBillingManagement from "./components/PaymentBillingManagement";
import CurriculumManagement from "./components/curriculum";
import SectionManagementPage from "./admin/sections/page";
import { Building, Section, Room, Department, Program, Major, Faculty, Fees } from "./components/fileMaintenance";
import MiscellaneousFees from "./components/MiscellaneousFees";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function App() {
  const [currentView, setCurrentView] = useState("dashboard");
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Don't redirect - let the component handle routing via currentView state
  // This allows Navigation menu to work properly
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
      case "forecast-billing":
        return <StudentForecastDashboard />;
      case "assessment":
        return <AssessmentManagement />;
      case "reports":
        return <ReportManagement />;
      case "scheduling":
        return <SchedulingManagement />;
      case "section-management":
        return <SectionManagementPage />;
      case "payment-billing":
        return <PaymentBillingManagement />;
      case "curriculum":
        return <CurriculumManagement />;
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
      case "miscellaneous-fees":
        return <MiscellaneousFees />;
      default:
        return <Dashboard />;
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
          <Navigation currentView={currentView} onViewChange={setCurrentView} />
          <main className='flex-1 overflow-auto'>{renderCurrentView()}</main>
        </div>
      </ProtectedRoute>
    </AuthProvider>
  );  
 
}
export default App