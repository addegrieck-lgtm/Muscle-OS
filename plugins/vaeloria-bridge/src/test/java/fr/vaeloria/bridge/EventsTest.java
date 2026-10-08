package fr.vaeloria.bridge;

import com.google.gson.JsonObject;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EventsTest {
    @Test
    void serverVoteKeepsValidVotes() {
        JsonObject o = Events.serverVote("factions", "serveur-prive.net", " Arthur_42 ", "203.0.113.10");
        assertNotNull(o);
        assertEquals("SERVER_VOTE", o.get("event").getAsString());
        assertEquals("serveur-prive.net", o.get("service").getAsString());
        assertEquals("Arthur_42", o.get("username").getAsString());
        assertEquals("203.0.113.10", o.get("address").getAsString());
    }

    @Test
    void serverVoteDropsUnusableVotes() {
        assertNull(Events.serverVote("factions", "serveur-prive.net", "pseudo avec espaces", null));
        assertNull(Events.serverVote("factions", "", "Arthur", null));
        assertNull(Events.serverVote("factions", "x", null, null));
        assertFalse(Events.serverVote("factions", "x", "Arthur", "").has("address"));
    }
}
