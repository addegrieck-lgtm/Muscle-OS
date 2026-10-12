package fr.vaeloria.villageois.model;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.SplittableRandom;
import java.util.random.RandomGenerator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BookTableTest {
    private static final BookOffer COMMON = new BookOffer("p2", "protection", 2, 12, 6, 90, -10, false);
    private static final BookOffer RARE = new BookOffer("p4", "protection", 4, 56, 2, 10, 10, true);
    private static final BookTable TABLE = new BookTable(List.of(COMMON, RARE), 5);

    @Test
    void chanceDeplaceLePoidsVersLeRare() {
        assertEquals(0.10, TABLE.chance(RARE, 0), 1e-9);
        assertEquals(0.60, TABLE.chance(RARE, 5), 1e-9); // 40 contre 60
        assertEquals(TABLE.chance(RARE, 5), TABLE.chance(RARE, 99), 1e-9); // plafond max-luck
    }

    @Test
    void poidsJamaisNegatif() {
        BookTable t = new BookTable(List.of(COMMON, RARE), 20);
        assertEquals(0, COMMON.weightAt(20));
        assertEquals(1.0, t.chance(RARE, 20), 1e-9);
        assertEquals(List.of(RARE), t.rarest(20, 5));
    }

    @Test
    void tirageSuitLesPoids() {
        RandomGenerator rnd = new SplittableRandom(42);
        int rare = 0, n = 100_000;
        for (int i = 0; i < n; i++) if (TABLE.pick(5, rnd) == RARE) rare++;
        assertEquals(0.60, rare / (double) n, 0.01);
    }

    @Test
    void tablesInvalides() {
        assertThrows(IllegalArgumentException.class, () -> new BookTable(List.of(), 5));
        BookOffer vanishing = new BookOffer("x", "protection", 1, 1, 1, 10, -10, false);
        assertThrows(IllegalArgumentException.class, () -> new BookTable(List.of(vanishing), 1));
    }

    @Test
    void rarestTrieParPrix() {
        assertEquals(List.of(RARE, COMMON), TABLE.rarest(0, 5));
        assertTrue(TABLE.rarest(0, 1).contains(RARE));
    }
}
