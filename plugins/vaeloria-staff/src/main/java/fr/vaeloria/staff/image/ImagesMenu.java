package fr.vaeloria.staff.image;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.gui.ConfirmMenu;
import fr.vaeloria.staff.gui.Menu;
import fr.vaeloria.staff.gui.StaffHubMenu;
import fr.vaeloria.staff.util.Items;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.ClickType;

import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Images posées + assistant de pose (source → taille → clic sur le mur). */
public final class ImagesMenu extends Menu {
    private static final Pattern SIZE = Pattern.compile("\\s*(\\d{1,2})\\s*(?:[x×*]\\s*(\\d{1,2}))?\\s*(brut)?\\s*", Pattern.CASE_INSENSITIVE);

    private final VaeloriaStaffPlugin plugin;
    private int page;

    public ImagesMenu(VaeloriaStaffPlugin plugin, Player viewer) {
        super(viewer, 6, "&8Images HD");
        this.plugin = plugin;
    }

    @Override
    protected void render() {
        List<ImageWall> all = new ArrayList<>(plugin.images().all());
        int pages = Math.max(1, (all.size() + 44) / 45);
        page = Math.min(page, pages - 1);
        for (int i = 0; i < 45 && page * 45 + i < all.size(); i++) {
            ImageWall w = all.get(page * 45 + i);
            set(i, Items.icon(Material.FILLED_MAP, "&f" + w.id(),
                    "&7Source : &f" + shorten(w.source()),
                    "&7Taille : &f" + w.cols() + "×" + w.rows() + " cadres",
                    "&7Position : &f" + w.world() + " " + w.x() + " " + w.y() + " " + w.z(),
                    "",
                    "&eClic gauche &7: se téléporter devant",
                    "&eShift-clic droit &7: supprimer"), e -> {
                if (e.getClick() == ClickType.SHIFT_RIGHT) {
                    new ConfirmMenu(viewer, "Retirer l'image " + w.id() + " et ses cadres ?", () -> {
                        plugin.images().delete(w);
                        plugin.msg(viewer, "Image &f" + w.id() + " &7retirée.");
                        new ImagesMenu(plugin, viewer).open();
                    }, this::open).open();
                } else if (!e.isRightClick()) {
                    Location at = plugin.images().location(w);
                    if (at != null) {
                        viewer.closeInventory();
                        viewer.teleport(at);
                    }
                }
            });
        }
        for (int i = 45; i < 54; i++) set(i, Items.filler());
        set(45, Items.icon(Material.ARROW, "&fRetour"), e -> new StaffHubMenu(plugin, viewer).open());
        if (page > 0) set(46, Items.icon(Material.ARROW, "&fPage précédente"), e -> { page--; redraw(); });
        if (page < pages - 1) set(53, Items.icon(Material.ARROW, "&fPage suivante"), e -> { page++; redraw(); });
        set(49, Items.icon(Material.EMERALD, "&aNouvelle image",
                "&7Affiche une image (règles d'un jeu, carte,",
                "&7affiche d'événement…) sur un mur de cadres.",
                "",
                "&71. Lien &fhttps://…&7 ou fichier de &fimages/",
                "&72. Taille en cadres (1 cadre = 1 bloc)",
                "&73. Clic droit sur le bloc &fen bas à gauche"), e -> start(plugin, viewer));
        List<String> files = plugin.images().files();
        List<String> lore = new ArrayList<>();
        lore.add("&7Dépose tes images dans");
        lore.add("&fplugins/VaeloriaStaff/images/");
        lore.add("&7(PNG, JPEG, GIF, BMP).");
        lore.add("");
        if (files.isEmpty()) lore.add("&8Aucun fichier pour l'instant.");
        files.stream().limit(10).forEach(f -> lore.add("&8• &f" + f));
        if (files.size() > 10) lore.add("&8… et " + (files.size() - 10) + " autre(s)");
        set(48, Items.icon(Material.BOOKSHELF, "&eFichiers disponibles", lore.toArray(String[]::new)));
    }

    private static String shorten(String s) {
        return s.length() > 40 ? s.substring(0, 37) + "…" : s;
    }

    /** Assistant de pose, aussi utilisé par /staff image. */
    public static void start(VaeloriaStaffPlugin plugin, Player viewer) {
        plugin.prompts().ask(viewer, "Lien de l'image (&fhttps://…&7) ou nom du fichier dans &fimages/&7 ?",
                source -> load(plugin, viewer, source.trim(), null), () -> new ImagesMenu(plugin, viewer).open());
    }

    /** Charge l'image puis demande la taille (sauf si {@code size} est déjà donnée, ex. « 4x3 »). */
    public static void load(VaeloriaStaffPlugin plugin, Player viewer, String source, String size) {
        plugin.msg(viewer, "Chargement de l'image…");
        plugin.images().loadAsync(source, image -> {
            if (!viewer.isOnline()) return;
            plugin.msg(viewer, "Image chargée : &f" + image.getWidth() + "×" + image.getHeight() + " px&7.");
            if (size != null) {
                choose(plugin, viewer, source, image, size);
                return;
            }
            int cols = Math.min(8, Math.max(1, (int) Math.ceil(image.getWidth() / 256.0)));
            String hint = cols + "x" + ImageLoader.suggestedRows(image, cols);
            plugin.prompts().ask(viewer, "Taille en cadres ? &8(&7largeur&8 ou &7largeurxhauteur&8, conseillé : &f" + hint
                            + "&8 ; ajoute &7brut&8 pour un logo sans tramage)",
                    s -> choose(plugin, viewer, source, image, s), () -> new ImagesMenu(plugin, viewer).open());
        }, error -> plugin.msg(viewer, "&cImage impossible à charger : " + error));
    }

    private static void choose(VaeloriaStaffPlugin plugin, Player viewer, String source, BufferedImage image, String input) {
        Matcher m = SIZE.matcher(input);
        if (!m.matches()) {
            plugin.msg(viewer, "&cTaille invalide. Exemples : &f4 &c, &f4x3&c, &f6x4 brut&c.");
            return;
        }
        int cols = Integer.parseInt(m.group(1));
        int rows = m.group(2) != null ? Integer.parseInt(m.group(2)) : ImageLoader.suggestedRows(image, cols);
        boolean dither = m.group(3) == null;
        int max = plugin.images().maxTiles();
        if (cols < 1 || rows < 1 || cols > 32 || rows > 32 || cols * rows > max) {
            plugin.msg(viewer, "&cTaille refusée : " + cols + "×" + rows + " (max " + max + " cadres au total, 32 par côté).");
            return;
        }
        String name = source.replaceAll("[?#].*$", "").replaceAll("^.*/", "").replaceAll("\\.[a-zA-Z]+$", "");
        plugin.pendingImages().put(viewer.getUniqueId(), new ImageManager.Pending(name, source, image, cols, rows, dither));
        plugin.msg(viewer, "Image prête : &f" + cols + "×" + rows + " cadres&7. &eClic droit sur le bloc du mur en bas à gauche&7"
                + " (vu de face). &8Accroupi + clic gauche pour annuler.");
    }
}
