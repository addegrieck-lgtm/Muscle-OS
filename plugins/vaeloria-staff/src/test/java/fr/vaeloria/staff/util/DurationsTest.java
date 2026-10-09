package fr.vaeloria.staff.util;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DurationsTest {
    @Test
    void parsesUnitsAndCombinations() {
        assertEquals(Duration.ofSeconds(30), Durations.parse("30s"));
        assertEquals(Duration.ofMinutes(10), Durations.parse("10m"));
        assertEquals(Duration.ofHours(2), Durations.parse("2h"));
        assertEquals(Duration.ofDays(7), Durations.parse("7d"));
        assertEquals(Duration.ofDays(3), Durations.parse("3j"));
        assertEquals(Duration.ofDays(14), Durations.parse("2w"));
        assertEquals(Duration.ofHours(36), Durations.parse("1d12h"));
        assertEquals(Duration.ofHours(1), Durations.parse(" 1H "));
    }

    @Test
    void permanent() {
        assertNull(Durations.parse("perm"));
        assertNull(Durations.parse("définitif"));
    }

    @Test
    void rejectsGarbage() {
        for (String bad : new String[] {"", "abc", "10", "10x", "h1", "1h-", "0m", "1h spam"}) {
            assertThrows(IllegalArgumentException.class, () -> Durations.parse(bad), bad);
        }
    }

    @Test
    void formats() {
        assertEquals("définitif", Durations.format(null));
        assertEquals("45min", Durations.format(Duration.ofMinutes(45)));
        assertEquals("2h 30min", Durations.format(Duration.ofMinutes(150)));
        assertEquals("7j", Durations.format(Duration.ofDays(7)));
        assertEquals("1j 12h", Durations.format(Duration.ofHours(36)));
        assertEquals("30s", Durations.format(Duration.ofSeconds(30)));
    }
}
