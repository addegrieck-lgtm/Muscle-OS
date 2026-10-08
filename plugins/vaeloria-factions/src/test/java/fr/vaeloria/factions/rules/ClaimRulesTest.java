package fr.vaeloria.factions.rules;

import org.junit.jupiter.api.Test;

import static fr.vaeloria.factions.rules.ClaimRules.Owner.NONE;
import static fr.vaeloria.factions.rules.ClaimRules.Owner.OTHER;
import static fr.vaeloria.factions.rules.ClaimRules.Owner.SELF;
import static fr.vaeloria.factions.rules.ClaimRules.Owner.SYSTEM;
import static fr.vaeloria.factions.rules.ClaimRules.Result.*;
import static org.junit.jupiter.api.Assertions.assertEquals;

class ClaimRulesTest {

    /** Contexte de base : faction de 3 claims pour 10 de power, en nature, chunk adjacent. */
    private static ClaimRules.Context wild(int claims, int limit, boolean connected) {
        return new ClaimRules.Context(false, claims, limit, 120, connected, true, NONE,
                0, 0, true, false, true, false, true, false, false);
    }

    /** Surclaim : la cible a ownerClaims chunks pour ownerLimit de power. */
    private static ClaimRules.Context over(int ownerClaims, int ownerLimit, boolean enemies, boolean edge, boolean shielded, boolean grace) {
        return new ClaimRules.Context(false, 3, 10, 120, false, true, OTHER,
                ownerClaims, ownerLimit, true, enemies, true, edge, true, shielded, grace);
    }

    @Test
    void claimsWildernessWithinPower() {
        assertEquals(CLAIM_WILDERNESS, ClaimRules.evaluate(wild(3, 10, true)));
        assertEquals(CLAIM_WILDERNESS, ClaimRules.evaluate(wild(0, 10, false)), "premier claim : n'importe où");
    }

    @Test
    void refusesWithoutPowerOrConnection() {
        assertEquals(NOT_ENOUGH_POWER, ClaimRules.evaluate(wild(10, 10, true)));
        assertEquals(NOT_CONNECTED, ClaimRules.evaluate(wild(3, 10, false)));
    }

    @Test
    void refusesOwnAndSystemChunks() {
        var self = new ClaimRules.Context(false, 3, 10, 120, true, true, SELF, 0, 0, true, false, true, false, true, false, false);
        var sys = new ClaimRules.Context(false, 3, 10, 120, true, true, SYSTEM, 0, 0, true, false, true, false, true, false, false);
        assertEquals(ALREADY_OWNED, ClaimRules.evaluate(self));
        assertEquals(SYSTEM_ZONE, ClaimRules.evaluate(sys));
    }

    @Test
    void hardMaxWins() {
        var c = new ClaimRules.Context(false, 120, 500, 120, true, true, NONE, 0, 0, true, false, true, false, true, false, false);
        assertEquals(MAX_CLAIMS, ClaimRules.evaluate(c));
    }

    @Test
    void overclaimOnlyWhenTargetIsUnderPowered() {
        assertEquals(TARGET_TOO_STRONG, ClaimRules.evaluate(over(10, 10, true, true, false, false)));
        assertEquals(OVERCLAIM, ClaimRules.evaluate(over(11, 10, true, true, false, false)));
    }

    @Test
    void overclaimNeedsWarEdgeAndNoShield() {
        assertEquals(NOT_ENEMY, ClaimRules.evaluate(over(11, 10, false, true, false, false)));
        assertEquals(NOT_EDGE, ClaimRules.evaluate(over(11, 10, true, false, false, false)));
        assertEquals(TARGET_SHIELDED, ClaimRules.evaluate(over(11, 10, true, true, true, false)));
        assertEquals(TARGET_IN_GRACE, ClaimRules.evaluate(over(11, 10, true, true, false, true)));
    }

    @Test
    void overclaimStillCostsPower() {
        var c = new ClaimRules.Context(false, 10, 10, 120, false, true, OTHER, 11, 10, true, true, true, true, true, false, false);
        assertEquals(NOT_ENOUGH_POWER, ClaimRules.evaluate(c));
    }

    @Test
    void disabledWorld() {
        var c = new ClaimRules.Context(true, 0, 10, 120, false, true, NONE, 0, 0, true, false, true, false, true, false, false);
        assertEquals(WORLD_DISABLED, ClaimRules.evaluate(c));
    }
}
