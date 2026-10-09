package fr.vaeloria.echanges;

import fr.vaeloria.echanges.model.BookOffer;
import fr.vaeloria.echanges.model.Expiry;
import fr.vaeloria.echanges.model.Tier;
import org.bukkit.Material;
import org.bukkit.Particle;
import org.bukkit.Sound;
import org.bukkit.entity.Player;
import org.bukkit.entity.Villager;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerInteractEntityEvent;
import org.bukkit.inventory.EquipmentSlot;
import org.bukkit.inventory.MerchantRecipe;

import java.util.concurrent.ThreadLocalRandom;

/**
 * Boost : accroupi + clic droit sur un bibliothécaire avec des émeraudes en main.
 * Le joueur paie, la chance du villageois monte de 1 et son livre est relancé avec cette chance.
 */
public final class BoostListener implements Listener {
    private final VaeloriaEchangesPlugin plugin;

    public BoostListener(VaeloriaEchangesPlugin plugin) { this.plugin = plugin; }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onInteract(PlayerInteractEntityEvent e) {
        if (e.getHand() != EquipmentSlot.HAND || !(e.getRightClicked() instanceof Villager v)) return;
        Player p = e.getPlayer();
        if (!p.isSneaking() || p.getInventory().getItemInMainHand().getType() != Material.EMERALD) return;
        if (v.getProfession() != Villager.Profession.LIBRARIAN || !v.isAdult()) return;
        if (!p.hasPermission("vaeloria.echanges.use")) return;
        e.setCancelled(true);

        if (v.isTrading()) {
            plugin.msg(p, "&cCe villageois est en train de commercer.");
            return;
        }
        Settings s = plugin.settings();
        Trades trades = plugin.trades();
        trades.expireIfDue(v);
        if (trades.exhausted(v)) {
            plugin.msg(p, "&cCe villageois est épuisé : capture-le et relâche-le pour qu'il propose de nouveau un livre.");
            return;
        }
        if (trades.sales(v) > 0) {
            plugin.msg(p, "&cSon livre a déjà été acheté : il ne peut plus être boosté avant que ce livre disparaisse.");
            return;
        }
        int boosts = trades.boosts(v);
        int luck = Math.min(s.maxLuck(), trades.luck(v) + 1);
        int cost = s.boostCost().next(boosts);

        BookOffer offer = s.table().roll(ThreadLocalRandom.current(), luck, trades.forbidden(v));
        if (offer == null) {
            plugin.msg(p, "&cCe villageois ne peut plus proposer aucun livre.");
            return;
        }
        if (!Emeralds.take(p, cost)) {
            plugin.msg(p, "&cIl faut &a" + Emeralds.format(cost) + " &cpour booster ce villageois (tu en as " + Emeralds.count(p) + ").");
            p.playSound(v.getLocation(), Sound.ENTITY_VILLAGER_NO, 1f, 1f);
            return;
        }

        MerchantRecipe recipe = trades.roll(offer);
        Trades.setBook(v, recipe);
        trades.startBook(v, offer.uses());
        boolean reset = s.resetOn().contains(offer.tier());
        trades.setBoostState(v, reset ? 0 : luck, reset ? 0 : boosts + 1);

        int price = recipe.getIngredients().get(0).getAmount();
        plugin.msg(p, "&7Boost payé : &a" + Emeralds.format(cost) + "&7. Nouveau livre : &f" + Books.name(offer)
                + " &7(" + offer.tier().label() + "&7) pour &a" + Emeralds.format(price) + "&7.");
        if (reset) {
            plugin.msg(p, "&7La chance de ce villageois repart de zéro.");
        } else {
            plugin.msg(p, "&7Chance : &e" + luck + "/" + s.maxLuck() + " &7· prochain boost : &a"
                    + Emeralds.format(s.boostCost().next(boosts + 1)) + "&7.");
        }
        plugin.msg(p, "&7Ce livre se vend &e" + offer.uses() + " fois" + (s.bookLifetimeHours() > 0
                ? " &7pendant &e" + Expiry.remaining(trades.expiresAt(v) - System.currentTimeMillis()) : "") + "&7, puis disparaît.");
        boolean big = offer.tier() == Tier.EPIQUE || offer.tier() == Tier.LEGENDAIRE;
        p.playSound(v.getLocation(), big ? Sound.UI_TOAST_CHALLENGE_COMPLETE : Sound.ENTITY_VILLAGER_YES, 1f, 1f);
        v.getWorld().spawnParticle(big ? Particle.TOTEM_OF_UNDYING : Particle.HAPPY_VILLAGER, v.getLocation().add(0, 1.2, 0), big ? 40 : 12, 0.4, 0.6, 0.4);
        plugin.getLogger().info(p.getName() + " a boosté un bibliothécaire (" + cost + " émeraudes) → " + offer.id() + " à " + price);
    }
}
