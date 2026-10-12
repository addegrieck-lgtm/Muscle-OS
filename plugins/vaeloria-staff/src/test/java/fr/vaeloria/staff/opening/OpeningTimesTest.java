package fr.vaeloria.staff.opening;

import org.junit.jupiter.api.Test;

import java.time.ZoneId;
import java.time.ZonedDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class OpeningTimesTest {
    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");
    private static final ZonedDateTime NOW = ZonedDateTime.of(2026, 10, 12, 15, 0, 0, 0, PARIS);

    private static ZonedDateTime at(int y, int mo, int d, int h, int mi) {
        return ZonedDateTime.of(y, mo, d, h, mi, 0, 0, PARIS);
    }

    @Test
    void absoluteDates() {
        assertEquals(at(2026, 10, 20, 18, 0), OpeningTimes.parse("2026-10-20 18:00", NOW));
        assertEquals(at(2026, 10, 20, 18, 30), OpeningTimes.parse("20/10/2026 18h30", NOW));
        assertEquals(at(2026, 10, 20, 18, 0), OpeningTimes.parse("20/10 18h", NOW));
        assertEquals(at(2027, 1, 5, 20, 0), OpeningTimes.parse("05/01 20:00", NOW)); // passé cette année → l'an prochain
    }

    @Test
    void timeOnly() {
        assertEquals(at(2026, 10, 12, 18, 0), OpeningTimes.parse("18h", NOW));
        assertEquals(at(2026, 10, 13, 14, 0), OpeningTimes.parse("14:00", NOW)); // déjà passé → demain
    }

    @Test
    void relative() {
        assertEquals(NOW.plusHours(2), OpeningTimes.parse("+2h", NOW));
        assertEquals(NOW.plusHours(36), OpeningTimes.parse("dans 1d12h", NOW));
    }

    @Test
    void rejects() {
        for (String bad : new String[] {"", "demain", "2026-10-01 18:00", "32/10 18h", "25h", "+perm", "+abc"}) {
            assertThrows(IllegalArgumentException.class, () -> OpeningTimes.parse(bad, NOW), bad);
        }
    }
}
