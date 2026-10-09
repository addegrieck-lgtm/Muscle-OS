package fr.vaeloria.factions.rules;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import fr.vaeloria.factions.service.SchematicPaster;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FortressTest {

    @Test
    void spawnsAreSpreadOut() {
        List<int[]> pts = new java.util.ArrayList<>();
        for (int i = 0; i < 40; i++) pts.add(new int[]{i * 3, 0});
        List<Integer> pick = FortressRules.pickSpawns(5, pts, 12, new java.util.Random(7));
        assertEquals(5, pick.size());
        for (int i : pick) for (int j : pick) if (i != j) assertTrue(Math.abs(pts.get(i)[0] - pts.get(j)[0]) >= 12);
        // Plus de combattants que de points éloignés : on complète quand même.
        assertEquals(30, FortressRules.pickSpawns(30, pts, 50, new java.util.Random(1)).size());
        assertTrue(FortressRules.pickSpawns(3, List.of(), 5, new java.util.Random()).isEmpty());
    }

    @Test
    void eligibilityAndCaps() {
        List<String> ok = FortressRules.eligible(Map.of("a", 3, "b", 1, "c", 2), 2);
        assertEquals(List.of("a", "c"), ok);
        assertTrue(FortressRules.canRegister(10, 0));
        assertTrue(FortressRules.canRegister(4, 5));
        assertFalse(FortressRules.canRegister(5, 5));
    }

    @Test
    void lastFactionStandingWins() {
        assertEquals(FortressRules.Outcome.CONTINUE, FortressRules.check(Map.of("a", 2, "b", 1)));
        assertEquals(FortressRules.Outcome.WINNER, FortressRules.check(Map.of("a", 2, "b", 0)));
        assertEquals("a", FortressRules.lastStanding(Map.of("a", 2, "b", 0)));
        assertEquals(FortressRules.Outcome.NOBODY, FortressRules.check(Map.of()));
        assertNull(FortressRules.lastStanding(Map.of("a", 1, "b", 1)));
        Map<String, Integer> alive = FortressRules.aliveByFaction(List.of("a", "b", "a"));
        assertEquals(2, alive.get("a"));
    }

    @Test
    void timeoutGoesToTheBiggestGroupOnTheSummit() {
        assertEquals("b", FortressRules.summitLeader(Map.of("a", 1, "b", 3)));
        assertNull(FortressRules.summitLeader(Map.of("a", 2, "b", 2)));
        assertNull(FortressRules.summitLeader(Map.of()));
        assertEquals(5000, FortressRules.graceLeft(1000, 10_000, 6000));
        assertEquals(0, FortressRules.graceLeft(1000, 10_000, 20_000));
    }

    /** Le plan livré correspond bien au schéma : herses aux portes, sol au sommet, points d'apparition praticables dans la forêt. */
    @Test
    void layoutMatchesTheSchematic() throws Exception {
        SchematicPaster.Raw s;
        try (InputStream in = Objects.requireNonNull(getClass().getResourceAsStream("/forteresse/forteresse.schem"))) {
            s = SchematicPaster.readRaw(in);
        }
        JsonObject j;
        try (InputStream in = Objects.requireNonNull(getClass().getResourceAsStream("/forteresse/layout.json"))) {
            j = new Gson().fromJson(new InputStreamReader(in, StandardCharsets.UTF_8), JsonObject.class);
        }
        assertEquals(241, s.width());
        assertEquals(241, s.length());
        // Origine : là où l'on se tient au centre ; coordonnée du schéma = relative - décalage.
        int ox = -s.offX(), oy = -s.offY(), oz = -s.offZ();
        assertEquals(4, j.getAsJsonArray("gates").size());
        for (JsonElement e : j.getAsJsonArray("gates")) {
            JsonObject g = e.getAsJsonObject();
            JsonArray a = g.getAsJsonArray("min"), b = g.getAsJsonArray("max");
            for (int x = a.get(0).getAsInt(); x <= b.get(0).getAsInt(); x++)
                for (int y = a.get(1).getAsInt(); y <= b.get(1).getAsInt(); y++)
                    for (int z = a.get(2).getAsInt(); z <= b.get(2).getAsInt(); z++)
                        assertTrue(s.at(ox + x, oy + y, oz + z).startsWith("minecraft:iron_bars"), "herse en " + x + "," + y + "," + z);
            // Le passage sous la herse est dégagé de part et d'autre.
            int mx = (a.get(0).getAsInt() + b.get(0).getAsInt()) / 2, mz = (a.get(2).getAsInt() + b.get(2).getAsInt()) / 2;
            int dx = Integer.signum(mx), dz = Integer.signum(mz);
            int gy = oy + a.get(1).getAsInt();
            assertEquals("minecraft:air", s.at(ox + mx - dx, gy, oz + mz - dz));
            assertEquals("minecraft:air", s.at(ox + mx + dx, gy, oz + mz + dz));
        }
        JsonObject summit = j.getAsJsonObject("summit");
        int sy = summit.getAsJsonArray("min").get(1).getAsInt();
        // Le toit du donjon est plein sous les pieds de ceux qui s'y tiennent.
        String roof = s.at(ox + 2, oy + sy, oz + 2);
        assertNotNull(roof);
        assertFalse(roof.equals("minecraft:air"));
        assertEquals("minecraft:air", s.at(ox + 2, oy + sy + 1, oz + 2));
        JsonArray spawns = j.getAsJsonArray("spawns");
        assertTrue(spawns.size() >= 100, "assez de points d'apparition");
        for (JsonElement e : spawns) {
            JsonObject c = e.getAsJsonObject();
            int x = c.get("x").getAsInt(), y = c.get("y").getAsInt(), z = c.get("z").getAsInt();
            String ground = s.at(ox + x, oy + y - 1, oz + z);
            assertFalse(ground.equals("minecraft:air") || ground.contains("leaves") || ground.contains("_log"), "sol en " + x + "," + z + " : " + ground);
            for (int dy = 0; dy < 2; dy++) {
                String b = s.at(ox + x, oy + y + dy, oz + z);
                assertTrue(b.equals("minecraft:air") || b.contains("grass") || b.contains("fern") || b.contains("carpet")
                        || b.contains("mushroom") || b.contains("poppy") || b.contains("lily") || b.contains("orchid"), "place libre en " + x + "," + z + " : " + b);
            }
            assertTrue(Math.hypot(x, z) > 45, "dans la forêt, pas dans le temple");
        }
    }
}
