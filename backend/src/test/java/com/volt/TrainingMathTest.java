package com.volt;

import com.volt.load.TrainingMath;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TrainingMathTest {

    @Test
    void epleyMatchesSpec() {
        assertEquals(105.0, TrainingMath.epleyOneRepMax(90, 5), 1e-9);
    }

    @Test
    void epleySingleUsesRawFormula() {
        // Raw Epley overestimates a true single by 1/30; this matches existing PR behavior.
        // Special-casing reps==1 -> weight is a rating-engine decision (RATINGS.md), not ours.
        assertEquals(100 * (1 + 1 / 30.0), TrainingMath.epleyOneRepMax(100, 1), 1e-9);
    }

    @Test
    void volumeNullSafe() {
        assertEquals(0.0, TrainingMath.setVolumeKg(null, 100.0));
        assertEquals(0.0, TrainingMath.setVolumeKg(5, null));
        assertEquals(500.0, TrainingMath.setVolumeKg(5, 100.0));
    }
}
