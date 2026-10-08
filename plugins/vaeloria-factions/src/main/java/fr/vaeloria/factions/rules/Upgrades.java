package fr.vaeloria.factions.rules;

import fr.vaeloria.factions.model.UpgradeType;

import java.util.List;

/** Calculs des améliorations de faction, purs et testables. */
public final class Upgrades {
    private Upgrades() {}

    /** Définition d'une amélioration : bonus par niveau et coût de chaque niveau (index 0 = niveau 1). */
    public record Def(double perLevel, List<Double> costs) {
        public int maxLevel() { return costs.size(); }
    }

    public static double bonus(Def def, int level) {
        if (def == null) return 0;
        return def.perLevel() * Math.max(0, Math.min(level, def.maxLevel()));
    }

    /** Coût du prochain niveau, ou -1 si le maximum est atteint. */
    public static double nextCost(Def def, int level) {
        if (def == null || level >= def.maxLevel()) return -1;
        return def.costs().get(Math.max(0, level));
    }

    public enum BuyResult { OK, MAX_LEVEL, NOT_ENOUGH_MONEY, UNKNOWN }

    public static BuyResult canBuy(Def def, int level, double bank) {
        if (def == null) return BuyResult.UNKNOWN;
        double cost = nextCost(def, level);
        if (cost < 0) return BuyResult.MAX_LEVEL;
        return bank + 1e-9 >= cost ? BuyResult.OK : BuyResult.NOT_ENOUGH_MONEY;
    }

    /** Valeur d'un type en tenant compte d'un plafond (ex. 6 rangées de coffre). */
    public static int capped(int base, double bonus, int cap) {
        return (int) Math.min(cap, base + Math.floor(bonus + 1e-9));
    }

    public static String key(UpgradeType t) { return t.name(); }
}
