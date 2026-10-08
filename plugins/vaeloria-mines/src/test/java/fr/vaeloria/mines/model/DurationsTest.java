package fr.vaeloria.mines.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DurationsTest {
    @Test
    void saisies() {
        assertEquals(900, Durations.parse("15"));
        assertEquals(900, Durations.parse("15m"));
        assertEquals(900, Durations.parse("15 min"));
        assertEquals(5400, Durations.parse("1h30"));
        assertEquals(5400, Durations.parse("1h 30m"));
        assertEquals(90, Durations.parse("90s"));
        assertEquals(3665, Durations.parse("1h1m5s"));
        assertEquals(86400, Durations.parse("1j"));
    }

    @Test
    void saisiesRefusees() {
        assertEquals(-1, Durations.parse(""));
        assertEquals(-1, Durations.parse("abc"));
        assertEquals(-1, Durations.parse("5s"));      // moins de 10 s
        assertEquals(-1, Durations.parse("8j"));      // plus de 7 jours
        assertEquals(-1, Durations.parse("1h30x"));
        assertEquals(-1, Durations.parse("30 1h"));
    }

    @Test
    void affichage() {
        assertEquals("15 minutes", Durations.format(900));
        assertEquals("1 heure 30 minutes", Durations.format(5400));
        assertEquals("1 minute 5 secondes", Durations.format(65));
        assertEquals("1 seconde", Durations.format(1));
        assertEquals("0 seconde", Durations.format(0));
        assertEquals("2 jours", Durations.format(172800));
        assertEquals("14:59", Durations.clock(899));
        assertEquals("0:07", Durations.clock(7));
        assertEquals("1:05:09", Durations.clock(3909));
    }
}
