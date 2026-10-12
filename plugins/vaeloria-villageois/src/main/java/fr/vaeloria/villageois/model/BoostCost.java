package fr.vaeloria.villageois.model;

/** Coût d'un boost en émeraudes : {@code base + step × boosts déjà payés}, plafonné à {@code max}. */
public record BoostCost(int base, int step, int max) {
    public BoostCost {
        if (base < 1) throw new IllegalArgumentException("coût de base < 1");
        if (step < 0) throw new IllegalArgumentException("pas négatif");
        max = Math.max(base, max);
    }

    public int forBoost(int alreadyPaid) {
        long cost = base + (long) step * Math.max(0, alreadyPaid);
        return (int) Math.min(cost, max);
    }
}
