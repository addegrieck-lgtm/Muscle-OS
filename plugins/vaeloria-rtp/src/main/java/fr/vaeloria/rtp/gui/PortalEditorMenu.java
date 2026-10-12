package fr.vaeloria.rtp.gui;

import fr.vaeloria.rtp.Messages;
import fr.vaeloria.rtp.RtpWorld;
import fr.vaeloria.rtp.VaeloriaRtpPlugin;
import fr.vaeloria.rtp.portal.Portal;
import fr.vaeloria.rtp.portal.PortalStyle;
import fr.vaeloria.rtp.portal.Wand;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;

/** Réglages d'un portail : destination, style de particules, accès, zone. */
public final class PortalEditorMenu extends Menu {
    private final Portal portal;

    public PortalEditorMenu(VaeloriaRtpPlugin plugin, Player viewer, Portal portal) {
        super(plugin, viewer, 5, Messages.ui("<dark_gray>Portail » <dark_purple>" + portal.name()));
        this.portal = portal;
    }

    @Override
    protected void render() {
        PortalStyle style = plugin.portals().style(portal.style());
        set(4, item(style.icon(), "<white><bold>" + portal.name(), List.of(
                "<gray>Monde : <white>" + Messages.escape(portal.world()),
                "<gray>Zone : <white>" + portal.zone().describe() + " <dark_gray>(" + portal.zone().volume() + " blocs)",
                "<gray>Destination : <white>" + Messages.escape(portal.describeDestination()))), null);

        set(10, glow(item(portal.enabled() ? Material.LIME_DYE : Material.GRAY_DYE,
                portal.enabled() ? "<green><bold>Actif" : "<red><bold>Désactivé",
                List.of("<gray>Désactivé : ni particules ni téléportation.", "", "<yellow>Clic » basculer")), portal.enabled()),
                e -> change(() -> portal.enabled(!portal.enabled())));

        set(12, item(Material.RECOVERY_COMPASS, "<gold>Destination : ma position", List.of(
                "<gray>Les joueurs arriveront exactement ici,",
                "<gray>tournés dans la même direction que toi.",
                "", "<yellow>Clic » définir")), e -> {
            Location l = viewer.getLocation();
            change(() -> portal.sendTo(l.getWorld().getName(), l.getX(), l.getY(), l.getZ(), l.getYaw(), l.getPitch()));
            plugin.messages().send(viewer, "portal-dest-set", Messages.p("portal", portal.name()),
                    Messages.p("dest", portal.describeDestination()));
        });

        List<RtpWorld> worlds = new ArrayList<>(plugin.registry().all());
        List<String> rtpLore = new ArrayList<>(List.of("<gray>Le portail fait un RTP dans un monde", "<gray>(délai et permission du monde respectés).", ""));
        for (RtpWorld w : worlds) {
            boolean current = portal.destination() == Portal.Destination.RTP && w.worldName().equalsIgnoreCase(portal.rtpWorld());
            rtpLore.add((current ? "<green>▶ " : "<dark_gray>  ") + w.displayName());
        }
        rtpLore.add("");
        rtpLore.add("<yellow>Clic » monde suivant");
        set(14, item(Material.ENDER_PEARL, "<gold>Destination : RTP", rtpLore), e -> {
            if (worlds.isEmpty()) return;
            int idx = -1;
            for (int i = 0; i < worlds.size(); i++) {
                if (portal.destination() == Portal.Destination.RTP && worlds.get(i).worldName().equalsIgnoreCase(portal.rtpWorld())) idx = i;
            }
            RtpWorld next = worlds.get((idx + 1) % worlds.size());
            change(() -> portal.sendToRtp(next.worldName()));
        });

        List<PortalStyle> styles = new ArrayList<>(plugin.portals().styles());
        List<String> styleLore = new ArrayList<>();
        for (PortalStyle s : styles) styleLore.add((s.id().equals(style.id()) ? "<green>▶ " : "<dark_gray>  ") + s.displayName());
        styleLore.add("");
        styleLore.add("<yellow>Clic gauche » suivant   <yellow>Clic droit » précédent");
        set(16, glow(item(style.icon(), "<gold>Particules : " + style.displayName(), styleLore), true), e -> {
            if (styles.isEmpty()) return;
            int idx = Math.max(0, styles.indexOf(style));
            int next = Math.floorMod(idx + (e.isRightClick() ? -1 : 1), styles.size());
            change(() -> portal.style(styles.get(next).id()));
        });

        set(20, glow(item(Material.TRIPWIRE_HOOK, portal.permissionRequired() ? "<yellow>Permission requise" : "<gray>Accès libre",
                List.of("<gray>Permission : <white>" + portal.permissionNode(), "", "<yellow>Clic » basculer")), portal.permissionRequired()),
                e -> change(() -> portal.permissionRequired(!portal.permissionRequired())));

        set(22, item(Material.SPYGLASS, "<aqua>Voir la zone", List.of("<gray>Affiche le contour pendant 15 secondes.")), e -> {
            plugin.wand().preview(viewer, portal.zone(), 15);
            viewer.closeInventory();
        });

        Wand.Selection sel = plugin.wand().selection(viewer);
        set(24, item(Material.GOLDEN_AXE, "<gold>Redéfinir la zone", List.of(
                sel != null && sel.complete() ? "<gray>Nouvelle zone : <white>" + sel.cuboid().describe() + " <gray>dans <white>" + Messages.escape(sel.world())
                        : "<gray>Sélectionne d'abord la zone avec la hache.",
                "", "<yellow>Clic » appliquer ma sélection")), e -> {
            if (sel == null || !sel.complete()) return;
            change(() -> {
                plugin.portals().checkVolume(sel.cuboid());
                portal.zone(sel.world(), sel.cuboid());
            });
        });

        set(36, item(Material.ARROW, "<gray>Retour", List.of()), e -> new PortalListMenu(plugin, viewer).open());
        set(40, item(Material.COMPASS, "<aqua>Aller au portail", List.of()), e -> {
            World w = Bukkit.getWorld(portal.world());
            if (w == null) return;
            viewer.closeInventory();
            // Juste à côté de la zone, pour ne pas déclencher le portail en arrivant.
            viewer.teleportAsync(new Location(w, portal.zone().maxX() + 2.5, portal.zone().minY(), portal.zone().centerZ()));
        });
        set(44, item(Material.LAVA_BUCKET, "<red><bold>Supprimer le portail", List.of("<red>Maj+clic » confirmer")), e -> {
            if (!e.isShiftClick()) return;
            plugin.portals().remove(portal.name());
            plugin.messages().send(viewer, "portal-removed", Messages.p("portal", portal.name()));
            new PortalListMenu(plugin, viewer).open();
        });
        fill(Material.GRAY_STAINED_GLASS_PANE);
    }

    private void change(Runnable mutation) {
        try {
            mutation.run();
            plugin.portals().save();
        } catch (IllegalArgumentException ex) {
            plugin.messages().send(viewer, "admin-invalid", Messages.p("error", ex.getMessage()));
        }
        refresh();
    }
}
