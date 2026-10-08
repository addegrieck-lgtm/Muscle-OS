package fr.vaeloria.mines.model;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Random;

/**
 * Blocs régénérés dans la mine et leurs poids (ex. OBSIDIAN 100, ou STONE 70 / IRON_ORE 20 / DIAMOND_ORE 10).
 * La proportion d'un bloc = son poids ÷ somme des poids. Clés : noms de Material (« OBSIDIAN »).
 */
public final class Composition {
    public static final int MAX_WEIGHT = 10_000;

    private final Map<String, Integer> weights = new LinkedHashMap<>();

    public Map<String, Integer> weights() {
        return Collections.unmodifiableMap(weights);
    }

    public boolean isEmpty() {
        return weights.isEmpty();
    }

    public int total() {
        int t = 0;
        for (int w : weights.values()) t += w;
        return t;
    }

    /** Poids borné à [1, MAX_WEIGHT] ; 0 ou moins retire le bloc. */
    public void set(String block, int weight) {
        if (weight <= 0) weights.remove(block);
        else weights.put(block, Math.min(weight, MAX_WEIGHT));
    }

    public int weight(String block) {
        return weights.getOrDefault(block, 0);
    }

    public void remove(String block) {
        weights.remove(block);
    }

    public void clear() {
        weights.clear();
    }

    public double percent(String block) {
        int total = total();
        return total == 0 ? 0 : 100.0 * weight(block) / total;
    }

    /** Bloc le plus présent (icône de la mine), ou null. */
    public String main() {
        String best = null;
        for (Map.Entry<String, Integer> e : weights.entrySet()) {
            if (best == null || e.getValue() > weights.get(best)) best = e.getKey();
        }
        return best;
    }

    /** Tirage pondéré, préparé une fois par réinitialisation (des millions de tirages). */
    public static final class Picker<T> {
        private final Object[] values;
        private final int[] cumulative;
        private final int total;

        public Picker(Map<T, Integer> weights) {
            values = new Object[weights.size()];
            cumulative = new int[weights.size()];
            int i = 0, sum = 0;
            for (Map.Entry<T, Integer> e : weights.entrySet()) {
                if (e.getValue() <= 0) continue;
                sum += e.getValue();
                values[i] = e.getKey();
                cumulative[i++] = sum;
            }
            if (sum == 0) throw new IllegalArgumentException("Aucun bloc");
            total = sum;
        }

        @SuppressWarnings("unchecked")
        public T pick(Random random) {
            if (values.length == 1) return (T) values[0];
            int r = random.nextInt(total);
            int lo = 0, hi = values.length - 1;
            while (lo < hi) {
                int mid = (lo + hi) >>> 1;
                if (cumulative[mid] > r) hi = mid;
                else lo = mid + 1;
            }
            return (T) values[lo];
        }
    }
}
