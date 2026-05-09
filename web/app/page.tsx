import Link from "next/link";
import { Zap, Dumbbell, MapPin, BarChart3, Users, ArrowRight, CheckCircle } from "lucide-react";

const features = [
  {
    icon: Dumbbell,
    title: "Strength Logging",
    desc: "Log every set, rep, and weight. Track PRs and watch your lifts climb week over week.",
  },
  {
    icon: MapPin,
    title: "GPS Activity Tracking",
    desc: "Record runs, rides, and hikes. See your route on a map with splits and elevation.",
  },
  {
    icon: BarChart3,
    title: "Progress Analytics",
    desc: "Volume trends, strength curves, and training load — visualised across any timeframe.",
  },
  {
    icon: Users,
    title: "Social Feed",
    desc: "Follow athletes, give kudos, and stay motivated together.",
  },
];

const bullets = [
  "One app for all your training",
  "No subscription required",
  "Your data, exported anytime",
  "Works offline",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-[var(--color-text)]">Volt</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium bg-[var(--color-accent)] text-white px-4 py-2 rounded-[var(--radius-md)] hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[400px] rounded-full bg-[var(--color-accent)] opacity-[0.04] blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-accent-muted)] border border-[var(--color-accent)]/20 text-xs font-medium text-[var(--color-accent)] mb-6">
            <Zap className="w-3 h-3" />
            Strava + Hevy, combined
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-[var(--color-text)] leading-[1.08] tracking-tight mb-6">
            Train harder.<br />
            <span className="text-[var(--color-accent)]">Track everything.</span>
          </h1>
          <p className="text-lg text-[var(--color-text-muted)] max-w-xl mx-auto mb-10 leading-relaxed">
            Volt is the only app you need for your fitness. Log strength workouts,
            record GPS runs and rides, and watch your progress compound.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-[var(--color-accent)] text-white px-6 py-3 rounded-[var(--radius-md)] font-semibold text-base hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Start for free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text)] px-6 py-3 rounded-[var(--radius-md)] font-semibold text-base hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-5xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-[var(--color-text)] text-center mb-10">
          Everything you need. Nothing you don&apos;t.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 hover:border-[var(--color-accent)]/40 transition-colors"
            >
              <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-accent-muted)] flex items-center justify-center mb-3">
                <Icon className="w-4.5 h-4.5 text-[var(--color-accent)]" />
              </div>
              <h3 className="font-semibold text-[var(--color-text)] mb-1.5">{title}</h3>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bullets CTA */}
      <section className="px-6 py-16 border-t border-[var(--color-border)]">
        <div className="max-w-xl mx-auto text-center">
          <ul className="flex flex-col sm:flex-row flex-wrap justify-center gap-x-8 gap-y-3 mb-10">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <CheckCircle className="w-4 h-4 text-[var(--color-green)] shrink-0" />
                {b}
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-[var(--color-accent)] text-white px-8 py-3.5 rounded-[var(--radius-md)] font-semibold hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Create your account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] px-6 py-6 text-center">
        <p className="text-xs text-[var(--color-text-muted)]">
          © 2026 Volt Fitness. Built with ⚡
        </p>
      </footer>
    </div>
  );
}
