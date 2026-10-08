package fr.vaeloria.factions.service;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.UpgradeType;
import fr.vaeloria.factions.rules.Upgrades;
import fr.vaeloria.factions.util.Msg;
import org.bukkit.Sound;
import org.bukkit.entity.Player;

/** Achat des améliorations de faction avec l'argent de la banque. */
public final class UpgradeService {
    private final VaeloriaFactionsPlugin plugin;

    public UpgradeService(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
    }

    public Upgrades.Def def(UpgradeType t) { return plugin.settings().upgrades.get(t); }

    public Upgrades.BuyResult buy(Player p, Faction f, UpgradeType t) {
        Upgrades.Def d = def(t);
        int level = f.level(t);
        Upgrades.BuyResult r = Upgrades.canBuy(d, level, f.bank);
        switch (r) {
            case OK -> {
                double cost = Upgrades.nextCost(d, level);
                f.bank = fr.vaeloria.factions.rules.PowerMath.round(f.bank - cost);
                f.upgrades.put(t, level + 1);
                plugin.manager().markDirty();
                if (t == UpgradeType.CHEST) plugin.chests().resize(f);
                plugin.logs().add(f, "AMÉLIORATION", p.getName(), t.label() + " niveau " + (level + 1) + " (" + plugin.bank().format(cost) + ")");
                for (Player m : plugin.manager().online(f)) {
                    Msg.send(m, "upgrade.bought", "player", p.getName(), "upgrade", t.label(), "level", level + 1,
                            "bonus", Msg.fmt(Upgrades.bonus(d, level + 1)), "unit", t.unit(), "cost", plugin.bank().format(cost));
                    m.playSound(m.getLocation(), Sound.ENTITY_PLAYER_LEVELUP, 0.8f, 1.2f);
                }
            }
            case MAX_LEVEL -> Msg.send(p, "upgrade.max", "upgrade", t.label());
            case NOT_ENOUGH_MONEY -> Msg.send(p, "upgrade.no-money", "cost", plugin.bank().format(Upgrades.nextCost(d, level)),
                    "bank", plugin.bank().format(f.bank));
            case UNKNOWN -> Msg.send(p, "upgrade.disabled");
        }
        return r;
    }
}
