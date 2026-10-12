package fr.vaeloria.villageois.model;

import org.junit.jupiter.api.Test;

import java.util.SplittableRandom;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WearTest {
    @Test
    void uneQuinzaineEnMoyenne() {
        Wear w = new Wear(true, 12, 18);
        SplittableRandom rnd = new SplittableRandom(1);
        long sum = 0;
        int n = 100_000, min = Integer.MAX_VALUE, max = 0;
        for (int i = 0; i < n; i++) {
            int l = w.drawLimit(rnd);
            sum += l;
            min = Math.min(min, l);
            max = Math.max(max, l);
        }
        assertEquals(15.0, sum / (double) n, 0.05);
        assertEquals(12, min);
        assertEquals(18, max);
    }

    @Test
    void epuiseALaLimite() {
        Wear w = new Wear(true, 12, 18);
        assertFalse(w.exhausted(14, 15));
        assertTrue(w.exhausted(15, 15));
        assertFalse(new Wear(false, 12, 18).exhausted(99, 15));
    }

    @Test
    void bornesInversees() {
        assertEquals(new Wear(true, 15, 15), new Wear(true, 15, 3));
    }
}
