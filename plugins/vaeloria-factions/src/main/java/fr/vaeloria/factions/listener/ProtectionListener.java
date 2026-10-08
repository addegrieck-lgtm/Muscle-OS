package fr.vaeloria.factions.listener;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.ChunkPos;
import fr.vaeloria.factions.model.FPerm;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.service.AccessService;
import fr.vaeloria.factions.service.FactionManager;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.Tag;
import org.bukkit.block.Block;
import org.bukkit.block.BlockState;
import org.bukkit.block.Container;
import org.bukkit.entity.Enderman;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Hanging;
import org.bukkit.entity.Monster;
import org.bukkit.entity.Player;
import org.bukkit.entity.Projectile;
import org.bukkit.entity.Ravager;
import org.bukkit.entity.Vehicle;
import org.bukkit.entity.minecart.StorageMinecart;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.Action;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockBurnEvent;
import org.bukkit.event.block.BlockFromToEvent;
import org.bukkit.event.block.BlockIgniteEvent;
import org.bukkit.event.block.BlockPistonExtendEvent;
import org.bukkit.event.block.BlockPistonRetractEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.block.BlockSpreadEvent;
import org.bukkit.event.entity.CreatureSpawnEvent;
import org.bukkit.event.entity.EntityChangeBlockEvent;
import org.bukkit.event.entity.EntityDamageByEntityEvent;
import org.bukkit.event.entity.EntityDamageEvent;
import org.bukkit.event.entity.EntityTargetLivingEntityEvent;
import org.bukkit.event.hanging.HangingBreakByEntityEvent;
import org.bukkit.event.hanging.HangingPlaceEvent;
import org.bukkit.event.player.PlayerArmorStandManipulateEvent;
import org.bukkit.event.player.PlayerBucketEmptyEvent;
import org.bukkit.event.player.PlayerBucketFillEvent;
import org.bukkit.event.player.PlayerInteractEntityEvent;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.event.vehicle.VehicleDestroyEvent;
import org.bukkit.inventory.InventoryHolder;
import org.bukkit.inventory.ItemStack;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/** Protection des claims : construction, coffres, portes, pistons, liquides, feu, safezone. */
public final class ProtectionListener implements Listener {
    /** Objets qui modifient le terrain quand on les utilise sur un bloc. */
    private static final Set<Material> TERRAIN_ITEMS = EnumSet.of(Material.FLINT_AND_STEEL, Material.FIRE_CHARGE, Material.BONE_MEAL,
            Material.ARMOR_STAND, Material.END_CRYSTAL, Material.MINECART, Material.CHEST_MINECART, Material.TNT_MINECART,
            Material.HOPPER_MINECART, Material.FURNACE_MINECART, Material.PAINTING, Material.ITEM_FRAME, Material.GLOW_ITEM_FRAME,
            Material.LEAD, Material.WATER_BUCKET, Material.LAVA_BUCKET, Material.POWDER_SNOW_BUCKET, Material.SHEARS,
            Material.BRUSH, Material.HONEYCOMB);

    private final FactionManager manager;
    private final AccessService access;
    private final VaeloriaFactionsPlugin plugin;

    public ProtectionListener(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
        this.manager = plugin.manager();
        this.access = plugin.access();
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onBreak(BlockBreakEvent e) {
        if (!access.check(e.getPlayer(), e.getBlock().getLocation(), FPerm.BUILD)) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onPlace(BlockPlaceEvent e) {
        if (!access.check(e.getPlayer(), e.getBlock().getLocation(), FPerm.BUILD)) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onBucketEmpty(PlayerBucketEmptyEvent e) {
        if (!access.check(e.getPlayer(), e.getBlock().getLocation(), FPerm.BUILD)) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onBucketFill(PlayerBucketFillEvent e) {
        if (!access.check(e.getPlayer(), e.getBlock().getLocation(), FPerm.BUILD)) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onInteract(PlayerInteractEvent e) {
        Block b = e.getClickedBlock();
        if (b == null) return;
        Player p = e.getPlayer();
        if (e.getAction() == Action.PHYSICAL) {
            FPerm perm = b.getType() == Material.FARMLAND || b.getType() == Material.TURTLE_EGG ? FPerm.BUILD : FPerm.DOOR;
            if (!access.allowed(p, b.getLocation(), perm)) e.setCancelled(true);
            return;
        }
        if (e.getAction() != Action.RIGHT_CLICK_BLOCK) return;
        FPerm perm = permFor(b);
        if (perm != null && (!p.isSneaking() || e.getItem() == null)) {
            if (!access.check(p, b.getLocation(), perm)) {
                e.setUseInteractedBlock(org.bukkit.event.Event.Result.DENY);
                if (perm != FPerm.BUILD) e.setUseItemInHand(org.bukkit.event.Event.Result.DENY);
            }
        }
        ItemStack item = e.getItem();
        if (item != null && (TERRAIN_ITEMS.contains(item.getType()) || item.getType().name().endsWith("_SPAWN_EGG")
                || item.getType().name().endsWith("_BOAT") || item.getType().name().endsWith("_RAFT")
                || item.getType().name().endsWith("_AXE") && isStrippable(b.getType())
                || item.getType().name().endsWith("_HOE") || item.getType().name().endsWith("_SHOVEL"))) {
            Location target = b.getRelative(e.getBlockFace()).getLocation();
            if (!access.check(p, b.getLocation(), FPerm.BUILD) || !access.allowed(p, target, FPerm.BUILD)) {
                e.setUseItemInHand(org.bukkit.event.Event.Result.DENY);
                e.setUseInteractedBlock(org.bukkit.event.Event.Result.DENY);
            }
        }
    }

    private static boolean isStrippable(Material m) {
        return Tag.LOGS.isTagged(m) || m.name().contains("COPPER") || m.name().endsWith("_STEM") || m.name().endsWith("_HYPHAE");
    }

    /** Permission nécessaire pour faire un clic droit sur ce bloc, null si libre. */
    private static FPerm permFor(Block b) {
        Material m = b.getType();
        if (Tag.DOORS.isTagged(m) || Tag.TRAPDOORS.isTagged(m) || Tag.FENCE_GATES.isTagged(m) || Tag.BUTTONS.isTagged(m)
                || m == Material.LEVER || Tag.PRESSURE_PLATES.isTagged(m) || m == Material.BELL) {
            return FPerm.DOOR;
        }
        BlockState st = b.getState(false);
        if (st instanceof Container || st instanceof InventoryHolder
                || m == Material.JUKEBOX || m == Material.CHISELED_BOOKSHELF || m == Material.LECTERN
                || m == Material.DECORATED_POT || m.name().endsWith("_SHULKER_BOX")) {
            return FPerm.CONTAINER;
        }
        if (m == Material.REPEATER || m == Material.COMPARATOR || m == Material.NOTE_BLOCK || m == Material.DAYLIGHT_DETECTOR
                || Tag.BEDS.isTagged(m) || m == Material.RESPAWN_ANCHOR || Tag.FLOWER_POTS.isTagged(m) || Tag.CANDLES.isTagged(m)
                || Tag.CANDLE_CAKES.isTagged(m) || m == Material.CAKE || Tag.ALL_SIGNS.isTagged(m) || m == Material.COMPOSTER
                || m == Material.CAULDRON || m == Material.WATER_CAULDRON || m == Material.LAVA_CAULDRON
                || m == Material.BEEHIVE || m == Material.BEE_NEST || m == Material.DRAGON_EGG || m == Material.CRAFTER) {
            return FPerm.BUILD;
        }
        return null;
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onInteractEntity(PlayerInteractEntityEvent e) {
        Entity en = e.getRightClicked();
        FPerm perm = en instanceof StorageMinecart || en instanceof org.bukkit.entity.ChestBoat ? FPerm.CONTAINER
                : en instanceof Hanging || en instanceof org.bukkit.entity.ArmorStand ? FPerm.BUILD : null;
        if (perm != null && !access.check(e.getPlayer(), en.getLocation(), perm)) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onArmorStand(PlayerArmorStandManipulateEvent e) {
        if (!access.check(e.getPlayer(), e.getRightClicked().getLocation(), FPerm.BUILD)) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onHangingPlace(HangingPlaceEvent e) {
        if (e.getPlayer() != null && !access.check(e.getPlayer(), e.getEntity().getLocation(), FPerm.BUILD)) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onHangingBreak(HangingBreakByEntityEvent e) {
        Player p = playerOf(e.getRemover());
        if (p != null) {
            if (!access.check(p, e.getEntity().getLocation(), FPerm.BUILD)) e.setCancelled(true);
        } else if (e.getCause() == org.bukkit.event.hanging.HangingBreakEvent.RemoveCause.EXPLOSION) {
            if (!plugin.raid().explosionAllowed(manager.factionAt(e.getEntity().getLocation()))) e.setCancelled(true);
        }
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onVehicleDestroy(VehicleDestroyEvent e) {
        Player p = playerOf(e.getAttacker());
        if (p != null && !access.check(p, e.getVehicle().getLocation(), FPerm.BUILD)) e.setCancelled(true);
    }

    /** Cadres, supports d'armure et véhicules frappés dans un claim étranger. */
    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onEntityHit(EntityDamageByEntityEvent e) {
        Entity victim = e.getEntity();
        if (!(victim instanceof Hanging || victim instanceof org.bukkit.entity.ArmorStand || victim instanceof Vehicle)) return;
        Player p = playerOf(e.getDamager());
        if (p != null && !access.check(p, victim.getLocation(), FPerm.BUILD)) e.setCancelled(true);
    }

    private static Player playerOf(Entity en) {
        if (en instanceof Player p) return p;
        if (en instanceof Projectile pr && pr.getShooter() instanceof Player p) return p;
        return null;
    }

    // ── Environnement ──

    private boolean crossesBorder(Location from, Location to) {
        String a = manager.ownerId(ChunkPos.of(from));
        String b = manager.ownerId(ChunkPos.of(to));
        return b != null && !b.equals(a);
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onPistonExtend(BlockPistonExtendEvent e) {
        if (!plugin.settings().protectPistons) return;
        Location piston = e.getBlock().getLocation();
        List<Block> blocks = e.getBlocks();
        if (crossesBorder(piston, e.getBlock().getRelative(e.getDirection()).getLocation())) {
            e.setCancelled(true);
            return;
        }
        for (Block b : blocks) {
            if (crossesBorder(piston, b.getRelative(e.getDirection()).getLocation()) || crossesBorder(piston, b.getLocation())) {
                e.setCancelled(true);
                return;
            }
        }
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onPistonRetract(BlockPistonRetractEvent e) {
        if (!plugin.settings().protectPistons) return;
        Location piston = e.getBlock().getLocation();
        for (Block b : e.getBlocks()) {
            if (crossesBorder(piston, b.getLocation())) {
                e.setCancelled(true);
                return;
            }
        }
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onFlow(BlockFromToEvent e) {
        if (!plugin.settings().protectLiquidFlow) return;
        if (crossesBorder(e.getBlock().getLocation(), e.getToBlock().getLocation())) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onIgnite(BlockIgniteEvent e) {
        if (e.getPlayer() != null) {
            if (!access.check(e.getPlayer(), e.getBlock().getLocation(), FPerm.BUILD)) e.setCancelled(true);
            return;
        }
        if (!plugin.settings().protectFireSpread) return;
        if (manager.factionAt(e.getBlock().getLocation()) != null
                && e.getCause() != BlockIgniteEvent.IgniteCause.ENDER_CRYSTAL) {
            e.setCancelled(true);
        }
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onBurn(BlockBurnEvent e) {
        if (plugin.settings().protectFireSpread && manager.factionAt(e.getBlock().getLocation()) != null) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onSpread(BlockSpreadEvent e) {
        if (plugin.settings().protectFireSpread && e.getNewState().getType() == Material.FIRE
                && manager.factionAt(e.getBlock().getLocation()) != null) {
            e.setCancelled(true);
        }
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onMobGrief(EntityChangeBlockEvent e) {
        Entity en = e.getEntity();
        if (en instanceof Enderman || en instanceof Ravager || en instanceof org.bukkit.entity.Silverfish) {
            if (manager.factionAt(e.getBlock().getLocation()) != null) e.setCancelled(true);
        }
    }

    // ── Safezone ──

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onSpawn(CreatureSpawnEvent e) {
        if (!(e.getEntity() instanceof Monster)) return;
        CreatureSpawnEvent.SpawnReason r = e.getSpawnReason();
        if (r != CreatureSpawnEvent.SpawnReason.NATURAL && r != CreatureSpawnEvent.SpawnReason.REINFORCEMENTS
                && r != CreatureSpawnEvent.SpawnReason.PATROL && r != CreatureSpawnEvent.SpawnReason.RAID) return;
        Faction f = manager.factionAt(e.getLocation());
        if (f != null && f.isSafezone()) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onDamage(EntityDamageEvent e) {
        if (!(e.getEntity() instanceof Player p)) return;
        if (e.getCause() == EntityDamageEvent.DamageCause.VOID || e.getCause() == EntityDamageEvent.DamageCause.KILL) return;
        Faction f = manager.factionAt(p.getLocation());
        if (f != null && f.isSafezone()) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onTarget(EntityTargetLivingEntityEvent e) {
        if (!(e.getTarget() instanceof Player p)) return;
        Faction f = manager.factionAt(p.getLocation());
        if (f != null && f.isSafezone()) e.setCancelled(true);
    }
}
