import Link from "next/link";
import { Zap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] rounded-full bg-[var(--color-accent)] opacity-[0.03] blur-3xl" />
      </div>

      <Link href="/" className="flex items-center gap-2 mb-8 relative z-10">
        <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)] flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-xl font-bold text-[var(--color-text)]">Volt</span>
      </Link>

      <div className="w-full max-w-sm relative z-10">{children}</div>
    </div>
  );
}
