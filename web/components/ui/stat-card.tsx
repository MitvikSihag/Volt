import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  subvalue?: string;
  icon?: ReactNode;
  trend?: { value: number; label: string };
  accent?: boolean;
  className?: string;
}

export function StatCard({ label, value, subvalue, icon, trend, accent, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 flex flex-col gap-3",
        accent && "border-[var(--color-accent)] bg-[var(--color-accent-muted)]",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{label}</span>
        {icon && (
          <span className={cn("text-[var(--color-text-muted)]", accent && "text-[var(--color-accent)]")}>
            {icon}
          </span>
        )}
      </div>
      <div>
        <div className={cn("text-2xl font-bold text-[var(--color-text)]", accent && "text-[var(--color-accent)]")}>
          {value}
        </div>
        {subvalue && <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{subvalue}</div>}
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs">
          <span className={cn(trend.value >= 0 ? "text-[var(--color-green)]" : "text-[var(--color-red)]")}>
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
          <span className="text-[var(--color-text-muted)]">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
