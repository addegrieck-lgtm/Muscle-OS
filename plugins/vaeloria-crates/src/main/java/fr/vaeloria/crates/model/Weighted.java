package fr.vaeloria.crates.model;

import java.util.List;
import java.util.Locale;
import java.util.function.ToIntFunction;
import java.util.random.RandomGenerator;

/** Tirage pondéré et affichage des chances. Sans dépendance Bukkit (testé unitairement). */
public final class Weighted {
    private Weighted() {}

    /** Somme des poids strictement positifs. */
    public static <T> long total(List<T> entries, ToIntFunction<T> weight) {
        long sum = 0;
        for (T e : entries) sum += Math.max(0, weight.applyAsInt(e));
        return sum;
    }

    /**
     * Tire une entrée proportionnellement à son poids. Les poids nuls ou négatifs ne sortent jamais.
     * Retourne {@code null} si aucune entrée n'a de poids positif.
     */
    public static <T> T pick(List<T> entries, ToIntFunction<T> weight, RandomGenerator random) {
        long total = total(entries, weight);
        if (total <= 0) return null;
        long roll = random.nextLong(total);
        for (T e : entries) {
            int w = weight.applyAsInt(e);
            if (w <= 0) continue;
            if (roll < w) return e;
            roll -= w;
        }
        throw new IllegalStateException("Tirage hors bornes");
    }

    /** Chance en pourcentage lisible : « 12,5 % », « 0,05 % », « 100 % ». */
    public static String percent(int weight, long total) {
        if (weight <= 0 || total <= 0) return "0 %";
        double p = weight * 100.0 / total;
        String s;
        if (p >= 10) s = String.format(Locale.FRANCE, "%.1f", p);
        else if (p >= 0.1) s = String.format(Locale.FRANCE, "%.2f", p);
        else s = String.format(Locale.FRANCE, "%.3f", p);
        s = s.replaceAll(",?0+$", "");
        return s + " %";
    }
}
