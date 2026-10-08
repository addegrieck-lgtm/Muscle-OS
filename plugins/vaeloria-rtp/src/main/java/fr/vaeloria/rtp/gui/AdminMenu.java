package fr.vaeloria.rtp.gui;

import fr.vaeloria.rtp.Messages;
import fr.vaeloria.rtp.RtpWorld;
import fr.vaeloria.rtp.VaeloriaRtpPlugin;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;

/** /rtpadmin : liste des mondes RTP, ajout d'un monde, rechargement. */
public final class AdminMenu extends Menu {
    public AdminMenu(VaeloriaRtpPlugin plugin, Player viewer) {
        super(plugin, viewer, 6, Messages.ui("<dark_gray>RTP » <dark_red><bold>Administration"));
    }

    @Override
    protected void render() {
        int slot = 0;
        for (RtpWorld w : plugin.registry().all()) {
            if (slot >= 45) break;
            boolean loaded = Bukkit.getWorld(w.worldName()) != null;
            List<String> lore = new ArrayList<>();
            lore.add("<dark_gray>Monde : " + Messages.escape(w.worldName()));
            lore.add("");
            lore.add(!loaded ? "<red>✖ Monde non chargé sur ce serveur"
                    : w.enabled() ? "<green>● Activé" : "<red>● Désactivé");
            lore.add("<gray>Rayon : <white>" + w.minRadius() + " → " + w.maxRadius() + " <dark_gray>(" + w.shape() + ")");
            lore.add("<gray>Centre : <white>" + w.centerX() + ", " + w.centerZ());
            lore.add("<gray>Délai : <white>" + w.cooldownSeconds() + "s <gray>· Attente : <white>" + w.warmupSeconds() + "s");
            lore.add("<gray>Permission : " + (w.permissionRequired() ? "<yellow>" + w.permissionNode() : "<white>aucune"));
            lore.add("");
            lore.add("<yellow>Clic » modifier");
            Material icon = loaded ? material(w.icon(), Material.GRASS_BLOCK) : Material.BARRIER;
            set(slot++, glow(item(icon, w.displayName(), lore), w.enabled() && loaded),
                    e -> new WorldEditorMenu(plugin, viewer, w).open());
        }

        set(45, item(Material.EMERALD, "<green><bold>Ajouter un monde", List.of(
                "<gray>Rendre un monde chargé disponible au RTP.")), e -> new AddWorldMenu(plugin, viewer).open());
        set(48, item(Material.COMPASS, "<aqua>Aperçu joueur", List.of(
                "<gray>Ouvrir le menu /rtp tel que les joueurs le voient.")), e -> new PlayerMenu(plugin, viewer).open());
        set(50, item(Material.REPEATER, "<gold>Recharger", List.of(
                "<gray>Relire config.yml et worlds.yml.")), e -> {
            plugin.reloadAll();
            plugin.messages().send(viewer, "reloaded");
            refresh();
        });
        set(53, item(Material.OAK_DOOR, "<red>Fermer", List.of()), e -> viewer.closeInventory());
        fill(Material.GRAY_STAINED_GLASS_PANE);
    }
}
