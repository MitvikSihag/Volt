import type { Metadata } from "next";
import Link from "next/link";
import { Medal, ArrowRight, Zap } from "lucide-react";
import { TrainingChart } from "@/components/workout/TrainingChart";

export const metadata: Metadata = { title: "Dashboard" };

const calendarDays = [
  { label: "Mon", num: "5", type: "lift" as const },
  { label: "Tue", num: "6", type: "cardio" as const },
  { label: "Wed", num: "7", type: "both" as const },
  { label: "Thu", num: "8", type: "lift" as const },
  { label: "Fri", num: "9", type: "rest" as const },
  { label: "Sat", num: "10", type: "lift" as const },
  { label: "Sun", num: "11", type: "rest" as const, today: true },
];

const recentPRs = [
  { exercise: "Bench Press", value: "105 kg × 5", type: "Best set volume", date: "May 10" },
  { exercise: "Squat", value: "140 kg × 1", type: "1RM", date: "May 8" },
  { exercise: "Deadlift", value: "180 kg × 3", type: "Heaviest weight", date: "May 5" },
];

const socialItems = [
  { initials: "SP", name: "Sarah P.", desc: "Morning run — 8.2 km in 42:15", time: "2h ago", avatarClass: "bg-[var(--color-purple)] text-white border-[var(--color-purple)]" },
  { initials: "JR", name: "Jake R.", desc: "Pull Day — 14,200 kg total volume, 2 PRs", time: "5h ago", avatarClass: "bg-[var(--color-accent)] text-[var(--color-bg)] border-[var(--color-accent)]" },
  { initials: "LM", name: "Lisa M.", desc: "Evening ride — 24.6 km, 320m elevation", time: "8h ago", avatarClass: "bg-[#14b8a6] text-[var(--color-bg)] border-[#14b8a6]" },
];

function CalDot({ type }: { type: "lift" | "cardio" | "both" | "rest" }) {
  if (type === "lift") return <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />;
  if (type === "cardio") return <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-blue)]" />;
  if (type === "both")
    return (
      <span className="flex gap-0.5">
        <span className="w-[5px] h-[5px] rounded-full bg-[var(--color-accent)]" />
        <span className="w-[5px] h-[5px] rounded-full bg-[var(--color-blue)]" />
      </span>
    );
  return <span className="w-1.5 h-1.5 rounded-full bg-transparent" />;
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[920px]">
      {/* 1. Greeting + streak */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-[22px] font-bold tracking-[-0.4px] text-[var(--color-text)]">
          Good morning, Mike
        </h1>
        <div className="inline-flex items-center gap-1.5 bg-[var(--color-accent-muted)] border border-[rgba(6,182,212,0.3)] text-[var(--color-accent)] text-xs font-semibold px-3 py-[5px] rounded-full">
          <Zap className="w-3.5 h-3.5" />
          12-day streak
        </div>
      </div>

      {/* 2. Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Volume" value="24,680" unit="kg" sub={<><span className="text-[var(--color-green)]">&uarr; 8%</span> vs last week</>} />
        <StatCard label="Workouts" value="4" unit="/ 5" sub="weekly goal" />
        <StatCard label="Distance" value="18.4" unit="km" sub={<><span className="text-[var(--color-red)]">&darr; 3%</span> vs last week</>} />
        <StatCard label="Active days" value="5" sub="this week" />
      </div>

      {/* 3. Calendar strip */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {calendarDays.map((d) => (
          <div
            key={d.label}
            className={`flex flex-col items-center gap-1 px-2.5 py-2 rounded-[10px] min-w-[48px] ${d.today ? "bg-[var(--color-elevated)] border border-[var(--color-border)]" : "hover:bg-[var(--color-elevated)]"} transition-colors cursor-pointer`}
          >
            <span className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-[0.04em]">{d.label}</span>
            <span className="font-[family-name:var(--font-mono)] text-sm font-semibold text-[var(--color-text)]">{d.num}</span>
            <CalDot type={d.type} />
          </div>
        ))}
      </div>

      {/* 4. Active routine */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[14px] p-5 flex items-center justify-between gap-4 max-md:flex-col max-md:items-stretch max-md:text-center">
        <div className="flex-1">
          <div className="font-[family-name:var(--font-mono)] text-[10px] font-medium text-[var(--color-accent)] uppercase tracking-[0.15em] mb-1">Today&apos;s routine</div>
          <div className="font-[family-name:var(--font-display)] text-[17px] font-bold tracking-[-0.3px] text-[var(--color-text)] mb-1">Push Day A</div>
          <div className="flex gap-1.5 flex-wrap mt-1 max-md:justify-center">
            <span className="text-[11px] py-0.5 px-2 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] border border-[rgba(6,182,212,0.2)]">Chest</span>
            <span className="text-[11px] py-0.5 px-2 rounded-full bg-[var(--color-elevated)] text-[var(--color-text-dim)] border border-[var(--color-border)]">Shoulders</span>
            <span className="text-[11px] py-0.5 px-2 rounded-full bg-[var(--color-elevated)] text-[var(--color-text-dim)] border border-[var(--color-border)]">Triceps</span>
            <span className="text-[11px] text-[var(--color-text-muted)] self-center">&middot; 5 exercises</span>
          </div>
        </div>
        <Link
          href="/workouts/log"
          className="font-semibold text-[13px] text-[var(--color-bg)] bg-[var(--color-accent)] px-[22px] py-[11px] rounded-[8px] hover:opacity-[0.92] hover:-translate-y-px transition-all no-underline whitespace-nowrap max-md:w-full max-md:text-center"
        >
          Start workout
        </Link>
      </div>

      {/* 5. 14-day chart */}
      <TrainingChart />

      {/* 6. Recent PRs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="font-[family-name:var(--font-display)] text-[15px] font-bold tracking-[-0.2px] text-[var(--color-text)]">Recent PRs</div>
          <Link href="/progress" className="text-xs text-[var(--color-accent)] no-underline hover:opacity-80 transition-opacity">View all &rarr;</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {recentPRs.map((pr) => (
            <div key={pr.exercise} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[12px] py-3.5 px-4 min-w-[200px] shrink-0">
              <div className="w-7 h-7 bg-[var(--color-accent-muted)] border border-[rgba(6,182,212,0.3)] rounded-[8px] flex items-center justify-center mb-2.5">
                <Medal className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              </div>
              <div className="text-xs text-[var(--color-text-dim)] mb-1">{pr.exercise}</div>
              <div className="font-[family-name:var(--font-display)] text-[18px] font-extrabold text-[var(--color-accent)] tracking-[-0.3px]">{pr.value}</div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.1em] mt-0.5">{pr.type}</div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-text-muted)] mt-1.5">{pr.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Social snippet */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[14px] p-5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="font-[family-name:var(--font-display)] text-[15px] font-bold tracking-[-0.2px] text-[var(--color-text)]">Friends&apos; activity</div>
          <Link href="/social" className="text-xs text-[var(--color-accent)] no-underline hover:opacity-80 transition-opacity">Feed &rarr;</Link>
        </div>
        <div className="flex flex-col gap-3">
          {socialItems.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <div className={`w-[34px] h-[34px] rounded-full border flex items-center justify-center text-xs font-semibold shrink-0 ${item.avatarClass}`}>
                {item.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[var(--color-text)]">{item.name}</div>
                <div className="text-xs text-[var(--color-text-muted)] truncate">{item.desc}</div>
              </div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">{item.time}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2.5 mt-3.5 pt-3 border-t border-[var(--color-border)]">
          <div className="flex">
            {[{ bg: "var(--color-purple)", c: "#fff", t: "SP" }, { bg: "var(--color-accent)", c: "var(--color-bg)", t: "JR" }, { bg: "var(--color-elevated)", c: "var(--color-text-dim)", t: "+9" }].map((a, i) => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-[var(--color-card)] -mr-1.5 flex items-center justify-center text-[9px] font-semibold" style={{ background: a.bg, color: a.c, zIndex: 3 - i }}>
                {a.t}
              </div>
            ))}
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">12 friends active this week</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[12px] p-4">
      <div className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-[0.06em] mb-1.5">{label}</div>
      <div className="font-[family-name:var(--font-display)] text-[26px] font-extrabold leading-none tracking-[-0.5px] text-[var(--color-text)]">
        {value}
        {unit && <span className="font-[family-name:var(--font-mono)] text-xs font-medium text-[var(--color-text-dim)] ml-[3px]">{unit}</span>}
      </div>
      <div className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text-muted)] mt-1">{sub}</div>
    </div>
  );
}
