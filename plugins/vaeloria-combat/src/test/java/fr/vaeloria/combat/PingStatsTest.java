package fr.vaeloria.combat;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PingStatsTest {
    @Test
    void pingStableSansGigue() {
        PingStats s = new PingStats();
        assertEquals(-1, s.ping());
        for (int i = 0; i < 30; i++) s.sample(35);
        assertEquals(35, s.ping());
        assertEquals(0, s.jitter());
    }

    @Test
    void pingQuiOscilleDonneUneGigueElevee() {
        PingStats s = new PingStats();
        for (int i = 0; i < 60; i++) s.sample(i % 2 == 0 ? 30 : 110);
        assertTrue(s.jitter() > 60, "gigue " + s.jitter());
        assertTrue(s.ping() > 50 && s.ping() < 90, "ping " + s.ping());
    }

    @Test
    void ignoreLesValeursInvalides() {
        PingStats s = new PingStats();
        s.sample(-1);
        assertEquals(-1, s.ping());
    }
}
