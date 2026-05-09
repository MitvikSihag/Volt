"use client";

import { MapPin } from "lucide-react";

export function ActivityMap() {
  return (
    <div className="w-full h-72 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-lg)] flex flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 rounded-full bg-[var(--color-border)] flex items-center justify-center">
        <MapPin className="w-5 h-5 text-[var(--color-text-muted)]" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">Map view</p>
        <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">GPS route will render here when backend is connected</p>
      </div>
    </div>
  );
}
