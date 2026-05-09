import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockExercises } from "@/lib/mock-data";
import { Dumbbell, Plus } from "lucide-react";

export const metadata: Metadata = { title: "Exercises" };

const muscleGroupColors: Record<string, "accent" | "blue" | "green" | "yellow" | "red"> = {
  Quads: "blue", Glutes: "accent", Hamstrings: "green", Back: "blue",
  Chest: "accent", Shoulders: "yellow", Triceps: "accent", Biceps: "blue",
};

const equipmentColors: Record<string, "default" | "green" | "blue" | "yellow"> = {
  Barbell: "default", Dumbbell: "blue", Machine: "yellow", Cable: "green", Bodyweight: "accent" as unknown as "green",
};

export default function ExercisesPage() {
  const grouped = mockExercises.reduce<Record<string, typeof mockExercises>>((acc, ex) => {
    const primary = ex.muscleGroups[0];
    acc[primary] = [...(acc[primary] ?? []), ex];
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Exercise Library</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{mockExercises.length} exercises</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-[var(--color-accent)] text-white px-4 py-2 rounded-[var(--radius-md)] text-sm font-semibold hover:bg-[var(--color-accent-hover)] transition-colors">
          <Plus className="w-4 h-4" /> Custom exercise
        </button>
      </div>

      {Object.entries(grouped).map(([group, exercises]) => (
        <div key={group}>
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">{group}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {exercises.map((ex) => (
              <Card key={ex.id} className="hover:border-[var(--color-accent)]/30 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-accent-muted)] flex items-center justify-center shrink-0">
                    <Dumbbell className="w-4 h-4 text-[var(--color-accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--color-text)] text-sm">{ex.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ex.muscleGroups.map((mg) => (
                        <Badge key={mg} variant={muscleGroupColors[mg] ?? "default"} className="text-xs">{mg}</Badge>
                      ))}
                      <Badge variant="default" className="text-xs">{ex.equipment}</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
