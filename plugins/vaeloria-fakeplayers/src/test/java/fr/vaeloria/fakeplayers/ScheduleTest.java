package fr.vaeloria.fakeplayers;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ScheduleTest {
    private static final List<Schedule.Period> PERIODS = List.of(
            new Schedule.Period(LocalDate.of(2026, 10, 17), LocalDate.of(2026, 11, 1), Set.of("A", "B", "C"), "Toussaint"),
            new Schedule.Period(LocalDate.of(2027, 2, 6), LocalDate.of(2027, 2, 21), Set.of("C"), "hiver"));

    private static Schedule schedule(double variation, double noise) {
        return new Schedule(Schedule.DEFAULT_CURVES, PERIODS, Set.of("A", "B", "C"), true, Set.of(), variation, noise, 42);
    }

    private static LocalDateTime at(int y, int m, int d, int h) { return LocalDateTime.of(y, m, d, h, 0); }

    @Test
    void computesEasterAndFrenchPublicHolidays() {
        assertEquals(LocalDate.of(2027, 3, 28), Schedule.easterSunday(2027));
        assertEquals(LocalDate.of(2026, 4, 5), Schedule.easterSunday(2026));
        Schedule s = schedule(0, 0);
        assertTrue(s.isPublicHoliday(LocalDate.of(2027, 3, 29)));  // lundi de Pâques
        assertTrue(s.isPublicHoliday(LocalDate.of(2027, 5, 6)));   // Ascension
        assertTrue(s.isPublicHoliday(LocalDate.of(2027, 5, 17)));  // lundi de Pentecôte
        assertTrue(s.isPublicHoliday(LocalDate.of(2026, 11, 11)));
        assertFalse(s.isPublicHoliday(LocalDate.of(2026, 11, 12)));
    }

    @Test
    void weekendsHolidaysAndPartialZones() {
        Schedule s = schedule(0, 0);
        assertEquals(0, s.offFraction(LocalDate.of(2026, 10, 8)));     // jeudi d'école
        assertEquals(1, s.offFraction(LocalDate.of(2026, 10, 10)));    // samedi
        assertEquals(1, s.offFraction(LocalDate.of(2026, 10, 20)));    // Toussaint, toutes zones
        assertEquals(1.0 / 3, s.offFraction(LocalDate.of(2027, 2, 9)), 1e-9); // hiver, zone C seule
        assertEquals("hiver (33 % des zones)", s.describe(LocalDate.of(2027, 2, 9)));
        assertEquals("jour d'école", s.describe(LocalDate.of(2026, 10, 8)));
        assertEquals("jour férié", s.describe(LocalDate.of(2026, 11, 11)));
    }

    @Test
    void eveningsBeatAfternoonsOnSchoolDaysAndNightsAreEmpty() {
        Schedule s = schedule(0, 0);
        double thursday21 = s.percent(at(2026, 10, 8, 21)), thursday10 = s.percent(at(2026, 10, 8, 10));
        double thursday3 = s.percent(at(2026, 10, 9, 3));
        assertTrue(thursday21 > thursday10 * 5, thursday21 + " vs " + thursday10);
        assertTrue(thursday3 < 5);
        // Vendredi soir > jeudi soir ; samedi après-midi > jeudi après-midi ; mercredi après-midi > jeudi après-midi
        assertTrue(s.percent(at(2026, 10, 9, 21)) > thursday21);
        assertTrue(s.percent(at(2026, 10, 10, 15)) > s.percent(at(2026, 10, 8, 15)));
        assertTrue(s.percent(at(2026, 10, 7, 15)) > s.percent(at(2026, 10, 8, 15)));
        // Nuit de vendredi à samedi (courbe du vendredi) bien plus remplie que la nuit de dimanche à lundi
        assertTrue(s.percent(at(2026, 10, 10, 1)) > 3 * s.percent(at(2026, 10, 12, 1)));
        // Mardi 13 h pendant la Toussaint > mardi 13 h d'école
        assertTrue(s.percent(at(2026, 10, 20, 13)) > 2 * s.percent(at(2026, 10, 6, 13)));
    }

    @Test
    void targetStaysWithinBoundsAndIsReproducible() {
        Schedule s = schedule(0.15, 0.10);
        LocalDateTime t = at(2026, 10, 9, 0);
        for (int i = 0; i < 24 * 14 * 4; i++, t = t.plusMinutes(15)) {
            int target = s.target(t, 12, 120, 150);
            assertTrue(target >= 12 * 0.7 && target <= 150, t + " → " + target);
            assertEquals(target, schedule(0.15, 0.10).target(t, 12, 120, 150));
        }
        Schedule flat = schedule(0, 0);
        assertEquals(120, flat.target(at(2026, 10, 10, 21), 12, 120, 150)); // samedi 21 h = 100 % → pic
        assertEquals(13, flat.target(at(2026, 10, 8, 4), 12, 120, 150));    // jeudi 4 h = 1 % → creux
    }

    @Test
    void parsesDurations() {
        assertEquals(45, Durations.parseSeconds("45"));
        assertEquals(30, Durations.parseSeconds("30s"));
        assertEquals(600, Durations.parseSeconds("10m"));
        assertEquals(7200, Durations.parseSeconds("2h"));
        assertEquals(-1, Durations.parseSeconds("abc"));
    }
}
