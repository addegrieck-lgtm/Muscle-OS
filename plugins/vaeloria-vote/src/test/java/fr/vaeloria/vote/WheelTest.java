package fr.vaeloria.vote;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class WheelTest {
    final Wheel classic = new Wheel(List.of(new Wheel.Slice(1, 50), new Wheel.Slice(2, 35), new Wheel.Slice(3, 15)));
    final Wheel risky = new Wheel(List.of(new Wheel.Slice(4, 40), new Wheel.Slice(0, 60)));

    @Test
    void tirageSelonLesPoids() {
        assertEquals(1, classic.pick(0.0));
        assertEquals(1, classic.pick(0.4999));
        assertEquals(2, classic.pick(0.50));
        assertEquals(2, classic.pick(0.8499));
        assertEquals(3, classic.pick(0.85));
        assertEquals(3, classic.pick(0.99999));
        assertEquals(4, risky.pick(0.39));
        assertEquals(0, risky.pick(0.40));
    }

    @Test
    void moyennesDesRouesParDefaut() {
        assertEquals(1.65, classic.expected(), 1e-9);
        assertEquals(1.60, risky.expected(), 1e-9);
        assertEquals(40.0, risky.percent(risky.slices().get(0)), 1e-9);
    }

    @Test
    void rouesInvalidesRefusees() {
        assertThrows(IllegalArgumentException.class, () -> new Wheel(List.of()));
        assertThrows(IllegalArgumentException.class, () -> new Wheel.Slice(2, 0));
        assertThrows(IllegalArgumentException.class, () -> new Wheel.Slice(-1, 10));
    }

    @Test
    void recompenseMultiplieeEtAdditionnee() {
        Reward r = new Reward(300, Map.of("cooked_beef", 8));
        assertEquals(new Reward(900, Map.of("COOKED_BEEF", 24)), r.times(3));
        assertEquals(Reward.NONE, r.times(0));
        assertEquals(new Reward(600.5, Map.of("COOKED_BEEF", 8, "GOLDEN_APPLE", 1)),
                r.plus(new Reward(300.499, Map.of("GOLDEN_APPLE", 1))));
    }
}
