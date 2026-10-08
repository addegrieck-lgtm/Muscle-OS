package fr.vaeloria.tab;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;

class TabLimitTest {
    private final List<Integer> ordered = IntStream.range(0, 100).boxed().toList();

    @Test
    void plafonneDansLOrdre() {
        Set<Integer> shown = TabLimit.shown(ordered, 3, 75);
        assertEquals(75, shown.size());
        assertTrue(shown.contains(0));
        assertTrue(shown.contains(74));
        assertFalse(shown.contains(75));
    }

    @Test
    void leJoueurSeVoitToujours() {
        Set<Integer> shown = TabLimit.shown(ordered, 99, 75);
        assertEquals(75, shown.size());
        assertTrue(shown.contains(99));
        assertFalse(shown.contains(74)); // sa place est prise sur le dernier
    }

    @Test
    void sansLimite() {
        assertEquals(100, TabLimit.shown(ordered, 99, 0).size());
        assertEquals(3, TabLimit.shown(List.of(1, 2, 3), 1, 75).size());
    }
}
