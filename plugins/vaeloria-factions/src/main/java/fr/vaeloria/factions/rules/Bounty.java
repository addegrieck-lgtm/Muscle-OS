package fr.vaeloria.factions.rules;

import java.util.List;

/** Règles des primes, pures et testables. */
public final class Bounty {
    private Bounty() {}

    /** Pourcentage de la fortune mis à prix pour une série de {@code streak} kills (paliers triés par kills). */
    public static int percent(List<int[]> tiers, int streak) {
        int pct = 0;
        for (int[] t : tiers) if (streak >= t[0]) pct = t[1];
        return pct;
    }

    /** Montant de la prime : pourcentage de la fortune, plafonné (0 = sans plafond), jamais négatif. */
    public static double amount(double balance, int percent, double cap) {
        if (balance <= 0 || percent <= 0) return 0;
        double v = Math.floor(balance * percent) / 100.0;
        return cap > 0 ? Math.min(cap, v) : v;
    }

    /** Faut-il annoncer cette série ? Au premier palier, à chaque nouveau palier, puis tous les {@code every} kills. */
    public static boolean announce(List<int[]> tiers, int streak, int every) {
        if (tiers.isEmpty() || streak < tiers.get(0)[0]) return false;
        for (int[] t : tiers) if (streak == t[0]) return true;
        return (streak - tiers.get(0)[0]) % Math.max(1, every) == 0;
    }
}
