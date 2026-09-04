"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ExerciseCard, type SetData } from "@/components/workout/ExerciseCard";
import { PRBanner } from "@/components/workout/PRBanner";
import { RestTimer } from "@/components/workout/RestTimer";
import type { SetType } from "@/components/workout/SetTypeChip";
import type { CheckState } from "@/components/workout/SetRow";
import { ChevronLeft, MoreVertical, Plus, Trash2, Medal } from "lucide-react";

interface ExerciseState {
  id: string;
  name: string;
  muscleGroup: string;
  lastSession?: string;
  lastWeight: number;
  lastReps: number;
  sets: SetData[];
}

const SET_TYPE_CYCLE: SetType[] = ["NORMAL", "WARMUP", "DROP_SET", "FAILURE", "SUPERSET"];

const initialExercises: ExerciseState[] = [
  {
    id: "e1", name: "Bench Press (Barbell)", muscleGroup: "Chest · Barbell",
    lastSession: "Last: 100kg × 5 — May 8", lastWeight: 100, lastReps: 5,
    sets: [
      { id: "s1-1", type: "WARMUP", weight: "60", reps: "10", checkState: "done", ghostWeight: "60", ghostReps: "10" },
      { id: "s1-2", type: "NORMAL", weight: "100", reps: "5", checkState: "done", ghostWeight: "100", ghostReps: "5" },
      { id: "s1-3", type: "NORMAL", weight: "105", reps: "5", checkState: "pr", ghostWeight: "100", ghostReps: "5" },
      { id: "s1-4", type: "NORMAL", weight: "", reps: "", checkState: "empty", ghostWeight: "100", ghostReps: "5" },
    ],
  },
  {
    id: "e2", name: "Overhead Press (Barbell)", muscleGroup: "Shoulders · Barbell",
    lastSession: "Last: 60kg × 6 — May 8", lastWeight: 60, lastReps: 6,
    sets: [
      { id: "s2-1", type: "WARMUP", weight: "40", reps: "8", checkState: "done", ghostWeight: "40", ghostReps: "8" },
      { id: "s2-2", type: "NORMAL", weight: "60", reps: "6", checkState: "done", ghostWeight: "60", ghostReps: "6" },
      { id: "s2-3", type: "NORMAL", weight: "", reps: "", checkState: "empty", ghostWeight: "60", ghostReps: "6" },
      { id: "s2-4", type: "NORMAL", weight: "", reps: "", checkState: "empty", ghostWeight: "60", ghostReps: "6" },
    ],
  },
  {
    id: "e3", name: "Incline Dumbbell Press", muscleGroup: "Chest · Dumbbell",
    lastSession: "Last: 36kg × 8 — May 8", lastWeight: 36, lastReps: 8,
    sets: [
      { id: "s3-1", type: "NORMAL", weight: "", reps: "", checkState: "empty", ghostWeight: "36", ghostReps: "8" },
      { id: "s3-2", type: "NORMAL", weight: "", reps: "", checkState: "empty", ghostWeight: "36", ghostReps: "8" },
      { id: "s3-3", type: "DROP_SET", weight: "", reps: "", checkState: "empty", ghostWeight: "28", ghostReps: "10" },
    ],
  },
];

export default function LogWorkoutPage() {
  const router = useRouter();
  const [workoutTitle, setWorkoutTitle] = useState("Push Day A");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [exercises, setExercises] = useState<ExerciseState[]>(initialExercises);
  const [restTimer, setRestTimer] = useState<{ visible: boolean; seconds: number } | null>(null);
  const [prBanner, setPrBanner] = useState<{ exerciseName: string; prType: string; value: string } | null>(null);
  const [showKebab, setShowKebab] = useState(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startTime.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  function handleSetCheck(exerciseId: string, setId: string) {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => {
            if (s.id !== setId) return s;
            const next: CheckState =
              s.checkState === "empty" ? "done" : s.checkState === "done" ? "pr" : "empty";

            if (next === "done") {
              setRestTimer({ visible: true, seconds: 90 });
            }

            if (next === "pr") {
              const w = parseFloat(s.weight) || parseFloat(s.ghostWeight || "0");
              const r = parseInt(s.reps) || parseInt(s.ghostReps || "0");
              if (w > ex.lastWeight || (w === ex.lastWeight && r > ex.lastReps)) {
                setPrBanner({
                  exerciseName: ex.name.split(" (")[0],
                  prType: "New PR",
                  value: `${w} kg × ${r}`,
                });
              }
            }

            return { ...s, checkState: next };
          }),
        };
      })
    );
  }

  function handleSetChange(exerciseId: string, setId: string, field: "reps" | "weight", value: string) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exerciseId ? ex : {
          ...ex,
          sets: ex.sets.map((s) => s.id !== setId ? s : { ...s, [field]: value }),
        }
      )
    );
  }

  function handleSetTypeChange(exerciseId: string, setId: string) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exerciseId ? ex : {
          ...ex,
          sets: ex.sets.map((s) => {
            if (s.id !== setId) return s;
            const idx = SET_TYPE_CYCLE.indexOf(s.type);
            return { ...s, type: SET_TYPE_CYCLE[(idx + 1) % SET_TYPE_CYCLE.length] };
          }),
        }
      )
    );
  }

  function handleAddSet(exerciseId: string) {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const n = ex.sets.length + 1;
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              id: `${ex.id}-s${n}-${Date.now()}`,
              type: "NORMAL" as SetType,
              weight: "",
              reps: "",
              checkState: "empty" as CheckState,
              ghostWeight: String(ex.lastWeight),
              ghostReps: String(ex.lastReps),
            },
          ],
        };
      })
    );
  }

  function handleRemoveExercise(exerciseId: string) {
    setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
  }

  const totalVolume = exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets
        .filter((s) => s.checkState !== "empty")
        .reduce((acc, s) => acc + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0),
    0
  );
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const completedSets = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.checkState !== "empty").length, 0
  );
  const totalPRs = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.checkState === "pr").length, 0
  );

  const dismissPr = useCallback(() => setPrBanner(null), []);
  const dismissRest = useCallback(() => setRestTimer(null), []);

  return (
    <div className="flex flex-col min-h-screen -mx-6 -mt-6 lg:-mx-8 lg:-mt-8">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-[rgba(9,9,14,0.92)] backdrop-blur-[16px] border-b border-[var(--color-border)] px-6 py-3.5 flex items-center gap-3">
        <button
          onClick={() => router.push("/workouts")}
          className="p-1.5 rounded-[8px] text-[var(--color-text-dim)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text)] transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <input
          value={workoutTitle}
          onChange={(e) => setWorkoutTitle(e.target.value)}
          spellCheck={false}
          className="font-[family-name:var(--font-display)] text-[19px] font-bold text-[var(--color-text)] bg-transparent border-none outline-none flex-1 min-w-0 px-2 py-1 rounded-[6px] tracking-[-0.3px] hover:bg-[var(--color-elevated)] focus:bg-[var(--color-elevated)] focus:ring-1 focus:ring-[var(--color-accent)]"
        />

        <div className="font-[family-name:var(--font-mono)] text-sm font-semibold text-[var(--color-accent)] whitespace-nowrap px-3 py-1.5 bg-[var(--color-accent-muted)] border border-[rgba(6,182,212,0.3)] rounded-[8px]">
          {fmt(elapsedSeconds)}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowKebab(!showKebab)}
            className="p-1.5 rounded-[8px] text-[var(--color-text-dim)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text)] transition-all"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {showKebab && (
            <div className="absolute top-full right-0 mt-1 bg-[var(--color-elevated)] border border-[var(--color-border)] rounded-[10px] p-1 min-w-[180px] z-60 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
              <button
                onClick={() => { setShowKebab(false); router.push("/workouts"); }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-[6px] text-[13px] text-[var(--color-red)] hover:bg-[rgba(239,68,68,0.1)] w-full text-left transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Discard workout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Exercise List */}
      <div className="flex-1 px-6 py-4 flex flex-col gap-4 max-w-[680px] w-full pb-[120px]">
        {exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            name={ex.name}
            muscleGroup={ex.muscleGroup}
            lastSession={ex.lastSession}
            sets={ex.sets}
            onSetCheck={(setId) => handleSetCheck(ex.id, setId)}
            onSetChange={(setId, field, value) => handleSetChange(ex.id, setId, field, value)}
            onSetTypeChange={(setId) => handleSetTypeChange(ex.id, setId)}
            onAddSet={() => handleAddSet(ex.id)}
            onRemove={() => handleRemoveExercise(ex.id)}
          />
        ))}

        <button className="flex items-center justify-center gap-2 w-full py-3.5 bg-[var(--color-card)] border border-dashed border-[var(--color-border)] rounded-[12px] text-sm font-medium text-[var(--color-accent)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] transition-all">
          <Plus className="w-[18px] h-[18px]" /> Add exercise
        </button>
      </div>

      {/* Finish Bar */}
      <div className="fixed bottom-0 left-0 md:left-[220px] right-0 px-6 py-4 bg-[rgba(9,9,14,0.95)] backdrop-blur-[12px] border-t border-[var(--color-border)] z-30 flex gap-3 items-center">
        <div className="flex-1 flex gap-5">
          <div>
            <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.06em]">Duration</div>
            <div className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-text)] font-medium mt-0.5">{fmt(elapsedSeconds)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.06em]">Volume</div>
            <div className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-text)] font-medium mt-0.5">{totalVolume.toLocaleString()} kg</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.06em]">Sets</div>
            <div className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-text)] font-medium mt-0.5">{completedSets} / {totalSets}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.06em]">PRs</div>
            <div className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-accent)] font-medium mt-0.5 flex items-center gap-1">
              {totalPRs > 0 && <Medal className="w-3 h-3" />}
              {totalPRs}
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push("/workouts")}
          className="font-semibold text-sm text-[var(--color-bg)] bg-[var(--color-accent)] border-none px-7 py-3 rounded-[10px] hover:opacity-[0.92] hover:-translate-y-px transition-all"
        >
          Finish Workout
        </button>
      </div>

      {/* PR Banner */}
      {prBanner && (
        <PRBanner
          exerciseName={prBanner.exerciseName}
          prType={prBanner.prType}
          value={prBanner.value}
          onDismiss={dismissPr}
        />
      )}

      {/* Rest Timer */}
      {restTimer?.visible && (
        <RestTimer
          initialSeconds={restTimer.seconds}
          onComplete={dismissRest}
          onDismiss={dismissRest}
        />
      )}
    </div>
  );
}
