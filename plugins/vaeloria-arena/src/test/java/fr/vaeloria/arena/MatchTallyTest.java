package fr.vaeloria.arena;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class MatchTallyTest {
    @Test
    void teamWipedOutEndsTheMatch() {
        MatchTally t = new MatchTally(2);
        t.death(Team.BLEU, Team.ROUGE);
        assertFalse(t.finished());
        t.death(Team.BLEU, Team.ROUGE);
        assertTrue(t.finished());
        assertEquals(Optional.of(Team.ROUGE), t.winner());
        assertEquals(2, t.kills(Team.ROUGE));
    }

    @Test
    void timeoutTieBreaksOnKillsThenDraw() {
        MatchTally t = new MatchTally(3);
        t.death(Team.ROUGE, Team.BLEU);
        t.death(Team.BLEU, Team.ROUGE);
        assertEquals(Optional.empty(), t.winner());
        t.death(Team.ROUGE, null); // mort hors combat (chute, lave) : pas de kill pour Bleu
        t.death(Team.BLEU, Team.ROUGE);
        assertEquals(1, t.alive(Team.ROUGE));
        assertEquals(1, t.alive(Team.BLEU));
        assertEquals(Optional.of(Team.ROUGE), t.winner());
    }

    @Test
    void aliveNeverGoesNegative() {
        MatchTally t = new MatchTally(1);
        t.death(Team.ROUGE, Team.BLEU);
        t.death(Team.ROUGE, Team.BLEU);
        assertEquals(0, t.alive(Team.ROUGE));
    }

    @Test
    void teamsSpawnFacingEachOtherInsideTheArena() {
        List<double[]> red = ArenaGeometry.spawnOffsets(Team.ROUGE, 3, 16, 3);
        List<double[]> blue = ArenaGeometry.spawnOffsets(Team.BLEU, 3, 16, 3);
        assertEquals(3, red.size());
        assertArrayEquals(new double[] {-8, -3}, red.get(0));
        assertArrayEquals(new double[] {-8, 0}, red.get(1));
        assertArrayEquals(new double[] {8, 3}, blue.get(2));
        for (double[] o : red) assertTrue(ArenaGeometry.isInside(o[0], o[1], 20));
        assertFalse(ArenaGeometry.isInside(15, 15, 20));
    }
}
