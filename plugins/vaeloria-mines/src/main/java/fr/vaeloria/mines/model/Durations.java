package fr.vaeloria.mines.model;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Délais saisis par les admins (« 15m », « 1h30 », « 90s », « 15 » = minutes) et affichage en français. */
public final class Durations {
    private Durations() {}

    public static final long MIN_SECONDS = 10;
    public static final long MAX_SECONDS = 7 * 24 * 3600;

    private static final Pattern TOKEN = Pattern.compile("(\\d{1,7})(j|d|h|min|mn|m|sec|s)?");

    /** Secondes, ou -1 si la saisie est invalide ou hors de [10 s, 7 j]. */
    public static long parse(String input) {
        String s = input.toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
        if (s.isEmpty()) return -1;
        if (s.matches("\\d{1,7}")) return bounded(Long.parseLong(s) * 60);
        Matcher m = TOKEN.matcher(s);
        long total = 0;
        long lastUnit = 0;
        int pos = 0;
        while (m.lookingAt()) {
            long n = Long.parseLong(m.group(1));
            String unit = m.group(2);
            long u;
            if (unit == null) {
                // « 1h30 » : un nombre sans unité après une unité prend l'unité inférieure.
                if (lastUnit == 0 || m.end() != s.length()) return -1;
                u = lastUnit == 86400 ? 3600 : lastUnit == 3600 ? 60 : lastUnit == 60 ? 1 : -1;
                if (u < 0) return -1;
            } else {
                u = switch (unit) {
                    case "j", "d" -> 86400;
                    case "h" -> 3600;
                    case "min", "mn", "m" -> 60;
                    default -> 1;
                };
            }
            total += n * u;
            lastUnit = u;
            pos = m.end();
            m.region(pos, s.length());
            if (pos == s.length()) break;
        }
        if (pos != s.length()) return -1;
        return bounded(total);
    }

    private static long bounded(long seconds) {
        return seconds >= MIN_SECONDS && seconds <= MAX_SECONDS ? seconds : -1;
    }

    /** « 1 heure 30 minutes », « 15 minutes », « 1 minute 5 secondes », « 0 seconde ». */
    public static String format(long seconds) {
        if (seconds < 0) seconds = 0;
        long d = seconds / 86400, h = seconds % 86400 / 3600, m = seconds % 3600 / 60, s = seconds % 60;
        StringBuilder b = new StringBuilder();
        append(b, d, "jour");
        append(b, h, "heure");
        append(b, m, "minute");
        if (s > 0 || b.isEmpty()) append(b, s, "seconde");
        if (b.isEmpty()) b.append("0 seconde");
        return b.toString();
    }

    private static void append(StringBuilder b, long n, String unit) {
        if (n == 0) return;
        if (!b.isEmpty()) b.append(' ');
        b.append(n).append(' ').append(unit).append(n > 1 ? "s" : "");
    }

    /** Format court : « 1:05:09 », « 14:59 », « 0:07 ». */
    public static String clock(long seconds) {
        if (seconds < 0) seconds = 0;
        long h = seconds / 3600, m = seconds % 3600 / 60, s = seconds % 60;
        return h > 0 ? String.format(Locale.ROOT, "%d:%02d:%02d", h, m, s) : String.format(Locale.ROOT, "%d:%02d", m, s);
    }
}
