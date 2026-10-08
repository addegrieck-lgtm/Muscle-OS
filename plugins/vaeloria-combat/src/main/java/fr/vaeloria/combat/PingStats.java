package fr.vaeloria.combat;

/**
 * Ping lissé et stabilité (gigue) d'un joueur, à partir d'échantillons réguliers.
 * Une gigue élevée gêne plus le PvP qu'un ping élevé mais stable : le recul arrive tantôt tôt, tantôt tard.
 */
public final class PingStats {
    private static final double ALPHA = 0.2;
    private double ping = -1;
    private double jitter;
    private int last = -1;

    public synchronized void sample(int pingMs) {
        if (pingMs < 0) return;
        if (ping < 0) {
            ping = pingMs;
        } else {
            ping += ALPHA * (pingMs - ping);
            jitter += ALPHA * (Math.abs(pingMs - last) - jitter);
        }
        last = pingMs;
    }

    /** Ping lissé en ms, -1 tant qu'aucun échantillon. */
    public synchronized int ping() {
        return ping < 0 ? -1 : (int) Math.round(ping);
    }

    /** Variation moyenne entre deux échantillons, en ms. */
    public synchronized int jitter() {
        return (int) Math.round(jitter);
    }
}
