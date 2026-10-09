package fr.vaeloria.staff.npc;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityCombustEvent;
import org.bukkit.event.entity.EntityDamageByEntityEvent;
import org.bukkit.event.entity.EntityDamageEvent;
import org.bukkit.event.entity.EntityTargetEvent;
import org.bukkit.event.player.PlayerInteractAtEntityEvent;
import org.bukkit.event.player.PlayerInteractEntityEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.inventory.EquipmentSlot;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/** Clic sur un PNJ (actions), protection (dégâts, feu, échanges), accès admin (accroupi + clic). */
public final class NpcListener implements Listener {
    private final VaeloriaStaffPlugin plugin;
    private final Map<UUID, Long> cooldown = new HashMap<>();

    public NpcListener(VaeloriaStaffPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onInteract(PlayerInteractEntityEvent event) {
        Npc npc = plugin.npcs().of(event.getRightClicked());
        if (npc == null) return;
        event.setCancelled(true); // pas d'échange avec un villageois, pas d'objet posé sur un support d'armure
        if (event.getHand() == EquipmentSlot.HAND) use(event.getPlayer(), npc);
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onInteractAt(PlayerInteractAtEntityEvent event) {
        if (plugin.npcs().of(event.getRightClicked()) != null) event.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onDamage(EntityDamageEvent event) {
        Npc npc = plugin.npcs().of(event.getEntity());
        if (npc == null) return;
        event.setCancelled(true);
        if (event instanceof EntityDamageByEntityEvent byEntity && byEntity.getDamager() instanceof Player player) use(player, npc);
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onCombust(EntityCombustEvent event) {
        if (plugin.npcs().of(event.getEntity()) != null) event.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onTarget(EntityTargetEvent event) {
        Entity e = event.getEntity();
        if (plugin.npcs().of(e) != null) event.setCancelled(true);
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent event) {
        cooldown.remove(event.getPlayer().getUniqueId());
    }

    private void use(Player player, Npc npc) {
        long now = System.currentTimeMillis();
        Long last = cooldown.get(player.getUniqueId());
        if (last != null && now - last < 750) return;
        cooldown.put(player.getUniqueId(), now);
        if (player.isSneaking() && player.hasPermission("vaeloria.staff.npc")) {
            new NpcEditMenu(plugin, player, npc).open();
            return;
        }
        plugin.npcs().interact(npc, player);
    }
}
