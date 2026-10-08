package fr.vaeloria.factions.rules;

import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TotemTest {

    @Test
    void factionMustBreakEveryBlockInARow() {
        TotemProgress t = new TotemProgress(5);
        assertEquals(TotemProgress.Outcome.PROGRESS, t.hit("lions"));
        assertEquals(TotemProgress.Outcome.PROGRESS, t.hit("lions"));
        assertEquals(TotemProgress.Outcome.PROGRESS, t.hit("lions"));
        assertEquals(2, t.remaining());
        // Les Loups frappent : le totem repousse, ils ont 1 bloc.
        assertEquals(TotemProgress.Outcome.TAKEOVER, t.hit("loups"));
        assertEquals("loups", t.faction());
        assertEquals(1, t.broken());
        assertEquals(TotemProgress.Outcome.PROGRESS, t.hit("loups"));
        assertEquals(TotemProgress.Outcome.PROGRESS, t.hit("loups"));
        assertEquals(TotemProgress.Outcome.PROGRESS, t.hit("loups"));
        assertEquals(TotemProgress.Outcome.WIN, t.hit("loups"));
    }

    @Test
    void singleBlockTotemIsWonAtOnce() {
        assertEquals(TotemProgress.Outcome.WIN, new TotemProgress(1).hit("a"));
    }

    @Test
    void scheduleParsing() {
        var e = TotemSchedule.parse("Samedi 21:00");
        assertEquals(DayOfWeek.SATURDAY, e.day());
        assertEquals(21, e.hour());
        assertNull(e.totem());
        var f = TotemSchedule.parse("mercredi 20h30 citadelle");
        assertEquals(DayOfWeek.WEDNESDAY, f.day());
        assertEquals(30, f.minute());
        assertEquals("citadelle", f.totem());
        assertNull(TotemSchedule.parse("TOUS"));
        assertNull(TotemSchedule.parse("TOUS 25:00"));
        assertNull(TotemSchedule.parse("BLURP 10:00"));
        var daily = TotemSchedule.parse("TOUS 18:15");
        assertNull(daily.day());
        ZonedDateTime sat = ZonedDateTime.of(2026, 10, 10, 21, 0, 30, 0, ZoneId.of("Europe/Paris"));
        assertTrue(e.matches(sat));
        assertFalse(e.matches(sat.plusMinutes(1)));
        assertFalse(f.matches(sat));
        assertTrue(daily.matches(sat.withHour(18).withMinute(15)));
    }
}
