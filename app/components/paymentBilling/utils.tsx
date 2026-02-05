import { Wallet, Smartphone, Building2, CreditCard } from "lucide-react";
import React from "react";

export type PaymentType = "cash" | "gcash" | "bank_transfer";

export const formatAmount = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "₱0.00";
  return `₱${Number(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const getPaymentTypeIcon = (type: string | null) => {
  switch (type) {
    case "cash":
      return <Wallet className='w-4 h-4' />;
    case "gcash":
      return <Smartphone className='w-4 h-4' />;
    case "bank_transfer":
      return <Building2 className='w-4 h-4' />;
    default:
      return <CreditCard className='w-4 h-4' />;
  }
};

export const getPaymentTypeBadge = (type: string | null) => {
  const styles = {
    cash: "bg-green-100 text-green-800",
    gcash: "bg-blue-100 text-blue-800",
    bank_transfer: "bg-purple-100 text-purple-800",
  };
  const labels = {
    cash: "Cash",
    gcash: "GCash",
    bank_transfer: "Bank Transfer",
  };
  const style =
    styles[type as keyof typeof styles] || "bg-gray-100 text-gray-800";
  const label = labels[type as keyof typeof labels] || type || "Unknown";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style}`}
    >
      {getPaymentTypeIcon(type)}
      {label}
    </span>
  );
};

