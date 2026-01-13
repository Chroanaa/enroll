"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { AcademicTermProvider } from "./contexts/AcademicTermContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AcademicTermProvider autoSync={true} refreshInterval={5 * 60 * 1000}>
        {children}
      </AcademicTermProvider>
    </SessionProvider>
  );
}
