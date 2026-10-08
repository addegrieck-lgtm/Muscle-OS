package fr.vaeloria.crates.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CrateIdsTest {
    @Test
    void slugDepuisUnNomColore() {
        assertEquals("coffre_legendaire", CrateIds.slug("&6&lCoffre Légendaire !"));
        assertEquals("vote", CrateIds.slug("  §aVote  "));
        assertEquals("", CrateIds.slug("&6!!!"));
        assertTrue(CrateIds.slug("x".repeat(50)).length() <= CrateIds.MAX_LENGTH);
        assertTrue(CrateIds.isValid("coffre_legendaire"));
        assertFalse(CrateIds.isValid("Coffre"));
    }

    @Test
    void positionAllerRetour() {
        BlockPos p = new BlockPos("world_nether", -12, 64, 300);
        assertEquals(p, BlockPos.parse(p.serialize()));
        assertThrows(IllegalArgumentException.class, () -> BlockPos.parse("world;1;2"));
    }
}
