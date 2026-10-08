package fr.vaeloria.factions.rules;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AntiAbuseAndWarTest {

    @Test
    void farmGuardPenalizesOncePerCooldown() {
        FarmGuard g = new FarmGuard();
        UUID k = UUID.randomUUID(), v = UUID.randomUUID(), other = UUID.randomUUID();
        long cd = 15 * 60_000L;
        assertTrue(g.shouldPenalize(k, v, 0, cd));
        assertFalse(g.shouldPenalize(k, v, 60_000, cd), "re-kill immédiat : farm");
        assertTrue(g.shouldPenalize(other, v, 60_000, cd), "un autre tueur compte");
        assertTrue(g.shouldPenalize(v, k, 60_000, cd), "dans l'autre sens aussi");
        assertTrue(g.shouldPenalize(k, v, cd + 1, cd), "après la période");
        assertTrue(g.shouldPenalize(null, v, 0, cd), "mort sans tueur : toujours compté");
        assertTrue(g.shouldPenalize(k, v, cd + 2, 0), "anti-farm désactivé");
    }

    @Test
    void itemDiff() {
        Map<String, Integer> before = new LinkedHashMap<>(Map.of("diamond", 64, "tnt", 10, "obsidian", 5));
        Map<String, Integer> after = new LinkedHashMap<>(Map.of("diamond", 32, "tnt", 10, "gold ingot", 3));
        Map<String, Integer> d = ItemDiff.diff(before, after);
        assertEquals(-32, d.get("diamond"));
        assertEquals(-5, d.get("obsidian"));
        assertEquals(3, d.get("gold ingot"));
        assertFalse(d.containsKey("tnt"));
    }

    @Test
    void warRules() {
        assertEquals(WarRules.Winner.ATTACKER, WarRules.winner(12, 8));
        assertEquals(WarRules.Winner.DEFENDER, WarRules.winner(0, 1));
        assertEquals(WarRules.Winner.DRAW, WarRules.winner(5, 5));
        assertEquals(WarRules.pairKey("a", "b"), WarRules.pairKey("b", "a"));
        assertEquals(WarRules.Phase.PREPARATION, WarRules.phase(5, 10, 20));
        assertEquals(WarRules.Phase.ACTIVE, WarRules.phase(10, 10, 20));
        assertEquals(WarRules.Phase.OVER, WarRules.phase(20, 10, 20));
    }

    @Test
    void webhookValidation() {
        String ok = "https://discord.com/api/webhooks/123456789012345678/AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789-abcdefghijkl";
        assertTrue(WebhookRules.valid(ok, ""));
        assertTrue(WebhookRules.valid(ok.replace("discord.com", "canary.discord.com"), null));
        assertFalse(WebhookRules.valid("http://discord.com/api/webhooks/1234567/abc", ""), "http refusé");
        assertFalse(WebhookRules.valid("https://evil.example/api/webhooks/123456789/AbCdEfGhIjKlMnOpQrStUv", ""));
        assertFalse(WebhookRules.valid("https://discord.com.evil.example/api/webhooks/123456789/AbCdEfGhIjKlMnOpQrStUv", ""));
        assertFalse(WebhookRules.valid("http://127.0.0.1/hook", ""), "pas d'adresse interne");
        assertTrue(WebhookRules.valid("http://127.0.0.1:8099/hook", "^http://127\\.0\\.0\\.1:\\d+/hook$"), "motif personnalisé (tests)");
        assertEquals("https://discord.com/api/webhooks/123456789012345678/••••••", WebhookRules.masked(ok));
        assertEquals("@​everyone \\*gras\\*", WebhookRules.escape("@everyone *gras*"));
    }
}
