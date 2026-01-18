"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Navigation from "@/app/components/Navigation";
import EditSubjectPage from "@/app/components/fileMaintenance/subject/EditSubjectPage";
import { Subject } from "@/app/types";
import { getSubjects } from "@/app/utils/subjectUtils";

export default function EditSubjectRoutePage() {
  const router = useRouter();
  const params = useParams();
  const [currentView, setCurrentView] = useState("file-maintenance-subject");
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubject = async () => {
      try {
        const subjectsData = await getSubjects();
        const subjectsArray: Subject[] = Array.isArray(subjectsData)
          ? subjectsData
          : (Object.values(subjectsData) as Subject[]);
        const subjectId = parseInt(params.id as string);
        const foundSubject = subjectsArray.find((s) => s.id === subjectId);
        if (foundSubject) {
          setSubject(foundSubject);
        } else {
          router.push("/dashboard?view=file-maintenance-subject");
        }
      } catch (error) {
        console.error("Failed to fetch subject:", error);
        router.push("/dashboard?view=file-maintenance-subject");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchSubject();
    }
  }, [params.id, router]);

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
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subject),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update subject");
      }
      // Don't navigate here - let the component handle navigation after showing success modal
    } catch (error: any) {
      throw error;
    }
  };

  const handleCancel = () => {
    router.push("/dashboard?view=file-maintenance-subject");
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-gray-50 items-center justify-center">
          <p>Loading...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (!subject) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        <Navigation currentView={currentView} onViewChange={handleViewChange} />
        <main className="flex-1 overflow-auto">
          <EditSubjectPage subject={subject} onSave={handleSave} onCancel={handleCancel} />
        </main>
      </div>
    </ProtectedRoute>
  );
}

