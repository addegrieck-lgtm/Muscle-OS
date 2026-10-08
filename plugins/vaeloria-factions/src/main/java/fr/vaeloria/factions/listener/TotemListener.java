package fr.vaeloria.factions.listener;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.service.TotemService;
import fr.vaeloria.factions.util.Msg;
import org.bukkit.block.Block;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockDamageEvent;
import org.bukkit.event.block.BlockExplodeEvent;
import org.bukkit.event.block.BlockPistonExtendEvent;
import org.bukkit.event.block.BlockPistonRetractEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.entity.EntityChangeBlockEvent;
import org.bukkit.event.entity.EntityExplodeEvent;
import org.bukkit.event.player.PlayerJoinEvent;

/** Le totem : seuls les coups d'un membre de faction pendant l'événement comptent ; personne d'autre n'y touche. */
public final class TotemListener implements Listener {
    private final VaeloriaFactionsPlugin plugin;

    public TotemListener(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
    }

    private TotemService t() { return plugin.totems(); }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onDamage(BlockDamageEvent e) {
        if (plugin.settings().totemInstantBreak && t().isActiveBlock(e.getBlock()) && plugin.manager().factionOf(e.getPlayer()) != null) {
            e.setInstaBreak(true);
        }
    }

    @EventHandler(priority = EventPriority.LOWEST, ignoreCancelled = true)
    public void onBreak(BlockBreakEvent e) {
        Block b = e.getBlock();
        if (!t().isTotemBlock(b)) return;
        if (plugin.manager().fplayer(e.getPlayer()).adminBypass) return;
        switch (t().hit(e.getPlayer(), b)) {
            case NOT_ACTIVE -> {
                e.setCancelled(true);
                e.getPlayer().sendActionBar(Msg.get("totem.not-active"));
            }
            case NO_FACTION -> {
                e.setCancelled(true);
                e.getPlayer().sendActionBar(Msg.get("totem.need-faction"));
            }
            default -> {
                e.setDropItems(false);
                e.setExpToDrop(0);
            }
        }
    }

    @EventHandler(priority = EventPriority.LOWEST, ignoreCancelled = true)
    public void onPlace(BlockPlaceEvent e) {
        if (t().isTotemBlock(e.getBlock()) && !plugin.manager().fplayer(e.getPlayer()).adminBypass) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.HIGHEST, ignoreCancelled = true)
    public void onExplode(EntityExplodeEvent e) {
        e.blockList().removeIf(t()::isTotemBlock);
    }

    @EventHandler(priority = EventPriority.HIGHEST, ignoreCancelled = true)
    public void onBlockExplode(BlockExplodeEvent e) {
        e.blockList().removeIf(t()::isTotemBlock);
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onPistonExtend(BlockPistonExtendEvent e) {
        if (e.getBlocks().stream().anyMatch(t()::isTotemBlock)) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onPistonRetract(BlockPistonRetractEvent e) {
        if (e.getBlocks().stream().anyMatch(t()::isTotemBlock)) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onEntityChange(EntityChangeBlockEvent e) {
        if (t().isTotemBlock(e.getBlock())) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onJoin(PlayerJoinEvent e) {
        t().onJoin(e.getPlayer());
    }
}
