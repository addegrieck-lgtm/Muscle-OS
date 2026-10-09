package fr.vaeloria.echanges.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class BoostCostTest {
    @Test
    void augmenteJusquAuPlafond() {
        BoostCost cost = new BoostCost(2, 1, 8);
        assertEquals(2, cost.next(0));
        assertEquals(3, cost.next(1));
        assertEquals(8, cost.next(6));
        assertEquals(8, cost.next(1_000_000));
        assertEquals(2 + 3 + 4 + 5 + 6 + 7 + 8 + 8 + 8 + 8, cost.total(10));
    }

    @Test
    void reglagesInvalides() {
        assertThrows(IllegalArgumentException.class, () -> new BoostCost(0, 1, 8));
        assertThrows(IllegalArgumentException.class, () -> new BoostCost(5, 1, 4));
    }
}
