package fr.vaeloria.rtp.gui;

import fr.vaeloria.rtp.Messages;
import fr.vaeloria.rtp.RtpWorld;
import fr.vaeloria.rtp.VaeloriaRtpPlugin;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.entity.Player;

import java.util.List;

/** Choix d'un monde chargé, pas encore configuré, à ajouter au RTP. */
public final class AddWorldMenu extends Menu {
    public AddWorldMenu(VaeloriaRtpPlugin plugin, Player viewer) {
        super(plugin, viewer, 6, Messages.ui("<dark_gray>RTP » <green>Ajouter un monde"));
    }

    @Override
    protected void render() {
        List<World> worlds = plugin.registry().unconfigured();
        int slot = 0;
        for (World world : worlds) {
            if (slot >= 45) break;
            Material icon = switch (world.getEnvironment()) {
                case NETHER -> Material.NETHERRACK;
                case THE_END -> Material.END_STONE;
                default -> Material.GRASS_BLOCK;
            };
            set(slot++, item(icon, "<white>" + Messages.escape(world.getName()), List.of(
                    "<gray>Type : <white>" + world.getEnvironment().name(),
                    "<gray>Bordure : <white>" + (int) world.getWorldBorder().getSize() + " blocs",
                    "",
                    "<green>Clic » ajouter et configurer")), e -> {
                RtpWorld added = plugin.registry().add(world);
                plugin.messages().send(viewer, "admin-added", Messages.p("world", world.getName()));
                new WorldEditorMenu(plugin, viewer, added).open();
            });
        }
        if (worlds.isEmpty()) {
            set(22, item(Material.BARRIER, "<gray>Tous les mondes chargés sont déjà configurés", List.of(
                    "<dark_gray>Charge un nouveau monde (Multiverse…) puis reviens ici.")), null);
        }
        set(45, item(Material.ARROW, "<gray>Retour", List.of()), e -> new AdminMenu(plugin, viewer).open());
        fill(Material.GRAY_STAINED_GLASS_PANE);
    }
}
