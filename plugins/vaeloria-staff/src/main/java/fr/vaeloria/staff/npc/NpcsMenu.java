package fr.vaeloria.staff.npc;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.gui.Menu;
import fr.vaeloria.staff.gui.StaffHubMenu;
import fr.vaeloria.staff.util.Ids;
import fr.vaeloria.staff.util.Items;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;

public final class NpcsMenu extends Menu {
    private final VaeloriaStaffPlugin plugin;
    private int page;

    public NpcsMenu(VaeloriaStaffPlugin plugin, Player viewer) {
        super(viewer, 6, "&8PNJ");
        this.plugin = plugin;
    }

    /** Œuf d'apparition correspondant au type (icône), sinon un support d'armure. */
    static Material icon(Npc npc) {
        Material egg = Material.matchMaterial(npc.type().name() + "_SPAWN_EGG");
        return egg == null ? Material.ARMOR_STAND : egg;
    }

    @Override
    protected void render() {
        List<Npc> all = new ArrayList<>(plugin.npcs().all());
        int pages = Math.max(1, (all.size() + 44) / 45);
        page = Math.min(page, pages - 1);
        for (int i = 0; i < 45 && page * 45 + i < all.size(); i++) {
            Npc npc = all.get(page * 45 + i);
            set(i, Items.icon(icon(npc), "&f" + npc.name(),
                    "&7Id : &f" + npc.id(),
                    "&7Apparence : &f" + npc.type().name().toLowerCase(),
                    "&7Position : &f" + npc.pos().describe(),
                    "&7Messages : &f" + npc.messages().size() + " &8· &7Commandes : &f" + npc.commands().size(),
                    "",
                    "&eClic &7pour modifier"), e -> new NpcEditMenu(plugin, viewer, npc).open());
        }
        for (int i = 45; i < 54; i++) set(i, Items.filler());
        set(45, Items.icon(Material.ARROW, "&fRetour"), e -> new StaffHubMenu(plugin, viewer).open());
        if (page > 0) set(46, Items.icon(Material.ARROW, "&fPage précédente"), e -> { page--; redraw(); });
        if (page < pages - 1) set(53, Items.icon(Material.ARROW, "&fPage suivante"), e -> { page++; redraw(); });
        set(49, Items.icon(Material.EMERALD, "&aNouveau PNJ ici",
                "&7Apparaît à ta position, tourné comme toi.",
                "&7Au clic : messages et/ou commandes",
                "&7(explications d'un jeu, téléportation…)."), e -> create());
        set(48, Items.icon(Material.BOOK, "&eAstuce",
                "&7Accroupi + clic sur un PNJ",
                "&7ouvre directement sa configuration."));
    }

    private void create() {
        plugin.prompts().ask(viewer, "Nom affiché au-dessus du PNJ ? &8(ex. &7&e&lGuide de l'Arène&8)", name -> {
            Location at = viewer.getLocation();
            at.setPitch(0);
            String id = Ids.unique(name, "pnj", plugin.npcs()::exists);
            Npc npc = plugin.npcs().create(id, name, at);
            plugin.msg(viewer, "PNJ &f" + id + " &7créé. Configure ce qu'il dit et fait au clic.");
            new NpcEditMenu(plugin, viewer, npc).open();
        }, this::open);
    }
}
