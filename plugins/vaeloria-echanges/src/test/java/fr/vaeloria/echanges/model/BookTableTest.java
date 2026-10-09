package fr.vaeloria.echanges.model;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.SplittableRandom;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BookTableTest {
    static final BookOffer COMMUN = new BookOffer("protection", 2, Tier.COMMUN, 90, 8, 12, 12);
    static final BookOffer EPIQUE = new BookOffer("protection", 4, Tier.EPIQUE, 10, 36, 44, 3);
    static final Map<Tier, Double> FACTORS = Map.of(Tier.COMMUN, 0.0, Tier.RARE, 0.15, Tier.EPIQUE, 0.6, Tier.LEGENDAIRE, 0.8);

    @Test
    void sansChanceRespecteLesPoids() {
        BookTable table = new BookTable(List.of(COMMUN, EPIQUE), FACTORS);
        SplittableRandom random = new SplittableRandom(7);
        int n = 200_000, epic = 0;
        for (int i = 0; i < n; i++) if (table.roll(random, 0, Set.of()) == EPIQUE) epic++;
        assertEquals(0.10, epic / (double) n, 0.005);
    }

    @Test
    void laChanceFavoriseLesLivresRares() {
        BookTable table = new BookTable(List.of(COMMUN, EPIQUE), FACTORS);
        // chance 10 : 10 × (1 + 10 × 0,6) = 70 contre 90 → 43,75 %
        assertEquals(70.0 / 160, table.odds(EPIQUE, 10, Set.of()), 1e-9);
        assertTrue(table.odds(EPIQUE, 5, Set.of()) > table.odds(EPIQUE, 0, Set.of()));
        assertEquals(90.0, table.weight(COMMUN, 10), 1e-9, "la chance ne change pas les communs");
    }

    @Test
    void unLivreInterditNeSortJamais() {
        BookTable table = new BookTable(List.of(COMMUN, EPIQUE), FACTORS);
        SplittableRandom random = new SplittableRandom(3);
        for (int i = 0; i < 10_000; i++) assertNotEquals(EPIQUE, table.roll(random, 15, Set.of("protection:4")));
        assertEquals(0, table.odds(EPIQUE, 15, Set.of("protection:4")));
        assertNull(table.roll(random, 0, Set.of("protection:2", "protection:4")), "plus aucun livre possible");
    }

    @Test
    void prixDansLaFourchette() {
        SplittableRandom random = new SplittableRandom(1);
        for (int i = 0; i < 1_000; i++) {
            int p = BookTable.price(EPIQUE, random);
            assertTrue(p >= 36 && p <= 44, "prix " + p);
        }
    }

    @Test
    void prixInvalidesRefuses() {
        assertThrows(IllegalArgumentException.class, () -> new BookOffer("mending", 1, Tier.LEGENDAIRE, 1, 60, 70, 1));
        assertThrows(IllegalArgumentException.class, () -> new BookOffer("mending", 1, Tier.LEGENDAIRE, 1, 20, 10, 1));
        assertThrows(IllegalArgumentException.class, () -> new BookOffer("mending", 0, Tier.LEGENDAIRE, 1, 10, 20, 1));
    }

    @Test
    void cotesParRarete() {
        BookTable table = new BookTable(List.of(COMMUN, EPIQUE), FACTORS);
        Map<Tier, Double> odds = table.tierOdds(0, Set.of());
        assertEquals(0.9, odds.get(Tier.COMMUN), 1e-9);
        assertEquals(0.1, odds.get(Tier.EPIQUE), 1e-9);
    }
}
