package fr.vaeloria.echanges;

import fr.vaeloria.echanges.model.Forbidden;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.serializer.gson.GsonComponentSerializer;
import org.bukkit.Bukkit;
import org.bukkit.GameMode;
import org.bukkit.Location;
import org.bukkit.NamespacedKey;
import org.bukkit.Particle;
import org.bukkit.Registry;
import org.bukkit.Sound;
import org.bukkit.block.Block;
import org.bukkit.damage.DamageSource;
import org.bukkit.damage.DamageType;
import org.bukkit.entity.Egg;
import org.bukkit.entity.Player;
import org.bukkit.entity.Villager;
import org.bukkit.event.Event;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.Action;
import org.bukkit.event.block.BlockDispenseEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.entity.EntityDamageByEntityEvent;
import org.bukkit.event.entity.EntityDamageEvent;
import org.bukkit.event.entity.ProjectileHitEvent;
import org.bukkit.event.player.PlayerEggThrowEvent;
import org.bukkit.event.player.PlayerInteractEntityEvent;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.inventory.EquipmentSlot;
import org.bukkit.inventory.ItemStack;
import org.bukkit.persistence.PersistentDataContainer;
import org.bukkit.persistence.PersistentDataType;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Capture à l'œuf : l'œuf touche un villageois → le villageois devient un objet que le joueur relâche ailleurs.
 * Les échanges ne sont pas conservés : relâché, il repart au niveau 1 sans livre et ses anciens livres lui sont interdits.
 */
public final class CaptureListener implements Listener {
    private final VaeloriaEchangesPlugin plugin;
    /** Œufs qui viennent de capturer : ils ne doivent pas faire naître de poussin. */
    private final Set<UUID> spentEggs = new HashSet<>();

    public CaptureListener(VaeloriaEchangesPlugin plugin) { this.plugin = plugin; }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onHit(ProjectileHitEvent e) {
        if (!(e.getEntity() instanceof Egg egg) || !(e.getHitEntity() instanceof Villager v)) return;
        if (!(egg.getShooter() instanceof Player p)) return;
        boolean special = plugin.items().isCaptureEgg(egg.getItem());
        if (!special && !plugin.settings().plainEggs()) return;
        spentEggs.add(egg.getUniqueId());

        String refusal = refusal(p, v);
        if (refusal != null) {
            plugin.msg(p, "&c" + refusal);
            if (special && p.getGameMode() != GameMode.CREATIVE) give(p, plugin.items().captureEgg(1), p.getLocation());
            return;
        }

        Trades trades = plugin.trades();
        String forbidden = Forbidden.merge(trades.forbiddenRaw(v), Trades.bookIds(v), plugin.settings().maxForbidden());
        ItemStack item = plugin.items().captured(v, forbidden);
        Location at = v.getLocation();
        v.remove();
        give(p, item, at);
        at.getWorld().spawnParticle(Particle.POOF, at.clone().add(0, 1, 0), 25, 0.3, 0.6, 0.3, 0.02);
        at.getWorld().playSound(at, Sound.ENTITY_ITEM_PICKUP, 1f, 0.6f);
        plugin.msg(p, "&aVillageois capturé ! &7Clic droit sur un bloc pour le relâcher.");
        plugin.getLogger().info(p.getName() + " a capturé un villageois " + v.getProfession().getKey().getKey()
                + " en " + at.getWorld().getName() + " " + at.getBlockX() + " " + at.getBlockY() + " " + at.getBlockZ()
                + (forbidden.isEmpty() ? "" : " (livres interdits : " + forbidden + ")"));
    }

    /** Raison du refus de capture, ou null si la capture est permise. */
    private String refusal(Player p, Villager v) {
        if (!p.hasPermission("vaeloria.echanges.use")) return "Tu ne peux pas capturer de villageois.";
        if (!v.isAdult()) return "On ne capture pas un bébé villageois.";
        if (v.isTrading()) return "Ce villageois est en train de commercer.";
        if (v.isDead() || !v.isValid()) return "Ce villageois n'est plus là.";
        if (plugin.settings().respectProtections()) {
            // Les plugins de protection (claims de faction, régions) annulent les coups portés aux villageois chez eux.
            DamageSource source = DamageSource.builder(DamageType.PLAYER_ATTACK).withCausingEntity(p).withDirectEntity(p).build();
            Event probe = new EntityDamageByEntityEvent(p, v, EntityDamageEvent.DamageCause.ENTITY_ATTACK, source, 0);
            Bukkit.getPluginManager().callEvent(probe);
            if (((EntityDamageByEntityEvent) probe).isCancelled()) return "Ce villageois est protégé ici.";
        }
        return null;
    }

    @EventHandler(priority = EventPriority.HIGH)
    public void onEggThrow(PlayerEggThrowEvent e) {
        if (spentEggs.remove(e.getEgg().getUniqueId()) || plugin.items().isCaptureEgg(e.getEgg().getItem())) {
            e.setHatching(false);
        }
    }

    // ── Relâcher ─────────────────────────────────────────────────────

    @EventHandler(priority = EventPriority.HIGH)
    public void onUse(PlayerInteractEvent e) {
        ItemStack item = e.getItem();
        if (!plugin.items().isCaptured(item)) return;
        // L'œuf ne doit jamais servir d'œuf d'apparition vanilla (bébé villageois, spawner…).
        e.setUseItemInHand(Event.Result.DENY);
        e.setUseInteractedBlock(Event.Result.DENY);
        if (e.getAction() != Action.RIGHT_CLICK_BLOCK || e.getClickedBlock() == null) return;
        Player p = e.getPlayer();
        if (!p.hasPermission("vaeloria.echanges.use")) return;

        Block target = e.getClickedBlock().getRelative(e.getBlockFace());
        if (!target.isPassable() || !target.getRelative(0, 1, 0).isPassable()) {
            plugin.msg(p, "&cPas assez de place pour relâcher le villageois ici.");
            return;
        }
        if (plugin.settings().respectProtections() && !canBuild(p, target, e.getClickedBlock(), item, e.getHand())) {
            plugin.msg(p, "&cTu ne peux relâcher un villageois que là où tu peux construire (tes claims, la zone libre).");
            return;
        }
        PersistentDataContainer data = item.getItemMeta().getPersistentDataContainer();
        NamespacedKey professionKey = key(data.get(plugin.keys().capturedProfession, PersistentDataType.STRING));
        NamespacedKey typeKey = key(data.get(plugin.keys().capturedType, PersistentDataType.STRING));
        Villager.Profession profession = professionKey == null ? null : Registry.VILLAGER_PROFESSION.get(professionKey);
        Villager.Type type = typeKey == null ? null : Registry.VILLAGER_TYPE.get(typeKey);
        String forbidden = data.getOrDefault(plugin.keys().capturedForbidden, PersistentDataType.STRING, "");
        String rawName = data.get(plugin.keys().capturedName, PersistentDataType.STRING);
        Component name = rawName == null ? null : GsonComponentSerializer.gson().deserialize(rawName);

        // Retirer l'objet AVANT de faire apparaître le villageois : aucune duplication possible.
        ItemStack refund = item.asOne();
        if (p.getGameMode() != GameMode.CREATIVE) item.setAmount(item.getAmount() - 1);
        Location loc = target.getLocation().add(0.5, 0, 0.5);
        loc.setYaw(p.getLocation().getYaw() + 180);
        Villager released = target.getWorld().spawn(loc, Villager.class, v -> {
            // Marquer AVANT le métier : le livre que le métier génère est alors refusé (voir TradeListener).
            PersistentDataContainer pdc = v.getPersistentDataContainer();
            pdc.set(plugin.keys().needsBoost, PersistentDataType.BYTE, (byte) 1);
            if (!forbidden.isEmpty()) pdc.set(plugin.keys().forbidden, PersistentDataType.STRING, forbidden);
            if (type != null) v.setVillagerType(type);
            if (profession != null) v.setProfession(profession);
            v.setVillagerLevel(1);
            v.setVillagerExperience(0);
            if (name != null) v.customName(name);
        });
        if (!released.isValid()) {
            // Apparition annulée par un autre plugin (anti-mobs d'un claim, région…) : l'objet est rendu.
            if (p.getGameMode() != GameMode.CREATIVE) give(p, refund, p.getLocation());
            plugin.msg(p, "&cLes villageois ne peuvent pas apparaître ici. Ton villageois capturé t'a été rendu.");
            return;
        }
        target.getWorld().spawnParticle(Particle.HAPPY_VILLAGER, loc.clone().add(0, 1, 0), 15, 0.3, 0.6, 0.3);
        plugin.msg(p, "&aVillageois relâché. &7Accroupi + clic droit avec des émeraudes pour lui faire proposer un livre.");
    }

    @EventHandler(priority = EventPriority.HIGH)
    public void onUseOnEntity(PlayerInteractEntityEvent e) {
        ItemStack hand = e.getPlayer().getInventory().getItem(e.getHand());
        if (plugin.items().isCaptured(hand)) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onDispense(BlockDispenseEvent e) {
        if (plugin.items().isCaptured(e.getItem()) || plugin.items().isCaptureEgg(e.getItem())) e.setCancelled(true);
    }

    /**
     * Droit de construire sur ce bloc : un faux placement de bloc est soumis aux plugins de protection
     * (claims de faction, régions), qui l'annulent hors des zones où le joueur peut bâtir.
     */
    private static boolean canBuild(Player p, Block target, Block against, ItemStack item, EquipmentSlot hand) {
        BlockPlaceEvent probe = new BlockPlaceEvent(target, target.getState(), against, item, p, true, hand);
        Bukkit.getPluginManager().callEvent(probe);
        return !probe.isCancelled() && probe.canBuild();
    }

    private static NamespacedKey key(String raw) {
        return raw == null ? null : NamespacedKey.fromString(raw);
    }

    static void give(Player p, ItemStack item, Location fallback) {
        for (ItemStack left : p.getInventory().addItem(item).values()) fallback.getWorld().dropItemNaturally(fallback, left);
    }
}
