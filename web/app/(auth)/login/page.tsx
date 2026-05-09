"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { authApi } from "@/lib/api";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.login(form);
      setAuth(res.data.token, res.data.user);
      router.push("/dashboard");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  function useMockLogin() {
    const mockUser = {
      id: "u1", username: "voltuser", email: "user@volt.app",
      displayName: "Alex Rider", followersCount: 142, followingCount: 89,
      workoutsCount: 48, activitiesCount: 23,
    };
    setAuth("mock-jwt-token", mockUser);
    router.push("/dashboard");
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] p-8">
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-1">Welcome back</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">Sign in to your Volt account</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          icon={<Mail className="w-4 h-4" />}
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          icon={<Lock className="w-4 h-4" />}
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required
        />
        {error && <p className="text-sm text-[var(--color-red)]">{error}</p>}

        <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
          Sign in
        </Button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-border)]" />
        </div>
        <div className="relative flex justify-center text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] px-2">
          or
        </div>
      </div>

      <Button variant="secondary" size="lg" className="w-full" onClick={useMockLogin}>
        Continue with demo account
      </Button>

      <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
        No account?{" "}
        <Link href="/register" className="text-[var(--color-accent)] hover:underline font-medium">
          Create one
        </Link>
      </p>
    </div>
  );
}
