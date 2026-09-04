"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { authApi } from "@/lib/api";
import { Mail, Lock, User } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const errs: Record<string, string> = {};
    if (form.username.length < 3) errs.username = "Must be at least 3 characters";
    if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email";
    if (form.password.length < 8) errs.password = "Must be at least 8 characters";
    if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords don't match";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await authApi.register({ username: form.username, email: form.email, password: form.password });
      const loginRes = await authApi.login({ email: form.email, password: form.password });
      setAuth(loginRes.data.token, loginRes.data.user);
      router.push("/dashboard");
    } catch {
      setErrors({ form: "Registration failed. Username or email may already be taken." });
    } finally {
      setLoading(false);
    }
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] p-8">
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-1">Create account</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">Start tracking your fitness journey</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Username" placeholder="alexrider" icon={<User className="w-4 h-4" />}
          value={form.username} onChange={set("username")} error={errors.username} required />
        <Input label="Email" type="email" placeholder="you@example.com" icon={<Mail className="w-4 h-4" />}
          value={form.email} onChange={set("email")} error={errors.email} required />
        <Input label="Password" type="password" placeholder="••••••••" icon={<Lock className="w-4 h-4" />}
          value={form.password} onChange={set("password")} error={errors.password} required />
        <Input label="Confirm password" type="password" placeholder="••••••••" icon={<Lock className="w-4 h-4" />}
          value={form.confirmPassword} onChange={set("confirmPassword")} error={errors.confirmPassword} required />

        {errors.form && <p className="text-sm text-[var(--color-red)]">{errors.form}</p>}

        <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
          Create account
        </Button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-border)]" />
        </div>
        <div className="relative flex justify-center text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] px-2">
          or sign up with
        </div>
      </div>

      <div className="flex gap-2.5">
        <button type="button" className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-[#1D1D1F] font-medium text-sm py-2.5 px-4 rounded-[var(--radius-md)] cursor-pointer border-none hover:bg-gray-100 transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12.82 8.16c0-.47-.04-.82-.13-1.18H8.18v2.14h2.66a2.3 2.3 0 01-.95 1.5l-.01.06 1.38 1.07.1.01c.88-.81 1.38-2.01 1.38-3.6z" fill="#4285F4"/><path d="M8.18 12.86c1.28 0 2.36-.42 3.14-1.14l-1.5-1.16c-.4.28-.93.47-1.65.47a2.87 2.87 0 01-2.71-1.98l-.06.01-1.43 1.11-.02.06a4.74 4.74 0 004.23 2.63z" fill="#34A853"/><path d="M5.47 9.05a2.88 2.88 0 01-.16-.94c0-.33.06-.65.15-.94l0-.06-1.45-1.13-.05.03A4.74 4.74 0 003.18 8c0 .76.18 1.49.78 2.09l1.51-1.04z" fill="#FBBC05"/><path d="M8.18 5.19c.88 0 1.48.38 1.82.7l1.33-1.3A4.7 4.7 0 008.18 3.14a4.74 4.74 0 00-4.22 2.63l1.5 1.16A2.88 2.88 0 018.18 5.2z" fill="#EB4335"/></svg>
          Google
        </button>
        <button type="button" className="flex-1 inline-flex items-center justify-center gap-2 bg-[#1D1D1F] text-white font-medium text-sm py-2.5 px-4 rounded-[var(--radius-md)] cursor-pointer border-none hover:bg-[#2D2D2F] transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.2 8.43c0-1.5 1.22-2.22 1.28-2.26a2.77 2.77 0 00-2.18-1.18c-.92-.1-1.81.55-2.28.55-.48 0-1.2-.54-1.98-.52a2.91 2.91 0 00-2.46 1.5c-1.06 1.83-.27 4.53.75 6.01.5.73 1.1 1.54 1.88 1.51.76-.03 1.04-.49 1.96-.49.91 0 1.17.49 1.97.47.81-.01 1.33-.73 1.82-1.46a6.2 6.2 0 00.83-1.7 2.54 2.54 0 01-1.55-2.34l.01.01zM10.15 3.88a2.6 2.6 0 00.6-1.88 2.65 2.65 0 00-1.72.89 2.5 2.5 0 00-.62 1.81c.67.05 1.35-.3 1.74-.82z" fill="white"/></svg>
          Apple
        </button>
      </div>

      <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--color-accent)] hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
