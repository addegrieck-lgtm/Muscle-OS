package fr.vaeloria.factions.rules;

/** Chronomètre de casse du totem, en ticks (20 par seconde). */
public final class DigTimer {
    private DigTimer() {}

    public static int ticksFor(double seconds) {
        return Math.max(1, (int) Math.round(seconds * 20));
    }

    /** Avancement 0..1 après {@code elapsed} ticks. */
    public static float progress(int elapsed, int total) {
        return Math.max(0f, Math.min(1f, elapsed / (float) Math.max(1, total)));
    }

    public static boolean done(int elapsed, int total) {
        return elapsed >= total;
    }
}
