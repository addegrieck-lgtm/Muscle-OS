package fr.vaeloria.staff.moderation;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.gui.Menu;
import fr.vaeloria.staff.gui.StaffHubMenu;
import fr.vaeloria.staff.util.Items;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Joueurs connectés : clic → fiche du joueur. */
public final class PlayersMenu extends Menu {
    private final VaeloriaStaffPlugin plugin;
    private int page;

    public PlayersMenu(VaeloriaStaffPlugin plugin, Player viewer) {
        super(viewer, 6, "&8Joueurs connectés");
        this.plugin = plugin;
    }

    @Override
    protected void render() {
        List<Player> all = new ArrayList<>(Bukkit.getOnlinePlayers());
        all.sort(Comparator.comparing(Player::getName, String.CASE_INSENSITIVE_ORDER));
        int pages = Math.max(1, (all.size() + 44) / 45);
        page = Math.min(page, pages - 1);
        for (int i = 0; i < 45 && page * 45 + i < all.size(); i++) {
            Player target = all.get(page * 45 + i);
            set(i, PlayerMenu.head(plugin, target, "", "&eClic &7pour ouvrir sa fiche"), e -> {
                if (target.isOnline()) new PlayerMenu(plugin, viewer, target).open();
                else redraw();
            });
        }
        for (int i = 45; i < 54; i++) set(i, Items.filler());
        set(45, Items.icon(Material.ARROW, "&fRetour"), e -> new StaffHubMenu(plugin, viewer).open());
        if (page > 0) set(46, Items.icon(Material.ARROW, "&fPage précédente"), e -> { page--; redraw(); });
        if (page < pages - 1) set(53, Items.icon(Material.ARROW, "&fPage suivante"), e -> { page++; redraw(); });
        set(49, Items.icon(Material.CLOCK, "&fActualiser", "&7" + all.size() + " joueur(s) connecté(s)"), e -> redraw());
    }
}
