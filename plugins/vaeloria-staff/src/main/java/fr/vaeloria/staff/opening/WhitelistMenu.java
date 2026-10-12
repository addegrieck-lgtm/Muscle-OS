package fr.vaeloria.staff.opening;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.gui.Menu;
import fr.vaeloria.staff.util.Items;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.OfflinePlayer;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.ClickType;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.SkullMeta;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Joueurs autorisés pendant la fermeture (whitelist du serveur). */
public final class WhitelistMenu extends Menu {
    private final VaeloriaStaffPlugin plugin;
    private int page;

    public WhitelistMenu(VaeloriaStaffPlugin plugin, Player viewer) {
        super(viewer, 6, "&8Whitelist");
        this.plugin = plugin;
    }

    @Override
    protected void render() {
        List<OfflinePlayer> all = new ArrayList<>(Bukkit.getWhitelistedPlayers());
        all.sort(Comparator.comparing((OfflinePlayer p) -> p.getName() == null ? "" : p.getName(), String.CASE_INSENSITIVE_ORDER));
        int pages = Math.max(1, (all.size() + 44) / 45);
        page = Math.min(page, pages - 1);
        for (int i = 0; i < 45 && page * 45 + i < all.size(); i++) {
            OfflinePlayer p = all.get(page * 45 + i);
            String name = p.getName() == null ? p.getUniqueId().toString() : p.getName();
            ItemStack head = Items.icon(Material.PLAYER_HEAD, "&f" + name, "", "&eShift-clic droit &7: retirer");
            SkullMeta meta = (SkullMeta) head.getItemMeta();
            meta.setOwningPlayer(p);
            head.setItemMeta(meta);
            set(i, head, e -> {
                if (e.getClick() != ClickType.SHIFT_RIGHT) return;
                plugin.opening().setWhitelisted(viewer, name, false);
                Bukkit.getScheduler().runTaskLater(plugin, this::redraw, 2L);
            });
        }
        for (int i = 45; i < 54; i++) set(i, Items.filler());
        set(45, Items.icon(Material.ARROW, "&fRetour"), e -> new OpeningMenu(plugin, viewer).open());
        if (page > 0) set(46, Items.icon(Material.ARROW, "&fPage précédente"), e -> { page--; redraw(); });
        if (page < pages - 1) set(53, Items.icon(Material.ARROW, "&fPage suivante"), e -> { page++; redraw(); });
        set(49, Items.icon(Material.EMERALD, "&aAjouter un joueur", "&7Pseudo Minecraft exact."), e ->
                plugin.prompts().ask(viewer, "Pseudo à ajouter à la whitelist ?", name -> {
                    plugin.opening().setWhitelisted(viewer, name.trim(), true);
                    Bukkit.getScheduler().runTaskLater(plugin, this::open, 10L);
                }, this::open));
    }
}
