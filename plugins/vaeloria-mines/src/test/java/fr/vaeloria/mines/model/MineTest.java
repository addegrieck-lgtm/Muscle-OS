package fr.vaeloria.mines.model;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MineTest {
    @Test
    void zone() {
        Cuboid c = Cuboid.of(new BlockPos("world", 10, 70, -5), new BlockPos("world", 0, 60, 5));
        assertEquals(new Cuboid("world", 0, 60, -5, 10, 70, 5), c);
        assertEquals(11L * 11 * 11, c.volume());
        assertTrue(c.contains("world", 0, 60, 5));
        assertFalse(c.contains("world", 11, 60, 5));
        assertFalse(c.contains("world_nether", 0, 60, 5));
        assertTrue(c.contains("world", 13, 60, 5, 3));
        assertEquals(c, Cuboid.parse(c.serialize()));
        assertThrows(IllegalArgumentException.class, () -> Cuboid.of(new BlockPos("a", 0, 0, 0), new BlockPos("b", 0, 0, 0)));
    }

    @Test
    void parcoursDeLaZoneDuBasVersLeHaut() {
        Cuboid c = new Cuboid("w", 0, 10, 0, 1, 11, 2);
        assertEquals(new BlockPos("w", 0, 10, 0), c.at(0));
        assertEquals(new BlockPos("w", 1, 10, 0), c.at(1));
        assertEquals(new BlockPos("w", 0, 10, 1), c.at(2));
        assertEquals(new BlockPos("w", 1, 11, 2), c.at(c.volume() - 1));
        java.util.Set<BlockPos> seen = new java.util.HashSet<>();
        for (long i = 0; i < c.volume(); i++) assertTrue(seen.add(c.at(i)));
    }

    @Test
    void composition() {
        Composition comp = new Composition();
        comp.set("STONE", 70);
        comp.set("DIAMOND_ORE", 30);
        assertEquals(70.0, comp.percent("STONE"), 1e-9);
        assertEquals("STONE", comp.main());
        comp.set("STONE", 0);
        assertFalse(comp.weights().containsKey("STONE"));
        comp.set("OBSIDIAN", 1_000_000);
        assertEquals(Composition.MAX_WEIGHT, comp.weight("OBSIDIAN"));
    }

    @Test
    void tiragePondere() {
        Map<String, Integer> w = new LinkedHashMap<>();
        w.put("STONE", 75);
        w.put("IRON_ORE", 25);
        Composition.Picker<String> picker = new Composition.Picker<>(w);
        Random random = new Random(42);
        Map<String, Integer> counts = new HashMap<>();
        for (int i = 0; i < 100_000; i++) counts.merge(picker.pick(random), 1, Integer::sum);
        assertEquals(0.75, counts.get("STONE") / 100_000.0, 0.01);
        assertEquals("OBSIDIAN", new Composition.Picker<>(Map.of("OBSIDIAN", 1)).pick(random));
        assertThrows(IllegalArgumentException.class, () -> new Composition.Picker<>(Map.<String, Integer>of()));
    }

    @Test
    void minuterie() {
        Mine mine = new Mine("mine-obsidienne", "&5Mine d'obsidienne");
        mine.intervalSeconds(900, 0);
        mine.restartTimer(0);
        assertEquals(900, mine.remainingSeconds(0));
        assertEquals(900, mine.remainingSeconds(1)); // arrondi au-dessus : jamais « 0 » avant l'échéance
        assertEquals(0, mine.remainingSeconds(900_000));

        mine.pause(300_000);
        assertEquals(600, mine.remainingSeconds(10_000_000));
        mine.resume(10_000_000);
        assertEquals(600, mine.remainingSeconds(10_000_000));

        // Délai réduit à 5 min : le compte à rebours de 10 min en cours repart sur 5 min.
        mine.intervalSeconds(300, 10_000_000);
        assertEquals(300, mine.remainingSeconds(10_000_000));
        // Délai allongé : le compte à rebours en cours est conservé.
        mine.intervalSeconds(3600, 10_000_000);
        assertEquals(300, mine.remainingSeconds(10_000_000));
    }

    @Test
    void identifiants() {
        assertEquals("mine-obsidienne", MineIds.slug("&5Mine Obsidienne"));
        assertEquals("mine-d-emeraude", MineIds.slug("§aMine d'Émeraude !"));
        assertEquals("mine-obsidienne", MineIds.slug("mine-obsidienne"));
        assertEquals("", MineIds.slug("&6!!!"));
        assertTrue(MineIds.isValid("mine-obsidienne"));
        assertFalse(MineIds.isValid("Mine"));
    }

    @Test
    void positions() {
        Spot s = new Spot("world", 10.5, 64, -3.25, 90f, -10f);
        assertEquals(s, Spot.parse(s.serialize()));
    }
}
