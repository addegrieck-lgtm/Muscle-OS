package fr.vaeloria.factions.model;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RaidReportTest {

    @Test
    void accumulatesPerAttacker() {
        RaidReport r = new RaidReport(1000);
        assertTrue(r.isEmpty());
        r.touch("Loups", 1000);
        r.addBlocks("Loups", 40);
        r.addBlocks("Loups", 12);
        r.addBlocks("Ours", 8);
        r.addBlocks(null, 3);
        r.touch("Ours", 61_000);
        assertEquals(63, r.totalBlocks());
        assertEquals(52, r.blocksByAttacker.get("Loups"));
        assertEquals(List.of("Loups", "Ours"), List.copyOf(r.attackers));
        assertEquals(60_000, r.lastActivity - r.startedAt);
        assertFalse(r.isEmpty());
    }

    @Test
    void stolenItemsAreSummedAndRanked() {
        RaidReport r = new RaidReport(0);
        Map<String, Integer> a = new LinkedHashMap<>();
        a.put("diamond", 32);
        a.put("tnt", 5);
        a.put("ignored", -3);
        r.addStolen("Loups", a);
        r.addStolen("Ours", Map.of("diamond", 10, "gold ingot", 64));
        assertEquals(42, r.stolen.get("diamond"));
        assertEquals(111, r.totalStolen());
        assertEquals(List.of("64× gold ingot", "42× diamond", "5× tnt"), RaidReport.top(r.stolen, 5));
        assertEquals(List.of("64× gold ingot", "+2 autres"), RaidReport.top(r.stolen, 1));
        assertEquals(32, r.stolenByAttacker.get("Loups").get("diamond"));
    }
}
