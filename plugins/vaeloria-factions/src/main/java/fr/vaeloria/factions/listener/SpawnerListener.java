package fr.vaeloria.factions.listener;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.FPerm;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.util.Msg;
import net.kyori.adventure.text.format.TextDecoration;
import org.bukkit.Material;
import org.bukkit.block.Block;
import org.bukkit.block.CreatureSpawner;
import org.bukkit.entity.EntityType;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockExplodeEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.entity.EntityExplodeEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.BlockStateMeta;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Spawners pillables : ils résistent aux explosions et ne se récupèrent qu'à la main, par la faction qui tient le
 * chunk (après un surclaim, c'est l'attaquant) ou par un ennemi pendant une brèche. Ils tombent alors en objet,
 * avec leur type de créature : c'est le butin le plus précieux d'un raid.
 */
public final class SpawnerListener implements Listener {
    private final VaeloriaFactionsPlugin plugin;

    public SpawnerListener(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
    }

    public static ItemStack item(EntityType type) {
        ItemStack it = new ItemStack(Material.SPAWNER);
        if (type == null) return it;
        BlockStateMeta meta = (BlockStateMeta) it.getItemMeta();
        CreatureSpawner cs = (CreatureSpawner) meta.getBlockState();
        cs.setSpawnedType(type);
        meta.setBlockState(cs);
        meta.displayName(Msg.parse("<gold>Spawner à <n>", "n", type.name().toLowerCase(Locale.ROOT).replace('_', ' '))
                .decoration(TextDecoration.ITALIC, false));
        it.setItemMeta(meta);
        return it;
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onBreak(BlockBreakEvent e) {
        Block b = e.getBlock();
        if (b.getType() != Material.SPAWNER || !plugin.settings().spawnersEnabled) return;
        Faction owner = plugin.manager().factionAt(b.getLocation());
        if (owner == null && !plugin.settings().spawnersWildernessDrop) return;
        if (owner != null && owner.system) return;
        EntityType type = b.getState(false) instanceof CreatureSpawner cs ? cs.getSpawnedType() : null;
        e.setExpToDrop(0);
        b.getWorld().dropItemNaturally(b.getLocation().add(0.5, 0.5, 0.5), item(type));
        Player p = e.getPlayer();
        String label = "spawner " + (type == null ? "vide" : type.name().toLowerCase(Locale.ROOT).replace('_', ' '));
        if (owner != null && plugin.access().viaBreach(p, b.getLocation(), FPerm.SPAWNER)) {
            Faction mine = plugin.manager().factionOf(p);
            if (owner.raidReport != null && mine != null) owner.raidReport.addStolen(mine.name, Map.of(label, 1));
            plugin.logs().add(owner, "VOL", p.getName() + (mine == null ? "" : " (" + mine.name + ")"), "a arraché un " + label);
            Msg.send(p, "spawner.looted", "type", label);
        }
    }

    /** Un spawner posé garde la créature indiquée sur l'objet. */
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onPlace(BlockPlaceEvent e) {
        if (e.getBlock().getType() != Material.SPAWNER) return;
        if (!(e.getItemInHand().getItemMeta() instanceof BlockStateMeta meta) || !(meta.getBlockState() instanceof CreatureSpawner src)) return;
        if (src.getSpawnedType() == null) return;
        if (e.getBlock().getState() instanceof CreatureSpawner dst) {
            dst.setSpawnedType(src.getSpawnedType());
            dst.update(true, false);
        }
    }

    @EventHandler(priority = EventPriority.HIGHEST, ignoreCancelled = true)
    public void onExplode(EntityExplodeEvent e) {
        protect(e.blockList());
    }

    @EventHandler(priority = EventPriority.HIGHEST, ignoreCancelled = true)
    public void onBlockExplode(BlockExplodeEvent e) {
        protect(e.blockList());
    }

    private void protect(List<Block> blocks) {
        if (!plugin.settings().spawnersEnabled || !plugin.settings().spawnersExplosionProof) return;
        blocks.removeIf(b -> b.getType() == Material.SPAWNER && plugin.manager().factionAt(b.getLocation()) != null);
    }
}
