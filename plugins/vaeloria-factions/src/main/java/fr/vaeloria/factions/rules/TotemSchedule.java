package fr.vaeloria.factions.rules;

import java.text.Normalizer;
import java.time.DayOfWeek;
import java.time.ZonedDateTime;
import java.util.Locale;
import java.util.Map;

/** Programmation des totems : entrées « SAMEDI 21:00 [nom] », « TOUS 20:30 », « SAT 21:00 citadelle ». */
public final class TotemSchedule {
    private TotemSchedule() {}

    /** Une entrée analysée. day null = tous les jours ; totem null = au hasard. */
    public record Entry(DayOfWeek day, int hour, int minute, String totem) {
        public boolean matches(ZonedDateTime t) {
            return (day == null || t.getDayOfWeek() == day) && t.getHour() == hour && t.getMinute() == minute;
        }
    }

    private static final Map<String, DayOfWeek> DAYS = Map.ofEntries(
            Map.entry("LUNDI", DayOfWeek.MONDAY), Map.entry("MON", DayOfWeek.MONDAY), Map.entry("MONDAY", DayOfWeek.MONDAY),
            Map.entry("MARDI", DayOfWeek.TUESDAY), Map.entry("TUE", DayOfWeek.TUESDAY), Map.entry("TUESDAY", DayOfWeek.TUESDAY),
            Map.entry("MERCREDI", DayOfWeek.WEDNESDAY), Map.entry("WED", DayOfWeek.WEDNESDAY), Map.entry("WEDNESDAY", DayOfWeek.WEDNESDAY),
            Map.entry("JEUDI", DayOfWeek.THURSDAY), Map.entry("THU", DayOfWeek.THURSDAY), Map.entry("THURSDAY", DayOfWeek.THURSDAY),
            Map.entry("VENDREDI", DayOfWeek.FRIDAY), Map.entry("FRI", DayOfWeek.FRIDAY), Map.entry("FRIDAY", DayOfWeek.FRIDAY),
            Map.entry("SAMEDI", DayOfWeek.SATURDAY), Map.entry("SAT", DayOfWeek.SATURDAY), Map.entry("SATURDAY", DayOfWeek.SATURDAY),
            Map.entry("DIMANCHE", DayOfWeek.SUNDAY), Map.entry("SUN", DayOfWeek.SUNDAY), Map.entry("SUNDAY", DayOfWeek.SUNDAY));

    /** null si l'entrée est illisible. */
    public static Entry parse(String raw) {
        if (raw == null) return null;
        String[] p = raw.trim().split("\\s+");
        if (p.length < 2) return null;
        String d = Normalizer.normalize(p[0], Normalizer.Form.NFD).replaceAll("\\p{M}", "").toUpperCase(Locale.ROOT);
        DayOfWeek day;
        if (d.equals("TOUS") || d.equals("DAILY") || d.equals("*")) day = null;
        else {
            day = DAYS.get(d);
            if (day == null) return null;
        }
        String[] hm = p[1].replace('h', ':').split(":");
        try {
            int h = Integer.parseInt(hm[0]);
            int m = hm.length > 1 && !hm[1].isEmpty() ? Integer.parseInt(hm[1]) : 0;
            if (h < 0 || h > 23 || m < 0 || m > 59) return null;
            return new Entry(day, h, m, p.length > 2 ? p[2] : null);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
