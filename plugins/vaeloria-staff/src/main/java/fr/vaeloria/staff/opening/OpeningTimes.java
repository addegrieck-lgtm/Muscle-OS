package fr.vaeloria.staff.opening;

import fr.vaeloria.staff.util.Durations;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Date d'ouverture saisie par un admin, dans le fuseau du serveur :
 * « 2026-10-20 18:00 », « 20/10/2026 18h00 », « 20/10 18h », « 18:30 » (aujourd'hui, ou demain si passé),
 * ou une durée « +2h », « dans 1d12h » (« 18h » seul = 18h00, pas dans 18 heures).
 */
public final class OpeningTimes {
    private OpeningTimes() {}

    private static final Pattern ISO = Pattern.compile("(\\d{4})-(\\d{1,2})-(\\d{1,2})\\s+(\\d{1,2})[:h](\\d{2})?");
    private static final Pattern FR = Pattern.compile("(\\d{1,2})/(\\d{1,2})(?:/(\\d{4}))?\\s+(\\d{1,2})[:h](\\d{2})?");
    private static final Pattern TIME = Pattern.compile("(\\d{1,2})[:h](\\d{2})?");
    private static final DateTimeFormatter DISPLAY = DateTimeFormatter.ofPattern("EEEE d MMMM 'à' HH'h'mm", Locale.FRENCH);

    /** @throws IllegalArgumentException si illisible ou dans le passé */
    public static ZonedDateTime parse(String input, ZonedDateTime now) {
        String s = input.trim().toLowerCase(Locale.ROOT);
        if (s.startsWith("+") || s.startsWith("dans ")) {
            Duration d = Durations.parse(s.startsWith("+") ? s.substring(1) : s.substring(5));
            if (d == null) throw new IllegalArgumentException(input);
            return now.plus(d);
        }
        ZonedDateTime at;
        Matcher m;
        try {
            if ((m = ISO.matcher(s)).matches()) {
                at = at(now, LocalDate.of(i(m, 1), i(m, 2), i(m, 3)), m.group(4), m.group(5));
            } else if ((m = FR.matcher(s)).matches()) {
                int year = m.group(3) == null ? now.getYear() : i(m, 3);
                at = at(now, LocalDate.of(year, i(m, 2), i(m, 1)), m.group(4), m.group(5));
                if (m.group(3) == null && !at.isAfter(now)) at = at.plusYears(1);
            } else if ((m = TIME.matcher(s)).matches()) {
                at = at(now, now.toLocalDate(), m.group(1), m.group(2));
                if (!at.isAfter(now)) at = at.plusDays(1);
            } else {
                throw new IllegalArgumentException(input);
            }
        } catch (java.time.DateTimeException e) {
            throw new IllegalArgumentException(input, e);
        }
        if (!at.isAfter(now)) throw new IllegalArgumentException("date passée : " + input);
        return at;
    }

    private static ZonedDateTime at(ZonedDateTime now, LocalDate date, String hour, String minute) {
        LocalTime time = LocalTime.of(Integer.parseInt(hour), minute == null ? 0 : Integer.parseInt(minute));
        return ZonedDateTime.of(LocalDateTime.of(date, time), now.getZone());
    }

    private static int i(Matcher m, int group) {
        return Integer.parseInt(m.group(group));
    }

    /** « samedi 20 octobre à 18h00 ». */
    public static String display(ZonedDateTime at) {
        return DISPLAY.format(at);
    }
}
