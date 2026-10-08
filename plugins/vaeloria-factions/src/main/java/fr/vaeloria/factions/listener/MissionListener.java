package fr.vaeloria.factions.listener;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.Faction;
import org.bukkit.Material;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.entity.Monster;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.entity.EntityDeathEvent;

/** Progression des missions quotidiennes : minage et créatures (kills, pillages et temps de jeu sont suivis ailleurs). */
public final class MissionListener implements Listener {
    private final VaeloriaFactionsPlugin plugin;

    public MissionListener(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
    }

    static boolean isOre(Material m) {
        String n = m.name();
        return n.endsWith("_ORE") || m == Material.ANCIENT_DEBRIS;
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onMine(BlockBreakEvent e) {
        if (fr.vaeloria.factions.util.Probes.isProbe(e)) return;
        Material m = e.getBlock().getType();
        if (!isOre(m)) return;
        Player p = e.getPlayer();
        // Toucher de soie : le minerai pourrait être reposé et reminé en boucle.
        if (p.getInventory().getItemInMainHand().containsEnchantment(Enchantment.SILK_TOUCH)) return;
        Faction f = plugin.manager().factionOf(p);
        if (f == null) return;
        plugin.missions().progress(f, "MINE_ORES", 1);
        if (m.name().startsWith("DEEPSLATE_")) plugin.missions().progress(f, "MINE_DEEPSLATE_ORES", 1);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onMobDeath(EntityDeathEvent e) {
        if (!(e.getEntity() instanceof Monster)) return;
        Player k = e.getEntity().getKiller();
        if (k == null) return;
        plugin.missions().progress(plugin.manager().factionOf(k), "KILL_MOBS", 1);
    }
}
