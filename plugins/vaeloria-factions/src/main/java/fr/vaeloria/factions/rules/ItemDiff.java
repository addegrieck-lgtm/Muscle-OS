package fr.vaeloria.factions.rules;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;

/** Différence entre deux inventaires résumés (nom d'objet → quantité), pour le journal du coffre. */
public final class ItemDiff {
    private ItemDiff() {}

    /** Quantités positives = ajoutées, négatives = retirées. Les objets inchangés sont omis. */
    public static Map<String, Integer> diff(Map<String, Integer> before, Map<String, Integer> after) {
        Map<String, Integer> out = new LinkedHashMap<>();
        TreeMap<String, Boolean> keys = new TreeMap<>();
        before.keySet().forEach(k -> keys.put(k, true));
        after.keySet().forEach(k -> keys.put(k, true));
        for (String k : keys.keySet()) {
            int d = after.getOrDefault(k, 0) - before.getOrDefault(k, 0);
            if (d != 0) out.put(k, d);
        }
        return out;
    }
}
