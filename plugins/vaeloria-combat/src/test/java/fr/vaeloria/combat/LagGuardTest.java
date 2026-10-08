package fr.vaeloria.combat;

import org.junit.jupiter.api.Test;

import static fr.vaeloria.combat.LagGuard.Transition.DEGRADE;
import static fr.vaeloria.combat.LagGuard.Transition.NONE;
import static fr.vaeloria.combat.LagGuard.Transition.RECOVER;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LagGuardTest {
    private final LagGuard g = new LagGuard(new LagGuard.Settings(45, 30, 10_000, 60_000));

    @Test
    void unPicBrefNeDeclencheRien() {
        assertEquals(NONE, g.update(80, 0));
        assertEquals(NONE, g.update(80, 5_000));
        assertEquals(NONE, g.update(20, 6_000)); // retombé : le compteur repart de zéro
        assertEquals(NONE, g.update(80, 12_000));
        assertFalse(g.degraded());
    }

    @Test
    void lagSoutenuPuisRetourALaNormale() {
        assertEquals(NONE, g.update(50, 0));
        assertEquals(DEGRADE, g.update(50, 10_000));
        assertTrue(g.degraded());
        // Entre les deux seuils : on reste dégradé.
        assertEquals(NONE, g.update(40, 20_000));
        assertEquals(NONE, g.update(40, 200_000));
        assertEquals(NONE, g.update(25, 200_000));
        assertEquals(NONE, g.update(25, 259_999));
        assertEquals(RECOVER, g.update(25, 260_000));
        assertFalse(g.degraded());
    }

    @Test
    void seuilsIncoherentsRefuses() {
        assertThrows(IllegalArgumentException.class, () -> new LagGuard.Settings(30, 30, 0, 0));
    }
}
