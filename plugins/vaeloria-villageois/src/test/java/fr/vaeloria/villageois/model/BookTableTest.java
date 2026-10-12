package fr.vaeloria.villageois.model;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.SplittableRandom;
import java.util.random.RandomGenerator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class BookTableTest {
    private static final BookOffer P1 = new BookOffer("protection-1", "protection", 1, 6, 6, 1, "courant", false);
    private static final BookOffer P2 = new BookOffer("protection-2", "protection", 2, 10, 6, 3, "courant", false);
    private static final BookOffer P4 = new BookOffer("protection-4", "protection", 4, 56, 2, 1, "rare", true);
    private static final Tier COMMON = new Tier("courant", 90, -10, List.of(P1, P2));
    private static final Tier RARE = new Tier("rare", 10, 10, List.of(P4));
    private static final BookTable TABLE = new BookTable(List.of(COMMON, RARE), 5);

    @Test
    void chanceDuPalierPuisDuLivre() {
        assertEquals(0.90, TABLE.chance(COMMON, 0), 1e-9);
        assertEquals(0.90 * 3 / 4, TABLE.chance(P2, 0), 1e-9);
        assertEquals(0.10, TABLE.chance(P4, 0), 1e-9);
    }

    @Test
    void chanceDeplaceLePoidsVersLeRare() {
        assertEquals(0.60, TABLE.chance(P4, 5), 1e-9); // 40 contre 60
        assertEquals(TABLE.chance(P4, 5), TABLE.chance(P4, 99), 1e-9); // plafond max-luck
    }

    @Test
    void poidsJamaisNegatif() {
        BookTable t = new BookTable(List.of(COMMON, RARE), 20);
        assertEquals(0, COMMON.weightAt(20));
        assertEquals(1.0, t.chance(P4, 20), 1e-9);
        assertEquals(List.of(P4), t.rarest(20, 5));
    }

    @Test
    void tirageSuitLesPoids() {
        RandomGenerator rnd = new SplittableRandom(42);
        int rare = 0, p2 = 0, n = 200_000;
        for (int i = 0; i < n; i++) {
            BookOffer o = TABLE.pick(0, rnd);
            if (o == P4) rare++;
            if (o == P2) p2++;
        }
        assertEquals(0.10, rare / (double) n, 0.005);
        assertEquals(0.675, p2 / (double) n, 0.005);
    }

    @Test
    void tablesInvalides() {
        assertThrows(IllegalArgumentException.class, () -> new BookTable(List.of(), 5));
        assertThrows(IllegalArgumentException.class, () -> new Tier("vide", 10, 0, List.of()));
        Tier vanishing = new Tier("x", 10, -10, List.of(P1));
        assertThrows(IllegalArgumentException.class, () -> new BookTable(List.of(vanishing), 1));
    }

    @Test
    void rarestTrieParPrix() {
        assertEquals(List.of(P4, P2, P1), TABLE.rarest(0, 5));
    }

    @Test
    void clesDeLivre() {
        assertEquals(new BookOffer.Key("protection", 4), BookOffer.Key.parse("protection-4"));
        assertEquals(new BookOffer.Key("silk_touch", 1), BookOffer.Key.parse("silk_touch"));
        assertEquals(new BookOffer.Key("bane_of_arthropods", 5), BookOffer.Key.parse("Bane_of_Arthropods-5"));
        assertThrows(IllegalArgumentException.class, () -> BookOffer.Key.parse("protection 4"));
    }
}
