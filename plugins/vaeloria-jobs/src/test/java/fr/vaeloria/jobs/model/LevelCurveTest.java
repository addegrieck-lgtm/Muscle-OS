package fr.vaeloria.jobs.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class LevelCurveTest {
    private final LevelCurve curve = new LevelCurve(20, 1.5, 30, 1);

    @Test
    void levelsFollowTheCumulativeCurve() {
        assertEquals(0, curve.levelFor(0));
        assertEquals(20, curve.xpForLevel(1));
        assertEquals(0, curve.levelFor(19.9));
        assertEquals(1, curve.levelFor(20));
        assertEquals(57, curve.xpForLevel(2)); // 20 × 2^1,5 = 56,6
        assertEquals(1, curve.levelFor(76.9));
        assertEquals(2, curve.levelFor(77));
    }

    @Test
    void maxLevelCapsXpAndProgress() {
        double total = curve.totalXpFor(30);
        assertEquals(30, curve.levelFor(total));
        assertEquals(30, curve.levelFor(total * 10));
        assertEquals(total, curve.clamp(total + 500));
        assertEquals(1.0, curve.progress(total));
        assertEquals(0, curve.xpToNext(total));
    }

    @Test
    void defaultCurveTakesAboutFortyThousandXp() {
        double total = curve.totalXpFor(30);
        org.junit.jupiter.api.Assertions.assertTrue(total > 38_000 && total < 44_000, "total = " + total);
    }

    @Test
    void progressInsideALevel() {
        assertEquals(0.5, curve.progress(10), 1e-9);
        assertEquals(10, curve.xpToNext(10), 1e-9);
    }

    @Test
    void pointsPerLevel() {
        assertEquals(30, curve.pointsAt(30));
        assertEquals(60, new LevelCurve(20, 1.5, 30, 2).pointsAt(30));
    }

    @Test
    void rejectsInvalidCurves() {
        assertThrows(IllegalArgumentException.class, () -> new LevelCurve(0, 1, 30, 1));
        assertThrows(IllegalArgumentException.class, () -> new LevelCurve(10, 1, 0, 1));
    }
}
