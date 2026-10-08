package fr.vaeloria.combat;

/**
 * Bascule le serveur en mode dégradé quand le MSPT moyen reste trop haut, et l'en sort quand il est revenu bas.
 * Deux seuils + deux durées (hystérésis) : un pic isolé ne déclenche rien, et le mode ne clignote pas autour du seuil.
 */
public final class LagGuard {
    public enum Transition { NONE, DEGRADE, RECOVER }

    public record Settings(double degradeMspt, double recoverMspt, long degradeAfterMs, long recoverAfterMs) {
        public Settings {
            if (recoverMspt >= degradeMspt) throw new IllegalArgumentException("recover-mspt doit être inférieur à degrade-mspt");
        }
    }

    private final Settings s;
    private boolean degraded;
    private long since = -1;

    public LagGuard(Settings settings) {
        this.s = settings;
    }

    public boolean degraded() {
        return degraded;
    }

    /** À appeler à intervalle régulier (1 fois par seconde) avec le MSPT moyen récent. */
    public Transition update(double avgMspt, long nowMs) {
        boolean pressure = degraded ? avgMspt < s.recoverMspt() : avgMspt >= s.degradeMspt();
        if (!pressure) {
            since = -1;
            return Transition.NONE;
        }
        if (since < 0) since = nowMs;
        if (nowMs - since < (degraded ? s.recoverAfterMs() : s.degradeAfterMs())) return Transition.NONE;
        since = -1;
        degraded = !degraded;
        return degraded ? Transition.DEGRADE : Transition.RECOVER;
    }
}
