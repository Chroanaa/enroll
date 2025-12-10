"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Navigation from "@/app/components/Navigation";
import AddCurriculumPage from "@/app/components/curriculum/AddCurriculumPage";

export default function NewCurriculumPage() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState("curriculum");

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    if (view === "curriculum") {
      // If clicking curriculum while on new page, go to curriculum list
      router.push("/dashboard?view=curriculum");
    } else {
      // Navigate to dashboard with the selected view
      router.push(`/dashboard?view=${view}`);
    }
  };

  const handleSave = async (curriculum: any) => {
    try {
      const response = await fetch("/api/auth/curriculum", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(curriculum),
      });

      if (response.ok) {
        router.push("/dashboard?view=curriculum");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create curriculum");
      }
    } catch (error: any) {
      throw error;
    }
  };

  const handleCancel = () => {
    router.push("/dashboard?view=curriculum");
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        <Navigation currentView={currentView} onViewChange={handleViewChange} />
        <main className="flex-1 overflow-auto">
          <AddCurriculumPage onSave={handleSave} onCancel={handleCancel} />
        </main>
      </div>
    </ProtectedRoute>
  );
}

