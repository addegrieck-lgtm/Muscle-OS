package fr.vaeloria.staff.hologram;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.gui.Menu;
import fr.vaeloria.staff.gui.StaffHubMenu;
import fr.vaeloria.staff.util.Ids;
import fr.vaeloria.staff.util.Items;
import fr.vaeloria.staff.util.Text;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;

public final class HologramsMenu extends Menu {
    private final VaeloriaStaffPlugin plugin;
    private int page;

    public HologramsMenu(VaeloriaStaffPlugin plugin, Player viewer) {
        super(viewer, 6, "&8Pancartes");
        this.plugin = plugin;
    }

    @Override
    protected void render() {
        List<Hologram> all = new ArrayList<>(plugin.holograms().all());
        int pages = Math.max(1, (all.size() + 44) / 45);
        page = Math.min(page, pages - 1);
        for (int i = 0; i < 45 && page * 45 + i < all.size(); i++) {
            Hologram h = all.get(page * 45 + i);
            List<String> lore = new ArrayList<>();
            lore.add("&7Id : &f" + h.id());
            lore.add("&7Position : &f" + h.pos().describe());
            lore.add("");
            h.lines().stream().limit(5).forEach(l -> lore.add("&8│ &r" + l));
            lore.add("");
            lore.add("&eClic &7pour modifier");
            set(i, Items.icon(Material.OAK_HANGING_SIGN, "&f" + h.id(), lore.toArray(String[]::new)),
                    e -> new HologramEditMenu(plugin, viewer, h).open());
        }
        for (int i = 45; i < 54; i++) set(i, Items.filler());
        set(45, Items.icon(Material.ARROW, "&fRetour"), e -> new StaffHubMenu(plugin, viewer).open());
        if (page > 0) set(46, Items.icon(Material.ARROW, "&fPage précédente"), e -> { page--; redraw(); });
        if (page < pages - 1) set(53, Items.icon(Material.ARROW, "&fPage suivante"), e -> { page++; redraw(); });
        set(49, Items.icon(Material.EMERALD, "&aNouvelle pancarte ici",
                "&7Apparaît à ta position (hauteur des yeux).",
                "&7Texte multiligne, couleurs, taille, fond…"), e -> create());
    }

    private void create() {
        plugin.prompts().ask(viewer, "Première ligne de la pancarte ? &8(ex. &7&6&lBienvenue sur VÆLORIA&8)", line -> {
            Location at = viewer.getEyeLocation();
            at.setPitch(0);
            String id = Ids.unique(line, "pancarte", plugin.holograms()::exists);
            Hologram h = plugin.holograms().create(id, at, line);
            plugin.msg(viewer, "Pancarte &f" + id + " &7créée. Ajoute d'autres lignes dans &fTexte&7.");
            plugin.getLogger().info(viewer.getName() + " a créé la pancarte " + id + " (" + Text.strip(line) + ")");
            new HologramEditMenu(plugin, viewer, h).open();
        }, this::open);
    }
}
