package fr.vaeloria.echanges;

import fr.vaeloria.echanges.model.BookOffer;
import io.papermc.paper.event.player.PlayerTradeEvent;
import org.bukkit.entity.Player;
import org.bukkit.entity.Villager;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.VillagerAcquireTradeEvent;
import org.bukkit.event.entity.VillagerCareerChangeEvent;
import org.bukkit.event.inventory.InventoryCloseEvent;
import org.bukkit.event.player.PlayerInteractEntityEvent;
import org.bukkit.inventory.EquipmentSlot;
import org.bukkit.inventory.MerchantInventory;

import java.util.concurrent.ThreadLocalRandom;

/**
 * Livres proposés naturellement par les bibliothécaires : tirés dans la table, jamais un livre interdit.
 * Un villageois propose un seul livre à la fois ; ce livre disparaît après sa durée de vie ou ses ventes.
 */
public final class TradeListener implements Listener {
    private final VaeloriaEchangesPlugin plugin;

    public TradeListener(VaeloriaEchangesPlugin plugin) { this.plugin = plugin; }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onAcquire(VillagerAcquireTradeEvent e) {
        if (!(e.getEntity() instanceof Villager v) || !Trades.isBook(e.getRecipe())) return;
        Trades trades = plugin.trades();
        // Villageois relâché (aucun livre avant un boost), épuisé (à capturer), ou qui a déjà son livre.
        if (trades.needsBoost(v) || trades.exhausted(v) || Trades.hasBook(v)) {
            e.setCancelled(true);
            return;
        }
        if (!plugin.settings().replaceVanillaBooks()) {
            trades.startBook(v, e.getRecipe().getMaxUses());
            return;
        }
        BookOffer offer = plugin.settings().table().roll(ThreadLocalRandom.current(), trades.luck(v), trades.forbidden(v));
        if (offer == null) {
            e.setCancelled(true);
            return;
        }
        e.setRecipe(trades.roll(offer));
        trades.startBook(v, offer.uses());
    }

    /** Avant d'ouvrir les échanges : le livre arrivé à son terme disparaît. */
    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onOpen(PlayerInteractEntityEvent e) {
        if (e.getHand() != EquipmentSlot.HAND || !(e.getRightClicked() instanceof Villager v)) return;
        if (plugin.trades().expireIfDue(v)) {
            plugin.msg(e.getPlayer(), "&cLe livre de ce villageois a disparu. &7Capture-le et relâche-le pour qu'il en propose un nouveau.");
        }
    }

    /** Chaque livre ne se vend qu'un nombre limité de fois (pas de réapprovisionnement). */
    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onTrade(PlayerTradeEvent e) {
        if (!(e.getVillager() instanceof Villager v) || !Trades.isBook(e.getTrade())) return;
        Trades trades = plugin.trades();
        if (trades.salesDone(v)) {
            e.setCancelled(true);
            plugin.msg(e.getPlayer(), "&cCe livre n'est plus disponible.");
            return;
        }
        if (trades.recordSale(v)) {
            plugin.msg(e.getPlayer(), "&7C'était le dernier exemplaire : ce villageois devra être capturé et relâché pour proposer un nouveau livre.");
        }
    }

    @EventHandler
    public void onClose(InventoryCloseEvent e) {
        if (!(e.getInventory() instanceof MerchantInventory inv) || !(inv.getMerchant() instanceof Villager v)) return;
        if (!(e.getPlayer() instanceof Player)) return;
        // Le villageois n'est plus « en échange » qu'au tick suivant.
        plugin.getServer().getScheduler().runTask(plugin, () -> {
            if (v.isValid()) plugin.trades().expireIfDue(v);
        });
    }

    /** Casser le pupitre d'un bibliothécaire qui propose un livre ne relance plus ce livre gratuitement. */
    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onCareerChange(VillagerCareerChangeEvent e) {
        if (!plugin.settings().lockLibrarians() || e.getReason() != VillagerCareerChangeEvent.ChangeReason.LOSING_JOB) return;
        Villager v = e.getEntity();
        Trades trades = plugin.trades();
        if (Trades.hasBook(v) || trades.boosts(v) > 0 || trades.exhausted(v)) e.setCancelled(true);
    }
}
