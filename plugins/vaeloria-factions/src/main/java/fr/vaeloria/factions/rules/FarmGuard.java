package fr.vaeloria.factions.rules;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Anti-farm de power : un même tueur ne fait perdre du power à une même victime qu'une fois par période.
 * Sans ça, deux complices (ou un double compte) rendent n'importe quelle faction surclaimable en boucle.
 */
public final class FarmGuard {
    private final Map<String, Long> lastKill = new ConcurrentHashMap<>();

    /** Vrai si cette mort doit coûter du power ; enregistre la mort le cas échéant. */
    public boolean shouldPenalize(UUID killer, UUID victim, long now, long cooldownMs) {
        if (killer == null || cooldownMs <= 0) return true;
        String key = killer + ">" + victim;
        Long last = lastKill.get(key);
        if (last != null && now - last < cooldownMs) return false;
        lastKill.put(key, now);
        return true;
    }

    public void purge(long now, long cooldownMs) {
        lastKill.values().removeIf(t -> now - t >= cooldownMs);
    }
}
