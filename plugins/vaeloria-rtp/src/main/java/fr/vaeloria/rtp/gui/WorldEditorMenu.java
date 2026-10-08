package fr.vaeloria.rtp.gui;

import fr.vaeloria.rtp.Messages;
import fr.vaeloria.rtp.RtpWorld;
import fr.vaeloria.rtp.VaeloriaRtpPlugin;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;

import java.util.ArrayList;
import java.util.List;
import java.util.function.IntSupplier;

/**
 * Édition d'un monde RTP. Valeurs numériques : clic gauche +, clic droit −, Maj+clic = saisie exacte dans le chat.
 * Chaque modification est enregistrée immédiatement dans worlds.yml.
 */
public final class WorldEditorMenu extends Menu {
    private final RtpWorld w;

    public WorldEditorMenu(VaeloriaRtpPlugin plugin, Player viewer, RtpWorld w) {
        super(plugin, viewer, 6, Messages.ui("<dark_gray>RTP » <gold>" + Messages.escape(w.worldName())));
        this.w = w;
    }

    @Override
    protected void render() {
        World world = Bukkit.getWorld(w.worldName());

        set(4, item(material(w.icon(), Material.GRASS_BLOCK), w.displayName(), List.of(
                "<dark_gray>Monde : " + Messages.escape(w.worldName()),
                world == null ? "<red>✖ Monde non chargé" : "<gray>Bordure : <white>" + (int) world.getWorldBorder().getSize() + " blocs")), null);

        // Ligne 2 : apparence et accès
        set(10, glow(item(w.enabled() ? Material.LIME_DYE : Material.GRAY_DYE,
                w.enabled() ? "<green><bold>Activé" : "<red><bold>Désactivé",
                List.of("<gray>Visible et utilisable par les joueurs.", "", "<yellow>Clic » basculer")), w.enabled()),
                e -> change(() -> w.enabled(!w.enabled())));
        set(11, item(Material.NAME_TAG, "<gold>Nom affiché", List.of(
                "<gray>Actuel : " + w.displayName(), "", "<yellow>Clic » saisir (MiniMessage)")),
                e -> prompt("display-name", "Nouveau nom affiché (MiniMessage, ex. <green>Monde Faction</green>)"));
        set(12, item(Material.ITEM_FRAME, "<gold>Icône", List.of(
                "<gray>Actuelle : <white>" + w.icon(), "",
                "<yellow>Clic » prendre l'objet en main", "<yellow>Maj+clic » saisir un matériau")), e -> {
            if (e.isShiftClick()) {
                prompt("icon", "Matériau de l'icône (ex. DIAMOND_SWORD)");
                return;
            }
            ItemStack hand = viewer.getInventory().getItemInMainHand();
            if (hand.getType().isAir()) {
                plugin.messages().send(viewer, "admin-hand-empty");
                return;
            }
            change(() -> w.set("icon", hand.getType().name()));
        });
        List<String> desc = new ArrayList<>();
        desc.add("<gray>Lignes affichées sous le nom :");
        if (w.description().isEmpty()) desc.add("<dark_gray>(aucune)");
        else desc.addAll(w.description());
        desc.add("");
        desc.add("<yellow>Clic » saisir (lignes séparées par |)");
        desc.add("<yellow>Maj+clic » effacer");
        set(13, item(Material.WRITABLE_BOOK, "<gold>Description", desc), e -> {
            if (e.isShiftClick()) change(() -> w.set("description", ""));
            else prompt("description", "Description (lignes séparées par |, MiniMessage accepté)");
        });
        number(14, Material.CHEST, "Position dans le menu /rtp", () -> w.slot(), "slot", 1, 9,
                "-1 = placement automatique centré");
        set(15, glow(item(Material.TRIPWIRE_HOOK, w.permissionRequired() ? "<yellow>Permission requise" : "<gray>Accès libre",
                List.of("<gray>Permission : <white>" + w.permissionNode(), "", "<yellow>Clic » basculer")), w.permissionRequired()),
                e -> change(() -> w.permissionRequired(!w.permissionRequired())));
        set(16, item(w.shape() == RtpWorld.Shape.SQUARE ? Material.MAP : Material.CLOCK,
                "<gold>Forme : <white>" + (w.shape() == RtpWorld.Shape.SQUARE ? "carré" : "cercle"),
                List.of("<gray>Forme de la zone de téléportation.", "", "<yellow>Clic » basculer")),
                e -> change(() -> w.shape(w.shape() == RtpWorld.Shape.SQUARE ? RtpWorld.Shape.CIRCLE : RtpWorld.Shape.SQUARE)));

        // Ligne 3 : zone et délais
        number(19, Material.LEAD, "Rayon minimum", () -> w.minRadius(), "min-radius", 100, 1000,
                "Distance minimale du centre (évite le spawn)");
        number(20, Material.SPYGLASS, "Rayon maximum", () -> w.maxRadius(), "max-radius", 100, 1000,
                "Distance maximale du centre");
        set(21, item(Material.RECOVERY_COMPASS, "<gold>Centre : <white>" + w.centerX() + ", " + w.centerZ(), List.of(
                "<yellow>Clic gauche » ma position",
                "<yellow>Clic droit » 0, 0",
                "<yellow>Maj+clic » centre de la bordure")), e -> {
            if (e.isShiftClick()) {
                if (world == null) return;
                Location c = world.getWorldBorder().getCenter();
                change(() -> w.center(c.getBlockX(), c.getBlockZ()));
            } else if (e.isRightClick()) {
                change(() -> w.center(0, 0));
            } else {
                if (world == null || !viewer.getWorld().equals(world)) {
                    plugin.messages().send(viewer, "admin-wrong-world", Messages.p("world", w.worldName()));
                    return;
                }
                change(() -> w.center(viewer.getLocation().getBlockX(), viewer.getLocation().getBlockZ()));
            }
        });
        number(23, Material.CLOCK, "Délai entre deux RTP (s)", () -> w.cooldownSeconds(), "cooldown", 10, 60,
                "Temps d'attente avant de refaire un RTP");
        number(24, Material.HOPPER, "Compte à rebours (s)", () -> w.warmupSeconds(), "warmup", 1, 5,
                "Immobilité requise avant le départ");
        set(25, item(Material.NETHERRACK, "<gold>Hauteur max : <white>" + (w.maxY() == null ? "auto" : w.maxY()), List.of(
                "<gray>auto = surface (ou 120 dans le Nether).",
                "<gray>Fixer une valeur force la recherche sous ce Y.",
                "",
                "<yellow>Clic gauche » +5   <yellow>Clic droit » −5",
                "<yellow>Maj+clic » saisir (ou « auto »)")), e -> {
            if (e.isShiftClick()) {
                prompt("max-y", "Hauteur max (nombre, ou « auto »)");
                return;
            }
            int base = w.maxY() == null ? 120 : w.maxY();
            change(() -> w.set("max-y", String.valueOf(base + (e.isRightClick() ? -5 : 5))));
        });

        // Bas : actions
        set(45, item(Material.ARROW, "<gray>Retour", List.of()), e -> new AdminMenu(plugin, viewer).open());
        set(49, item(Material.ENDER_PEARL, "<aqua><bold>Tester", List.of(
                "<gray>Te téléporter maintenant dans ce monde", "<gray>(sans délai ni compte à rebours).")), e -> {
            viewer.closeInventory();
            plugin.teleports().request(viewer, w, true);
        });
        set(53, item(Material.LAVA_BUCKET, "<red><bold>Retirer du RTP", List.of(
                "<gray>Le monde n'est pas supprimé, seulement", "<gray>retiré du menu /rtp.", "",
                "<red>Maj+clic » confirmer")), e -> {
            if (!e.isShiftClick()) return;
            plugin.registry().remove(w.worldName());
            plugin.messages().send(viewer, "admin-removed", Messages.p("world", w.worldName()));
            new AdminMenu(plugin, viewer).open();
        });
        fill(Material.GRAY_STAINED_GLASS_PANE);
    }

    private void number(int slot, Material icon, String label, IntSupplier value, String key, int step, int bigStep, String help) {
        set(slot, item(icon, "<gold>" + label + " : <white>" + value.getAsInt(), List.of(
                "<gray>" + help, "",
                "<yellow>Clic gauche » +" + step + "   <yellow>Clic droit » −" + step,
                "<yellow>Touche Q » +" + bigStep + "   <yellow>Ctrl+Q » −" + bigStep,
                "<yellow>Maj+clic » saisir une valeur")), e -> {
            if (e.isShiftClick()) {
                prompt(key, label + " (nombre entier)");
                return;
            }
            int delta = switch (e.getClick()) {
                case LEFT -> step;
                case RIGHT -> -step;
                case DROP -> bigStep;
                case CONTROL_DROP -> -bigStep;
                default -> 0;
            };
            if (delta != 0) change(() -> w.set(key, String.valueOf(value.getAsInt() + delta)));
        });
    }

    private void prompt(String key, String question) {
        plugin.chatPrompt().ask(viewer, question, input -> {
            try {
                w.set(key, input);
                plugin.registry().save();
                plugin.messages().send(viewer, "admin-saved");
            } catch (IllegalArgumentException ex) {
                plugin.messages().send(viewer, "admin-invalid", Messages.p("error", ex.getMessage()));
            }
            open();
        }, this::open);
    }

    private void change(Runnable mutation) {
        try {
            mutation.run();
            plugin.registry().save();
        } catch (IllegalArgumentException ex) {
            plugin.messages().send(viewer, "admin-invalid", Messages.p("error", ex.getMessage()));
        }
        refresh();
    }
}
