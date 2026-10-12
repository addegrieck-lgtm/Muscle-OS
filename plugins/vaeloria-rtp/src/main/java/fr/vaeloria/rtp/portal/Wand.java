package fr.vaeloria.rtp.portal;

import fr.vaeloria.rtp.Messages;
import fr.vaeloria.rtp.VaeloriaRtpPlugin;
import org.bukkit.Bukkit;
import org.bukkit.Color;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.Particle;
import org.bukkit.block.Block;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.Action;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.inventory.EquipmentSlot;
import org.bukkit.inventory.ItemFlag;
import org.bukkit.inventory.ItemStack;
import org.bukkit.persistence.PersistentDataType;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import static fr.vaeloria.rtp.Messages.p;

/**
 * Hache de sélection des portails : clic gauche = coin 1, clic droit = coin 2.
 * Seule la hache marquée par le plugin est concernée, les haches normales restent des haches.
 */
public final class Wand implements Listener {
    /** Sélection en cours d'un admin (les deux coins doivent être dans le même monde). */
    public record Selection(String world, int[] pos1, int[] pos2) {
        public boolean complete() { return pos1 != null && pos2 != null; }

        public Cuboid cuboid() {
            return Cuboid.of(pos1[0], pos1[1], pos1[2], pos2[0], pos2[1], pos2[2]);
        }
    }

    private final VaeloriaRtpPlugin plugin;
    private final NamespacedKey key;
    private final Map<UUID, Selection> selections = new ConcurrentHashMap<>();
    /** Zones affichées temporairement à un admin (« voir la zone » d'un portail), jusqu'à l'instant donné. */
    private final Map<UUID, Map.Entry<Cuboid, Long>> previews = new ConcurrentHashMap<>();

    public Wand(VaeloriaRtpPlugin plugin) {
        this.plugin = plugin;
        this.key = new NamespacedKey(plugin, "portal_wand");
        Bukkit.getScheduler().runTaskTimer(plugin, this::drawOutlines, 10L, 10L);
    }

    public ItemStack create() {
        Material m = Material.matchMaterial(plugin.getConfig().getString("portals.wand-material", "GOLDEN_AXE"));
        ItemStack axe = new ItemStack(m == null || !m.isItem() ? Material.GOLDEN_AXE : m);
        axe.editMeta(meta -> {
            meta.displayName(Messages.ui("<gradient:#D21F2F:#FFFFFF><bold>Hache des portails</bold></gradient>"));
            meta.lore(List.of(
                    Messages.ui("<gray>Clic gauche sur un bloc » <white>coin 1"),
                    Messages.ui("<gray>Clic droit sur un bloc » <white>coin 2"),
                    Messages.ui("<gray>Puis <white>/rtpadmin portal create <nom>")));
            meta.setEnchantmentGlintOverride(true);
            meta.addItemFlags(ItemFlag.values());
            meta.getPersistentDataContainer().set(key, PersistentDataType.BYTE, (byte) 1);
        });
        return axe;
    }

    public boolean isWand(ItemStack item) {
        return item != null && item.hasItemMeta()
                && item.getItemMeta().getPersistentDataContainer().has(key, PersistentDataType.BYTE);
    }

    public void clear(Player player) {
        selections.remove(player.getUniqueId());
    }

    public Selection selection(Player player) {
        return selections.get(player.getUniqueId());
    }

    public void preview(Player player, Cuboid zone, int seconds) {
        previews.put(player.getUniqueId(), Map.entry(zone, System.currentTimeMillis() + seconds * 1000L));
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onInteract(PlayerInteractEvent e) {
        if (e.getHand() != EquipmentSlot.HAND || !isWand(e.getItem())) return;
        Player player = e.getPlayer();
        if (!player.hasPermission("vaeloria.rtp.admin")) return;
        Block b = e.getClickedBlock();
        if (b == null || (e.getAction() != Action.LEFT_CLICK_BLOCK && e.getAction() != Action.RIGHT_CLICK_BLOCK)) return;
        e.setCancelled(true);
        int[] pos = {b.getX(), b.getY(), b.getZ()};
        String world = b.getWorld().getName();
        Selection old = selections.get(player.getUniqueId());
        if (old != null && !old.world().equals(world)) old = null;
        boolean first = e.getAction() == Action.LEFT_CLICK_BLOCK;
        Selection sel = new Selection(world, first ? pos : old == null ? null : old.pos1(), first ? (old == null ? null : old.pos2()) : pos);
        selections.put(player.getUniqueId(), sel);
        plugin.messages().send(player, first ? "wand-pos1" : "wand-pos2",
                p("x", pos[0]), p("y", pos[1]), p("z", pos[2]),
                p("size", sel.complete() ? sel.cuboid().describe() + " (" + sel.cuboid().volume() + " blocs)" : "—"));
        // Prévenir tout de suite plutôt qu'à la création : souvent un vieux coin resté ailleurs.
        int max = plugin.portals().maxVolume();
        if (sel.complete() && sel.cuboid().volume() > max) {
            plugin.messages().send(player, "wand-too-big", p("size", sel.cuboid().describe()),
                    p("volume", sel.cuboid().volume()), p("max", max));
        }
    }

    /** En créatif, un clic gauche casse le bloc : on l'empêche avec la hache. */
    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onBreak(BlockBreakEvent e) {
        if (isWand(e.getPlayer().getInventory().getItemInMainHand()) && e.getPlayer().hasPermission("vaeloria.rtp.admin")) {
            e.setCancelled(true);
        }
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent e) {
        selections.remove(e.getPlayer().getUniqueId());
        previews.remove(e.getPlayer().getUniqueId());
    }

    /** Contour jaune de la sélection (hache en main) et contour blanc des aperçus, visibles seulement par l'admin. */
    private void drawOutlines() {
        long now = System.currentTimeMillis();
        for (Player player : Bukkit.getOnlinePlayers()) {
            Map.Entry<Cuboid, Long> preview = previews.get(player.getUniqueId());
            if (preview != null) {
                if (preview.getValue() < now) previews.remove(player.getUniqueId());
                else outline(player, preview.getKey(), Color.WHITE);
            }
            Selection sel = selections.get(player.getUniqueId());
            if (sel == null || !sel.complete() || !player.getWorld().getName().equals(sel.world())) continue;
            if (!isWand(player.getInventory().getItemInMainHand())) continue;
            outline(player, sel.cuboid(), Color.YELLOW);
        }
    }

    private static void outline(Player player, Cuboid c, Color color) {
        Particle.DustOptions dust = new Particle.DustOptions(color, 0.8f);
        double x1 = c.minX(), y1 = c.minY(), z1 = c.minZ();
        double x2 = c.maxX() + 1, y2 = c.maxY() + 1, z2 = c.maxZ() + 1;
        double longest = Math.max(x2 - x1, Math.max(y2 - y1, z2 - z1));
        double step = Math.max(0.5, longest / 40); // ~480 particules max par contour
        double[][] edges = {
                {x1, y1, z1, x2, y1, z1}, {x1, y2, z1, x2, y2, z1}, {x1, y1, z2, x2, y1, z2}, {x1, y2, z2, x2, y2, z2},
                {x1, y1, z1, x1, y2, z1}, {x2, y1, z1, x2, y2, z1}, {x1, y1, z2, x1, y2, z2}, {x2, y1, z2, x2, y2, z2},
                {x1, y1, z1, x1, y1, z2}, {x2, y1, z1, x2, y1, z2}, {x1, y2, z1, x1, y2, z2}, {x2, y2, z1, x2, y2, z2}};
        for (double[] e : edges) {
            double len = Math.max(Math.abs(e[3] - e[0]), Math.max(Math.abs(e[4] - e[1]), Math.abs(e[5] - e[2])));
            int n = (int) Math.ceil(len / step);
            for (int i = 0; i <= n; i++) {
                double t = n == 0 ? 0 : (double) i / n;
                player.spawnParticle(Particle.DUST, e[0] + (e[3] - e[0]) * t, e[1] + (e[4] - e[1]) * t,
                        e[2] + (e[5] - e[2]) * t, 1, 0, 0, 0, 0, dust);
            }
        }
    }
}
