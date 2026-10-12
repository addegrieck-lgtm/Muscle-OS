package fr.vaeloria.rtp.portal;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PortalTest {
    @Test
    void cuboidNormalizesCornersAndContains() {
        Cuboid c = Cuboid.of(10, 70, -5, 8, 64, -3);
        assertEquals(new Cuboid(8, 64, -5, 10, 70, -3), c);
        assertTrue(c.contains(8, 64, -5));
        assertTrue(c.contains(10, 70, -3));
        assertFalse(c.contains(11, 70, -3));
        assertEquals(3L * 7 * 3, c.volume());
        assertEquals("3×7×3", c.describe());
        assertEquals(c, Cuboid.parse(c.serialize()));
        assertEquals(9.5, c.centerX());
    }

    @Test
    void portalRoundTripsWithLocation() {
        Portal p = new Portal("Spawn-Nord", "world", Cuboid.of(0, 64, 0, 0, 66, 3), "vaeloria");
        p.sendTo("world_nether", 12.5, 70, -8.5, 90f, 10f);
        p.permissionRequired(true);
        Portal copy = Portal.fromMap("spawn-nord", p.toMap());
        assertEquals("spawn-nord", copy.name());
        assertEquals(Portal.Destination.LOCATION, copy.destination());
        assertEquals("world_nether", copy.destWorld());
        assertEquals(12.5, copy.destX());
        assertEquals(90f, copy.destYaw());
        assertTrue(copy.permissionRequired());
        assertEquals(p.zone(), copy.zone());
        assertEquals("vaeloria.rtp.portal.spawn-nord", copy.permissionNode());
    }

    @Test
    void portalRoundTripsWithRtp() {
        Portal p = new Portal("pvp", "world", Cuboid.of(0, 64, 0, 1, 65, 0), "ame");
        p.sendToRtp("world");
        p.enabled(false);
        Portal copy = Portal.fromMap("pvp", p.toMap());
        assertEquals(Portal.Destination.RTP, copy.destination());
        assertEquals("world", copy.rtpWorld());
        assertFalse(copy.enabled());
        assertEquals("ame", copy.style());
    }

    @Test
    void rejectsBadNames() {
        assertThrows(IllegalArgumentException.class, () -> new Portal("a b", "w", Cuboid.of(0, 0, 0, 0, 0, 0), "s"));
        assertThrows(IllegalArgumentException.class, () -> new Portal("x.y", "w", Cuboid.of(0, 0, 0, 0, 0, 0), "s"));
    }

    @Test
    void parsesColors() {
        assertEquals(0xD21F2F, Colors.parse("#D21F2F"));
        assertEquals(0x5E0710, Colors.parse("5e0710"));
        assertEquals(0xD21F2F, Colors.parse("210, 31, 47"));
        assertThrows(IllegalArgumentException.class, () -> Colors.parse("rouge"));
        assertThrows(IllegalArgumentException.class, () -> Colors.parse("300,0,0"));
    }
}
