"use client";
import React, { useState } from "react";
import Navigation from "../components/Navigation";
import Dashboard from "../components/Dashboard";
import StudentManagement from "../components/StudentManagement";
import CourseManagement from "../components/CourseManagement";
import EnrollmentManagement from "../components/EnrollmentManagement";
import ForecastingAnalytics from "../components/ForecastingAnalytics";
import ProtectedRoute from "../components/ProtectedRoute";

export default function DashboardPage() {
  const [currentView, setCurrentView] = useState("dashboard");

  const renderCurrentView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard />;
      case "students":
        return <StudentManagement />;
      case "courses":
        return <CourseManagement />;
      case "enrollments":
        return <EnrollmentManagement />;
      case "forecast":
        return <ForecastingAnalytics />;
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
