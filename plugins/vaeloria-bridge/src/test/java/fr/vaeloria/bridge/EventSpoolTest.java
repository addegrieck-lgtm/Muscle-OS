package fr.vaeloria.bridge;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class EventSpoolTest {
    @TempDir
    Path dir;

    @Test
    void conserveLesEvenementsSiLApiEstIndisponiblePuisLesRenvoie() throws Exception {
        EventSpool spool = new EventSpool(dir, 2);
        for (int i = 0; i < 5; i++) spool.add(Events.base("SERVER_HEARTBEAT", "factions"));

        spool.flush(json -> false); // API en panne
        assertEquals(0, spool.pendingInMemory());
        assertEquals(2, spool.pendingOnDisk()); // lot échoué + reste

        List<String> sent = new ArrayList<>();
        spool.flush(json -> sent.add(json)); // API rétablie
        assertEquals(0, spool.pendingOnDisk());
        assertEquals(5, sent.stream().mapToInt(EventSpool::count).sum());
    }

    @Test
    void persisteLaMemoireALArret() throws Exception {
        EventSpool spool = new EventSpool(dir, 10);
        spool.add(Events.base("PLAYER_JOIN", "factions"));
        spool.persistAll();
        assertEquals(1, spool.pendingOnDisk());
    }
}
