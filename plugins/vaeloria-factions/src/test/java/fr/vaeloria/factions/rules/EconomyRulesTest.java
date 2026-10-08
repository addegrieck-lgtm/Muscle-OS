package fr.vaeloria.factions.rules;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class EconomyRulesTest {
    private final Upgrades.Def claims = new Upgrades.Def(10, List.of(10000.0, 25000.0, 50000.0));

    @Test
    void upgradeCostsAndBonuses() {
        assertEquals(0, Upgrades.bonus(claims, 0));
        assertEquals(20, Upgrades.bonus(claims, 2));
        assertEquals(30, Upgrades.bonus(claims, 9), "plafonné au niveau maximum");
        assertEquals(10000, Upgrades.nextCost(claims, 0));
        assertEquals(50000, Upgrades.nextCost(claims, 2));
        assertEquals(-1, Upgrades.nextCost(claims, 3));
        assertEquals(Upgrades.BuyResult.OK, Upgrades.canBuy(claims, 0, 10000));
        assertEquals(Upgrades.BuyResult.NOT_ENOUGH_MONEY, Upgrades.canBuy(claims, 1, 24999.99));
        assertEquals(Upgrades.BuyResult.MAX_LEVEL, Upgrades.canBuy(claims, 3, 1e9));
        assertEquals(Upgrades.BuyResult.UNKNOWN, Upgrades.canBuy(null, 0, 1e9));
        assertEquals(6, Upgrades.capped(3, 5, 6), "coffre limité à 6 rangées");
        assertEquals(5, Upgrades.capped(3, 2, 6));
    }

    @Test
    void dailyMissionsAreTheSameForEveryoneOnAGivenDay() {
        List<String> pool = List.of("a", "b", "c", "d", "e", "f", "g");
        List<String> d1 = MissionRules.pick(pool, 3, "2026-10-08");
        assertEquals(d1, MissionRules.pick(pool, 3, "2026-10-08"));
        assertEquals(3, d1.size());
        assertEquals(3, d1.stream().distinct().count());
        assertEquals(2, MissionRules.pick(List.of("x", "y"), 5, "2026-10-08").size());
        assertEquals("▰▰▰▰▰▱▱▱▱▱", MissionRules.bar(5, 10, 10));
        assertEquals("▰▰▰▰▰▰▰▰▰▰", MissionRules.bar(99, 10, 10));
    }
}
