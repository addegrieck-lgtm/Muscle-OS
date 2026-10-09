package fr.vaeloria.staff.util;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

class IdsTest {
    @Test
    void slugStripsColorsAndAccents() {
        assertEquals("bienvenue_a_l_arene", Ids.slug("&6&lBienvenue à l'Arène !"));
        assertEquals("discord", Ids.slug("&#ff8800Discord"));
        assertEquals("", Ids.slug("&6!!!"));
    }

    @Test
    void uniqueAddsSuffix() {
        Set<String> taken = Set.of("arene", "arene_2");
        assertEquals("arene_3", Ids.unique("Arène", "x", taken::contains));
        assertEquals("pnj", Ids.unique("§§§", "pnj", taken::contains));
    }
}
