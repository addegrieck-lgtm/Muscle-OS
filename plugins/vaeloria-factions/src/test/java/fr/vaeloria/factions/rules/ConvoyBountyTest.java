package fr.vaeloria.factions.rules;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ConvoyBountyTest {
    private final List<int[]> tiers = List.of(new int[]{5, 5}, new int[]{15, 10});

    @Test
    void bountyPercentByStreak() {
        assertEquals(0, Bounty.percent(tiers, 4));
        assertEquals(5, Bounty.percent(tiers, 5));
        assertEquals(5, Bounty.percent(tiers, 14));
        assertEquals(10, Bounty.percent(tiers, 15));
        assertEquals(10, Bounty.percent(tiers, 40));
    }

    @Test
    void bountyAmountIsAShareOfTheFortune() {
        assertEquals(5000, Bounty.amount(100000, 5, 0));
        assertEquals(10000, Bounty.amount(100000, 10, 0));
        assertEquals(2500, Bounty.amount(100000, 10, 2500), "plafond");
        assertEquals(0, Bounty.amount(-500, 10, 0), "solde négatif : rien");
        assertEquals(0, Bounty.amount(100000, 0, 0));
        assertEquals(12.34, Bounty.amount(246.8, 5, 0), 1e-9);
    }

    @Test
    void streakAnnouncements() {
        assertFalse(Bounty.announce(tiers, 4, 5));
        assertTrue(Bounty.announce(tiers, 5, 5));
        assertFalse(Bounty.announce(tiers, 6, 5));
        assertTrue(Bounty.announce(tiers, 10, 5));
        assertTrue(Bounty.announce(tiers, 15, 5));
        assertTrue(Bounty.announce(tiers, 20, 5));
        assertFalse(Bounty.announce(List.of(), 50, 5));
    }

    @Test
    void convoyGoal() {
        assertEquals(ConvoyRules.Goal.LEAVE_WARZONE, ConvoyRules.goal(0));
        assertEquals(ConvoyRules.Goal.REACH_OUTPOST, ConvoyRules.goal(2));
        assertTrue(ConvoyRules.won(0, false, false), "sans avant-poste : gagne en sortant de la warzone");
        assertFalse(ConvoyRules.won(0, false, true));
        assertFalse(ConvoyRules.won(1, false, false), "avec avant-poste : sortir ne suffit pas");
        assertTrue(ConvoyRules.won(1, true, false));
    }
}
