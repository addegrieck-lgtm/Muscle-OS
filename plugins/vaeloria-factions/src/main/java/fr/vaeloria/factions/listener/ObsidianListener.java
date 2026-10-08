package fr.vaeloria.factions.listener;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.service.ObsidianService;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import org.bukkit.Keyed;
import org.bukkit.Material;
import org.bukkit.block.Block;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.Action;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockFormEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.entity.PiglinBarterEvent;
import org.bukkit.event.inventory.PrepareItemCraftEvent;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.event.world.LootGenerateEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.Recipe;

import java.util.List;
import java.util.ListIterator;
import java.util.concurrent.ThreadLocalRandom;

/** Rend l'obsidienne rare : pas de génerateur eau/lave, éclats à la place des blocs naturels, butin et troc filtrés. */
public final class ObsidianListener implements Listener {
    private final VaeloriaFactionsPlugin plugin;
    private final ObsidianService obsidian;

    public ObsidianListener(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
        this.obsidian = plugin.obsidian();
    }

    private Settings s() { return plugin.settings(); }

    private static boolean isObsidian(Material m) {
        return m == Material.OBSIDIAN || m == Material.CRYING_OBSIDIAN;
    }

    /** Eau sur une source de lave : de la pierre au lieu de l'obsidienne. */
    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onForm(BlockFormEvent e) {
        if (s().obsidianBlockGeneration && e.getNewState().getType() == Material.OBSIDIAN) {
            e.getNewState().setType(Material.COBBLESTONE);
        }
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onBreak(BlockBreakEvent e) {
        if (fr.vaeloria.factions.util.Probes.isProbe(e)) return;
        Block b = e.getBlock();
        Player p = e.getPlayer();
        if (plugin.totems().isTotemBlock(b)) return;
        obsidian.forget(b);
        if (p.getGameMode() == org.bukkit.GameMode.CREATIVE) return;
        if (isObsidian(b.getType())) {
            Faction owner = plugin.manager().factionAt(b.getLocation());
            // Obsidienne de la nature (portails, End) : seulement des éclats. Celle d'un claim que vous tenez reste entière :
            // c'est le butin d'un surclaim réussi.
            if (owner == null && s().obsidianWildShards) {
                e.setDropItems(false);
                int n = ThreadLocalRandom.current().nextInt(s().shardsMin, s().shardsMax + 1);
                if (n > 0) b.getWorld().dropItemNaturally(b.getLocation().add(0.5, 0.5, 0.5), obsidian.shard(n));
            }
            return;
        }
        if (s().oreShardChance > 0 && b.getType().name().startsWith("DEEPSLATE_") && b.getType().name().endsWith("_ORE")) {
            ItemStack tool = p.getInventory().getItemInMainHand();
            if (tool.containsEnchantment(Enchantment.SILK_TOUCH)) return;
            if (ThreadLocalRandom.current().nextDouble() < s().oreShardChance) {
                b.getWorld().dropItemNaturally(b.getLocation().add(0.5, 0.5, 0.5), obsidian.shard(1));
                Msg.send(p, "obsidian.shard-found");
            }
        }
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onPlace(BlockPlaceEvent e) {
        obsidian.forget(e.getBlock());
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onLoot(LootGenerateEvent e) {
        if (!s().obsidianLootReplace) return;
        List<ItemStack> loot = e.getLoot();
        replace(loot);
        e.setLoot(loot);
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onBarter(PiglinBarterEvent e) {
        if (s().obsidianBarterReplace) replace(e.getOutcome());
    }

    private void replace(List<ItemStack> items) {
        for (ListIterator<ItemStack> it = items.listIterator(); it.hasNext(); ) {
            ItemStack i = it.next();
            if (i != null && isObsidian(i.getType())) it.set(obsidian.shard(i.getAmount()));
        }
    }

    /** Les éclats ne servent qu'à refaire de l'obsidienne (pas de boussole de récupération en éclats d'écho). */
    @EventHandler(priority = EventPriority.HIGH)
    public void onCraft(PrepareItemCraftEvent e) {
        boolean hasShard = false;
        for (ItemStack i : e.getInventory().getMatrix()) {
            if (obsidian.isShard(i)) {
                hasShard = true;
                break;
            }
        }
        if (!hasShard) return;
        Recipe r = e.getRecipe();
        if (!(r instanceof Keyed k) || !k.getKey().equals(obsidian.recipeKey())) e.getInventory().setResult(null);
    }

    /** Clic droit avec une horloge sur un bloc renforcé : affiche son usure. */
    @EventHandler(priority = EventPriority.MONITOR)
    public void onInspect(PlayerInteractEvent e) {
        if (e.getAction() != Action.RIGHT_CLICK_BLOCK || e.getClickedBlock() == null || e.getItem() == null
                || e.getItem().getType() != Material.CLOCK) return;
        Block b = e.getClickedBlock();
        int max = obsidian.durability(b.getType());
        if (max < 0) return;
        if (max == 0) e.getPlayer().sendActionBar(Msg.get("obsidian.inspect-unbreakable"));
        else e.getPlayer().sendActionBar(Msg.get("obsidian.inspect", "left", max - obsidian.hits(b), "max", max));
    }
}
