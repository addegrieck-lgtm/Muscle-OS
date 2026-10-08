package fr.vaeloria.factions.model;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Bilan d'un pillage subi, accumulé pendant le raid et envoyé aux défenseurs quand il se termine.
 * Les clés « attaquant » sont des noms de faction.
 */
public final class RaidReport {
    public final long startedAt;
    public long lastActivity;
    public final java.util.Set<String> attackers = new java.util.LinkedHashSet<>();
    public final Map<String, Integer> blocksByAttacker = new LinkedHashMap<>();
    public final Map<String, Integer> stolen = new LinkedHashMap<>();
    public final Map<String, Map<String, Integer>> stolenByAttacker = new LinkedHashMap<>();
    public int blocksUnknown;
    public int containersOpened;
    public int chunksLost;
    public int membersKilled;
    public int enemiesKilled;

    public RaidReport(long startedAt) {
        this.startedAt = startedAt;
        this.lastActivity = startedAt;
    }

    public void touch(String attacker, long now) {
        if (attacker != null) attackers.add(attacker);
        lastActivity = Math.max(lastActivity, now);
    }

    public void addBlocks(String attacker, int n) {
        if (n <= 0) return;
        if (attacker == null) blocksUnknown += n;
        else blocksByAttacker.merge(attacker, n, Integer::sum);
    }

    /** Objets retirés d'un coffre par un ennemi (quantités positives). */
    public void addStolen(String attacker, Map<String, Integer> items) {
        Map<String, Integer> mine = stolenByAttacker.computeIfAbsent(attacker, k -> new LinkedHashMap<>());
        items.forEach((k, v) -> {
            if (v <= 0) return;
            stolen.merge(k, v, Integer::sum);
            mine.merge(k, v, Integer::sum);
        });
    }

    public int totalBlocks() {
        int n = blocksUnknown;
        for (int v : blocksByAttacker.values()) n += v;
        return n;
    }

    public int totalStolen() {
        int n = 0;
        for (int v : stolen.values()) n += v;
        return n;
    }

    /** Les {@code limit} objets les plus volés, « 32× diamond », du plus grand au plus petit. */
    public static List<String> top(Map<String, Integer> items, int limit) {
        List<Map.Entry<String, Integer>> l = new ArrayList<>(items.entrySet());
        l.sort((a, b) -> b.getValue() - a.getValue());
        List<String> out = new ArrayList<>();
        for (int i = 0; i < l.size() && i < limit; i++) out.add(l.get(i).getValue() + "× " + l.get(i).getKey());
        if (l.size() > limit) out.add("+" + (l.size() - limit) + " autres");
        return out;
    }

    public boolean isEmpty() {
        return totalBlocks() == 0 && containersOpened == 0 && chunksLost == 0 && membersKilled == 0 && enemiesKilled == 0 && stolen.isEmpty();
    }
}
