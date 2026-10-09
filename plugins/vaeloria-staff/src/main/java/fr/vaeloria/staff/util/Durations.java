package fr.vaeloria.staff.util;

import java.time.Duration;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Durées des sanctions : « 30s », « 10m », « 2h », « 7d », « 1w », combinables (« 1d12h ») ; « perm » = définitif. */
public final class Durations {
    private Durations() {}

    private static final Pattern PART = Pattern.compile("(\\d+)([smhdwj])");

    /** @return la durée, {@code null} pour « perm »/« def » ; lève IllegalArgumentException si illisible. */
    public static Duration parse(String input) {
        String s = input.trim().toLowerCase(Locale.ROOT);
        if (s.equals("perm") || s.equals("permanent") || s.equals("def") || s.equals("definitif") || s.equals("définitif")) {
            return null;
        }
        Matcher m = PART.matcher(s);
        int end = 0;
        long seconds = 0;
        while (m.find()) {
            if (m.start() != end) throw new IllegalArgumentException(input);
            long n = Long.parseLong(m.group(1));
            seconds += switch (m.group(2)) {
                case "s" -> n;
                case "m" -> n * 60;
                case "h" -> n * 3600;
                case "d", "j" -> n * 86_400;
                default -> n * 604_800; // w
            };
            end = m.end();
        }
        if (end == 0 || end != s.length() || seconds <= 0) throw new IllegalArgumentException(input);
        return Duration.ofSeconds(seconds);
    }

    /** « 2j 3h », « 45min », « définitif ». */
    public static String format(Duration d) {
        if (d == null) return "définitif";
        long s = Math.max(0, d.getSeconds());
        long days = s / 86_400, hours = s % 86_400 / 3600, minutes = s % 3600 / 60, secs = s % 60;
        StringBuilder out = new StringBuilder();
        if (days > 0) out.append(days).append("j ");
        if (hours > 0) out.append(hours).append("h ");
        if (minutes > 0 && days == 0) out.append(minutes).append("min ");
        if (secs > 0 && days == 0 && hours == 0) out.append(secs).append("s ");
        return out.isEmpty() ? "0s" : out.toString().trim();
    }
}
