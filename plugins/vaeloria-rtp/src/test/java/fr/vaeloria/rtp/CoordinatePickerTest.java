package fr.vaeloria.rtp;

import org.junit.jupiter.api.Test;

import java.util.SplittableRandom;

import static org.junit.jupiter.api.Assertions.*;

class CoordinatePickerTest {
    private final SplittableRandom rng = new SplittableRandom(42);

    @Test
    void squareStaysInAnnulus() {
        for (int i = 0; i < 20_000; i++) {
            int[] p = CoordinatePicker.pick(RtpWorld.Shape.SQUARE, 1000, -2000, 500, 5000, rng);
            long d = Math.max(Math.abs(p[0] - 1000L), Math.abs(p[1] + 2000L));
            assertTrue(d >= 499 && d <= 5001, "distance " + d);
        }
    }

    @Test
    void circleStaysInAnnulus() {
        for (int i = 0; i < 20_000; i++) {
            int[] p = CoordinatePicker.pick(RtpWorld.Shape.CIRCLE, 0, 0, 300, 3000, rng);
            double d = Math.hypot(p[0], p[1]);
            assertTrue(d >= 298 && d <= 3002, "distance " + d);
        }
    }

    @Test
    void thinAnnulusIsFast() {
        for (int i = 0; i < 1000; i++) {
            int[] p = CoordinatePicker.pick(RtpWorld.Shape.SQUARE, 0, 0, 9999, 10000, rng);
            long d = Math.max(Math.abs((long) p[0]), Math.abs((long) p[1]));
            assertTrue(d >= 9998 && d <= 10001);
        }
    }

    @Test
    void coversAllFourSides() {
        boolean[] seen = new boolean[4];
        for (int i = 0; i < 2000; i++) {
            int[] p = CoordinatePicker.pick(RtpWorld.Shape.SQUARE, 0, 0, 100, 200, rng);
            if (p[0] >= 100) seen[0] = true;
            if (p[0] <= -100) seen[1] = true;
            if (p[1] >= 100) seen[2] = true;
            if (p[1] <= -100) seen[3] = true;
        }
        for (boolean b : seen) assertTrue(b);
    }
}
