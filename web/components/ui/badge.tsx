import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "accent" | "green" | "blue" | "red" | "yellow";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        {
          "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]": variant === "default",
          "bg-[var(--color-accent-muted)] text-[var(--color-accent)]": variant === "accent",
          "bg-emerald-500/10 text-emerald-400": variant === "green",
          "bg-blue-500/10 text-blue-400": variant === "blue",
          "bg-red-500/10 text-red-400": variant === "red",
          "bg-yellow-500/10 text-yellow-400": variant === "yellow",
        },
        className
      )}
      {...props}
    />
  );
}
