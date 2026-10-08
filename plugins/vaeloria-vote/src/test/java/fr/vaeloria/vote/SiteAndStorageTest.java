package fr.vaeloria.vote;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SiteAndStorageTest {
    static final UUID P1 = UUID.fromString("00000000-0000-0000-0000-000000000001");
    static final UUID P2 = UUID.fromString("00000000-0000-0000-0000-000000000002");

    @Test
    void urlDApiAvecValeursEncodees() {
        VoteSite s = new VoteSite("s", "S", "https://s", 1440, "https://api.s/check/{key}?ip={ip}&u={player}&id={uuid}",
                "k&1", Pattern.compile("\"voted\"\\s*:\\s*true"), "");
        assertEquals("https://api.s/check/k%261?ip=1.2.3.4&u=Bob+X&id=00000000-0000-0000-0000-000000000001",
                s.checkRequest("Bob X", P1, "1.2.3.4"));
        assertTrue(s.accepts("{\"voted\": true}"));
        assertFalse(s.accepts("{\"voted\": false}"));
        assertTrue(s.verifiable());
        assertFalse(new VoteSite("t", "T", "https://t", 60, "", "", null, "").verifiable());
    }

    @Test
    void unVoteParIpEtParSiteDansLeDelai() {
        IpLocks l = new IpLocks();
        String ip = IpLocks.hash("1.2.3.4");
        assertTrue(l.tryLock("s", ip, P1, 0, 1000));
        assertTrue(l.tryLock("s", ip, P1, 10, 1000));   // le même joueur peut revérifier
        assertFalse(l.tryLock("s", ip, P2, 500, 1000)); // un autre compte du foyer non
        assertTrue(l.tryLock("t", ip, P2, 500, 1000));  // autre site : oui
        assertTrue(l.tryLock("s", ip, P2, 1010, 1000)); // délai écoulé
    }

    @Test
    void sauvegardePuisRelectureIdentique(@TempDir Path dir) throws Exception {
        Storage storage = new Storage(dir);
        PlayerVotes v = new PlayerVotes();
        VoteSite a = new VoteSite("a", "A", "u", 1440, "", "", null, "");
        LocalDate d = LocalDate.of(2026, 10, 8);
        v.vote(a, 123_456L, d, new Reward(300, Map.of("COOKED_BEEF", 8)), Reward.NONE, 1, 0);
        storage.write(P1, Storage.serialize(v));

        PlayerVotes back = storage.load(P1);
        assertEquals(Storage.serialize(v), Storage.serialize(back));
        assertFalse(back.available(a, 123_456L + 60_000));
        assertTrue(back.wheelReady(1));
        assertEquals(new Reward(300, Map.of("COOKED_BEEF", 8)), back.pot());

        IpLocks l = new IpLocks();
        l.tryLock("a", "h", P2, 0, 1000);
        storage.writeLocks(Storage.serialize(l));
        assertFalse(storage.loadLocks().tryLock("a", "h", P1, 10, 1000));
        assertTrue(storage.load(P2).pot().isEmpty()); // joueur inconnu : données vides
    }
}
