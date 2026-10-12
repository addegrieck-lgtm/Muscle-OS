package fr.vaeloria.rtp.gui;

import fr.vaeloria.rtp.Messages;
import fr.vaeloria.rtp.VaeloriaRtpPlugin;
import fr.vaeloria.rtp.portal.Portal;
import fr.vaeloria.rtp.portal.Wand;
import org.bukkit.Material;
import org.bukkit.entity.Player;

import java.util.List;

/** Liste des portails, création depuis la sélection de la hache. */
public final class PortalListMenu extends Menu {
    public PortalListMenu(VaeloriaRtpPlugin plugin, Player viewer) {
        super(plugin, viewer, 6, Messages.ui("<dark_gray>RTP » <dark_purple>Portails"));
    }

    @Override
    protected void render() {
        int slot = 0;
        for (Portal portal : plugin.portals().all()) {
            if (slot >= 45) break;
            set(slot++, glow(item(plugin.portals().style(portal.style()).icon(), "<white><bold>" + portal.name(), List.of(
                    portal.enabled() ? "<green>● Actif" : "<red>● Désactivé",
                    "<gray>Monde : <white>" + Messages.escape(portal.world()) + " <dark_gray>(" + portal.zone().describe() + ")",
                    "<gray>Destination : <white>" + Messages.escape(portal.describeDestination()),
                    "<gray>Style : " + plugin.portals().style(portal.style()).displayName(),
                    "",
                    "<yellow>Clic » modifier")), portal.enabled()),
                    e -> new PortalEditorMenu(plugin, viewer, portal).open());
        }

        Wand.Selection sel = plugin.wand().selection(viewer);
        boolean ready = sel != null && sel.complete();
        set(45, item(Material.ARROW, "<gray>Retour", List.of()), e -> new AdminMenu(plugin, viewer).open());
        set(48, item(Material.GOLDEN_AXE, "<gold><bold>Hache des portails", List.of(
                "<gray>Clic gauche sur un bloc » coin 1",
                "<gray>Clic droit sur un bloc » coin 2",
                "", "<yellow>Clic » recevoir la hache")), e -> {
            viewer.getInventory().addItem(plugin.wand().create());
            plugin.messages().send(viewer, "wand-given");
        });
        set(50, item(ready ? Material.END_PORTAL_FRAME : Material.GRAY_DYE,
                ready ? "<green><bold>Créer un portail" : "<gray>Créer un portail",
                ready ? List.of("<gray>Sélection : <white>" + sel.cuboid().describe() + " <gray>dans <white>" + Messages.escape(sel.world()),
                        "", "<yellow>Clic » choisir un nom")
                        : List.of("<gray>Sélectionne d'abord la zone avec la hache.")), e -> {
            if (!ready) return;
            plugin.chatPrompt().ask(viewer, "Nom du portail (lettres, chiffres, - et _)", name -> {
                try {
                    Portal portal = plugin.portals().create(name, sel.world(), sel.cuboid());
                    plugin.messages().send(viewer, "portal-created", Messages.p("portal", portal.name()));
                    new PortalEditorMenu(plugin, viewer, portal).open();
                } catch (IllegalArgumentException ex) {
                    plugin.messages().send(viewer, "admin-invalid", Messages.p("error", ex.getMessage()));
                    open();
                }
            }, this::open);
        });
        fill(Material.GRAY_STAINED_GLASS_PANE);
    }
}
