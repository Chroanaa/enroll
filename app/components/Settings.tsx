"use client";

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Calendar,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Info,
  GraduationCap,
  CalendarDays,
  DollarSign,
  Percent,
} from "lucide-react";
import { colors } from "../colors";
import ConfirmationModal from "./common/ConfirmationModal";

interface Setting {
  id: number;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

interface SemesterThresholdSettings {
  enrollmentStartDaysBefore: number;
  enrollmentEndDaysAfter: number;
  lateEnrollmentPenaltyDays: number;
  subjectDropRefundableDays: number;
  sectionShiftingAllowedDays: number;
  semesterStartMonth: number;
  semesterStartDay: number;
  secondSemesterStartMonth: number;
  secondSemesterStartDay: number;
}

interface PaymentSettings {
  minDownpayment: number;
  installmentChargePercentage: number;
}

interface CurrentTermInfo {
  currentSemester: string;
  currentAcademicYear: string;
  serverTime: string;
  isWithinSemester: boolean;
  semesterDates: {
    start: string;
    end: string;
  };
}

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTerm, setCurrentTerm] = useState<CurrentTermInfo | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [settings, setSettings] = useState<SemesterThresholdSettings>({
    enrollmentStartDaysBefore: 30,
    enrollmentEndDaysAfter: 14,
    lateEnrollmentPenaltyDays: 7,
    subjectDropRefundableDays: 15,
    sectionShiftingAllowedDays: 15,
    semesterStartMonth: 8, // August
    semesterStartDay: 1,
    secondSemesterStartMonth: 1, // January
    secondSemesterStartDay: 1,
  });

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    minDownpayment: 3000,
    installmentChargePercentage: 5,
  });
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchCurrentTerm();
  }, []);

  const fetchCurrentTerm = async () => {
    try {
      const response = await fetch("/api/auth/dashboard/stats");
      const data = await response.json();
      if (data.data) {
        setCurrentTerm({
          currentSemester: data.data.currentSemester,
          currentAcademicYear: data.data.currentAcademicYear,
          serverTime: data.data.serverTime,
          isWithinSemester: data.data.isWithinSemester,
          semesterDates: data.data.semesterDates,
        });
      }
    } catch (error) {
      console.error("Failed to fetch current term:", error);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/settings");
      const data = await response.json();

      if (data.data) {
        const settingsMap: Record<string, string> = {};
        data.data.forEach((s: Setting) => {
          settingsMap[s.key] = s.value;
        });

        setSettings({
          enrollmentStartDaysBefore: parseInt(
            settingsMap["enrollment_start_days_before"] || "30",
          ),
          enrollmentEndDaysAfter: parseInt(
            settingsMap["enrollment_end_days_after"] || "14",
          ),
          lateEnrollmentPenaltyDays: parseInt(
            settingsMap["late_enrollment_penalty_days"] || "7",
          ),
          subjectDropRefundableDays: parseInt(
            settingsMap["subject_drop_refundable_days"] || "15",
          ),
          sectionShiftingAllowedDays: parseInt(
            settingsMap["section_shifting_allowed_days"] || "15",
          ),
          semesterStartMonth: parseInt(
            settingsMap["semester_start_month"] || "8",
          ),
          semesterStartDay: parseInt(settingsMap["semester_start_day"] || "1"),
          secondSemesterStartMonth: parseInt(
            settingsMap["second_semester_start_month"] || "1",
          ),
          secondSemesterStartDay: parseInt(
            settingsMap["second_semester_start_day"] || "1",
          ),
        });

        setPaymentSettings({
          minDownpayment: parseFloat(settingsMap["min_downpayment"] || "3000"),
          installmentChargePercentage: parseFloat(
            settingsMap["installment_charge_percentage"] || "5",
          ),
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      setMessage({ type: "error", text: "Failed to load settings" });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const settingsToSave = [
        {
          key: "enrollment_start_days_before",
          value: settings.enrollmentStartDaysBefore.toString(),
          description:
            "Number of days before semester start when enrollment opens",
        },
        {
          key: "enrollment_end_days_after",
          value: settings.enrollmentEndDaysAfter.toString(),
          description:
            "Number of days after semester start when regular enrollment ends",
        },
        {
          key: "late_enrollment_penalty_days",
          value: settings.lateEnrollmentPenaltyDays.toString(),
          description: "Number of days for late enrollment with penalty",
        },
        {
          key: "subject_drop_refundable_days",
          value: settings.subjectDropRefundableDays.toString(),
          description:
            "Number of days from semester start when dropped subjects remain refundable",
        },
        {
          key: "section_shifting_allowed_days",
          value: settings.sectionShiftingAllowedDays.toString(),
          description:
            "Number of days from semester start when section shifting is allowed",
        },
        {
          key: "semester_start_month",
          value: settings.semesterStartMonth.toString(),
          description: "First semester start month (1-12)",
        },
        {
          key: "semester_start_day",
          value: settings.semesterStartDay.toString(),
          description: "First semester start day of month",
        },
        {
          key: "second_semester_start_month",
          value: settings.secondSemesterStartMonth.toString(),
          description: "Second semester start month (1-12)",
        },
        {
          key: "second_semester_start_day",
          value: settings.secondSemesterStartDay.toString(),
          description: "Second semester start day of month",
        },
        {
          key: "min_downpayment",
          value: paymentSettings.minDownpayment.toString(),
          description: "Minimum downpayment amount for installment enrollment",
        },
        {
          key: "installment_charge_percentage",
          value: paymentSettings.installmentChargePercentage.toString(),
          description:
            "Percentage charge applied to installment balance (e.g., 5 for 5%)",
        },
      ];

      for (const setting of settingsToSave) {
        await fetch("/api/auth/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(setting),
        });
      }

      setMessage({ type: "success", text: "Settings saved successfully!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  if (loading) {
    return (
      <div
        className='flex items-center justify-center min-h-screen'
        style={{ background: colors.paper }}
      >
        <div className='flex flex-col items-center gap-4'>
          <div className='relative'>
            <div
              className='w-16 h-16 border-4 rounded-full animate-spin'
              style={{
                borderColor: colors.neutralBorder,
                borderTopColor: colors.primary,
              }}
            ></div>
            <SettingsIcon
              className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6'
              style={{ color: colors.primary }}
            />
          </div>
          <p className='font-medium' style={{ color: colors.neutral }}>
            Loading Settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen' style={{ backgroundColor: colors.paper }}>
      {/* Header Section */}
      <div
        className='relative overflow-hidden border-b'
        style={{
          backgroundColor: colors.paper,
          borderColor: "rgba(58, 35, 19, 0.2)",
        }}
      >
        <div className='relative px-6 py-8 sm:px-8 lg:px-12'>
          <div className='max-w-4xl mx-auto'>
            <div className='flex items-center gap-3 mb-2'>
              <div
                className='p-2 rounded-xl'
                style={{ backgroundColor: colors.primary + "10" }}
              >
                <SettingsIcon
                  className='w-6 h-6'
                  style={{ color: colors.primary }}
                />
              </div>
              <h1
                className='text-3xl sm:text-4xl font-bold tracking-tight'
                style={{ color: colors.primary }}
              >
                System Settings
              </h1>
            </div>
            <p className='text-sm' style={{ color: colors.secondary }}>
              Configure semester thresholds and enrollment period settings
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='px-6 pb-12 sm:px-8 lg:px-12 pt-8'>
        <div className='max-w-4xl mx-auto space-y-8'>
          {/* Message Alert */}
          {message && (
            <div
              className='flex items-center gap-3 p-4 rounded-xl'
              style={{
                backgroundColor:
                  message.type === "success"
                    ? colors.success + "15"
                    : colors.danger + "15",
                border: `1px solid ${message.type === "success" ? colors.success : colors.danger}30`,
              }}
            >
              {message.type === "success" ? (
                <CheckCircle2
                  className='w-5 h-5'
                  style={{ color: colors.success }}
                />
              ) : (
                <AlertCircle
                  className='w-5 h-5'
                  style={{ color: colors.danger }}
                />
              )}
              <span
                className='font-medium'
                style={{
                  color:
                    message.type === "success" ? colors.success : colors.danger,
                }}
              >
                {message.text}
              </span>
            </div>
          )}

          {/* Current Semester Calculation Info */}
          <div
            className='rounded-2xl p-6 bg-white'
            style={{
              boxShadow:
                "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
              border: `2px solid ${colors.primary}20`,
            }}
          >
            <div
              className='flex items-center gap-3 mb-6 pb-4 border-b'
              style={{ borderColor: "rgba(58, 35, 19, 0.2)" }}
            >
              <div
                className='p-2 rounded-xl shadow-sm'
                style={{
                  backgroundColor: colors.primary + "15",
                  border: `1px solid ${colors.primary}30`,
                }}
              >
                <GraduationCap
                  className='w-5 h-5'
                  style={{ color: colors.primary }}
                />
              </div>
              <div>
                <h2
                  className='text-lg font-bold'
                  style={{ color: colors.primary }}
                >
                  Current Semester Calculation
                </h2>
                <p className='text-sm' style={{ color: colors.neutral }}>
                  How the system determines the current academic period
                </p>
              </div>
            </div>

            {currentTerm ? (
              <div className='space-y-4'>
                {/* Current Active Term */}
                <div
                  className='p-4 rounded-xl'
                  style={{
                    backgroundColor: colors.success + "10",
                    border: `1px solid ${colors.success}30`,
                  }}
                >
                  <div className='flex items-center gap-3 mb-3'>
                    <CheckCircle2
                      className='w-5 h-5'
                      style={{ color: colors.success }}
                    />
                    <span
                      className='font-semibold'
                      style={{ color: colors.success }}
                    >
                      Active Academic Period
                    </span>
                  </div>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <div>
                      <p
                        className='text-xs font-medium uppercase tracking-wide mb-1'
                        style={{ color: colors.neutral }}
                      >
                        Semester
                      </p>
                      <p
                        className='text-xl font-bold'
                        style={{ color: colors.primary }}
                      >
                        {currentTerm.currentSemester === "First"
                          ? "1st Semester"
                          : "2nd Semester"}
                      </p>
                    </div>
                    <div>
                      <p
                        className='text-xs font-medium uppercase tracking-wide mb-1'
                        style={{ color: colors.neutral }}
                      >
                        Academic Year
                      </p>
                      <p
                        className='text-xl font-bold'
                        style={{ color: colors.primary }}
                      >
                        {currentTerm.currentAcademicYear}
                      </p>
                    </div>
                    <div>
                      <p
                        className='text-xs font-medium uppercase tracking-wide mb-1'
                        style={{ color: colors.neutral }}
                      >
                        Status
                      </p>
                      <span
                        className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium'
                        style={{
                          backgroundColor: currentTerm.isWithinSemester
                            ? colors.success + "15"
                            : colors.warning + "15",
                          color: currentTerm.isWithinSemester
                            ? colors.success
                            : colors.warning,
                        }}
                      >
                        {currentTerm.isWithinSemester ? (
                          <>
                            <CheckCircle2 className='w-3 h-3' />
                            In Session
                          </>
                        ) : (
                          <>
                            <Clock className='w-3 h-3' />
                            Break Period
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Semester Date Range */}
                <div
                  className='p-4 rounded-xl'
                  style={{
                    backgroundColor: colors.paper,
                    border: `1px solid ${colors.tertiary}30`,
                  }}
                >
                  <div className='flex items-center gap-2 mb-3'>
                    <CalendarDays
                      className='w-4 h-4'
                      style={{ color: colors.primary }}
                    />
                    <span
                      className='font-medium'
                      style={{ color: colors.primary }}
                    >
                      Semester Date Range
                    </span>
                  </div>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div
                      className='p-3 rounded-lg'
                      style={{ backgroundColor: colors.neutralLight }}
                    >
                      <p
                        className='text-xs font-medium mb-1'
                        style={{ color: colors.neutral }}
                      >
                        Start Date
                      </p>
                      <p
                        className='font-semibold'
                        style={{ color: colors.primary }}
                      >
                        {new Date(
                          currentTerm.semesterDates.start,
                        ).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div
                      className='p-3 rounded-lg'
                      style={{ backgroundColor: colors.neutralLight }}
                    >
                      <p
                        className='text-xs font-medium mb-1'
                        style={{ color: colors.neutral }}
                      >
                        End Date
                      </p>
                      <p
                        className='font-semibold'
                        style={{ color: colors.primary }}
                      >
                        {new Date(
                          currentTerm.semesterDates.end,
                        ).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Calculation Rules */}
                <div
                  className='p-4 rounded-xl'
                  style={{
                    backgroundColor: colors.primary + "05",
                    border: `1px solid ${colors.primary}15`,
                  }}
                >
                  <div className='flex items-center gap-2 mb-3'>
                    <Info
                      className='w-4 h-4'
                      style={{ color: colors.primary }}
                    />
                    <span
                      className='font-medium'
                      style={{ color: colors.primary }}
                    >
                      Current Calculation Rules
                    </span>
                  </div>
                  <div className='space-y-2 text-sm'>
                    <div
                      className='flex items-start gap-2'
                      style={{ color: colors.neutral }}
                    >
                      <span
                        className='font-bold'
                        style={{ color: colors.primary }}
                      >
                        •
                      </span>
                      <span>
                        <strong>First Semester:</strong> August 1 - December 20
                      </span>
                    </div>
                    <div
                      className='flex items-start gap-2'
                      style={{ color: colors.neutral }}
                    >
                      <span
                        className='font-bold'
                        style={{ color: colors.primary }}
                      >
                        •
                      </span>
                      <span>
                        <strong>Second Semester:</strong> January 12 - July 31
                      </span>
                    </div>
                    <div
                      className='flex items-start gap-2'
                      style={{ color: colors.neutral }}
                    >
                      <span
                        className='font-bold'
                        style={{ color: colors.primary }}
                      >
                        •
                      </span>
                      <span>
                        <strong>Academic Year:</strong> First semester uses
                        current year (e.g., Aug 2025 = A.Y. 2025-2026); Second
                        semester uses previous year (e.g., Jan 2026 = A.Y.
                        2025-2026)
                      </span>
                    </div>
                    <div
                      className='flex items-start gap-2'
                      style={{ color: colors.neutral }}
                    >
                      <span
                        className='font-bold'
                        style={{ color: colors.primary }}
                      >
                        •
                      </span>
                      <span>
                        <strong>Server Time:</strong>{" "}
                        {new Date(currentTerm.serverTime).toLocaleString(
                          "en-US",
                          {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          },
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className='text-center py-8'
                style={{ color: colors.neutral }}
              >
                <RefreshCw className='w-8 h-8 mx-auto mb-2 animate-spin' />
                <p>Loading current term information...</p>
              </div>
            )}
          </div>

          {/* Semester Start Dates */}
          <div
            className='rounded-2xl p-6 bg-white'
            style={{
              boxShadow:
                "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
            }}
          >
            <div
              className='flex items-center gap-3 mb-6 pb-4 border-b'
              style={{ borderColor: "rgba(58, 35, 19, 0.2)" }}
            >
              <div
                className='p-2 rounded-xl shadow-sm'
                style={{
                  backgroundColor: colors.paper,
                  border: `1px solid ${colors.tertiary}30`,
                }}
              >
                <Calendar
                  className='w-5 h-5'
                  style={{ color: colors.primary }}
                />
              </div>
              <div>
                <h2
                  className='text-lg font-bold'
                  style={{ color: colors.primary }}
                >
                  Semester Start Dates
                </h2>
                <p className='text-sm' style={{ color: colors.neutral }}>
                  Configure when each semester begins
                </p>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {/* First Semester */}
              <div
                className='p-4 rounded-xl border'
                style={{
                  borderColor: colors.tertiary + "30",
                  backgroundColor: colors.paper,
                }}
              >
                <h3
                  className='font-semibold mb-4'
                  style={{ color: colors.primary }}
                >
                  First Semester
                </h3>
                <div className='space-y-4'>
                  <div>
                    <label
                      className='block text-sm font-medium mb-2'
                      style={{ color: colors.neutral }}
                    >
                      Start Month
                    </label>
                    <select
                      value={settings.semesterStartMonth}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          semesterStartMonth: parseInt(e.target.value),
                        })
                      }
                      className='w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2'
                      style={{
                        borderColor: colors.neutralBorder,
                        backgroundColor: "white",
                        color: colors.neutralDark,
                      }}
                    >
                      {months.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className='block text-sm font-medium mb-2'
                      style={{ color: colors.neutral }}
                    >
                      Start Day
                    </label>
                    <input
                      type='number'
                      min='1'
                      max='31'
                      value={settings.semesterStartDay}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          semesterStartDay: parseInt(e.target.value) || 1,
                        })
                      }
                      className='w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2'
                      style={{
                        borderColor: colors.neutralBorder,
                        backgroundColor: "white",
                        color: colors.neutralDark,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Second Semester */}
              <div
                className='p-4 rounded-xl border'
                style={{
                  borderColor: colors.tertiary + "30",
                  backgroundColor: colors.paper,
                }}
              >
                <h3
                  className='font-semibold mb-4'
                  style={{ color: colors.primary }}
                >
                  Second Semester
                </h3>
                <div className='space-y-4'>
                  <div>
                    <label
                      className='block text-sm font-medium mb-2'
                      style={{ color: colors.neutral }}
                    >
                      Start Month
                    </label>
                    <select
                      value={settings.secondSemesterStartMonth}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          secondSemesterStartMonth: parseInt(e.target.value),
                        })
                      }
                      className='w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2'
                      style={{
                        borderColor: colors.neutralBorder,
                        backgroundColor: "white",
                        color: colors.neutralDark,
                      }}
                    >
                      {months.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className='block text-sm font-medium mb-2'
                      style={{ color: colors.neutral }}
                    >
                      Start Day
                    </label>
                    <input
                      type='number'
                      min='1'
                      max='31'
                      value={settings.secondSemesterStartDay}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          secondSemesterStartDay: parseInt(e.target.value) || 1,
                        })
                      }
                      className='w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2'
                      style={{
                        borderColor: colors.neutralBorder,
                        backgroundColor: "white",
                        color: colors.neutralDark,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enrollment Period Thresholds */}
          <div
            className='rounded-2xl p-6 bg-white'
            style={{
              boxShadow:
                "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
            }}
          >
            <div
              className='flex items-center gap-3 mb-6 pb-4 border-b'
              style={{ borderColor: "rgba(58, 35, 19, 0.2)" }}
            >
              <div
                className='p-2 rounded-xl shadow-sm'
                style={{
                  backgroundColor: colors.paper,
                  border: `1px solid ${colors.tertiary}30`,
                }}
              >
                <Clock className='w-5 h-5' style={{ color: colors.primary }} />
              </div>
              <div>
                <h2
                  className='text-lg font-bold'
                  style={{ color: colors.primary }}
                >
                  Enrollment Period Thresholds
                </h2>
                <p className='text-sm' style={{ color: colors.neutral }}>
                  Set the enrollment window relative to semester start
                </p>
              </div>
            </div>

            <div className='space-y-6'>
              {/* Enrollment Start Days Before */}
              <div
                className='p-4 rounded-xl border'
                style={{
                  borderColor: colors.tertiary + "30",
                  backgroundColor: colors.paper,
                }}
              >
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex-1'>
                    <label
                      className='block font-semibold mb-1'
                      style={{ color: colors.primary }}
                    >
                      Enrollment Opens (Days Before Semester)
                    </label>
                    <p
                      className='text-sm mb-3'
                      style={{ color: colors.neutral }}
                    >
                      How many days before the semester start date should
                      enrollment open?
                    </p>
                    <div className='flex items-center gap-3'>
                      <input
                        type='number'
                        min='0'
                        max='90'
                        value={settings.enrollmentStartDaysBefore}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            enrollmentStartDaysBefore:
                              parseInt(e.target.value) || 0,
                          })
                        }
                        className='w-24 px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-center'
                        style={{
                          borderColor: colors.neutralBorder,
                          backgroundColor: "white",
                          color: colors.neutralDark,
                        }}
                      />
                      <span
                        className='text-sm font-medium'
                        style={{ color: colors.neutral }}
                      >
                        days before semester start
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enrollment End Days After */}
              <div
                className='p-4 rounded-xl border'
                style={{
                  borderColor: colors.tertiary + "30",
                  backgroundColor: colors.paper,
                }}
              >
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex-1'>
                    <label
                      className='block font-semibold mb-1'
                      style={{ color: colors.primary }}
                    >
                      Regular Enrollment Ends (Days After Semester Start)
                    </label>
                    <p
                      className='text-sm mb-3'
                      style={{ color: colors.neutral }}
                    >
                      How many days after the semester starts should regular
                      enrollment close?
                    </p>
                    <div className='flex items-center gap-3'>
                      <input
                        type='number'
                        min='0'
                        max='60'
                        value={settings.enrollmentEndDaysAfter}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            enrollmentEndDaysAfter:
                              parseInt(e.target.value) || 0,
                          })
                        }
                        className='w-24 px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-center'
                        style={{
                          borderColor: colors.neutralBorder,
                          backgroundColor: "white",
                          color: colors.neutralDark,
                        }}
                      />
                      <span
                        className='text-sm font-medium'
                        style={{ color: colors.neutral }}
                      >
                        days after semester start
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Late Enrollment Penalty Days */}
              <div
                className='p-4 rounded-xl border'
                style={{
                  borderColor: colors.warning + "30",
                  backgroundColor: colors.warning + "05",
                }}
              >
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex-1'>
                    <label
                      className='block font-semibold mb-1'
                      style={{ color: colors.primary }}
                    >
                      Late Enrollment Period (Days)
                    </label>
                    <p
                      className='text-sm mb-3'
                      style={{ color: colors.neutral }}
                    >
                      Additional days after regular enrollment for late
                      enrollment with penalty fees
                    </p>
                    <div className='flex items-center gap-3'>
                      <input
                        type='number'
                        min='0'
                        max='30'
                        value={settings.lateEnrollmentPenaltyDays}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            lateEnrollmentPenaltyDays:
                              parseInt(e.target.value) || 0,
                          })
                        }
                        className='w-24 px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-center'
                        style={{
                          borderColor: colors.neutralBorder,
                          backgroundColor: "white",
                          color: colors.neutralDark,
                        }}
                      />
                      <span
                        className='text-sm font-medium'
                        style={{ color: colors.neutral }}
                      >
                        additional days (with penalty)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className='p-4 rounded-xl border'
                style={{
                  borderColor: colors.info + "30",
                  backgroundColor: colors.info + "08",
                }}
              >
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex-1'>
                    <label
                      className='block font-semibold mb-1'
                      style={{ color: colors.primary }}
                    >
                      Subject Drop Refund Window (Days)
                    </label>
                    <p
                      className='text-sm mb-3'
                      style={{ color: colors.neutral }}
                    >
                      Subjects dropped within this many days from semester start
                      are marked refundable.
                    </p>
                    <div className='flex items-center gap-3'>
                      <input
                        type='number'
                        min='0'
                        max='60'
                        value={settings.subjectDropRefundableDays}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            subjectDropRefundableDays:
                              parseInt(e.target.value) || 0,
                          })
                        }
                        className='w-24 px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-center'
                        style={{
                          borderColor: colors.neutralBorder,
                          backgroundColor: "white",
                          color: colors.neutralDark,
                        }}
                      />
                      <span
                        className='text-sm font-medium'
                        style={{ color: colors.neutral }}
                      >
                        days from semester start
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className='p-4 rounded-xl border'
                style={{
                  borderColor: colors.secondary + "30",
                  backgroundColor: colors.secondary + "08",
                }}
              >
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex-1'>
                    <label
                      className='block font-semibold mb-1'
                      style={{ color: colors.primary }}
                    >
                      Section Shifting Window (Days)
                    </label>
                    <p
                      className='text-sm mb-3'
                      style={{ color: colors.neutral }}
                    >
                      Section shifting is allowed only within this many days
                      from semester start.
                    </p>
                    <div className='flex items-center gap-3'>
                      <input
                        type='number'
                        min='0'
                        max='60'
                        value={settings.sectionShiftingAllowedDays}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            sectionShiftingAllowedDays:
                              parseInt(e.target.value) || 0,
                          })
                        }
                        className='w-24 px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-center'
                        style={{
                          borderColor: colors.neutralBorder,
                          backgroundColor: "white",
                          color: colors.neutralDark,
                        }}
                      />
                      <span
                        className='text-sm font-medium'
                        style={{ color: colors.neutral }}
                      >
                        days from semester start
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Settings */}
          <div
            className='rounded-2xl p-6 bg-white'
            style={{
              boxShadow:
                "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
            }}
          >
            <div
              className='flex items-center gap-3 mb-6 pb-4 border-b'
              style={{ borderColor: "rgba(58, 35, 19, 0.2)" }}
            >
              <div
                className='p-2 rounded-xl shadow-sm'
                style={{
                  backgroundColor: colors.paper,
                  border: `1px solid ${colors.tertiary}30`,
                }}
              >
                <DollarSign
                  className='w-5 h-5'
                  style={{ color: colors.primary }}
                />
              </div>
              <div>
                <h2
                  className='text-lg font-bold'
                  style={{ color: colors.primary }}
                >
                  Payment Settings
                </h2>
                <p className='text-sm' style={{ color: colors.neutral }}>
                  Configure downpayment and installment charge settings
                </p>
              </div>
            </div>

            <div className='space-y-6'>
              {/* Minimum Downpayment */}
              <div
                className='p-4 rounded-xl border'
                style={{
                  borderColor: colors.tertiary + "30",
                  backgroundColor: colors.paper,
                }}
              >
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex-1'>
                    <label
                      className='block font-semibold mb-1'
                      style={{ color: colors.primary }}
                    >
                      Minimum Downpayment
                    </label>
                    <p
                      className='text-sm mb-3'
                      style={{ color: colors.neutral }}
                    >
                      The minimum amount students must pay as downpayment for
                      installment enrollment
                    </p>
                    <div className='flex items-center gap-3'>
                      <div className='relative'>
                        <span
                          className='absolute left-3 top-1/2 -translate-y-1/2 font-medium'
                          style={{ color: colors.neutral }}
                        >
                          ₱
                        </span>
                        <input
                          type='number'
                          min='0'
                          step='100'
                          value={paymentSettings.minDownpayment}
                          onChange={(e) =>
                            setPaymentSettings({
                              ...paymentSettings,
                              minDownpayment: parseFloat(e.target.value) || 0,
                            })
                          }
                          className='w-40 pl-8 pr-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-right'
                          style={{
                            borderColor: colors.neutralBorder,
                            backgroundColor: "white",
                            color: colors.neutralDark,
                          }}
                        />
                      </div>
                      <span
                        className='text-sm font-medium'
                        style={{ color: colors.neutral }}
                      >
                        pesos
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Installment Charge Percentage */}
              <div
                className='p-4 rounded-xl border'
                style={{
                  borderColor: colors.tertiary + "30",
                  backgroundColor: colors.paper,
                }}
              >
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex-1'>
                    <label
                      className='block font-semibold mb-1'
                      style={{ color: colors.primary }}
                    >
                      Installment Charge Percentage
                    </label>
                    <p
                      className='text-sm mb-3'
                      style={{ color: colors.neutral }}
                    >
                      Percentage charged on the remaining balance after
                      downpayment for installment payments
                    </p>
                    <div className='flex items-center gap-3'>
                      <input
                        type='number'
                        min='0'
                        max='100'
                        step='0.5'
                        value={paymentSettings.installmentChargePercentage}
                        onChange={(e) =>
                          setPaymentSettings({
                            ...paymentSettings,
                            installmentChargePercentage:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                        className='w-24 px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 text-center'
                        style={{
                          borderColor: colors.neutralBorder,
                          backgroundColor: "white",
                          color: colors.neutralDark,
                        }}
                      />
                      <div className='flex items-center gap-1'>
                        <Percent
                          className='w-4 h-4'
                          style={{ color: colors.neutral }}
                        />
                        <span
                          className='text-sm font-medium'
                          style={{ color: colors.neutral }}
                        >
                          of remaining balance
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Calculation Preview */}
            <div
              className='mt-6 p-4 rounded-xl'
              style={{
                backgroundColor: colors.primary + "05",
                border: `1px solid ${colors.primary}15`,
              }}
            >
              <div className='flex items-center gap-2 mb-3'>
                <Info className='w-4 h-4' style={{ color: colors.primary }} />
                <span className='font-medium' style={{ color: colors.primary }}>
                  Payment Calculation Preview
                </span>
              </div>
              <div
                className='text-sm space-y-1'
                style={{ color: colors.neutral }}
              >
                <p>For a sample ₱20,000 total assessment on installment:</p>
                <div className='mt-2 pl-4 space-y-0.5'>
                  <p>
                    Total Matriculation:{" "}
                    <strong>
                      ₱
                      {(20000 * 1.05).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                      })}
                    </strong>
                  </p>
                  <p>
                    Downpayment:{" "}
                    <strong>
                      ₱
                      {paymentSettings.minDownpayment.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                      })}
                    </strong>
                  </p>
                  <p>
                    Balance:{" "}
                    <strong>
                      ₱
                      {(
                        20000 * 1.05 -
                        paymentSettings.minDownpayment
                      ).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </strong>
                  </p>
                  <p>
                    Installment Charge (
                    {paymentSettings.installmentChargePercentage}%):{" "}
                    <strong>
                      ₱
                      {(
                        ((20000 * 1.05 - paymentSettings.minDownpayment) *
                          paymentSettings.installmentChargePercentage) /
                        100
                      ).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </strong>
                  </p>
                  <p>
                    Net Balance:{" "}
                    <strong>
                      ₱
                      {(
                        (20000 * 1.05 - paymentSettings.minDownpayment) *
                        (1 + paymentSettings.installmentChargePercentage / 100)
                      ).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </strong>
                  </p>
                  <p>
                    Per Term (3 terms):{" "}
                    <strong>
                      ₱
                      {(
                        ((20000 * 1.05 - paymentSettings.minDownpayment) *
                          (1 +
                            paymentSettings.installmentChargePercentage /
                              100)) /
                        3
                      ).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div
            className='flex items-start gap-3 p-4 rounded-xl'
            style={{
              backgroundColor: colors.primary + "08",
              border: `1px solid ${colors.primary}20`,
            }}
          >
            <Info
              className='w-5 h-5 mt-0.5 flex-shrink-0'
              style={{ color: colors.primary }}
            />
            <div>
              <p
                className='text-sm font-medium'
                style={{ color: colors.primary }}
              >
                Enrollment Period Calculation
              </p>
              <p className='text-sm mt-1' style={{ color: colors.neutral }}>
                Based on your settings, enrollment will open{" "}
                <strong>{settings.enrollmentStartDaysBefore} days</strong>{" "}
                before the semester start and close{" "}
                <strong>{settings.enrollmentEndDaysAfter} days</strong> after.
                Late enrollment with penalty will be accepted for an additional{" "}
                <strong>{settings.lateEnrollmentPenaltyDays} days</strong>.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className='flex justify-end gap-3'>
            <button
              onClick={() => setShowResetConfirmation(true)}
              disabled={loading}
              className='flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200'
              style={{
                backgroundColor: colors.neutralLight,
                color: colors.neutral,
                border: `1px solid ${colors.neutralBorder}`,
              }}
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Reset
            </button>
            <button
              onClick={() => setShowSaveConfirmation(true)}
              disabled={saving}
              className='flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200'
              style={{
                backgroundColor: colors.primary,
                color: colors.paper,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.secondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.primary;
              }}
            >
              {saving ? (
                <RefreshCw className='w-4 h-4 animate-spin' />
              ) : (
                <Save className='w-4 h-4' />
              )}
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>

          <ConfirmationModal
            isOpen={showResetConfirmation}
            onClose={() => setShowResetConfirmation(false)}
            onConfirm={() => {
              setShowResetConfirmation(false);
              fetchSettings();
            }}
            title='Reset Changes'
            message='Are you sure you want to reset the form values?'
            description='Any unsaved changes in settings will be discarded and replaced with the latest saved values.'
            confirmText='Reset'
            cancelText='Keep Editing'
            variant='warning'
          />

          <ConfirmationModal
            isOpen={showSaveConfirmation}
            onClose={() => setShowSaveConfirmation(false)}
            onConfirm={() => {
              setShowSaveConfirmation(false);
              saveSettings();
            }}
            title='Save Settings'
            message='Apply these settings now?'
            description='This will update semester, enrollment, and payment settings for the system.'
            confirmText='Save Settings'
            cancelText='Review Again'
            variant='info'
            isLoading={saving}
          />
        </div>
      </div>
    </div>
  );
};

export default Settings;
