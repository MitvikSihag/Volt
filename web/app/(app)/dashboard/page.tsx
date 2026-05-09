import type { Metadata } from "next";
import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { mockUser, mockWorkouts, mockActivities } from "@/lib/mock-data";
import { formatDuration, formatDistance, formatRelative } from "@/lib/utils";
import { Dumbbell, MapPin, Flame, Trophy, Plus, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const recentWorkouts = mockWorkouts.slice(0, 3);
  const recentActivities = mockActivities.slice(0, 2);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            Good morning, {mockUser.displayName.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            You&apos;ve trained 3 times this week. Keep it up.
          </p>
        </div>
        <Link
          href="/workouts/log"
          className="inline-flex items-center gap-2 bg-[var(--color-accent)] text-white px-4 py-2 rounded-[var(--radius-md)] text-sm font-semibold hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          <Plus className="w-4 h-4" /> Log workout
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Workouts" value={mockUser.workoutsCount} subvalue="all time" icon={<Dumbbell className="w-4 h-4" />} trend={{ value: 12, label: "vs last month" }} />
        <StatCard label="Activities" value={mockUser.activitiesCount} subvalue="all time" icon={<MapPin className="w-4 h-4" />} trend={{ value: 8, label: "vs last month" }} />
        <StatCard label="This week" value="3" subvalue="workouts" icon={<Flame className="w-4 h-4" />} accent />
        <StatCard label="PRs this month" value="5" subvalue="personal records" icon={<Trophy className="w-4 h-4" />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent workouts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Workouts</CardTitle>
            <Link href="/workouts" className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentWorkouts.map((w) => (
              <Link key={w.id} href={`/workouts/${w.id}`}
                className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-accent-muted)] flex items-center justify-center shrink-0">
                    <Dumbbell className="w-4 h-4 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{w.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatDuration(w.durationSeconds)} · {w.sets.length} sets
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {w.prCount > 0 && (
                    <Badge variant="yellow">🏆 {w.prCount} PR{w.prCount > 1 ? "s" : ""}</Badge>
                  )}
                  <span className="text-xs text-[var(--color-text-muted)]">{formatRelative(w.startedAt)}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent activities */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <Link href="/activities" className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentActivities.map((a) => (
              <Link key={a.id} href={`/activities/${a.id}`}
                className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[var(--radius-md)] bg-blue-500/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{a.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatDistance(a.distanceMeters)} · {formatDuration(a.durationSeconds)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="blue">{a.type}</Badge>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{formatRelative(a.startedAt)}</p>
                </div>
              </Link>
            ))}
            <Link href="/activities" className="flex items-center justify-center py-3 border border-dashed border-[var(--color-border)] rounded-[var(--radius-md)] text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors">
              <Plus className="w-4 h-4 mr-1" /> Record activity
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Social snippet */}
      <Card>
        <CardHeader>
          <CardTitle>Community</CardTitle>
          <Link href="/social" className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1">
            Social feed <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {["Kira M.", "Ben T.", "Sara L."].map((name) => (
                <Avatar key={name} name={name} size="sm" className="border-2 border-[var(--color-surface)]" />
              ))}
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              <span className="text-[var(--color-text)] font-medium">3 friends</span> logged workouts today.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
