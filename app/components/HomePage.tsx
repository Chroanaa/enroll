"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  Users,
  BookOpen,
  CreditCard,
  FileText,
} from "lucide-react";
import { colors } from "../colors";

const modules = [
  {
    title: "Student Information",
    description: "Manage student records",
    icon: Users,
    view: "enrollment-form",
  },
  {
    title: "Assessment",
    description: "Track academic records",
    icon: BookOpen,
    view: "assessment",
  },
  {
    title: "Billing",
    description: "Process payments",
    icon: CreditCard,
    view: "payment-billing",
  },
  {
    title: "Reports",
    description: "Generate insights",
    icon: FileText,
    view: "reports",
  },
];

const HomePage: React.FC = () => {
  const router = useRouter();
  const [loadingView, setLoadingView] = useState<string | null>(null);

  const navigateToView = (view: string, source: string) => {
    setLoadingView(source);
    router.push(`/dashboard?view=${view}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.paper }}>
      <div className="w-full max-w-5xl px-6 py-16">
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div
            className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full"
            style={{
              backgroundColor: "white",
              boxShadow: `0 8px 32px ${colors.primary}20`,
            }}
          >
            <Image
              src="/logo.png"
              alt="CSTA Logo"
              width={80}
              height={80}
              className="object-contain"
              priority
            />
          </div>
          
          <h1
            className="text-3xl font-semibold tracking-tight mb-3"
            style={{ color: colors.primary }}
          >
            Teresa Enrollment System
          </h1>
          
          <p className="text-gray-500 text-base max-w-md mx-auto">
            Streamlined enrollment and academic management for Colegio de Sta. Teresa de Avila
          </p>
        </div>

        {/* Quick Access Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group p-5 rounded-2xl bg-white border cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5"
                style={{ borderColor: `${colors.tertiary}25` }}
                onClick={() => {
                  if (!loadingView) {
                    navigateToView(item.view, item.title);
                  }
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors"
                  style={{ backgroundColor: `${colors.primary}08` }}
                >
                  {loadingView === item.title ? (
                    <Loader2
                      className="w-5 h-5 animate-spin"
                      style={{ color: colors.primary }}
                    />
                  ) : (
                    <Icon className="w-5 h-5" style={{ color: colors.primary }} />
                  )}
                </div>
                <p className="font-medium text-sm" style={{ color: colors.primary }}>
                  {item.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {loadingView === item.title ? "Opening module..." : item.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA Card */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
          }}
        >
          <p className="text-white/80 text-sm mb-2">Ready to get started?</p>
          <p className="text-white font-medium text-lg mb-5">
            Select a module from the sidebar to begin
          </p>
          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer"
            style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "white" }}
            onClick={() => {
              if (!loadingView) {
                navigateToView("dashboard", "cta");
              }
            }}
          >
            <span>{loadingView === "cta" ? "Opening dashboard..." : "Navigate using the menu"}</span>
            {loadingView === "cta" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-10">
          © {new Date().getFullYear()} Colegio de Sta. Teresa de Avila
        </p>
      </div>
    </div>
  );
};

export default HomePage;
