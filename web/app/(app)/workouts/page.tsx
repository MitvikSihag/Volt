import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockWorkouts } from "@/lib/mock-data";
import { formatDuration, formatRelative, formatWeight } from "@/lib/utils";
import { Dumbbell, Plus, Trophy, TrendingUp, Clock, Layers } from "lucide-react";

export const metadata: Metadata = { title: "Workouts" };

const typeColors: Record<string, "accent" | "blue" | "green"> = {
  normal: "accent",
  warmup: "blue",
  dropset: "green",
};

function getExerciseSummary(workout: (typeof mockWorkouts)[0]) {
  const exerciseMap = new Map<string, { name: string; sets: number; maxWeight: number }>();
  for (const set of workout.sets) {
    const name = set.exercise.name;
    const existing = exerciseMap.get(name) ?? { name, sets: 0, maxWeight: 0 };
    exerciseMap.set(name, { name, sets: existing.sets + 1, maxWeight: Math.max(existing.maxWeight, set.weight) });
  }
  return Array.from(exerciseMap.values());
}

export default function WorkoutsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Workouts</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{mockWorkouts.length} sessions logged</p>
        </div>
        <Link
          href="/workouts/log"
          className="inline-flex items-center gap-2 bg-[var(--color-accent)] text-white px-4 py-2 rounded-[var(--radius-md)] text-sm font-semibold hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          <Plus className="w-4 h-4" /> New workout
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {mockWorkouts.map((workout) => {
          const exercises = getExerciseSummary(workout);
          return (
            <Link key={workout.id} href={`/workouts/${workout.id}`}>
              <Card className="hover:border-[var(--color-accent)]/40 transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent-muted)] flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-[var(--color-text)]">{workout.name}</h2>
                      <p className="text-xs text-[var(--color-text-muted)]">{formatRelative(workout.startedAt)}</p>
                    </div>
                  </div>
                  {workout.prCount > 0 && (
                    <Badge variant="yellow"><Trophy className="w-3 h-3 mr-1" />{workout.prCount} PR{workout.prCount > 1 ? "s" : ""}</Badge>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-5 mb-4">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(workout.durationSeconds)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                    <Layers className="w-3.5 h-3.5" />
                    {workout.sets.length} sets
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {formatWeight(workout.totalVolume)} total
                  </div>
                </div>

                {/* Exercise chips */}
                <div className="flex flex-wrap gap-2">
                  {exercises.map(({ name, sets }) => (
                    <span key={name} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                      <span className="text-[var(--color-text)]">{name}</span>
                      <span>{sets} sets</span>
                    </span>
                  ))}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
