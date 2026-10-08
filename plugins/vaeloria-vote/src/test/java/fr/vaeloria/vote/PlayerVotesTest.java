package fr.vaeloria.vote;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PlayerVotesTest {
    static final VoteSite A = site("a", 1440), B = site("b", 1440), C = site("c", 90);
    static final Reward VOTE = new Reward(300, Map.of("COOKED_BEEF", 8));
    static final Reward BONUS = new Reward(500, Map.of("GOLDEN_APPLE", 1));
    static final LocalDate D1 = LocalDate.of(2026, 10, 8);
    static final long T = 1_000_000_000L;
    static final long MIN = 60_000L;

    static VoteSite site(String id, int cooldown) {
        return new VoteSite(id, id, "https://x/" + id, cooldown, "", "", null, "");
    }

    PlayerVotes.Credit vote(PlayerVotes v, VoteSite s, long now, LocalDate day) {
        return v.vote(s, now, day, VOTE, BONUS, 3, 0);
    }

    @Test
    void lesVotesRemplissentLaCagnotteEtLeTroisiemeDebloqueLaRoue() {
        PlayerVotes v = new PlayerVotes();
        assertTrue(vote(v, A, T, D1).toPot());
        vote(v, B, T, D1);
        assertFalse(v.wheelReady(3));
        PlayerVotes.Credit c = vote(v, C, T, D1);
        assertTrue(c.completedAll());
        assertTrue(v.wheelReady(3));
        assertEquals(new Reward(1400, Map.of("COOKED_BEEF", 24, "GOLDEN_APPLE", 1)), v.pot());
        assertTrue(v.pending().isEmpty());
    }

    @Test
    void unMemeVoteNestJamaisPayeDeuxFoisDansLeDelai() {
        PlayerVotes v = new PlayerVotes();
        assertTrue(vote(v, A, T, D1).accepted());
        assertFalse(vote(v, A, T + 1439 * MIN, D1).accepted());
        assertTrue(vote(v, A, T + 1440 * MIN, D1.plusDays(1)).accepted());
        assertEquals(2, v.total());
    }

    @Test
    void roueMultiplieLaCagnotteUneSeuleFoisParJour() {
        PlayerVotes v = full();
        Reward won = v.spin(3, 0);
        assertEquals(new Reward(4200, Map.of("COOKED_BEEF", 72, "GOLDEN_APPLE", 3)), won);
        assertTrue(v.pot().isEmpty());
        assertEquals(won, v.takePending());
        assertThrows(IllegalStateException.class, () -> v.spin(2, 0));
        assertFalse(v.wheelReady(3));
    }

    @Test
    void quitteOuDoublePerduNeDonneRien() {
        PlayerVotes v = full();
        assertTrue(v.spin(0, 0).isEmpty());
        assertTrue(v.takePending().isEmpty());
    }

    @Test
    void apresLaRoueLesVotesSontVersesDirectementSansMultiplicateur() {
        PlayerVotes v = full();
        v.spin(0, 0);
        v.takePending();
        PlayerVotes.Credit c = vote(v, C, T + 90 * MIN, D1); // site à délai court revoté
        assertTrue(c.accepted());
        assertFalse(c.toPot());
        assertFalse(c.completedAll()); // le bonus n'est donné qu'une fois par jour
        assertEquals(VOTE, v.takePending());
    }

    @Test
    void cagnotteNonLanceeVerseeTelleQuelleLeLendemain() {
        PlayerVotes v = new PlayerVotes();
        vote(v, A, T, D1);
        assertTrue(v.rollover(D1.plusDays(1)));
        assertEquals(VOTE, v.pending());
        assertTrue(v.pot().isEmpty());
        assertEquals(0, v.sitesToday());
        assertFalse(v.spun());
    }

    @Test
    void plafondArgentParJour() {
        PlayerVotes v = new PlayerVotes();
        v.vote(A, T, D1, VOTE, BONUS, 3, 5000);
        v.vote(B, T, D1, VOTE, BONUS, 3, 5000);
        v.vote(C, T, D1, VOTE, BONUS, 3, 5000);
        Reward won = v.spin(4, 5000); // 1 400 × 4 = 5 600 → plafonné à 5 000
        assertEquals(5000, won.money());
        assertEquals(96, won.items().get("COOKED_BEEF")); // 24 × 4 : les objets ne sont pas plafonnés
        v.takePending();
        Reward after = v.vote(C, T + 90 * MIN, D1, VOTE, BONUS, 3, 5000).reward();
        assertEquals(0, after.money());
    }

    @Test
    void serieDeJoursComplets() {
        PlayerVotes v = new PlayerVotes();
        long t = T;
        for (int d = 0; d < 3; d++) {
            LocalDate day = D1.plusDays(d);
            vote(v, A, t, day);
            vote(v, B, t, day);
            vote(v, C, t, day);
            t += 1440 * MIN;
        }
        assertEquals(3, v.streak(D1.plusDays(2)));
        assertEquals(3, v.streak(D1.plusDays(3)));  // encore récupérable aujourd'hui
        assertEquals(0, v.streak(D1.plusDays(4)));  // un jour manqué : cassée
        vote(v, A, t + 2440 * MIN, D1.plusDays(4));
        vote(v, B, t + 2440 * MIN, D1.plusDays(4));
        vote(v, C, t + 2440 * MIN, D1.plusDays(4));
        assertEquals(1, v.streak(D1.plusDays(4)));
    }

    private PlayerVotes full() {
        PlayerVotes v = new PlayerVotes();
        vote(v, A, T, D1);
        vote(v, B, T, D1);
        vote(v, C, T, D1);
        return v;
    }
}
