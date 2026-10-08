package fr.vaeloria.fakeplayers;

import java.util.Locale;

/** Durées saisies en commande : "45" ou "45s", "10m", "2h". */
final class Durations {
    private Durations() {}

    /** Durée en secondes, ou -1 si invalide. */
    static long parseSeconds(String s) {
        String v = s.toLowerCase(Locale.ROOT).trim();
        long unit = 1;
        if (v.endsWith("s")) v = v.substring(0, v.length() - 1);
        else if (v.endsWith("m")) { unit = 60; v = v.substring(0, v.length() - 1); }
        else if (v.endsWith("h")) { unit = 3600; v = v.substring(0, v.length() - 1); }
        try {
            long n = Long.parseLong(v);
            return n < 0 ? -1 : n * unit;
        } catch (NumberFormatException e) {
            return -1;
        }
    }
}
