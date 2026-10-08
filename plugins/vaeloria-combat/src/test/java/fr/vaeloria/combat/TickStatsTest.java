package fr.vaeloria.combat;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TickStatsTest {
    @Test
    void agregatsSurLaFenetreGlissante() {
        TickStats t = new TickStats(4);
        assertEquals(0, t.average());
        t.add(10);
        t.add(20);
        assertEquals(15, t.average(), 1e-9);
        t.add(30);
        t.add(40);
        t.add(100); // remplace 10
        assertEquals(4, t.size());
        assertEquals(47.5, t.average(), 1e-9);
        assertEquals(100, t.max(), 1e-9);
    }

    @Test
    void percentile() {
        TickStats t = new TickStats(100);
        for (int i = 1; i <= 100; i++) t.add(i);
        assertEquals(95, t.percentile(95), 1e-9);
        assertEquals(50, t.percentile(50), 1e-9);
        assertEquals(100, t.percentile(100), 1e-9);
    }
}
