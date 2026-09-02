package com.volt.load;

/**
 * Single source of truth for training-load math. The rating engine (RATINGS.md) and every
 * user-facing surface must agree on these numbers — never inline these formulas elsewhere.
 */
public final class TrainingMath {

    private TrainingMath() {}

    /** Epley estimated 1RM. Meaningful for 1..10 reps (callers filter). */
    public static double epleyOneRepMax(double weightKg, int reps) {
        return weightKg * (1 + reps / 30.0);
    }

    /** Null-safe set volume; 0 when reps or weight is missing. */
    public static double setVolumeKg(Integer reps, Double weightKg) {
        return (reps == null || weightKg == null) ? 0.0 : reps * weightKg;
    }
}
