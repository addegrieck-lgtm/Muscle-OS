package fr.vaeloria.jobs;

import org.bukkit.Bukkit;
import org.bukkit.GameMode;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.block.Block;
import org.bukkit.block.BlockFace;
import org.bukkit.block.BrewingStand;
import org.bukkit.block.data.Ageable;
import org.bukkit.block.data.Directional;
import org.bukkit.entity.LivingEntity;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockFormEvent;
import org.bukkit.event.block.BlockPistonExtendEvent;
import org.bukkit.event.block.BlockPistonRetractEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.enchantment.EnchantItemEvent;
import org.bukkit.event.entity.EntityBreedEvent;
import org.bukkit.event.entity.EntityDeathEvent;
import org.bukkit.event.inventory.BrewEvent;
import org.bukkit.event.inventory.CraftItemEvent;
import org.bukkit.event.inventory.FurnaceExtractEvent;
import org.bukkit.event.inventory.InventoryAction;
import org.bukkit.event.inventory.InventoryOpenEvent;
import org.bukkit.event.inventory.SmithItemEvent;
import org.bukkit.event.player.PlayerFishEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.PlayerInventory;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Sources d'XP des métiers. Tout est en MONITOR + ignoreCancelled : une action refusée (claim, protection) ne rapporte rien. */
final class XpListener implements Listener {
    private final VaeloriaJobsPlugin plugin;
    private final Jobs jobs;
    private final PlacedBlocks placed;
    private Set<Material> tracked = Set.of();
    /** Dernier joueur à avoir ouvert chaque alambic. */
    private final Map<Location, UUID> brewers = new HashMap<>();

    XpListener(VaeloriaJobsPlugin plugin, Jobs jobs, PlacedBlocks placed) {
        this.plugin = plugin;
        this.jobs = jobs;
        this.placed = placed;
    }

    void configure(Settings s) {
        tracked = s.ignorePlaced() ? s.trackedBlocks() : Set.of();
    }

    private Settings s() { return jobs.settings(); }

    private boolean ignored(Player p) {
        return s().ignoreCreative() && (p.getGameMode() == GameMode.CREATIVE || p.getGameMode() == GameMode.SPECTATOR);
    }

    // ─────────────── Blocs posés : pas d'XP ───────────────

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onPlace(BlockPlaceEvent event) {
        if (tracked.contains(event.getBlockPlaced().getType())) placed.mark(event.getBlockPlaced());
    }

    /** Générateurs de pierre, cobble, obsidienne (lave + eau). */
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onForm(BlockFormEvent event) {
        if (tracked.contains(event.getNewState().getType())) placed.mark(event.getBlock());
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onPistonExtend(BlockPistonExtendEvent event) {
        moved(event.getBlock(), event.getBlocks(), false);
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onPistonRetract(BlockPistonRetractEvent event) {
        moved(event.getBlock(), event.getBlocks(), true);
    }

    /** Un bloc déplacé par un piston ne compte plus comme naturel. */
    private void moved(Block piston, List<Block> blocks, boolean retract) {
        if (tracked.isEmpty() || !(piston.getBlockData() instanceof Directional d)) return;
        BlockFace dir = retract ? d.getFacing().getOppositeFace() : d.getFacing();
        for (Block b : blocks) if (tracked.contains(b.getType())) placed.mark(b.getRelative(dir));
    }

    // ─────────────── Mineur / Farmer ───────────────

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onBreak(BlockBreakEvent event) {
        Player p = event.getPlayer();
        Block b = event.getBlock();
        Material type = b.getType();
        boolean wasPlaced = tracked.contains(type) && placed.isPlaced(b);
        if (wasPlaced) placed.unmark(b);
        if (ignored(p)) return;
        for (Settings.Job job : s().jobs().values()) {
            Double harvest = job.harvestXp().get(type);
            if (harvest != null && b.getBlockData() instanceof Ageable a && a.getAge() >= a.getMaximumAge()) {
                jobs.addXp(p, job, harvest);
            }
            Double brk = job.breakXp().get(type);
            if (brk != null && !wasPlaced) jobs.addXp(p, job, brk);
        }
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onBreed(EntityBreedEvent event) {
        if (!(event.getBreeder() instanceof Player p) || ignored(p)) return;
        for (Settings.Job job : s().jobs().values()) {
            Double xp = job.breedXp().get(event.getEntity().getType());
            if (xp != null) jobs.addXp(p, job, xp);
        }
    }

    // ─────────────── Chasseur ───────────────

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onKill(EntityDeathEvent event) {
        LivingEntity dead = event.getEntity();
        Player p = dead.getKiller();
        if (p == null || dead instanceof Player || ignored(p)) return;
        double mult = dead.fromMobSpawner() ? s().spawnerMultiplier() : 1.0;
        if (mult <= 0) return;
        for (Settings.Job job : s().jobs().values()) {
            Double xp = job.killXp().get(dead.getType());
            if (xp != null) jobs.addXp(p, job, xp * mult);
        }
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onFish(PlayerFishEvent event) {
        if (event.getState() != PlayerFishEvent.State.CAUGHT_FISH || ignored(event.getPlayer())) return;
        for (Settings.Job job : s().jobs().values()) {
            if (job.fishXp() > 0) jobs.addXp(event.getPlayer(), job, job.fishXp());
        }
    }

    // ─────────────── Forgeron / Alchimiste ───────────────

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onCraft(CraftItemEvent event) {
        if (!(event.getWhoClicked() instanceof Player p) || ignored(p)) return;
        if (event.getAction() == InventoryAction.NOTHING) return;
        ItemStack result = event.getRecipe().getResult();
        Material type = result.getType();
        boolean any = s().jobs().values().stream().anyMatch(j -> j.craftXp().containsKey(type));
        if (!any) return;
        if (event.isShiftClick()) {
            // Fabrication en série : on compte ce qui est réellement arrivé dans l'inventaire.
            int before = count(p.getInventory(), type);
            Bukkit.getScheduler().runTask(plugin, () -> {
                if (!p.isOnline()) return;
                int made = count(p.getInventory(), type) - before;
                if (made > 0) creditCraft(p, type, made);
            });
        } else {
            creditCraft(p, type, result.getAmount());
        }
    }

    private void creditCraft(Player p, Material type, int amount) {
        for (Settings.Job job : s().jobs().values()) {
            Double xp = job.craftXp().get(type);
            if (xp != null) jobs.addXp(p, job, xp * amount);
        }
    }

    private static int count(PlayerInventory inv, Material type) {
        int n = 0;
        for (ItemStack it : inv.getStorageContents()) if (it != null && it.getType() == type) n += it.getAmount();
        return n;
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onSmelt(FurnaceExtractEvent event) {
        Player p = event.getPlayer();
        if (ignored(p) || event.getItemAmount() <= 0) return;
        for (Settings.Job job : s().jobs().values()) {
            Double xp = job.smeltXp().get(event.getItemType());
            if (xp != null) jobs.addXp(p, job, xp * event.getItemAmount());
        }
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onEnchant(EnchantItemEvent event) {
        Player p = event.getEnchanter();
        if (ignored(p)) return;
        for (Settings.Job job : s().jobs().values()) {
            if (job.enchantPerLevel() > 0) jobs.addXp(p, job, job.enchantPerLevel() * event.getExpLevelCost());
        }
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onSmith(SmithItemEvent event) {
        if (!(event.getWhoClicked() instanceof Player p) || ignored(p)) return;
        ItemStack result = event.getInventory().getResult();
        if (result == null || result.getType().isAir() || event.getAction() == InventoryAction.NOTHING) return;
        for (Settings.Job job : s().jobs().values()) {
            if (job.smithXp() > 0) jobs.addXp(p, job, job.smithXp());
        }
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onOpen(InventoryOpenEvent event) {
        if (event.getInventory().getHolder(false) instanceof BrewingStand stand && event.getPlayer() instanceof Player p) {
            if (brewers.size() > 10_000) brewers.clear();
            brewers.put(stand.getLocation(), p.getUniqueId());
        }
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onBrew(BrewEvent event) {
        UUID id = brewers.get(event.getBlock().getLocation());
        Player p = id == null ? null : Bukkit.getPlayer(id);
        if (p == null || ignored(p)) return;
        long potions = event.getResults().stream().filter(i -> i != null && !i.getType().isAir()).count();
        if (potions == 0) return;
        for (Settings.Job job : s().jobs().values()) {
            if (job.brewPerPotion() > 0) jobs.addXp(p, job, job.brewPerPotion() * potions);
        }
    }
}
