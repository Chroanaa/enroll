"use client";

import React, { useEffect, useMemo, useState } from "react";
import { colors } from "@/app/colors";
import { BookOpen, Loader2, Users } from "lucide-react";

type PetitionQueueItem = {
  curriculumCourseId: number;
  subjectId: number | null;
  programId: number | null;
  programCode: string | null;
  programName: string | null;
  courseCode: string;
  descriptiveTitle: string;
  yearLevel: number;
  academicYear: string;
  semester: number;
  approvedStudents: number;
  unassignedStudents: number;
};

type PetitionSchedulingQueueProps = {
  academicYear: string;
  semester: "first" | "second" | "summer";
  onOpenManualEnrollment: (item?: PetitionQueueItem) => void;
  onOpenScheduleBuilder: (item: PetitionQueueItem) => Promise<void> | void;
  refreshToken?: number;
};

export default function PetitionSchedulingQueue({
  academicYear,
  semester,
  onOpenManualEnrollment,
  onOpenScheduleBuilder,
  refreshToken = 0,
}: PetitionSchedulingQueueProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [items, setItems] = useState<PetitionQueueItem[]>([]);
  const [schedulingKey, setSchedulingKey] = useState<number | null>(null);

  useEffect(() => {
    const loadQueue = async () => {
      if (semester === "summer") {
        setItems([]);
        return;
      }

      setIsLoading(true);
      setError("");
      setActionError("");
      try {
        const params = new URLSearchParams({
          academicYear,
          semester,
        });
        const response = await fetch(
          `/api/auth/section/petition-queue?${params.toString()}`,
        );
        const result = await response.json();
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || "Failed to load petition queue.");
        }

        setItems(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load petition queue.");
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadQueue();
  }, [academicYear, semester, refreshToken]);

  const totalUnassigned = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.unassignedStudents || 0), 0),
    [items],
  );

  return (
    <section
      className="rounded-xl border bg-white p-4 md:p-5"
      style={{
        borderColor: colors.neutralBorder,
        boxShadow: `0 8px 20px ${colors.neutralBorder}2e`,
      }}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: colors.neutral }}
          >
            Petition Scheduling Queue
          </p>
          <h3 className="mt-1 text-lg font-semibold" style={{ color: colors.primary }}>
            Approved Petition Subjects Without Section
          </h3>
          <p className="mt-1 text-sm leading-6" style={{ color: colors.neutral }}>
            These petition subjects are approved but still need section scheduling and student assignment.
          </p>
        </div>
        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{
            backgroundColor: `${colors.secondary}12`,
            color: colors.secondary,
          }}
        >
          <Users className="h-3.5 w-3.5" />
          {totalUnassigned} pending students
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border" style={{ borderColor: colors.neutralBorder }}>
        {actionError ? (
          <div className="px-4 py-3 text-sm" style={{ color: colors.warning, backgroundColor: `${colors.warning}12` }}>
            {actionError}
          </div>
        ) : null}
        <table className="min-w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: `${colors.secondary}08` }}>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: colors.neutral }}>
                Code
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: colors.neutral }}>
                Subject
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: colors.neutral }}>
                Year
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: colors.neutral }}>
                Approved
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: colors.neutral }}>
                No Section
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: colors.neutral }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: colors.tertiary }}>
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading petition queue...
                  </span>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: colors.warning }}>
                  {error}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: colors.tertiary }}>
                  <span className="inline-flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    No approved petition subject is waiting for section scheduling.
                  </span>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={`petition-schedule-${item.curriculumCourseId}`} className="border-t" style={{ borderColor: colors.neutralBorder }}>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: colors.primary }}>
                    {item.courseCode}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: colors.primary }}>
                    {item.descriptiveTitle}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: colors.neutralDark }}>
                    {item.yearLevel > 0 ? `Year ${item.yearLevel}` : "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: colors.neutralDark }}>
                    {item.approvedStudents}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: colors.warning }}>
                    {item.unassignedStudents}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setActionError("");
                            setSchedulingKey(item.curriculumCourseId);
                            await onOpenScheduleBuilder(item);
                          } catch (err) {
                            setActionError(
                              err instanceof Error
                                ? err.message
                                : "Failed to open petition schedule builder.",
                            );
                          } finally {
                            setSchedulingKey(null);
                          }
                        }}
                        disabled={schedulingKey === item.curriculumCourseId}
                        className="rounded-lg px-3 py-2 text-xs font-semibold text-white transition disabled:cursor-wait disabled:opacity-70"
                        style={{ backgroundColor: colors.secondary }}
                      >
                        {schedulingKey === item.curriculumCourseId ? (
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Opening...
                          </span>
                        ) : (
                          "Create Section & Schedule"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenManualEnrollment(item)}
                        className="rounded-lg border px-3 py-2 text-xs font-semibold transition"
                        style={{
                          color: colors.primary,
                          borderColor: colors.neutralBorder,
                          backgroundColor: "white",
                        }}
                      >
                        Manual Enrollment
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
