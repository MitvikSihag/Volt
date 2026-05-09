"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockExercises } from "@/lib/mock-data";
import type { Exercise } from "@/lib/api";
import { formatDuration } from "@/lib/utils";
import { Plus, Trash2, Search, X, Timer, ChevronDown, ChevronUp, Check } from "lucide-react";

interface LoggedSet {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  setNumber: number;
  weight: string;
  reps: string;
  setType: "normal" | "warmup" | "dropset";
  done: boolean;
}

interface ExerciseBlock {
  id: string;
  exercise: Exercise;
  sets: LoggedSet[];
}

export default function LogWorkoutPage() {
  const router = useRouter();
  const [workoutName, setWorkoutName] = useState("Morning Workout");
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (restTimer === null) return;
    if (restTimer <= 0) { setRestTimer(null); return; }
    const id = setTimeout(() => setRestTimer((t) => (t ?? 0) - 1), 1000);
    return () => clearTimeout(id);
  }, [restTimer]);

  const filteredExercises = mockExercises.filter((e) =>
    e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
    e.muscleGroups.some((m) => m.toLowerCase().includes(exerciseSearch.toLowerCase()))
  );

  function addExercise(exercise: Exercise) {
    const blockId = `b${Date.now()}`;
    setBlocks((prev) => [
      ...prev,
      {
        id: blockId,
        exercise,
        sets: [makeSet(exercise, 1)],
      },
    ]);
    setShowExercisePicker(false);
    setExerciseSearch("");
  }

  function makeSet(exercise: Exercise, setNumber: number): LoggedSet {
    return {
      id: `s${Date.now()}-${setNumber}`,
      exerciseId: exercise.id,
      exercise,
      setNumber,
      weight: "",
      reps: "",
      setType: "normal",
      done: false,
    };
  }

  function addSet(blockId: string) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, sets: [...b.sets, makeSet(b.exercise, b.sets.length + 1)] }
          : b
      )
    );
  }

  function removeSet(blockId: string, setId: string) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, sets: b.sets.filter((s) => s.id !== setId).map((s, i) => ({ ...s, setNumber: i + 1 })) }
          : b
      )
    );
  }

  function removeBlock(blockId: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  }

  function updateSet(blockId: string, setId: string, field: "weight" | "reps" | "done" | "setType", value: string | boolean) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, sets: b.sets.map((s) => s.id === setId ? { ...s, [field]: value } : s) }
          : b
      )
    );
    if (field === "done" && value === true) {
      setRestTimer(90);
    }
  }

  function finishWorkout() {
    router.push("/workouts");
  }

  const totalSets = blocks.reduce((acc, b) => acc + b.sets.filter((s) => s.done).length, 0);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-1.5">
            <Timer className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span className="text-sm font-mono font-semibold text-[var(--color-text)]">{formatDuration(elapsed)}</span>
          </div>
          {restTimer !== null && (
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-[var(--radius-md)] px-3 py-1.5">
              <span className="text-xs text-blue-400">Rest</span>
              <span className="text-sm font-mono font-semibold text-blue-400">{formatDuration(restTimer)}</span>
              <button onClick={() => setRestTimer(null)} className="text-blue-400/60 hover:text-blue-400">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push("/workouts")}>
            Discard
          </Button>
          <Button size="sm" onClick={finishWorkout} disabled={totalSets === 0}>
            <Check className="w-3.5 h-3.5" /> Finish ({totalSets} sets)
          </Button>
        </div>
      </div>

      {/* Workout name */}
      <input
        value={workoutName}
        onChange={(e) => setWorkoutName(e.target.value)}
        className="text-2xl font-bold text-[var(--color-text)] bg-transparent border-none outline-none w-full placeholder:text-[var(--color-text-subtle)]"
        placeholder="Workout name"
      />

      {/* Exercise blocks */}
      <div className="flex flex-col gap-4">
        {blocks.map((block) => (
          <div key={block.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
            {/* Block header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <div>
                <span className="font-semibold text-[var(--color-text)]">{block.exercise.name}</span>
                <div className="flex gap-1 mt-0.5">
                  {block.exercise.muscleGroups.map((mg) => (
                    <Badge key={mg} variant="default" className="text-xs">{mg}</Badge>
                  ))}
                </div>
              </div>
              <button
                onClick={() => removeBlock(block.id)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-red)] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Sets table */}
            <div className="px-4 py-3">
              <div className="grid grid-cols-[32px_1fr_1fr_1fr_40px] gap-2 mb-2 px-1">
                <span className="text-xs text-[var(--color-text-muted)]">Set</span>
                <span className="text-xs text-[var(--color-text-muted)]">kg</span>
                <span className="text-xs text-[var(--color-text-muted)]">Reps</span>
                <span className="text-xs text-[var(--color-text-muted)]">Type</span>
                <span />
              </div>

              <div className="flex flex-col gap-2">
                {block.sets.map((set) => (
                  <div
                    key={set.id}
                    className={`grid grid-cols-[32px_1fr_1fr_1fr_40px] gap-2 items-center px-1 py-1.5 rounded-[var(--radius-sm)] transition-colors ${set.done ? "bg-emerald-500/5" : ""}`}
                  >
                    <span className={`text-sm font-medium ${set.done ? "text-[var(--color-green)]" : "text-[var(--color-text-muted)]"}`}>
                      {set.setNumber}
                    </span>
                    <input
                      type="number"
                      placeholder="0"
                      value={set.weight}
                      onChange={(e) => updateSet(block.id, set.id, "weight", e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-accent)] w-full"
                    />
                    <input
                      type="number"
                      placeholder="0"
                      value={set.reps}
                      onChange={(e) => updateSet(block.id, set.id, "reps", e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-[var(--color-text)] text-center focus:outline-none focus:border-[var(--color-accent)] w-full"
                    />
                    <select
                      value={set.setType}
                      onChange={(e) => updateSet(block.id, set.id, "setType", e.target.value)}
                      className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] w-full"
                    >
                      <option value="normal">Normal</option>
                      <option value="warmup">Warmup</option>
                      <option value="dropset">Dropset</option>
                    </select>
                    <button
                      onClick={() => set.done ? updateSet(block.id, set.id, "done", false) : updateSet(block.id, set.id, "done", true)}
                      className={`w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center transition-colors ${set.done ? "bg-[var(--color-green)] text-white" : "bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-green)] hover:text-[var(--color-green)]"}`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addSet(block.id)}
                className="mt-3 w-full py-2 border border-dashed border-[var(--color-border)] rounded-[var(--radius-md)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add set
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add exercise button */}
      <button
        onClick={() => setShowExercisePicker(true)}
        className="w-full py-3.5 border border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)] text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Add exercise
      </button>

      {/* Exercise picker modal */}
      {showExercisePicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <h3 className="font-semibold text-[var(--color-text)]">Add Exercise</h3>
              <button onClick={() => setShowExercisePicker(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-[var(--color-border)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <input
                  autoFocus
                  placeholder="Search exercises..."
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => addExercise(exercise)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--color-surface-2)] transition-colors text-left border-b border-[var(--color-border-subtle)] last:border-0"
                >
                  <div>
                    <span className="text-sm font-medium text-[var(--color-text)]">{exercise.name}</span>
                    <div className="flex gap-1 mt-0.5">
                      {exercise.muscleGroups.map((mg) => (
                        <span key={mg} className="text-xs text-[var(--color-text-muted)]">{mg}</span>
                      ))}
                    </div>
                  </div>
                  <Badge variant="default">{exercise.equipment}</Badge>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
