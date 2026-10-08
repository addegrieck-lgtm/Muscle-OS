package fr.vaeloria.tab;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ServerListSettingsTest {
    private ServerListSettings settings(boolean maintenance) {
        return new ServerListSettings(true, true, "<logo>", List.of("a", "b", "c"), 8,
                List.of(), true, 8, "", -1, maintenance, "maintenance", "Maintenance", "kick");
    }

    @Test
    void ligne2EnRotation() {
        ServerListSettings s = settings(false);
        assertEquals("a", s.line2At(0));
        assertEquals("a", s.line2At(7_999));
        assertEquals("b", s.line2At(8_000));
        assertEquals("c", s.line2At(16_000));
        assertEquals("a", s.line2At(24_000));
    }

    @Test
    void maintenanceRemplaceLaLigne2() {
        assertEquals("maintenance", settings(true).line2At(8_000));
    }
}
