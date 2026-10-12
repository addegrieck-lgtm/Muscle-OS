package fr.vaeloria.villageois;

import org.bukkit.Location;
import org.bukkit.block.Block;
import org.bukkit.entity.Egg;
import org.bukkit.entity.Player;
import org.bukkit.entity.Villager;
import org.bukkit.event.Event;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.Action;
import org.bukkit.event.block.BlockDispenseEvent;
import org.bukkit.event.entity.ProjectileHitEvent;
import org.bukkit.event.player.PlayerEggThrowEvent;
import org.bukkit.event.player.PlayerInteractEntityEvent;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.inventory.ItemStack;

import java.util.function.Supplier;

final class CaptureListener implements Listener {
    private final Capture capture;
    private final Supplier<Settings> settings;

    CaptureListener(Capture capture, Supplier<Settings> settings) {
        this.capture = capture;
        this.settings = settings;
    }

    @EventHandler(priority = EventPriority.HIGH)
    public void onHit(ProjectileHitEvent event) {
        if (!(event.getEntity() instanceof Egg egg) || !capture.isEgg(egg.getItem())) return;
        if (!(egg.getShooter() instanceof Player player) || !player.isOnline()) return;
        Settings s = settings.get();
        // Jamais d'annulation : l'œuf annulé continuerait sa course et serait rendu une 2e fois en touchant le sol.
        if (event.getHitEntity() instanceof Villager v) {
            String refusal = !s.captureEnabled() ? "La capture de villageois est désactivée."
                    : Capture.isPluginNpc(v) ? "Ce villageois ne peut pas être capturé."
                    : !Capture.canTouch(player, v) ? "Tu ne peux pas capturer un villageois ici."
                    : null;
            if (refusal == null) {
                Books.give(player, capture.capture(v));
                player.sendMessage(Text.prefixed("<gain>Villageois capturé !</gain> <silver>Clic droit sur un bloc pour le relâcher. Ses échanges sont perdus.</silver>"));
                return;
            }
            player.sendMessage(Text.prefixed("<loss>" + refusal + "</loss>"));
            Books.give(player, capture.egg(1)); // refus : l'œuf n'est jamais perdu
            return;
        }
        if (s.refundOnMiss()) {
            Books.give(player, capture.egg(1));
            player.sendMessage(Text.prefixed("<ash>Raté : l'œuf de capture t'est rendu.</ash>"));
        }
    }

    /** Jamais de poussin avec un œuf de capture. */
    @EventHandler
    public void onHatch(PlayerEggThrowEvent event) {
        if (capture.isEgg(event.getEgg().getItem())) {
            event.setHatching(false);
            event.setNumHatches((byte) 0);
        }
    }

    @EventHandler(priority = EventPriority.HIGH)
    public void onRelease(PlayerInteractEvent event) {
        ItemStack item = event.getItem();
        if (!capture.isCaptured(item)) return;
        // L'œuf d'apparition vanilla ne doit jamais servir (bébé villageois, changement de spawner).
        boolean allowed = event.useItemInHand() != Event.Result.DENY;
        event.setCancelled(true);
        if (event.getAction() != Action.RIGHT_CLICK_BLOCK || event.getClickedBlock() == null || !allowed) return;
        Player player = event.getPlayer();
        Block target = event.getClickedBlock().getRelative(event.getBlockFace());
        if (!target.isPassable() || !target.getRelative(0, 1, 0).isPassable()) {
            player.sendMessage(Text.prefixed("<loss>Pas assez de place pour relâcher le villageois ici.</loss>"));
            return;
        }
        Location at = target.getLocation().add(0.5, 0, 0.5);
        at.setYaw(player.getLocation().getYaw() + 180);
        capture.release(item, at);
        item.setAmount(item.getAmount() - 1);
        player.getInventory().setItem(event.getHand(), item.getAmount() > 0 ? item : null);
        player.sendMessage(Text.prefixed("<gain>Villageois relâché.</gain> <silver>Pose-lui un poste de travail (lutrin pour un bibliothécaire), puis booste-le.</silver>"));
    }

    @EventHandler(priority = EventPriority.LOWEST)
    public void onUseOnEntity(PlayerInteractEntityEvent event) {
        if (capture.isCaptured(event.getPlayer().getInventory().getItem(event.getHand()))) event.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOWEST)
    public void onDispense(BlockDispenseEvent event) {
        if (capture.isCaptured(event.getItem())) event.setCancelled(true);
    }
}
