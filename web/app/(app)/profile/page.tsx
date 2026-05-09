import type { Metadata } from "next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/ui/stat-card";
import { mockUser, mockWorkouts, mockActivities } from "@/lib/mock-data";
import { formatDate, formatDuration, formatDistance, formatRelative } from "@/lib/utils";
import { Dumbbell, MapPin, Users, TrendingUp } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Profile header */}
      <Card>
        <div className="flex items-start gap-5">
          <Avatar name={mockUser.displayName} src={mockUser.avatarUrl} size="xl" />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-[var(--color-text)]">{mockUser.displayName}</h1>
                <p className="text-sm text-[var(--color-text-muted)]">@{mockUser.username}</p>
              </div>
              <Link href="/settings" className="text-sm px-3 py-1.5 border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors">
                Edit profile
              </Link>
            </div>
            {mockUser.bio && (
              <p className="text-sm text-[var(--color-text-muted)] mt-2">{mockUser.bio}</p>
            )}
            <div className="flex items-center gap-5 mt-3">
              <div className="text-center">
                <div className="text-base font-bold text-[var(--color-text)]">{mockUser.followersCount}</div>
                <div className="text-xs text-[var(--color-text-muted)]">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-[var(--color-text)]">{mockUser.followingCount}</div>
                <div className="text-xs text-[var(--color-text-muted)]">Following</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Workouts" value={mockUser.workoutsCount} icon={<Dumbbell className="w-4 h-4" />} />
        <StatCard label="Activities" value={mockUser.activitiesCount} icon={<MapPin className="w-4 h-4" />} />
        <StatCard label="Followers" value={mockUser.followersCount} icon={<Users className="w-4 h-4" />} />
        <StatCard label="PRs" value="12" icon={<TrendingUp className="w-4 h-4" />} />
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader><CardTitle>Recent Workouts</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {mockWorkouts.map((w) => (
            <Link key={w.id} href={`/workouts/${w.id}`}
              className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Dumbbell className="w-4 h-4 text-[var(--color-accent)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{w.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{formatDuration(w.durationSeconds)} · {w.sets.length} sets</p>
                </div>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">{formatRelative(w.startedAt)}</span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Activities</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {mockActivities.map((a) => (
            <Link key={a.id} href={`/activities/${a.id}`}
              className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{a.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{formatDistance(a.distanceMeters)} · {formatDuration(a.durationSeconds)}</p>
                </div>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">{formatRelative(a.startedAt)}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
