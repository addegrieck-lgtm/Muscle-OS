package fr.vaeloria.villageois.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BoostCostTest {
    @Test
    void fixe() {
        BoostCost c = new BoostCost(6, 0, 6);
        assertEquals(6, c.forBoost(0));
        assertEquals(6, c.forBoost(50));
    }

    @Test
    void progressifEtPlafonne() {
        BoostCost c = new BoostCost(4, 2, 10);
        assertEquals(4, c.forBoost(0));
        assertEquals(8, c.forBoost(2));
        assertEquals(10, c.forBoost(3));
        assertEquals(10, c.forBoost(Integer.MAX_VALUE));
    }

    @Test
    void plafondJamaisSousLaBase() {
        assertEquals(6, new BoostCost(6, 0, 1).forBoost(0));
    }
}
