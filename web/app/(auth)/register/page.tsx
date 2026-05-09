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

      <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--color-accent)] hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
