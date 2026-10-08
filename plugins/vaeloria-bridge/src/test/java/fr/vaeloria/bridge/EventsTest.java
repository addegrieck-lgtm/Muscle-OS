package fr.vaeloria.bridge;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class EventsTest {
    @Test
    void keepsValidFactionNames() {
        assertEquals("Ordre-Noir", Events.factionOrNull("  Ordre-Noir "));
    }

    @Test
    void dropsNamesTheApiWouldReject() {
        assertNull(Events.factionOrNull(null));
        assertNull(Events.factionOrNull("X"));
        assertNull(Events.factionOrNull("UnNomDeFactionBeaucoupTropLong"));
        assertNull(Events.factionOrNull("Wilderness"));
    }
}
