"use client";
import ProtectedRoute from "../components/ProtectedRoute";
import ResidentPortalContent from "./ResidentPortalContent";

export default function ResidentPortal() {
  return (
    <ProtectedRoute>
      <ResidentPortalContent />
    </ProtectedRoute>
  );
}
