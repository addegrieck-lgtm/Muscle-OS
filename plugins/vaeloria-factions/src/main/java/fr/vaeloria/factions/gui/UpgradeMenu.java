package fr.vaeloria.factions.gui;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.FPerm;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.UpgradeType;
import fr.vaeloria.factions.rules.Upgrades;
import fr.vaeloria.factions.util.Msg;
import net.kyori.adventure.text.Component;
import org.bukkit.Material;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;

/** /f ameliorations : niveaux de faction, achetés avec la banque. */
public final class UpgradeMenu {
    private final VaeloriaFactionsPlugin plugin;

    public UpgradeMenu(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
    }

    private static Material icon(UpgradeType t) {
        return switch (t) {
            case CLAIMS -> Material.GRASS_BLOCK;
            case POWER -> Material.BLAZE_POWDER;
            case CHEST -> Material.CHEST;
            case SHIELD -> Material.SHIELD;
            case WARPS -> Material.ENDER_PEARL;
            case MEMBERS -> Material.PLAYER_HEAD;
        };
    }

    public void open(Player p) {
        Faction f = plugin.manager().factionOf(p);
        if (f == null) return;
        boolean canBuy = f.can(p.getUniqueId(), FPerm.UPGRADE) || plugin.manager().fplayer(p).adminBypass;
        Menu m = new Menu(4, Msg.get("menu.upgrades-title", "faction", f.name, "level", f.level()));
        m.set(4, Menu.item(Material.EXPERIENCE_BOTTLE, Msg.parse("<gold><b>Niveau de faction : <v>", "v", f.level()), List.of(
                Msg.parse("<gray>Banque : <gold><v>", "v", plugin.bank().format(f.bank)),
                Msg.parse("<gray>Chaque amélioration achetée ajoute un niveau"))), null);
        int[] slots = {19, 20, 21, 23, 24, 25};
        int i = 0;
        for (UpgradeType t : UpgradeType.values()) {
            Upgrades.Def d = plugin.upgrades().def(t);
            if (d == null || i >= slots.length) continue;
            int level = f.level(t);
            double next = Upgrades.nextCost(d, level);
            List<Component> lore = new ArrayList<>();
            lore.add(Msg.parse("<gray>Niveau <white><l></white>/<white><m>", "l", level, "m", d.maxLevel()));
            lore.add(Msg.parse("<gray>Bonus actuel : <green>+<b2> <un>", "b2", Msg.fmt(Upgrades.bonus(d, level)), "un", t.unit()));
            if (next >= 0) {
                lore.add(Msg.parse("<gray>Prochain niveau : <green>+<b2> <un>", "b2", Msg.fmt(Upgrades.bonus(d, level + 1)), "un", t.unit()));
                lore.add(Msg.parse("<gray>Coût : <gold><cost>", "cost", plugin.bank().format(next)));
                lore.add(Component.empty());
                lore.add(Msg.parse(canBuy ? (f.bank >= next ? "<yellow>Clic : acheter" : "<red>Banque insuffisante") : "<gray>Réservé au chef"));
            } else {
                lore.add(Msg.parse("<gold>Niveau maximum atteint"));
            }
            m.set(slots[i++], Menu.item(icon(t), Msg.parse("<gold><b><n>", "n", t.label()), lore), canBuy && next >= 0 ? (pl, c) -> {
                plugin.upgrades().buy(pl, f, t);
                open(pl);
            } : null);
        }
        m.set(31, Menu.item(Material.ARROW, Msg.parse("<gray>Retour"), List.of()), (pl, c) -> plugin.menus().openMain(pl));
        m.fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }
}
