package fr.vaeloria.tab;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ThresholdsTest {
    @Test
    void pingPlusBasEstMeilleur() {
        Thresholds ping = new Thresholds(80, 180, false, "g", "m", "b");
        assertEquals("g", ping.color(20));
        assertEquals("m", ping.color(80));
        assertEquals("b", ping.color(180));
    }

    @Test
    void tpsPlusHautEstMeilleur() {
        Thresholds tps = new Thresholds(19, 16, true, "g", "m", "b");
        assertEquals("g", tps.color(20));
        assertEquals("m", tps.color(17.5));
        assertEquals("b", tps.color(12));
    }
}
