"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, RotateCw, PhilippinePeso } from "lucide-react";
import { colors } from "../colors";
import ConfirmationModal from "./common/ConfirmationModal";

interface RefundRow {
  id: number;
  student_number: string;
  full_name?: string | null;
  academic_year: string;
  semester: number;
  curriculum_course_id: number;
  course_code: string | null;
  descriptive_title: string | null;
  units_total: number | null;
  dropped_at: string;
  drop_reason: string | null;
  refundable: boolean;
  units_lec?: number | null;
  units_lab?: number | null;
  fixed_amount?: number | null;
  tuition_per_unit?: number | null;
  lecture_base_amount?: number | null;
  lecture_after_discount?: number | null;
  lab_amount?: number | null;
  effective_discount_percent?: number | null;
  refund_amount?: number | null;
}

const RefundManagement: React.FC = () => {
  const [rows, setRows] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [confirmRow, setConfirmRow] = useState<RefundRow | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("query", search.trim());
      }
      const res = await fetch(`/api/auth/refunds?${params.toString()}`);
      const json = await res.json();
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRows();
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalRefundable = rows.length;

  const totalUnits = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.units_total || 0), 0),
    [rows],
  );

  const handleRefund = async (id: number) => {
    try {
      setProcessingId(id);
      const res = await fetch("/api/auth/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Failed to process refund.");
      }
      await fetchRows();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to process refund.");
    } finally {
      setProcessingId(null);
    }
  };

  const formatPeso = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number.isFinite(value) ? value : 0);

  return (
    <div className='min-h-screen p-6' style={{ backgroundColor: colors.paper }}>
      <div className='max-w-7xl mx-auto space-y-6'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-bold' style={{ color: colors.primary }}>
              Refund Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Refundable records from subject drop history
            </p>
          </div>
          <button
            onClick={fetchRows}
            className='inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white'
            style={{ backgroundColor: colors.secondary }}
          >
            <RotateCw className='w-4 h-4' />
            Refresh
          </button>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='bg-white border border-gray-100 rounded-2xl p-4'>
            <p className='text-sm text-gray-500'>Refundable Requests</p>
            <p className='text-3xl font-bold mt-1' style={{ color: colors.primary }}>
              {totalRefundable}
            </p>
          </div>
          <div className='bg-white border border-gray-100 rounded-2xl p-4'>
            <p className='text-sm text-gray-500'>Total Dropped Units</p>
            <p className='text-3xl font-bold mt-1' style={{ color: colors.primary }}>
              {totalUnits}
            </p>
          </div>
        </div>

        <div className='bg-white p-4 rounded-2xl shadow-sm border border-gray-100'>
          <div className='relative max-w-md'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5' />
            <input
              type='text'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search student number, subject code, title...'
              className='w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl'
            />
          </div>
        </div>

        <div className='bg-white rounded-2xl border border-gray-100 overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full min-w-[980px]'>
              <thead>
                <tr className='border-b border-gray-100' style={{ backgroundColor: colors.secondary }}>
                  <th className='px-4 py-3 text-left text-xs font-bold uppercase text-white'>Student #</th>
                  <th className='px-4 py-3 text-left text-xs font-bold uppercase text-white'>Full Name</th>
                  <th className='px-4 py-3 text-left text-xs font-bold uppercase text-white'>Subject</th>
                  <th className='px-4 py-3 text-left text-xs font-bold uppercase text-white'>Description</th>
                  <th className='px-4 py-3 text-left text-xs font-bold uppercase text-white'>Acad Year</th>
                  <th className='px-4 py-3 text-left text-xs font-bold uppercase text-white'>Sem</th>
                  <th className='px-4 py-3 text-left text-xs font-bold uppercase text-white'>Units</th>
                  <th className='px-4 py-3 text-left text-xs font-bold uppercase text-white'>Dropped At</th>
                  <th className='px-4 py-3 text-left text-xs font-bold uppercase text-white'>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className='px-4 py-10 text-center text-gray-500'>
                      Loading refundable drops...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className='px-4 py-10 text-center text-gray-500'>
                      No refundable subject drops found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className='border-b border-gray-100 last:border-b-0 hover:bg-gray-50'>
                      <td className='px-4 py-3 text-sm font-mono font-semibold' style={{ color: colors.primary }}>
                        {row.student_number}
                      </td>
                      <td className='px-4 py-3 text-sm font-semibold' style={{ color: colors.neutralDark }}>
                        {row.full_name || "N/A"}
                      </td>
                      <td className='px-4 py-3 text-sm font-semibold' style={{ color: colors.primary }}>
                        {row.course_code || "N/A"}
                      </td>
                      <td className='px-4 py-3 text-sm' style={{ color: colors.neutralDark }}>
                        {row.descriptive_title || "N/A"}
                      </td>
                      <td className='px-4 py-3 text-sm' style={{ color: colors.neutralDark }}>
                        {row.academic_year}
                      </td>
                      <td className='px-4 py-3 text-sm' style={{ color: colors.neutralDark }}>
                        {row.semester}
                      </td>
                      <td className='px-4 py-3 text-sm' style={{ color: colors.neutralDark }}>
                        {row.units_total ?? 0}
                      </td>
                      <td className='px-4 py-3 text-sm' style={{ color: colors.neutralDark }}>
                        {new Date(row.dropped_at).toLocaleDateString()}
                      </td>
                      <td className='px-4 py-3 text-sm'>
                        <button
                          type='button'
                          onClick={() => setConfirmRow(row)}
                          disabled={processingId === row.id}
                          className='inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed'
                          style={{ backgroundColor: colors.secondary }}
                          onMouseEnter={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.backgroundColor = colors.primary;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.backgroundColor = colors.secondary;
                            }
                          }}
                        >
                          <PhilippinePeso className='w-3.5 h-3.5' />
                          {processingId === row.id ? "Processing..." : "Refund Subject"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={Boolean(confirmRow)}
        onClose={() => setConfirmRow(null)}
        onConfirm={async () => {
          if (!confirmRow) return;
          await handleRefund(confirmRow.id);
          setConfirmRow(null);
        }}
        title='Confirm Refund Subject'
        message='Review the subject and refund amount before processing.'
        confirmText='Process Refund'
        cancelText='Cancel'
        variant='warning'
        isLoading={processingId === confirmRow?.id}
        customContent={
          confirmRow ? (
            <div className='space-y-3 text-sm'>
              <div className='rounded-lg border p-3' style={{ borderColor: colors.neutralBorder }}>
                <p style={{ color: colors.neutral }}>
                  <strong style={{ color: colors.primary }}>Student:</strong> {confirmRow.student_number} ({confirmRow.full_name || "N/A"})
                </p>
                <p style={{ color: colors.neutral }}>
                  <strong style={{ color: colors.primary }}>Subject:</strong> {confirmRow.course_code || "N/A"} - {confirmRow.descriptive_title || "N/A"}
                </p>
                <p style={{ color: colors.neutral }}>
                  <strong style={{ color: colors.primary }}>Term:</strong> {confirmRow.academic_year} / Sem {confirmRow.semester}
                </p>
              </div>
              <div className='rounded-lg border p-3' style={{ borderColor: colors.neutralBorder }}>
                <p style={{ color: colors.neutralDark }}>
                  Computation:{" "}
                  {Number(confirmRow.fixed_amount || 0) > 0
                    ? `Fixed Amount = ${formatPeso(Number(confirmRow.fixed_amount || 0))}`
                    : `(${Number(confirmRow.units_lec || 0)} lec x ${formatPeso(Number(confirmRow.tuition_per_unit || 0))}) - discount + (${Number(confirmRow.units_lab || 0)} lab x ${formatPeso(1000)})`}
                </p>
                {Number(confirmRow.fixed_amount || 0) <= 0 && (
                  <div className='mt-2 space-y-1 text-xs' style={{ color: colors.neutral }}>
                    <p>
                      Lecture Base: {formatPeso(Number(confirmRow.lecture_base_amount || 0))}
                    </p>
                    <p>
                      Discount: {Number(confirmRow.effective_discount_percent || 0).toFixed(2)}%
                    </p>
                    <p>
                      Lecture After Discount: {formatPeso(Number(confirmRow.lecture_after_discount || 0))}
                    </p>
                    <p>
                      Lab Component: {formatPeso(Number(confirmRow.lab_amount || 0))}
                    </p>
                  </div>
                )}
                <p className='mt-1 text-base font-bold' style={{ color: colors.primary }}>
                  Refund Amount: {formatPeso(Number(confirmRow.refund_amount || 0))}
                </p>
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
};

export default RefundManagement;

