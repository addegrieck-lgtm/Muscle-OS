package fr.vaeloria.echanges.model;

/** Fin d'un livre : il disparaît après sa date d'expiration ou quand toutes ses ventes ont été faites. */
public final class Expiry {
    private Expiry() {}

    /** {@code expiresAt} ≤ 0 : pas de limite de temps. {@code limit} ≤ 0 : ventes illimitées. */
    public static boolean due(long now, long expiresAt, int sales, int limit) {
        return (expiresAt > 0 && now >= expiresAt) || (limit > 0 && sales >= limit);
    }

    public static long expiresAt(long now, double hours) {
        return hours <= 0 ? 0 : now + Math.round(hours * 3_600_000);
    }

    /** Temps restant lisible : « 2 j 5 h », « 3 h 20 min », « 12 min ». */
    public static String remaining(long millis) {
        long minutes = Math.max(0, millis) / 60_000;
        long days = minutes / 1440, hours = minutes % 1440 / 60, mins = minutes % 60;
        if (days > 0) return days + " j" + (hours > 0 ? " " + hours + " h" : "");
        if (hours > 0) return hours + " h" + (mins > 0 ? " " + mins + " min" : "");
        return Math.max(1, mins) + " min";
    }
}
