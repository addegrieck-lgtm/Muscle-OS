package fr.vaeloria.fakeplayers;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class NamePoolTest {
    @Test
    void validatesMinecraftNames() {
        assertTrue(NamePool.isValid("Steve"));
        assertTrue(NamePool.isValid("a_b"));
        assertTrue(NamePool.isValid("abcdefghijklmnop"));
        assertFalse(NamePool.isValid("ab"));
        assertFalse(NamePool.isValid("abcdefghijklmnopq"));
        assertFalse(NamePool.isValid("bad name"));
        assertFalse(NamePool.isValid("é_accent"));
        assertFalse(NamePool.isValid(null));
    }

    @Test
    void prefersConfiguredNamesAndSkipsTakenOnes() {
        NamePool pool = new NamePool(List.of("Alpha", "Bravo", "x"), new Random(1));
        Set<String> taken = new HashSet<>(Set.of("alpha"));
        assertEquals("Bravo", pool.next(taken));
    }

    @Test
    void generatesUniqueValidNamesOnceListIsExhausted() {
        NamePool pool = new NamePool(List.of("Alpha"), new Random(42));
        Set<String> taken = new HashSet<>(Set.of("alpha"));
        for (int i = 0; i < 300; i++) {
            String name = pool.next(taken);
            assertNotNull(name);
            assertTrue(NamePool.isValid(name), name);
            assertTrue(taken.add(name.toLowerCase()), "doublon : " + name);
            assertFalse(NamePool.repeats(name), "mot répété : " + name);
        }
    }

    @Test
    void offlineUuidIsStableAndVersion3() {
        assertEquals(FakePlayer.offlineUuid("Steve"), FakePlayer.offlineUuid("Steve"));
        assertNotEquals(FakePlayer.offlineUuid("Steve"), FakePlayer.offlineUuid("Alex"));
        assertEquals(3, FakePlayer.offlineUuid("Steve").version());
    }

    @Test
    void detectsRepeatedWords() {
        assertTrue(NamePool.repeats("StormStorm"));
        assertTrue(NamePool.repeats("patate_patate"));
        assertFalse(NamePool.repeats("ShadowKnight"));
        assertFalse(NamePool.repeats("Lucas59"));
    }
}
