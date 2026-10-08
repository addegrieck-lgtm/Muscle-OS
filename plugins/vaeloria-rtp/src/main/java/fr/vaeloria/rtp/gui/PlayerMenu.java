package fr.vaeloria.rtp.gui;

import fr.vaeloria.rtp.Cooldowns;
import fr.vaeloria.rtp.RtpWorld;
import fr.vaeloria.rtp.VaeloriaRtpPlugin;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;

import java.util.ArrayList;
import java.util.List;

/** Menu /rtp : le joueur choisit le monde dans lequel il veut être téléporté. */
public final class PlayerMenu extends Menu {
    public PlayerMenu(VaeloriaRtpPlugin plugin, Player viewer) {
        super(plugin, viewer, plugin.getConfig().getInt("menu.rows", 3), plugin.messages().component("menu-title"));
    }

    @Override
    protected void render() {
        List<RtpWorld> visible = plugin.registry().all().stream()
                .filter(w -> w.enabled() && Bukkit.getWorld(w.worldName()) != null)
                .filter(w -> !w.permissionRequired() || viewer.hasPermission(w.permissionNode())
                        || !plugin.getConfig().getBoolean("menu.hide-locked-worlds", false))
                .toList();

        List<RtpWorld> unplaced = new ArrayList<>();
        for (RtpWorld w : visible) {
            if (w.slot() >= 0 && isFree(w.slot())) place(w.slot(), w);
            else unplaced.add(w);
        }
        int[] centered = centeredSlots(unplaced.size());
        for (int i = 0; i < unplaced.size(); i++) {
            int slot = centered[i];
            while (slot < size() && !isFree(slot)) slot++;
            place(slot, unplaced.get(i));
        }
        if (visible.isEmpty()) {
            set(size() / 2, item(Material.BARRIER, plugin.messages().raw("menu-empty"), List.of()), null);
        }
        fill(material(plugin.getConfig().getString("menu.filler", "BLACK_STAINED_GLASS_PANE"), Material.BLACK_STAINED_GLASS_PANE));
    }

    private void place(int slot, RtpWorld w) {
        List<String> lore = new ArrayList<>(w.description());
        lore.add("");
        lore.add("<gray>Rayon : <white>" + w.minRadius() + " → " + w.maxRadius() + " blocs");
        boolean locked = w.permissionRequired() && !viewer.hasPermission(w.permissionNode());
        long cd = plugin.teleports().remainingCooldown(viewer, w);
        if (locked) lore.add(plugin.messages().raw("menu-locked"));
        else if (cd > 0) lore.add(plugin.messages().raw("menu-cooldown").replace("<time>", Cooldowns.format(cd)));
        else lore.add(plugin.messages().raw("menu-click"));

        ItemStack stack = item(material(w.icon(), Material.GRASS_BLOCK), w.displayName(), lore);
        set(slot, glow(stack, !locked && cd == 0), e -> {
            viewer.closeInventory();
            plugin.teleports().request(viewer, w, false);
        });
    }

    /** Répartit n mondes de façon centrée sur la ligne du milieu (ou les lignes suivantes s'il y en a beaucoup). */
    private int[] centeredSlots(int n) {
        int[] slots = new int[n];
        int rows = size() / 9;
        int row = Math.max(0, (rows - 1) / 2);
        for (int i = 0; i < n; i++) {
            int line = i / 7;
            int inLine = Math.min(7, n - line * 7);
            int pos = i % 7;
            // Espacement d'une case quand c'est possible (ex. 3 mondes : cases 2, 4, 6).
            int spacing = inLine <= 4 ? 2 : 1;
            int start = 4 - (inLine - 1) * spacing / 2;
            slots[i] = Math.min(size() - 1, (row + line) * 9 + start + pos * spacing);
        }
        return slots;
    }
}
