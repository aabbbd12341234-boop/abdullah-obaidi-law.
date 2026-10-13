// Small utilities used inside dashboards
import React from "react";
import { Badge } from "@/components/ui/badge";

export const statusColor = (s) => {
  const map = {
    open: "bg-blue-100 text-blue-800 border-blue-200",
    in_progress: "bg-amber-100 text-amber-800 border-amber-200",
    court: "bg-purple-100 text-purple-800 border-purple-200",
    closed: "bg-slate-200 text-slate-700 border-slate-300",
    won: "bg-emerald-100 text-emerald-800 border-emerald-200",
    lost: "bg-red-100 text-red-800 border-red-200",
    paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
    partial: "bg-amber-100 text-amber-800 border-amber-200",
    unpaid: "bg-red-100 text-red-800 border-red-200",
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
    done: "bg-slate-200 text-slate-700 border-slate-300",
  };
  return map[s] || "bg-slate-100 text-slate-700 border-slate-200";
};

export function StatusBadge({ status, label }) {
  return (
    <Badge className={`${statusColor(status)} border rounded font-medium`}>
      {label}
    </Badge>
  );
}

export function Empty({ children }) {
  return (
    <div className="text-center text-slate-400 py-16 text-sm" data-testid="empty-state">
      {children}
    </div>
  );
}

export function StatCard({ label, value, testid, accent }) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-md p-5 ${accent ? "border-s-4 border-s-[#B4975A]" : ""}`}
      data-testid={testid}
    >
      <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{label}</div>
      <div className="mt-2 font-heading text-2xl lg:text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export function formatDate(iso, withTime = false) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    const opts = withTime
      ? { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
      : { year: "numeric", month: "short", day: "numeric" };
    return d.toLocaleString(undefined, opts);
  } catch {
    return iso;
  }
}

export function money(n) {
  const v = Number(n || 0);
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
