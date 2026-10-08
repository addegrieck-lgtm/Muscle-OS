package fr.vaeloria.rtp;

import org.junit.jupiter.api.Test;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

class CooldownsTest {
    private final AtomicLong now = new AtomicLong(1_000_000);
    private final UUID player = UUID.randomUUID();

    @Test
    void perWorldCooldown() {
        Cooldowns c = new Cooldowns(now::get, true);
        c.start(player, "world", 60);
        assertEquals(60, c.remainingSeconds(player, "world"));
        assertEquals(0, c.remainingSeconds(player, "world_nether"));
        now.addAndGet(59_500);
        assertEquals(1, c.remainingSeconds(player, "world"));
        now.addAndGet(500);
        assertEquals(0, c.remainingSeconds(player, "world"));
    }

    @Test
    void globalCooldownSharedAcrossWorlds() {
        Cooldowns c = new Cooldowns(now::get, false);
        c.start(player, "world", 30);
        assertEquals(30, c.remainingSeconds(player, "world_nether"));
        c.reset(player);
        assertEquals(0, c.remainingSeconds(player, "world"));
    }

    @Test
    void formatsDurations() {
        assertEquals("0s", Cooldowns.format(0));
        assertEquals("12s", Cooldowns.format(12));
        assertEquals("3m 07s", Cooldowns.format(187));
        assertEquals("1h 05m", Cooldowns.format(3900));
    }
}
