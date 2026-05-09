import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockWorkouts } from "@/lib/mock-data";
import { formatDuration, formatDate, formatWeight } from "@/lib/utils";
import { Dumbbell, ArrowLeft, Clock, Layers, TrendingUp, Trophy } from "lucide-react";

export const metadata: Metadata = { title: "Workout" };

export default async function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workout = mockWorkouts.find((w) => w.id === id);
  if (!workout) notFound();

  const exerciseMap = new Map<string, typeof workout.sets>();
  for (const set of workout.sets) {
    const name = set.exercise.name;
    if (!exerciseMap.has(name)) exerciseMap.set(name, []);
    exerciseMap.get(name)!.push(set);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/workouts" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to workouts
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--color-accent-muted)] flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-[var(--color-accent)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">{workout.name}</h1>
              <p className="text-sm text-[var(--color-text-muted)]">{formatDate(workout.startedAt)}</p>
            </div>
          </div>
          {workout.prCount > 0 && (
            <Badge variant="yellow" className="text-sm px-3 py-1">
              <Trophy className="w-3.5 h-3.5 mr-1" /> {workout.prCount} PR{workout.prCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <Clock className="w-5 h-5 text-[var(--color-accent)] mx-auto mb-2" />
          <div className="text-xl font-bold text-[var(--color-text)]">{formatDuration(workout.durationSeconds)}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-0.5">Duration</div>
        </Card>
        <Card className="text-center">
          <Layers className="w-5 h-5 text-[var(--color-accent)] mx-auto mb-2" />
          <div className="text-xl font-bold text-[var(--color-text)]">{workout.sets.length}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-0.5">Sets</div>
        </Card>
        <Card className="text-center">
          <TrendingUp className="w-5 h-5 text-[var(--color-accent)] mx-auto mb-2" />
          <div className="text-xl font-bold text-[var(--color-text)]">{formatWeight(workout.totalVolume)}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-0.5">Volume</div>
        </Card>
      </div>

      {/* Exercises */}
      <Card>
        <CardHeader>
          <CardTitle>Exercises</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {Array.from(exerciseMap.entries()).map(([name, sets]) => (
            <div key={name}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-[var(--color-text)]">{name}</h3>
                <div className="flex flex-wrap gap-1">
                  {sets[0].exercise.muscleGroups.map((mg) => (
                    <Badge key={mg} variant="default" className="text-xs">{mg}</Badge>
                  ))}
                </div>
              </div>
              <div className="bg-[var(--color-surface-2)] rounded-[var(--radius-md)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)]">Set</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)]">Weight</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)]">Reps</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)]">Volume</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)]">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sets.map((set, i) => (
                      <tr key={set.id} className={i < sets.length - 1 ? "border-b border-[var(--color-border-subtle)]" : ""}>
                        <td className="px-4 py-3 text-[var(--color-text-muted)]">{set.setNumber}</td>
                        <td className="px-4 py-3 text-[var(--color-text)] font-medium">{set.weight > 0 ? `${set.weight}kg` : "BW"}</td>
                        <td className="px-4 py-3 text-[var(--color-text)]">{set.reps}</td>
                        <td className="px-4 py-3 text-[var(--color-text-muted)]">{set.weight > 0 ? `${set.weight * set.reps}kg` : "-"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={set.setType === "normal" ? "default" : "accent"}>{set.setType}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {workout.notes && (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--color-text-muted)]">{workout.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
