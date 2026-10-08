package fr.vaeloria.factions.model;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ModelTest {

    @Test
    void relationIsTheMostHostileWish() {
        assertEquals(Relation.ALLIE, Relation.resolve(Relation.ALLIE, Relation.ALLIE));
        assertEquals(Relation.NEUTRE, Relation.resolve(Relation.ALLIE, null), "une alliance se signe à deux");
        assertEquals(Relation.TREVE, Relation.resolve(Relation.ALLIE, Relation.TREVE));
        assertEquals(Relation.ENNEMI, Relation.resolve(Relation.ALLIE, Relation.ENNEMI), "la guerre se déclare seul");
    }

    @Test
    void parsesFrenchAndEnglish() {
        assertEquals(Relation.TREVE, Relation.parse("trêve"));
        assertEquals(Relation.ALLIE, Relation.parse("ally"));
        assertNull(Relation.parse("ami"));
        assertEquals(Role.OFFICIER, Role.parse("officier"));
        assertEquals(Role.CHEF, Role.parse("LEADER"));
        assertEquals(FPerm.BUILD, FPerm.parse("build"));
    }

    @Test
    void roleHierarchy() {
        assertTrue(Role.CHEF.atLeast(Role.OFFICIER));
        assertFalse(Role.RECRUE.atLeast(Role.MEMBRE));
        assertEquals(Role.MEMBRE, Role.RECRUE.next());
        assertEquals(Role.RECRUE, Role.RECRUE.previous());
        assertEquals("OFFICER", Role.OFFICIER.bridgeName());
    }

    @Test
    void permissionsFallBackToDefaults() {
        Faction f = new Faction("id", "Test");
        UUID recruit = UUID.randomUUID(), officer = UUID.randomUUID();
        f.members.put(recruit, Role.RECRUE);
        f.members.put(officer, Role.OFFICIER);
        assertTrue(f.can(recruit, FPerm.BUILD));
        assertFalse(f.can(recruit, FPerm.CLAIM));
        assertTrue(f.can(officer, FPerm.CLAIM));
        f.perms.put(FPerm.BUILD, Role.MEMBRE);
        assertFalse(f.can(recruit, FPerm.BUILD));
        assertFalse(f.can(UUID.randomUUID(), FPerm.HOME), "un étranger n'a aucun droit");
    }

    @Test
    void chunkKeyRoundTripWithSemicolonInWorldName() {
        ChunkPos c = new ChunkPos("monde;bizarre", -12, 40);
        assertEquals(c, ChunkPos.parse(c.key()));
        assertEquals(4, c.neighbours().length);
    }
}
