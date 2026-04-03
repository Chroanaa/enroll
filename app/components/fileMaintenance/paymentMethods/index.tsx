"use client";
import React, { useEffect, useMemo, useState } from "react";
import { colors } from "@/app/colors";
import { Plus, Edit, Trash2, RefreshCw, Search, WalletCards } from "lucide-react";
import SuccessModal from "@/app/components/common/SuccessModal";
import ErrorModal from "@/app/components/common/ErrorModal";
import ConfirmationModal from "@/app/components/common/ConfirmationModal";

type PaymentMethodRow = {
  id: number;
  name: string;
  receiver_name: string;
  receiver_account: string;
  instructions: string | null;
  is_active: boolean;
  sort_order: number;
};

const initialForm = {
  id: null as number | null,
  name: "",
  receiver_name: "",
  receiver_account: "",
  instructions: "",
  is_active: true,
  sort_order: 0,
};

export default function PaymentMethodsManagement() {
  const [rows, setRows] = useState<PaymentMethodRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: "" });
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
    details: "",
  });

  const fetchRows = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/payment-methods");
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Failed to load methods.");
      setRows(Array.isArray(result?.data) ? result.data : []);
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: "Unable to load payment methods",
        details: error?.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.name, row.receiver_name, row.receiver_account]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [rows, search]);

  const activeCount = useMemo(
    () => rows.filter((row) => row.is_active).length,
    [rows],
  );
  const inactiveCount = rows.length - activeCount;

  const openCreate = () => {
    setForm(initialForm);
    setShowForm(true);
  };

  const openEdit = (row: PaymentMethodRow) => {
    setForm({
      id: row.id,
      name: row.name,
      receiver_name: row.receiver_name,
      receiver_account: row.receiver_account,
      instructions: row.instructions || "",
      is_active: row.is_active,
      sort_order: row.sort_order || 0,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.receiver_name.trim() || !form.receiver_account.trim()) {
      setErrorModal({
        isOpen: true,
        message: "Missing required fields",
        details: "Payment type, receiver name, and receiver account are required.",
      });
      return;
    }

    setSaving(true);
    try {
      const method = form.id ? "PATCH" : "POST";
      const response = await fetch("/api/auth/payment-methods", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          name: form.name.trim(),
          receiver_name: form.receiver_name.trim(),
          receiver_account: form.receiver_account.trim(),
          instructions: form.instructions.trim(),
          is_active: form.is_active,
          sort_order: Number(form.sort_order || 0),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Failed to save payment method.");
      setSuccessModal({
        isOpen: true,
        message: form.id ? "Payment method updated." : "Payment method created.",
      });
      setShowForm(false);
      setForm(initialForm);
      await fetchRows();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: "Save failed",
        details: error?.message || "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const response = await fetch("/api/auth/payment-methods", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Failed to delete payment method.");
      setSuccessModal({ isOpen: true, message: "Payment method deleted." });
      setDeletingId(null);
      await fetchRows();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: "Delete failed",
        details: error?.message || "Please try again.",
      });
      setDeletingId(null);
    }
  };

  return (
    <div
      className='min-h-screen p-6'
      style={{
        background: `linear-gradient(180deg, ${colors.paper} 0%, #eef2f7 100%)`,
      }}
    >
      <div className='max-w-7xl mx-auto space-y-4'>
        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
          <div
            className='rounded-xl border p-4'
            style={{
              borderColor: `${colors.secondary}45`,
              background: `linear-gradient(135deg, ${colors.secondary}12 0%, #fff 85%)`,
            }}
          >
            <div className='flex items-center gap-3'>
              <div
                className='h-11 w-11 rounded-xl border grid place-items-center'
                style={{
                  backgroundColor: `${colors.secondary}1C`,
                  borderColor: `${colors.secondary}40`,
                }}
              >
                <WalletCards className='h-5 w-5' style={{ color: colors.secondary }} />
              </div>
              <div>
                <h1
                  className='text-2xl font-extrabold tracking-tight'
                  style={{ color: colors.primary }}
                >
                  Payment Methods
                </h1>
                <p className='text-sm font-medium text-slate-700'>
                  Manage payment channels and receiver accounts used in student payment links.
                </p>
              </div>
            </div>
            <div className='mt-3 flex flex-wrap gap-2 text-xs'>
              <span className='rounded-full px-2.5 py-1 font-semibold bg-emerald-100 text-emerald-700'>
                {activeCount} active
              </span>
              <span className='rounded-full px-2.5 py-1 font-semibold bg-slate-200 text-slate-700'>
                {inactiveCount} inactive
              </span>
              <span className='rounded-full px-2.5 py-1 font-semibold bg-blue-100 text-blue-700'>
                {rows.length} total methods
              </span>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={fetchRows}
              className='h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium inline-flex items-center gap-2 hover:bg-slate-50'
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={openCreate}
              className='h-10 px-4 rounded-lg text-white font-semibold inline-flex items-center gap-2 shadow-sm'
              style={{
                background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)`,
              }}
            >
              <Plus className='h-4 w-4' />
              Add Method
            </button>
          </div>
        </div>

        <div
          className='bg-white rounded-xl border shadow-sm overflow-hidden'
          style={{ borderColor: `${colors.secondary}2E` }}
        >
          <div className='p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between'>
            <div className='relative w-full md:w-96'>
              <Search className='h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2' />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search payment methods...'
                className='w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-amber-400 focus:ring-2 focus:ring-amber-100'
              />
            </div>
            <p className='text-xs font-semibold text-slate-500'>
              Showing {filteredRows.length} of {rows.length}
            </p>
          </div>

          <div className='overflow-x-auto'>
            <table className='min-w-full text-sm'>
              <thead className='bg-slate-50 text-slate-700'>
                <tr>
                  <th className='px-4 py-3 text-left font-semibold'>Type</th>
                  <th className='px-4 py-3 text-left font-semibold'>Receiver Name</th>
                  <th className='px-4 py-3 text-left font-semibold'>Account/Number</th>
                  <th className='px-4 py-3 text-left font-semibold'>Instructions</th>
                  <th className='px-4 py-3 text-left font-semibold'>Status</th>
                  <th className='px-4 py-3 text-left font-semibold'>Sort</th>
                  <th className='px-4 py-3 text-left font-semibold'>Action</th>
                </tr>
              </thead>
              <tbody>
                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className='px-4 py-10 text-center text-slate-500'>
                      No payment methods found.
                    </td>
                  </tr>
                )}
                {filteredRows.map((row) => (
                  <tr key={row.id} className='border-t border-slate-100 hover:bg-slate-50/80'>
                    <td className='px-4 py-3 font-semibold text-slate-900'>{row.name}</td>
                    <td className='px-4 py-3 text-slate-800'>{row.receiver_name}</td>
                    <td className='px-4 py-3 font-medium text-slate-900'>{row.receiver_account}</td>
                    <td className='px-4 py-3 max-w-xs'>
                      <p className='text-xs text-slate-700 truncate' title={row.instructions || ""}>
                        {row.instructions?.trim() || "No instructions"}
                      </p>
                    </td>
                    <td className='px-4 py-3'>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className='px-4 py-3 font-medium text-slate-700'>{row.sort_order}</td>
                    <td className='px-4 py-3'>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => openEdit(row)}
                          className='h-8 px-3 rounded-md border border-slate-300 bg-white text-slate-800 font-medium inline-flex items-center gap-1 hover:bg-slate-100'
                        >
                          <Edit className='h-3.5 w-3.5' />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingId(row.id)}
                          className='h-8 px-3 rounded-md border border-rose-200 bg-rose-50 text-rose-600 font-medium inline-flex items-center gap-1 hover:bg-rose-100'
                        >
                          <Trash2 className='h-3.5 w-3.5' />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <div className='fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4'>
          <div
            className='w-full max-w-xl rounded-xl bg-white shadow-xl border overflow-hidden'
            style={{ borderColor: `${colors.secondary}35` }}
          >
            <div
              className='p-5 border-b'
              style={{
                borderColor: `${colors.secondary}30`,
                background: `linear-gradient(135deg, ${colors.secondary}10 0%, #fff 80%)`,
              }}
            >
              <h2 className='text-xl font-extrabold' style={{ color: colors.primary }}>
                {form.id ? "Edit Payment Method" : "Add Payment Method"}
              </h2>
              <p className='text-sm text-slate-700 mt-1'>
                Configure how students see payment details on the public payment page.
              </p>
            </div>
            <div className='p-5 grid grid-cols-1 gap-3'>
              <div>
                <label className='block text-xs font-semibold text-slate-600 mb-1.5'>
                  Payment Type Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder='e.g. GCash'
                  className='w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-100 focus:border-amber-400'
                />
              </div>
              <div>
                <label className='block text-xs font-semibold text-slate-600 mb-1.5'>
                  Receiver Name
                </label>
                <input
                  value={form.receiver_name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, receiver_name: e.target.value }))
                  }
                  placeholder='Receiver name'
                  className='w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-100 focus:border-amber-400'
                />
              </div>
              <div>
                <label className='block text-xs font-semibold text-slate-600 mb-1.5'>
                  Receiver Account/Number
                </label>
                <input
                  value={form.receiver_account}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, receiver_account: e.target.value }))
                  }
                  placeholder='Receiver account/number'
                  className='w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-100 focus:border-amber-400'
                />
              </div>
              <div>
                <label className='block text-xs font-semibold text-slate-600 mb-1.5'>
                  Instructions (Optional)
                </label>
                <textarea
                  value={form.instructions}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, instructions: e.target.value }))
                  }
                  placeholder='Payment instructions to show student'
                  className='w-full rounded-lg border border-slate-300 px-3 py-2 min-h-24 text-slate-900 focus:ring-2 focus:ring-amber-100 focus:border-amber-400'
                />
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-xs font-semibold text-slate-600 mb-1.5'>
                    Sort Order
                  </label>
                  <input
                    type='number'
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        sort_order: Number(e.target.value || 0),
                      }))
                    }
                    placeholder='Sort order'
                    className='w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-amber-100 focus:border-amber-400'
                  />
                </div>
                <div className='flex items-end'>
                  <label className='inline-flex items-center gap-2 text-sm font-medium text-slate-700 h-10'>
                    <input
                      type='checkbox'
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, is_active: e.target.checked }))
                      }
                    />
                    Active
                  </label>
                </div>
              </div>
            </div>
            <div className='p-5 border-t border-gray-100 flex justify-end gap-2'>
              <button
                onClick={() => {
                  setShowForm(false);
                  setForm(initialForm);
                }}
                className='h-10 px-4 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium'
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className='h-10 px-4 rounded-lg text-white font-semibold disabled:opacity-60 shadow-sm'
                style={{
                  background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)`,
                }}
              >
                {saving ? "Saving..." : form.id ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(deletingId)}
        title='Delete Payment Method'
        message='Are you sure you want to delete this payment method?'
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
      />
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: "" })}
        message={successModal.message}
        autoClose
      />
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: "", details: "" })}
        message={errorModal.message}
        details={errorModal.details}
      />
    </div>
  );
}
