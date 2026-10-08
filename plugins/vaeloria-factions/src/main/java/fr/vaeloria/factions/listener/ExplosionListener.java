package fr.vaeloria.factions.listener;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.ChunkPos;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.service.FactionManager;
import fr.vaeloria.factions.service.ObsidianService;
import fr.vaeloria.factions.service.RaidService;
import org.bukkit.Location;
import org.bukkit.NamespacedKey;
import org.bukkit.block.Block;
import org.bukkit.entity.Creeper;
import org.bukkit.entity.Entity;
import org.bukkit.entity.EnderDragon;
import org.bukkit.entity.Player;
import org.bukkit.entity.Projectile;
import org.bukkit.entity.TNTPrimed;
import org.bukkit.entity.Wither;
import org.bukkit.entity.WitherSkull;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockExplodeEvent;
import org.bukkit.event.entity.EntityChangeBlockEvent;
import org.bukkit.event.entity.EntityExplodeEvent;
import org.bukkit.event.entity.EntitySpawnEvent;
import org.bukkit.persistence.PersistentDataType;

import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * Pillage basique : filtre les blocs détruits par chaque explosion selon le terrain (grâce, bouclier, zones),
 * applique l'usure des blocs renforcés et prévient les défenseurs.
 */
public final class ExplosionListener implements Listener {
    private final VaeloriaFactionsPlugin plugin;
    private final FactionManager manager;
    private final RaidService raid;
    private final ObsidianService obsidian;
    private final NamespacedKey originKey;

    public ExplosionListener(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
        this.manager = plugin.manager();
        this.raid = plugin.raid();
        this.obsidian = plugin.obsidian();
        this.originKey = new NamespacedKey(plugin, "tnt_origin");
    }

    /** TNT amorcée sans joueur (dispenser, chaîne) : on retient la faction du chunk de départ, pour les stats. */
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onTntSpawn(EntitySpawnEvent e) {
        if (!(e.getEntity() instanceof TNTPrimed tnt)) return;
        Faction origin = attackerOf(tnt.getSource());
        if (origin == null) {
            Faction here = manager.factionAt(e.getLocation());
            if (here != null && !here.system) origin = here;
        }
        if (origin != null) tnt.getPersistentDataContainer().set(originKey, PersistentDataType.STRING, origin.id);
    }

    private Faction attackerOf(Entity e) {
        if (e == null) return null;
        if (e instanceof Player p) return manager.factionOf(p);
        if (e instanceof Projectile pr && pr.getShooter() instanceof Player p) return manager.factionOf(p);
        if (e instanceof TNTPrimed t) {
            String id = t.getPersistentDataContainer().get(originKey, PersistentDataType.STRING);
            if (id != null) return manager.byId(id);
            return t.getSource() == t ? null : attackerOf(t.getSource());
        }
        if (e instanceof Creeper c && c.getTarget() instanceof Player p) return manager.factionOf(p);
        return null;
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onEntityExplode(EntityExplodeEvent e) {
        Entity en = e.getEntity();
        boolean siege = en instanceof TNTPrimed || en instanceof org.bukkit.entity.minecart.ExplosiveMinecart;
        handle(e.getLocation(), e.blockList(), attackerOf(en), siege);
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onBlockExplode(BlockExplodeEvent e) {
        handle(e.getBlock().getLocation(), e.blockList(), null, false);
    }

    /**
     * @param siege explosion de TNT (pillage) : seules celles-ci, ou celles d'un joueur identifié, déclenchent
     *              l'alerte et le verrou de raid. Un creeper errant ne bloque pas une faction pendant 10 minutes.
     */
    private void handle(Location center, List<Block> blocks, Faction attacker, boolean siege) {
        Map<ChunkPos, Boolean> allowedCache = new HashMap<>();
        Map<Faction, Integer> hits = new HashMap<>();
        Map<Faction, java.util.Set<ChunkPos>> where = new HashMap<>();
        for (Iterator<Block> it = blocks.iterator(); it.hasNext(); ) {
            Block b = it.next();
            if (obsidian.indestructible(b.getType()) || obsidian.durability(b.getType()) > 0) {
                // Les blocs renforcés ne cèdent qu'à l'usure (plus bas), jamais d'un seul coup.
                it.remove();
                continue;
            }
            ChunkPos pos = ChunkPos.of(b.getLocation());
            Faction owner = manager.factionAt(pos);
            boolean allowed = allowedCache.computeIfAbsent(pos, k -> raid.explosionAllowed(owner));
            if (!allowed) {
                it.remove();
                continue;
            }
            if (owner != null) {
                hits.merge(owner, 1, Integer::sum);
                where.computeIfAbsent(owner, k -> new java.util.LinkedHashSet<>()).add(pos);
            }
            obsidian.forget(b);
        }

        // Usure des blocs renforcés (durabilité > 0) autour de l'explosion.
        int r = plugin.settings().durabilityRadius;
        if (r > 0 && hasDamageable()) {
            for (int dx = -r; dx <= r; dx++) for (int dy = -r; dy <= r; dy++) for (int dz = -r; dz <= r; dz++) {
                if (dx * dx + dy * dy + dz * dz > r * r) continue;
                Block b = center.getWorld().getBlockAt(center.getBlockX() + dx, center.getBlockY() + dy, center.getBlockZ() + dz);
                if (obsidian.durability(b.getType()) <= 0) continue;
                ChunkPos pos = ChunkPos.of(b.getLocation());
                Faction owner = manager.factionAt(pos);
                if (!allowedCache.computeIfAbsent(pos, k -> raid.explosionAllowed(owner))) continue;
                if (obsidian.damage(b) && owner != null) {
                    hits.merge(owner, 1, Integer::sum);
                    where.computeIfAbsent(owner, k -> new java.util.LinkedHashSet<>()).add(pos);
                }
            }
        }

        // Explosion dans un territoire protégé à son centre : rien à signaler.
        Faction centerOwner = manager.factionAt(center);
        if (centerOwner != null && !centerOwner.system && !hits.containsKey(centerOwner)
                && allowedCache.getOrDefault(ChunkPos.of(center), raid.explosionAllowed(centerOwner))) {
            where.computeIfAbsent(centerOwner, k -> new java.util.LinkedHashSet<>()).add(ChunkPos.of(center));
            hits.put(centerOwner, 0);
        }

        if (!siege && attacker == null) return;
        for (Map.Entry<Faction, Integer> h : hits.entrySet()) {
            Faction defender = h.getKey();
            if (defender.system || (attacker != null && attacker.id.equals(defender.id))) continue;
            raid.onRaidHit(defender, attacker, where.get(defender), h.getValue());
        }
    }

    private boolean hasDamageable() {
        for (int d : plugin.settings().reinforced.values()) if (d > 0) return true;
        return false;
    }

    /** Wither et dragon : ils cassent les blocs en volant, obsidienne comprise pour le wither. */
    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onBossGrief(EntityChangeBlockEvent e) {
        Entity en = e.getEntity();
        if (!(en instanceof Wither || en instanceof WitherSkull || en instanceof EnderDragon)) return;
        Block b = e.getBlock();
        if (plugin.settings().obsidianProtectWither && obsidian.durability(b.getType()) >= 0) {
            e.setCancelled(true);
            return;
        }
        if (!raid.explosionAllowed(manager.factionAt(b.getLocation()))) e.setCancelled(true);
    }
}
