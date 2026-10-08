package fr.vaeloria.mines.model;

/**
 * Avertissements avant réinitialisation (« dans 15 minutes », « dans 10 secondes »…).
 * Le compte à rebours est vérifié chaque seconde, mais un tick en retard peut sauter une seconde :
 * on annonce donc le seuil franchi entre deux vérifications plutôt que d'exiger une égalité exacte.
 */
public final class Countdown {
    private Countdown() {}

    /** Plus petit seuil t tel que now ≤ t &lt; previous (donc franchi depuis la dernière vérification), sinon -1. */
    public static long crossed(long[] thresholds, long previous, long now) {
        if (now <= 0) return -1;
        long best = -1;
        for (long t : thresholds) {
            if (t > 0 && now <= t && t < previous && (best < 0 || t < best)) best = t;
        }
        return best;
    }
}
