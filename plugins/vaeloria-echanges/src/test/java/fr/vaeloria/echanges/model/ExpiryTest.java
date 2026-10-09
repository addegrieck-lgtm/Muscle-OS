package fr.vaeloria.echanges.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ExpiryTest {
    @Test
    void disparaitApresLeTempsOuLesVentes() {
        long t0 = 1_000_000;
        long end = Expiry.expiresAt(t0, 48);
        assertEquals(t0 + 48 * 3_600_000L, end);
        assertFalse(Expiry.due(end - 1, end, 0, 3));
        assertTrue(Expiry.due(end, end, 0, 3), "délai écoulé");
        assertFalse(Expiry.due(t0, end, 2, 3));
        assertTrue(Expiry.due(t0, end, 3, 3), "toutes les ventes faites");
    }

    @Test
    void zeroVeutDireSansLimite() {
        assertEquals(0, Expiry.expiresAt(5, 0));
        assertFalse(Expiry.due(Long.MAX_VALUE, 0, 1_000, 0));
    }

    @Test
    void tempsRestantLisible() {
        assertEquals("2 j 5 h", Expiry.remaining((2 * 24 + 5) * 3_600_000L + 59_000));
        assertEquals("3 h 20 min", Expiry.remaining(200 * 60_000L));
        assertEquals("1 min", Expiry.remaining(10_000));
    }
}
