"use client";
import ProtectedRoute from "../components/ProtectedRoute";
import ResidentPortalContent from "./ResidentPortalContent";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ROLES } from "../lib/rbac";

export default function ResidentPortal() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const roleId = Number((session?.user as any)?.role) || 0;

  useEffect(() => {
    if (status === "authenticated" && roleId === ROLES.DEAN) {
      router.replace("/dashboard");
    }
  }, [roleId, router, status]);

  if (status === "authenticated" && roleId === ROLES.DEAN) {
    return null;
  }

  return (
    <ProtectedRoute>
      <ResidentPortalContent />
    </ProtectedRoute>
  );
}
