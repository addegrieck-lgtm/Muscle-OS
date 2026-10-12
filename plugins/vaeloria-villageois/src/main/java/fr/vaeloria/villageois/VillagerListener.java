package fr.vaeloria.villageois;

import org.bukkit.entity.Player;
import org.bukkit.entity.Villager;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerInteractEntityEvent;
import org.bukkit.inventory.EquipmentSlot;

import java.util.function.BiFunction;

/** Accroupi + clic droit sur un bibliothécaire : menu de boost, là où le joueur pourrait frapper le villageois. */
final class VillagerListener implements Listener {
    private final BiFunction<Player, Villager, Menu> menus;

    VillagerListener(BiFunction<Player, Villager, Menu> menus) {
        this.menus = menus;
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onInteract(PlayerInteractEntityEvent event) {
        if (event.getHand() != EquipmentSlot.HAND || !event.getPlayer().isSneaking()) return;
        if (!(event.getRightClicked() instanceof Villager v) || v.getProfession() != Villager.Profession.LIBRARIAN) return;
        if (Capture.isPluginNpc(v) || !event.getPlayer().hasPermission("vaeloria.villageois.use")) return;
        event.setCancelled(true);
        // Relancer les livres d'un villageois chez une autre faction serait du grief : même règle que pour le frapper.
        if (!Capture.canTouch(event.getPlayer(), v)) {
            event.getPlayer().sendMessage(Text.prefixed("<loss>Tu ne peux pas booster un villageois ici.</loss>"));
            return;
        }
        menus.apply(event.getPlayer(), v).open();
    }
}
