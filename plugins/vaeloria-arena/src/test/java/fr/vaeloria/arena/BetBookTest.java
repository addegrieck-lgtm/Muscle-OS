package fr.vaeloria.arena;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class BetBookTest {
    private final UUID a = UUID.randomUUID(), b = UUID.randomUUID(), c = UUID.randomUUID();

    @Test
    void winnersShareLosersStakeProRata() {
        BetBook book = new BetBook(10, 10_000, 0);
        book.add(a, "A", Team.ROUGE, 100);
        book.add(b, "B", Team.ROUGE, 300);
        book.add(c, "C", Team.BLEU, 200);
        assertEquals(1.5, book.odds(Team.ROUGE), 1e-9);
        assertEquals(3.0, book.odds(Team.BLEU), 1e-9);

        Map<UUID, Double> pay = book.settle(Optional.of(Team.ROUGE));
        assertEquals(Map.of(a, 150.0, b, 450.0), pay);
        assertTrue(book.bets().isEmpty());
    }

    @Test
    void houseCutComesOutOfTheLosingPool() {
        BetBook book = new BetBook(1, 10_000, 10);
        book.add(a, "A", Team.BLEU, 100);
        book.add(c, "C", Team.ROUGE, 100);
        assertEquals(Map.of(a, 190.0), book.settle(Optional.of(Team.BLEU)));
    }

    @Test
    void payoutsAreFlooredToTheCent() {
        BetBook book = new BetBook(1, 10_000, 0);
        book.add(a, "A", Team.ROUGE, 1);
        book.add(b, "B", Team.ROUGE, 2);
        book.add(c, "C", Team.BLEU, 1);
        Map<UUID, Double> pay = book.settle(Optional.of(Team.ROUGE));
        assertEquals(1.33, pay.get(a), 1e-9);
        assertEquals(2.66, pay.get(b), 1e-9);
        assertTrue(pay.values().stream().mapToDouble(Double::doubleValue).sum() <= 4.0);
    }

    @Test
    void drawOrOneSidedBetsAreRefunded() {
        BetBook draw = new BetBook(1, 10_000, 5);
        draw.add(a, "A", Team.ROUGE, 50);
        draw.add(c, "C", Team.BLEU, 70);
        assertEquals(Map.of(a, 50.0, c, 70.0), draw.settle(Optional.empty()));

        BetBook alone = new BetBook(1, 10_000, 5);
        alone.add(a, "A", Team.ROUGE, 50);
        alone.add(b, "B", Team.ROUGE, 20);
        assertFalse(alone.contested());
        assertEquals(Map.of(a, 50.0, b, 20.0), alone.settle(Optional.of(Team.ROUGE)));
    }

    @Test
    void oneTeamPerPlayerWithinLimitsUntilClosed() {
        BetBook book = new BetBook(10, 500, 0);
        assertEquals(Optional.of(BetBook.Refusal.BELOW_MIN), book.check(a, Team.ROUGE, 5));
        assertEquals(Optional.of(BetBook.Refusal.BELOW_MIN), book.check(a, Team.ROUGE, Double.NaN));
        assertEquals(Optional.empty(), book.check(a, Team.ROUGE, 400));
        book.add(a, "A", Team.ROUGE, 400);
        assertEquals(Optional.of(BetBook.Refusal.OTHER_TEAM), book.check(a, Team.BLEU, 50));
        assertEquals(Optional.of(BetBook.Refusal.ABOVE_MAX), book.check(a, Team.ROUGE, 200));
        assertEquals(500.0, book.add(a, "A", Team.ROUGE, 100));
        book.close();
        assertEquals(Optional.of(BetBook.Refusal.CLOSED), book.check(b, Team.BLEU, 50));
    }
}
