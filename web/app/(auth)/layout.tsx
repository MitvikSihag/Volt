import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] rounded-full bg-[var(--color-accent)] opacity-[0.03] blur-3xl" />
      </div>

      <Link href="/" className="mb-8 relative z-10 no-underline">
        <Logo size={28} textClassName="text-xl" />
      </Link>

      <div className="w-full max-w-sm relative z-10">{children}</div>
    </div>
  );
}
