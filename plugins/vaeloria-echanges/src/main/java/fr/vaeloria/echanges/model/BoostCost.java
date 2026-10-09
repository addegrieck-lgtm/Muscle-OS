package fr.vaeloria.echanges.model;

/** Coût en émeraudes du boost suivant : base + pas × boosts déjà faits, plafonné. */
public record BoostCost(int base, int step, int max) {
    public BoostCost {
        if (base < 1 || step < 0 || max < base) throw new IllegalArgumentException("coût de boost invalide");
    }

    public int next(int boostsDone) {
        long cost = base + (long) step * Math.max(0, boostsDone);
        return (int) Math.min(max, cost);
    }

    /** Coût total des n premiers boosts. */
    public int total(int n) {
        int sum = 0;
        for (int i = 0; i < n; i++) sum += next(i);
        return sum;
    }
}
