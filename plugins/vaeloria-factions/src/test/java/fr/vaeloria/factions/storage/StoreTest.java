package fr.vaeloria.factions.storage;

import fr.vaeloria.factions.model.FPerm;
import fr.vaeloria.factions.model.FPlayer;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.Relation;
import fr.vaeloria.factions.model.Role;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StoreTest {

    @Test
    void roundTrip(@TempDir Path dir) throws Exception {
        Store store = new Store(dir);
        UUID leader = UUID.randomUUID();
        Faction f = new Faction("f1", "Ordre-Noir");
        f.members.put(leader, Role.CHEF);
        f.wishes.put("f2", Relation.ENNEMI);
        f.perms.put(FPerm.CHEST, Role.OFFICIER);
        f.shieldStart = 22;
        f.raidsDone = 3;
        f.raidUntil = 123; // transient : ne doit pas être sauvé
        FPlayer p = new FPlayer(leader, "Steve", 7.5);
        Store.State st = new Store.State();
        st.graceUntil = 42;
        st.blockDamage.put("world;1;2;3", 2);

        store.snapshot(List.of(f), List.of(p), Map.of("world;0;0", "f1"), st).write();
        store.snapshot(List.of(f), List.of(p), Map.of("world;0;0", "f1"), st).write();
        assertTrue(Files.exists(dir.resolve("factions.json.bak")), "copie de la version précédente");

        Faction back = store.loadFactions().get(0);
        back.initTransient();
        assertEquals("Ordre-Noir", back.name);
        assertEquals(Role.CHEF, back.members.get(leader));
        assertEquals(Relation.ENNEMI, back.wishes.get("f2"));
        assertEquals(Role.OFFICIER, back.permRole(FPerm.CHEST));
        assertEquals(22, back.shieldStart);
        assertEquals(3, back.raidsDone);
        assertEquals(0, back.raidUntil);
        assertNotNull(back.claims);
        assertEquals(7.5, store.loadPlayers().get(0).power);
        assertEquals("f1", store.loadClaims().get("world;0;0"));
        assertEquals(42, store.loadState().graceUntil);
        assertEquals(2, store.loadState().blockDamage.get("world;1;2;3"));
    }

    @Test
    void emptyDirectoryLoadsEmpty(@TempDir Path dir) throws Exception {
        Store store = new Store(dir);
        assertTrue(store.loadFactions().isEmpty());
        assertTrue(store.loadPlayers().isEmpty());
        assertTrue(store.loadClaims().isEmpty());
        assertEquals(0, store.loadState().graceUntil);
    }
}
