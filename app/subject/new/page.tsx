"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Navigation from "@/app/components/Navigation";
import AddSubjectPage from "@/app/components/fileMaintenance/subject/AddSubjectPage";
import { Subject } from "@/app/types";

export default function NewSubjectPage() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState("file-maintenance-subject");

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    if (view === "file-maintenance-subject") {
      router.push("/dashboard?view=file-maintenance-subject");
    } else {
      router.push(`/dashboard?view=${view}`);
    }
  };

  const handleSave = async (subject: Subject) => {
    try {
      const response = await fetch("/api/auth/subject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subject),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create subject");
      }
      // Don't navigate here - let the component handle navigation after showing success modal
    } catch (error: any) {
      throw error;
    }
  };

  const handleCancel = () => {
    router.push("/dashboard?view=file-maintenance-subject");
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        <Navigation currentView={currentView} onViewChange={handleViewChange} />
        <main className="flex-1 overflow-auto">
          <AddSubjectPage onSave={handleSave} onCancel={handleCancel} />
        </main>
      </div>
    </ProtectedRoute>
  );
}

