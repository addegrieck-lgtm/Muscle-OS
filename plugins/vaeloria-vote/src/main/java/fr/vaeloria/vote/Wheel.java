package fr.vaeloria.vote;

import java.util.List;

/** Roue pondérée : chaque part porte un multiplicateur et un poids. */
public final class Wheel {
    public record Slice(int multiplier, int weight) {
        public Slice {
            if (multiplier < 0) throw new IllegalArgumentException("Multiplicateur négatif");
            if (weight <= 0) throw new IllegalArgumentException("Poids nul ou négatif pour ×" + multiplier);
        }
    }

    private final List<Slice> slices;
    private final int total;

    public Wheel(List<Slice> slices) {
        if (slices.isEmpty()) throw new IllegalArgumentException("Roue vide");
        this.slices = List.copyOf(slices);
        this.total = slices.stream().mapToInt(Slice::weight).sum();
    }

    /** r dans [0, 1). */
    public int pick(double r) {
        double target = r * total;
        int acc = 0;
        for (Slice s : slices) {
            acc += s.weight();
            if (target < acc) return s.multiplier();
        }
        return slices.get(slices.size() - 1).multiplier();
    }

    /** Probabilité d'une part, en pourcentage (affichée aux joueurs). */
    public double percent(Slice s) {
        return 100.0 * s.weight() / total;
    }

    /** Multiplicateur moyen : sert à vérifier qu'aucune roue n'est un piège ni une machine à argent. */
    public double expected() {
        return slices.stream().mapToDouble(s -> (double) s.multiplier() * s.weight()).sum() / total;
    }

    public List<Slice> slices() {
        return slices;
    }
}
