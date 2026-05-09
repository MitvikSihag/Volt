import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { mockFeed } from "@/lib/mock-data";
import { formatDuration, formatDistance, formatRelative } from "@/lib/utils";
import { Dumbbell, MapPin, Heart, Zap } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Social" };

export default function SocialPage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Social Feed</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">What your people are up to</p>
      </div>

      <div className="flex flex-col gap-4">
        {mockFeed.map((item) => (
          <Card key={item.id}>
            {/* User header */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar name={item.user.displayName} src={item.user.avatarUrl} size="md" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[var(--color-text)]">{item.user.displayName}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">@{item.user.username}</span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">{formatRelative(item.createdAt)}</p>
              </div>
              <Badge variant={item.type === "workout" ? "accent" : "blue"}>
                {item.type === "workout" ? <Dumbbell className="w-3 h-3 mr-1" /> : <MapPin className="w-3 h-3 mr-1" />}
                {item.type}
              </Badge>
            </div>

            {/* Workout card */}
            {item.type === "workout" && item.workout && (
              <Link href={`/workouts/${item.workout.id}`} className="block">
                <div className="bg-[var(--color-surface-2)] rounded-[var(--radius-md)] p-4 hover:bg-[var(--color-border)] transition-colors">
                  <p className="font-semibold text-[var(--color-text)] mb-2">{item.workout.name}</p>
                  <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                    <span>{formatDuration(item.workout.durationSeconds)}</span>
                    <span>{item.workout.sets.length} sets</span>
                    <span>{item.workout.totalVolume}kg volume</span>
                    {item.workout.prCount > 0 && <span className="text-yellow-400">🏆 {item.workout.prCount} PR{item.workout.prCount > 1 ? "s" : ""}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Array.from(new Set(item.workout.sets.map((s) => s.exercise.name))).slice(0, 4).map((name) => (
                      <span key={name} className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            )}

            {/* Activity card */}
            {item.type === "activity" && item.activity && (
              <Link href={`/activities/${item.activity.id}`} className="block">
                <div className="bg-[var(--color-surface-2)] rounded-[var(--radius-md)] p-4 hover:bg-[var(--color-border)] transition-colors">
                  <p className="font-semibold text-[var(--color-text)] mb-2">{item.activity.name}</p>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <div className="text-center">
                      <div className="text-base font-bold text-[var(--color-text)]">{formatDistance(item.activity.distanceMeters)}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">Distance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base font-bold text-[var(--color-text)]">{formatDuration(item.activity.durationSeconds)}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base font-bold text-[var(--color-text)]">+{item.activity.elevationGainMeters}m</div>
                      <div className="text-xs text-[var(--color-text-muted)]">Elevation</div>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--color-border)]">
              <button className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">
                <Zap className="w-3.5 h-3.5" />
                Kudos {item.type === "activity" && item.activity?.kudosCount ? `(${item.activity.kudosCount})` : ""}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
