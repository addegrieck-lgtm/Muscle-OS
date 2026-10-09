package fr.vaeloria.echanges;

import fr.vaeloria.echanges.model.BookOffer;
import org.bukkit.entity.Villager;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.VillagerAcquireTradeEvent;
import org.bukkit.event.entity.VillagerCareerChangeEvent;

import java.util.concurrent.ThreadLocalRandom;

/** Livres proposés naturellement par les bibliothécaires : tirés dans la table, jamais un livre interdit. */
public final class TradeListener implements Listener {
    private final VaeloriaEchangesPlugin plugin;

    public TradeListener(VaeloriaEchangesPlugin plugin) { this.plugin = plugin; }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onAcquire(VillagerAcquireTradeEvent e) {
        if (!(e.getEntity() instanceof Villager v) || !Trades.isBook(e.getRecipe())) return;
        Trades trades = plugin.trades();
        // Villageois relâché : aucun livre tant qu'il n'a pas été boosté.
        if (trades.needsBoost(v)) {
            e.setCancelled(true);
            return;
        }
        if (!plugin.settings().replaceVanillaBooks()) return;
        BookOffer offer = plugin.settings().table().roll(ThreadLocalRandom.current(), trades.luck(v), trades.forbidden(v));
        if (offer == null) {
            e.setCancelled(true);
            return;
        }
        e.setRecipe(trades.roll(offer));
    }

    /** Casser le pupitre d'un bibliothécaire qui propose un livre ne relance plus ce livre gratuitement. */
    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onCareerChange(VillagerCareerChangeEvent e) {
        if (!plugin.settings().lockLibrarians() || e.getReason() != VillagerCareerChangeEvent.ChangeReason.LOSING_JOB) return;
        Villager v = e.getEntity();
        if (Trades.hasBook(v) || plugin.trades().boosts(v) > 0) e.setCancelled(true);
    }
}
