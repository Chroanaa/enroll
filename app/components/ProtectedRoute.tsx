"use client";
import React, { ReactNode } from "react";
import { useSession } from "next-auth/react";
import Login from "../components/Login";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { data: session, status } = useSession();
  if (status === "authenticated" && session.user.role !== 1) {
    return <div>Access Denied</div>;
  }

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

  if (status === "unauthenticated") {
    return <Login />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
