package fr.vaeloria.echanges.model;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ForbiddenTest {
    @Test
    void fusionneSansDoublon() {
        // Un livre déjà mémorisé est déplacé en fin de liste (le plus récent), jamais dupliqué.
        assertEquals("mending:1,protection:4", Forbidden.merge("protection:4", List.of("mending:1", "protection:4"), 10));
        assertEquals(Set.of("protection:4", "mending:1"), Forbidden.parse(Forbidden.merge("protection:4", List.of("mending:1", "protection:4"), 10)));
    }

    @Test
    void oublieLesPlusAnciens() {
        assertEquals("b:1,c:1", Forbidden.merge("a:1,b:1", List.of("c:1"), 2));
    }

    @Test
    void videOuNul() {
        assertEquals(Set.of(), Forbidden.parse(null));
        assertEquals(Set.of(), Forbidden.parse(" "));
        assertEquals("x:1", Forbidden.merge("", List.of("x:1"), 5));
    }
}
