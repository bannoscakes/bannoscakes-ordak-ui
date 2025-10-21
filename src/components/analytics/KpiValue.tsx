import React from "react";

export default function KpiValue({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return <span>—</span>;
  }
  return <span>{Number.isFinite(value) ? `${value}%` : '—'}</span>;
}


