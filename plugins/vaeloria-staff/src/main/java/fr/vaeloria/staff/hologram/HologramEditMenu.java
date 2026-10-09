package fr.vaeloria.staff.hologram;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.gui.ConfirmMenu;
import fr.vaeloria.staff.gui.LinesMenu;
import fr.vaeloria.staff.gui.Menu;
import fr.vaeloria.staff.util.Items;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.entity.Display;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;

public final class HologramEditMenu extends Menu {
    private final VaeloriaStaffPlugin plugin;
    private final Hologram h;

    public HologramEditMenu(VaeloriaStaffPlugin plugin, Player viewer, Hologram h) {
        super(viewer, 4, "&8Pancarte · " + h.id());
        this.plugin = plugin;
        this.h = h;
    }

    private void update() {
        plugin.holograms().update(h);
        redraw();
    }

    @Override
    protected void render() {
        List<String> preview = new ArrayList<>();
        h.lines().forEach(l -> preview.add("&8│ &r" + l));
        preview.add("");
        preview.add("&eClic &7pour modifier les lignes");
        set(4, Items.icon(Material.WRITABLE_BOOK, "&fTexte", preview.toArray(String[]::new)),
                e -> new LinesMenu(plugin, viewer, "&8Texte · " + h.id(), h.lines(), 30,
                        "{online} se met à jour tout seul.", () -> plugin.holograms().update(h), this::open).open());

        set(10, Items.icon(Material.SLIME_BALL, "&eTaille : &fx" + h.scale(),
                "&eClic gauche/droit &7: ±0,25", "&eShift-clic &7: ±1"), e -> {
            float step = e.isShiftClick() ? 1f : 0.25f;
            h.scale(h.scale() + (e.isRightClick() ? -step : step));
            update();
        });
        set(11, Items.icon(Material.BLACK_STAINED_GLASS, "&eFond : &f" + switch (h.background()) {
            case DARK -> "sombre";
            case NONE -> "aucun";
            case DEFAULT -> "Minecraft";
        }, "&eClic &7pour changer"), e -> {
            Hologram.Background[] all = Hologram.Background.values();
            h.background(all[(h.background().ordinal() + 1) % all.length]);
            update();
        });
        set(12, Items.icon(Material.COMPASS, "&eOrientation : &f" + switch (h.billboard()) {
            case CENTER -> "suit le joueur";
            case VERTICAL -> "tourne sur l'axe vertical";
            case HORIZONTAL -> "tourne sur l'axe horizontal";
            case FIXED -> "fixe (comme un panneau)";
        }, "&7Fixe : face à la direction où tu", "&7regardais en la plaçant.", "", "&eClic &7pour changer"), e -> {
            Display.Billboard[] all = Display.Billboard.values();
            h.billboard(all[(h.billboard().ordinal() + 1) % all.length]);
            update();
        });
        set(13, Items.icon(Material.GRAY_DYE, "&eOmbre du texte : " + (h.shadow() ? "&aoui" : "&cnon"), "&eClic &7pour changer"), e -> {
            h.shadow(!h.shadow());
            update();
        });
        set(14, Items.icon(Material.ENDER_PEARL, "&eDéplacer ici", "&7À ta position, face à ta direction."), e -> {
            Location at = viewer.getEyeLocation();
            at.setPitch(0);
            plugin.holograms().move(h, at);
            redraw();
        });
        set(15, Items.icon(Material.FEATHER, "&eMonter / descendre",
                "&eClic gauche &7: +0,25 bloc", "&eClic droit &7: -0,25 bloc"), e -> {
            Location at = h.pos().toLocation();
            if (at == null) return;
            plugin.holograms().move(h, at.add(0, e.isRightClick() ? -0.25 : 0.25, 0));
            redraw();
        });
        set(16, Items.icon(Material.ENDER_EYE, "&eSe téléporter", "&7Position : &f" + h.pos().describe()), e -> {
            Location at = h.pos().toLocation();
            if (at != null) viewer.teleport(at.add(at.getDirection().multiply(-3)));
        });

        set(27, Items.icon(Material.ARROW, "&fRetour"), e -> new HologramsMenu(plugin, viewer).open());
        set(35, Items.icon(Material.LAVA_BUCKET, "&cSupprimer"), e -> new ConfirmMenu(viewer, "Supprimer la pancarte " + h.id() + " ?", () -> {
            plugin.holograms().delete(h);
            new HologramsMenu(plugin, viewer).open();
        }, this::open).open());
        fillEmpty();
    }
}
