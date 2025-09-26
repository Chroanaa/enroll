"use client";
import React, { useState } from "react";
import Navigation from "./components/Navigation";
import Dashboard from "./components/Dashboard";
import StudentManagement from "./components/StudentManagement";
import CourseManagement from "./components/CourseManagement";

function App() {
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
        return <Dashboard />; // For now, show dashboard
      case "forecast":
        return <Dashboard />; // For now, show dashboard
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className='flex h-screen bg-gray-50'>
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      <main className='flex-1 overflow-auto'>{renderCurrentView()}</main>
    </div>
  );
}

export default App;
