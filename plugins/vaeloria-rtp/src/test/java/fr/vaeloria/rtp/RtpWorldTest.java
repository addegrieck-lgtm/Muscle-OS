package fr.vaeloria.rtp;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class RtpWorldTest {
    @Test
    void roundTripsThroughMap() {
        RtpWorld w = new RtpWorld("faction");
        w.set("display-name", "<green>Faction");
        w.set("description", "Ligne 1 | Ligne 2");
        w.set("shape", "circle");
        w.set("max-radius", "8000");
        w.set("min-radius", "1 000");
        w.set("max-y", "100");
        w.set("permission", "oui");
        w.center(250, -40);

        RtpWorld copy = RtpWorld.fromMap("faction", w.toMap());
        assertEquals("<green>Faction", copy.displayName());
        assertEquals(List.of("Ligne 1", "Ligne 2"), copy.description());
        assertEquals(RtpWorld.Shape.CIRCLE, copy.shape());
        assertEquals(1000, copy.minRadius());
        assertEquals(8000, copy.maxRadius());
        assertEquals(100, copy.maxY());
        assertTrue(copy.permissionRequired());
        assertEquals(250, copy.centerX());
        assertEquals(-40, copy.centerZ());
    }

    @Test
    void radiiStayOrdered() {
        RtpWorld w = new RtpWorld("w");
        w.setMaxRadius(1000);
        w.setMinRadius(5000);
        assertTrue(w.minRadius() < w.maxRadius());
        w.setMaxRadius(10);
        assertTrue(w.minRadius() < w.maxRadius());
        w.setMinRadius(-50);
        assertEquals(0, w.minRadius());
    }

    @Test
    void rejectsInvalidValuesWithReadableMessage() {
        RtpWorld w = new RtpWorld("w");
        assertThrows(IllegalArgumentException.class, () -> w.set("cooldown", "abc"));
        assertThrows(IllegalArgumentException.class, () -> w.set("shape", "triangle"));
        assertThrows(IllegalArgumentException.class, () -> w.set("enabled", "peut-être"));
        assertThrows(IllegalArgumentException.class, () -> w.set("inconnu", "1"));
        assertThrows(IllegalArgumentException.class, () -> w.set("icon", "<bad>"));
    }

    @Test
    void maxYAutoAndClamps() {
        RtpWorld w = new RtpWorld("w");
        w.set("max-y", "64");
        w.set("max-y", "auto");
        assertNull(w.maxY());
        w.set("warmup", "999");
        assertEquals(60, w.warmupSeconds());
        w.set("cooldown", "-5");
        assertEquals(0, w.cooldownSeconds());
    }

    @Test
    void invalidFileValuesFallBackToDefaults() {
        RtpWorld w = RtpWorld.fromMap("w", Map.of("cooldown", "beaucoup", "warmup", 7));
        assertEquals(300, w.cooldownSeconds());
        assertEquals(7, w.warmupSeconds());
    }
}
