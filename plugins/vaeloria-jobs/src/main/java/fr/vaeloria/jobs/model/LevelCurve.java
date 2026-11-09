package fr.vaeloria.jobs.model;

/**
 * Courbe de niveaux : passer du niveau n-1 au niveau n coûte {@code base × n^exposant} XP.
 * Le niveau 0 est le départ ; chaque niveau gagné donne {@code pointsPerLevel} point(s) de compétence.
 */
public final class LevelCurve {
    private final double base;
    private final double exponent;
    private final int maxLevel;
    private final int pointsPerLevel;
    /** cumulative[n] = XP totale nécessaire pour atteindre le niveau n. */
    private final double[] cumulative;

    public LevelCurve(double base, double exponent, int maxLevel, int pointsPerLevel) {
        if (!(base > 0) || !(exponent >= 0) || maxLevel < 1 || pointsPerLevel < 1) {
            throw new IllegalArgumentException("Courbe invalide : base > 0, exposant ≥ 0, niveau max ≥ 1, points ≥ 1");
        }
        this.base = base;
        this.exponent = exponent;
        this.maxLevel = maxLevel;
        this.pointsPerLevel = pointsPerLevel;
        this.cumulative = new double[maxLevel + 1];
        for (int n = 1; n <= maxLevel; n++) cumulative[n] = cumulative[n - 1] + xpForLevel(n);
    }

    public int maxLevel() { return maxLevel; }
    public int pointsPerLevel() { return pointsPerLevel; }

    /** XP pour passer du niveau n-1 au niveau n. */
    public double xpForLevel(int n) {
        if (n < 1 || n > maxLevel) throw new IllegalArgumentException("niveau hors bornes : " + n);
        return Math.round(base * Math.pow(n, exponent));
    }

    /** XP totale pour atteindre le niveau donné depuis 0. */
    public double totalXpFor(int level) {
        return cumulative[Math.max(0, Math.min(level, maxLevel))];
    }

    public int levelFor(double xp) {
        int level = 0;
        while (level < maxLevel && xp >= cumulative[level + 1]) level++;
        return level;
    }

    /** Points de compétence gagnés à ce niveau. */
    public int pointsAt(int level) {
        return Math.max(0, Math.min(level, maxLevel)) * pointsPerLevel;
    }

    /** Avancement dans le niveau en cours, entre 0 et 1 (1 au niveau maximum). */
    public double progress(double xp) {
        int level = levelFor(xp);
        if (level >= maxLevel) return 1.0;
        double into = xp - cumulative[level];
        return Math.max(0, Math.min(1, into / xpForLevel(level + 1)));
    }

    /** XP manquante avant le prochain niveau (0 au niveau maximum). */
    public double xpToNext(double xp) {
        int level = levelFor(xp);
        if (level >= maxLevel) return 0;
        return Math.max(0, cumulative[level + 1] - xp);
    }

    /** XP plafonnée au total du niveau maximum : rien ne s'accumule au-delà. */
    public double clamp(double xp) {
        return Math.max(0, Math.min(xp, cumulative[maxLevel]));
    }
}
