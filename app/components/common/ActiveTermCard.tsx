"use client";

import React from "react";
import { Calendar } from "lucide-react";
import { colors } from "../../colors";

interface ActiveTermCardProps {
  value: string;
  label?: string;
  className?: string;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  border: `1px solid ${colors.neutralBorder}`,
  boxShadow: `0 14px 32px ${colors.neutralBorder}55`,
};

export default function ActiveTermCard({
  value,
  label = "Active Term",
  className = "",
}: ActiveTermCardProps) {
  return (
    <div
      className={`inline-flex items-center gap-3 rounded-xl px-4 py-3 ${className}`}
      style={cardStyle}
    >
      <div
        className='flex h-10 w-10 items-center justify-center rounded-xl'
        style={{
          backgroundColor: `${colors.secondary}12`,
          color: colors.secondary,
        }}
      >
        <Calendar className='h-5 w-5' />
      </div>
      <div>
        <p
          className='text-[11px] font-semibold uppercase tracking-[0.18em]'
          style={{ color: colors.neutral }}
        >
          {label}
        </p>
        <p className='text-sm font-semibold' style={{ color: colors.primary }}>
          {value}
        </p>
      </div>
    </div>
  );
}

