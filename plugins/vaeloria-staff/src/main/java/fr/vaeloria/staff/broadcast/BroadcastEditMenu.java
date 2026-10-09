package fr.vaeloria.staff.broadcast;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.gui.ConfirmMenu;
import fr.vaeloria.staff.gui.LinesMenu;
import fr.vaeloria.staff.gui.Menu;
import fr.vaeloria.staff.util.Items;
import net.kyori.adventure.bossbar.BossBar;
import org.bukkit.Material;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;

public final class BroadcastEditMenu extends Menu {
    /** Sons proposés au clic ; tout autre son (y compris d'un pack de ressources) peut être saisi au shift-clic. */
    static final List<String> SOUNDS = List.of(
            "", "entity.experience_orb.pickup", "block.note_block.pling", "block.note_block.bell", "entity.player.levelup",
            "ui.toast.challenge_complete", "block.bell.use", "block.beacon.activate", "entity.ender_dragon.growl",
            "entity.wither.spawn", "item.goat_horn.sound.0", "event.raid.horn");

    private final VaeloriaStaffPlugin plugin;
    private final Broadcast b;

    public BroadcastEditMenu(VaeloriaStaffPlugin plugin, Player viewer, Broadcast b) {
        super(viewer, 5, "&8Annonce · " + b.id());
        this.plugin = plugin;
        this.b = b;
    }

    private void save() {
        plugin.broadcasts().save();
    }

    @Override
    protected void render() {
        List<String> preview = new ArrayList<>();
        preview.add("&7" + b.type().help);
        preview.add("");
        b.lines().forEach(l -> preview.add("&8│ &r" + l));
        preview.add("");
        preview.add("&eClic &7pour modifier les lignes");
        set(4, Items.icon(Material.WRITABLE_BOOK, "&fTexte", preview.toArray(String[]::new)),
                e -> new LinesMenu(plugin, viewer, "&8Texte · " + b.id(), b.lines(), 20,
                        "Titre : ligne 1 = titre, ligne 2 = sous-titre.", this::save, this::open).open());

        set(19, Items.icon(b.type().icon, "&eType : &f" + b.type().label, "&7" + b.type().help, "", "&eClic &7pour changer"), e -> {
            b.type(b.type().next());
            save();
            redraw();
        });
        set(20, Items.icon(Material.CLOCK, "&eDurée d'affichage : &f" + b.seconds() + " s",
                "&7Titre, barre d'action, barre de boss.", "", "&eClic gauche/droit &7: ±1 s", "&eShift-clic &7: ±10 s"), e -> {
            int step = e.isShiftClick() ? 10 : 1;
            b.seconds(b.seconds() + (e.isRightClick() ? -step : step));
            save();
            redraw();
        });
        set(21, Items.icon(Material.NOTE_BLOCK, "&eSon : &f" + (b.sound() == null || b.sound().isEmpty() ? "aucun" : b.sound()),
                "&eClic &7: son suivant", "&eShift-clic &7: saisir une clé de son", "&eClic droit &7: écouter"), e -> {
            if (e.isShiftClick()) {
                plugin.prompts().ask(viewer, "Clé du son ? &8(ex. &7entity.player.levelup&8, &7aucun &8pour retirer)", s -> {
                    b.sound(s.equalsIgnoreCase("aucun") ? null : s.trim().toLowerCase());
                    save();
                    open();
                }, this::open);
                return;
            }
            if (e.isRightClick()) {
                BroadcastManager.playSound(viewer, b.sound());
                return;
            }
            int i = SOUNDS.indexOf(b.sound() == null ? "" : b.sound());
            String next = SOUNDS.get((i + 1) % SOUNDS.size());
            b.sound(next.isEmpty() ? null : next);
            BroadcastManager.playSound(viewer, b.sound());
            save();
            redraw();
        });
        if (b.type() == BroadcastType.BOSSBAR) {
            set(22, Items.icon(Material.PURPLE_DYE, "&eCouleur de la barre : &f" + b.color().name().toLowerCase(), "&eClic &7pour changer"), e -> {
                BossBar.Color[] colors = BossBar.Color.values();
                b.color(colors[(b.color().ordinal() + 1) % colors.length]);
                save();
                redraw();
            });
        }
        set(23, Items.icon(b.auto() ? Material.LIME_DYE : Material.GRAY_DYE,
                "&eRotation automatique : " + (b.auto() ? "&aoui" : "&cnon"),
                "&7Envoyée à tour de rôle toutes les &f" + plugin.broadcasts().interval() + " s", "&eClic &7pour changer"), e -> {
            b.auto(!b.auto());
            save();
            redraw();
        });
        set(24, Items.icon(Material.IRON_BARS, "&ePublic : &f" + (b.permission() == null ? "tout le monde" : b.permission()),
                "&7Une permission limite l'annonce", "&7(ex. &fvaeloria.staff.use &7= staff seulement).", "", "&eClic &7pour saisir"), e ->
                plugin.prompts().ask(viewer, "Permission requise ? &8(&7tous &8pour tout le monde)", s -> {
                    b.permission(s.equalsIgnoreCase("tous") ? null : s.trim());
                    save();
                    open();
                }, this::open));
        set(25, Items.icon(Material.NAME_TAG, "&eRenommer", "&7Nom actuel : &f" + b.name()), e ->
                plugin.prompts().ask(viewer, "Nouveau nom ?", s -> {
                    b.name(s);
                    save();
                    open();
                }, this::open));

        set(38, Items.icon(Material.SPYGLASS, "&bAperçu", "&7Te l'envoie à toi seul."), e -> {
            viewer.closeInventory();
            plugin.broadcasts().send(b, viewer);
        });
        set(40, Items.icon(Material.BELL, "&aEnvoyer maintenant", "&7À tous les joueurs concernés."), e -> {
            viewer.closeInventory();
            plugin.broadcasts().send(b);
            plugin.msg(viewer, "Annonce &f" + b.id() + " &7envoyée. &8(/staff annonce " + b.id() + ")");
        });
        set(42, Items.icon(Material.LAVA_BUCKET, "&cSupprimer"), e -> new ConfirmMenu(viewer, "Supprimer l'annonce " + b.id() + " ?", () -> {
            plugin.broadcasts().delete(b);
            new BroadcastsMenu(plugin, viewer).open();
        }, this::open).open());
        set(36, Items.icon(Material.ARROW, "&fRetour"), e -> new BroadcastsMenu(plugin, viewer).open());
        fillEmpty();
    }
}
