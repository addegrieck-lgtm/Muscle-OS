package fr.vaeloria.fakeplayers;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.MonthDay;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;

/**
 * Nombre de faux joueurs visé selon l'heure, le jour, les vacances scolaires et les jours fériés.
 * Indépendant de Bukkit pour être testable.
 *
 * <p>Chaque courbe donne 24 pourcentages du pic (heures 0 à 23). Une « journée » va de 6 h à 6 h :
 * les heures 0 à 5 d'une courbe décrivent donc la nuit <em>qui suit</em> cette journée
 * (la nuit de vendredi à samedi utilise la courbe du vendredi).
 *
 * <p>Le pourcentage mélange les courbes selon la part de zones en congé aujourd'hui (a) et demain (b) :
 * {@code (1-a)(1-b)·school + (1-a)b·schoolEve + a(1-b)·dayOffEve + ab·dayOff}. Une semaine où une seule
 * zone sur trois est en vacances donne donc un tiers de « jour de congé ».
 */
public final class Schedule {
    public static final int DAY_START_HOUR = 6;

    public record Period(LocalDate from, LocalDate to, Set<String> zones, String name) {
        boolean covers(LocalDate date, String zone) {
            return zones.contains(zone) && !date.isBefore(from) && !date.isAfter(to);
        }
    }

    public record Curves(double[] school, double[] wednesday, double[] schoolEve, double[] dayOff, double[] dayOffEve) {
        public Curves {
            for (double[] c : List.of(school, wednesday, schoolEve, dayOff, dayOffEve)) {
                if (c.length != 24) throw new IllegalArgumentException("Chaque courbe doit avoir 24 valeurs");
            }
        }

        public static Curves from(Map<String, double[]> map, Curves fallback) {
            return new Curves(map.getOrDefault("school", fallback.school), map.getOrDefault("wednesday", fallback.wednesday),
                    map.getOrDefault("school-eve", fallback.schoolEve), map.getOrDefault("day-off", fallback.dayOff),
                    map.getOrDefault("day-off-eve", fallback.dayOffEve));
        }
    }

    /** Courbes par défaut (% du pic), pensées pour un serveur PvP/Faction français. */
    public static final Curves DEFAULT_CURVES = new Curves(
            //          0   1   2  3  4  5  6  7  8  9 10 11  12  13 14 15  16  17  18  19  20  21  22  23
            new double[]{10, 4, 2, 1, 1, 1, 1, 2, 3, 3, 4, 6, 12, 12, 6, 6, 12, 30, 45, 50, 60, 65, 45, 22},
            new double[]{10, 4, 2, 1, 1, 1, 1, 2, 3, 4, 6, 8, 15, 30, 45, 55, 60, 60, 55, 55, 60, 65, 45, 22},
            new double[]{50, 35, 20, 10, 5, 3, 1, 2, 3, 3, 4, 6, 12, 12, 6, 6, 15, 40, 55, 65, 80, 90, 85, 65},
            new double[]{55, 40, 25, 12, 6, 3, 2, 2, 4, 8, 15, 25, 35, 40, 55, 65, 70, 70, 70, 75, 90, 100, 95, 75},
            new double[]{12, 5, 2, 1, 1, 1, 2, 2, 4, 8, 15, 25, 35, 40, 55, 65, 70, 70, 65, 65, 70, 65, 40, 18});

    private final Curves curves;
    private final List<Period> periods;
    private final Set<String> zones;
    private final boolean frenchPublicHolidays;
    private final Set<LocalDate> extraDaysOff;
    private final double dailyVariation;
    private final double noise;
    private final long seed;

    public Schedule(Curves curves, Collection<Period> periods, Set<String> zones, boolean frenchPublicHolidays,
                    Set<LocalDate> extraDaysOff, double dailyVariation, double noise, long seed) {
        this.curves = curves;
        this.periods = List.copyOf(periods);
        this.zones = Set.copyOf(zones);
        this.frenchPublicHolidays = frenchPublicHolidays;
        this.extraDaysOff = Set.copyOf(extraDaysOff);
        this.dailyVariation = clamp(dailyVariation, 0, 0.9);
        this.noise = clamp(noise, 0, 0.9);
        this.seed = seed;
    }

    /** Journée « logique » : avant 6 h, on est encore dans la nuit de la veille. */
    public static LocalDate logicalDate(LocalDateTime time) {
        return time.minusHours(DAY_START_HOUR).toLocalDate();
    }

    /** Part (0 à 1) des zones sans école ce jour-là : 1 le week-end et les jours fériés. */
    public double offFraction(LocalDate date) {
        DayOfWeek dow = date.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY || isPublicHoliday(date) || extraDaysOff.contains(date)) return 1;
        if (zones.isEmpty()) return 0;
        int off = 0;
        for (String zone : zones) {
            for (Period p : periods) {
                if (p.covers(date, zone)) { off++; break; }
            }
        }
        return (double) off / zones.size();
    }

    public boolean isPublicHoliday(LocalDate date) {
        if (!frenchPublicHolidays) return false;
        MonthDay md = MonthDay.from(date);
        for (String fixed : List.of("--01-01", "--05-01", "--05-08", "--07-14", "--08-15", "--11-01", "--11-11", "--12-25")) {
            if (md.equals(MonthDay.parse(fixed))) return true;
        }
        LocalDate easter = easterSunday(date.getYear());
        return date.equals(easter.plusDays(1)) || date.equals(easter.plusDays(39)) || date.equals(easter.plusDays(50));
    }

    /** Dimanche de Pâques (calendrier grégorien, algorithme de Meeus/Jones/Butcher). */
    public static LocalDate easterSunday(int y) {
        int a = y % 19, b = y / 100, c = y % 100, d = b / 4, e = b % 4, f = (b + 8) / 25, g = (b - f + 1) / 3;
        int h = (19 * a + b - d - g + 15) % 30, i = c / 4, k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
        int m = (a + 11 * h + 22 * l) / 451, month = (h + l - 7 * m + 114) / 31, day = (h + l - 7 * m + 114) % 31 + 1;
        return LocalDate.of(y, month, day);
    }

    /** Pourcentage du pic (0 à 100) attendu à cet instant, sans aléatoire. */
    public double percent(LocalDateTime time) {
        LocalDate day = logicalDate(time);
        double a = offFraction(day), b = offFraction(day.plusDays(1));
        double[] school = day.getDayOfWeek() == DayOfWeek.WEDNESDAY ? curves.wednesday : curves.school;
        int hour = time.getHour();
        double t = time.getMinute() / 60.0;
        return (1 - a) * (1 - b) * at(school, hour, t) + (1 - a) * b * at(curves.schoolEve, hour, t)
                + a * (1 - b) * at(curves.dayOffEve, hour, t) + a * b * at(curves.dayOff, hour, t);
    }

    /**
     * Multiplicateur aléatoire mais reproductible (même résultat après un redémarrage) :
     * une variation par jour (± dailyVariation) et un bruit doux qui change tous les quarts d'heure (± noise).
     */
    public double randomFactor(LocalDateTime time) {
        LocalDate day = logicalDate(time);
        double daily = 1 + dailyVariation * signed(day.toEpochDay() * 31 + 7);
        long slotMinutes = 15;
        long minutes = time.toLocalDate().toEpochDay() * 1440 + time.getHour() * 60L + time.getMinute();
        long slot = Math.floorDiv(minutes, slotMinutes);
        double t = (double) Math.floorMod(minutes, slotMinutes) / slotMinutes;
        double n = signed(slot * 131 + 3) * (1 - t) + signed((slot + 1) * 131 + 3) * t;
        return daily * (1 + noise * n);
    }

    /** Nombre de faux joueurs visé, entre floor et peak. */
    public int target(LocalDateTime time, int floor, int peak) {
        double value = peak * percent(time) / 100.0 * randomFactor(time);
        return (int) Math.max(floor, Math.min(peak, Math.round(value)));
    }

    /** Libellé lisible de la journée (pour /fp schedule). */
    public String describe(LocalDate day) {
        DayOfWeek dow = day.getDayOfWeek();
        if (isPublicHoliday(day)) return "jour férié";
        if (extraDaysOff.contains(day)) return "jour de congé";
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) return holidayName(day).map(n -> "week-end, " + n).orElse("week-end");
        double off = offFraction(day);
        String base = dow == DayOfWeek.WEDNESDAY ? "mercredi d'école" : "jour d'école";
        if (off == 0) return base;
        String name = holidayName(day).orElse("vacances");
        return off >= 1 ? name : name + " (" + Math.round(off * 100) + " % des zones)";
    }

    private Optional<String> holidayName(LocalDate day) {
        for (Period p : periods) {
            for (String zone : zones) if (p.covers(day, zone)) return Optional.of(p.name());
        }
        return Optional.empty();
    }

    private static double at(double[] curve, int hour, double t) {
        return curve[hour] * (1 - t) + curve[(hour + 1) % 24] * t;
    }

    /** Valeur pseudo-aléatoire reproductible dans [-1, 1]. */
    private double signed(long key) {
        return new Random(seed ^ (key * 0x9E3779B97F4A7C15L)).nextDouble() * 2 - 1;
    }

    private static double clamp(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
    }
}
