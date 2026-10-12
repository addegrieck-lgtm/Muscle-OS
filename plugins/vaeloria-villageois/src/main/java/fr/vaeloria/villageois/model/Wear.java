package fr.vaeloria.villageois.model;

import java.util.random.RandomGenerator;

/**
 * Usure d'un bibliothécaire : après un nombre de livres vendus tiré entre {@code min} et {@code max}
 * (une quinzaine en moyenne), il est épuisé. Il faut le capturer et le relâcher pour le relancer à zéro.
 */
public record Wear(boolean enabled, int min, int max) {
    public Wear {
        if (min < 1) throw new IllegalArgumentException("usure : minimum < 1");
        max = Math.max(min, max);
    }

    public int drawLimit(RandomGenerator random) {
        return min + random.nextInt(max - min + 1);
    }

    public boolean exhausted(int sold, int limit) {
        return enabled && sold >= limit;
    }

    public double average() {
        return (min + max) / 2.0;
    }
}
