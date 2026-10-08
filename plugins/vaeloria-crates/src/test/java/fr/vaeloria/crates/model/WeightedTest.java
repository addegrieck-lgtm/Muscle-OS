package fr.vaeloria.crates.model;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.SplittableRandom;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WeightedTest {
    record Lot(String name, int weight) {}

    @Test
    void respecteLesPoids() {
        List<Lot> lots = List.of(new Lot("commun", 70), new Lot("rare", 25), new Lot("legendaire", 5), new Lot("off", 0));
        SplittableRandom random = new SplittableRandom(42);
        Map<String, Integer> counts = new HashMap<>();
        int n = 200_000;
        for (int i = 0; i < n; i++) counts.merge(Weighted.pick(lots, Lot::weight, random).name(), 1, Integer::sum);
        assertEquals(0.70, counts.get("commun") / (double) n, 0.01);
        assertEquals(0.25, counts.get("rare") / (double) n, 0.01);
        assertEquals(0.05, counts.get("legendaire") / (double) n, 0.005);
        assertTrue(!counts.containsKey("off"), "un poids nul ne sort jamais");
    }

    @Test
    void videOuPoidsNulsDonnentNull() {
        assertNull(Weighted.pick(List.<Lot>of(), Lot::weight, new SplittableRandom(1)));
        assertNull(Weighted.pick(List.of(new Lot("a", 0), new Lot("b", -3)), Lot::weight, new SplittableRandom(1)));
    }

    @Test
    void pourcentagesLisibles() {
        assertEquals("100 %", Weighted.percent(10, 10));
        assertEquals("50 %", Weighted.percent(1, 2));
        assertEquals("12,5 %", Weighted.percent(1, 8));
        assertEquals("3,33 %", Weighted.percent(1, 30));
        assertEquals("0,05 %", Weighted.percent(1, 2000));
        assertEquals("0,001 %", Weighted.percent(1, 100_000));
        assertEquals("0 %", Weighted.percent(0, 10));
    }
}
