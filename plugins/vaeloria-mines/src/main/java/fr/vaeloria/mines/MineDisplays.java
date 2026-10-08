package fr.vaeloria.mines;

import fr.vaeloria.mines.model.Cuboid;
import fr.vaeloria.mines.model.Mine;
import fr.vaeloria.mines.model.Spot;
import fr.vaeloria.mines.util.Text;
import net.kyori.adventure.bossbar.BossBar;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.World;
import org.bukkit.entity.Display;
import org.bukkit.entity.Player;
import org.bukkit.entity.TextDisplay;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Affichages mis à jour chaque seconde :
 * - barre de boss pour les joueurs dans la mine (« Mine d'obsidienne · Réinitialisation dans 14:59 ») ;
 * - hologramme (TextDisplay) au point choisi par l'admin.
 * Les hologrammes ne sont jamais sauvegardés avec le monde (non persistants) : ils sont recréés quand leur
 * chunk est chargé, et ne peuvent donc pas se dupliquer après un crash.
 */
public final class MineDisplays {
    private record Hologram(TextDisplay entity, Spot spot) {}

    private final VaeloriaMinesPlugin plugin;
    private final Map<String, BossBar> bars = new HashMap<>();
    private final Map<String, Set<UUID>> viewers = new HashMap<>();
    private final Map<String, Hologram> holograms = new HashMap<>();

    public MineDisplays(VaeloriaMinesPlugin plugin) {
        this.plugin = plugin;
    }

    public void tick(long now) {
        Set<String> alive = new HashSet<>();
        for (Mine mine : plugin.mines().all()) {
            alive.add(mine.id());
            updateBar(mine, now);
            updateHologram(mine, now);
        }
        // Mines supprimées : on retire leurs affichages.
        for (String id : Set.copyOf(bars.keySet())) if (!alive.contains(id)) removeBar(id);
        for (String id : Set.copyOf(holograms.keySet())) if (!alive.contains(id)) removeHologram(id);
    }

    public void clear() {
        for (String id : Set.copyOf(bars.keySet())) removeBar(id);
        for (String id : Set.copyOf(holograms.keySet())) removeHologram(id);
    }

    // ---- Barre de boss ----

    private void updateBar(Mine mine, long now) {
        Cuboid r = mine.region();
        if (!plugin.getConfig().getBoolean("bossbar.enabled", true) || r == null) {
            removeBar(mine.id());
            return;
        }
        BossBar bar = bars.computeIfAbsent(mine.id(), id -> BossBar.bossBar(Text.of(""), 1f, color(), BossBar.Overlay.PROGRESS));
        String title = plugin.getConfig().getString("bossbar.title", "{mine} &8· {state}")
                .replace("{state}", plugin.state(mine, now, true));
        bar.name(Text.of(plugin.fill(title, mine, mine.remainingSeconds(now))));
        float progress = mine.resetting() || !mine.ready() ? 1f
                : (float) mine.remainingSeconds(now) / Math.max(1, mine.intervalSeconds());
        bar.progress(Math.max(0f, Math.min(1f, progress)));
        bar.color(color());

        int margin = plugin.getConfig().getInt("bossbar.margin", 5);
        Set<UUID> shown = viewers.computeIfAbsent(mine.id(), id -> new HashSet<>());
        shown.removeIf(uuid -> Bukkit.getPlayer(uuid) == null);
        for (Player p : Bukkit.getOnlinePlayers()) {
            Location l = p.getLocation();
            boolean inside = r.contains(l.getWorld().getName(), l.getBlockX(), l.getBlockY(), l.getBlockZ(), margin);
            if (inside && shown.add(p.getUniqueId())) p.showBossBar(bar);
            else if (!inside && shown.remove(p.getUniqueId())) p.hideBossBar(bar);
        }
    }

    private BossBar.Color color() {
        try {
            return BossBar.Color.valueOf(plugin.getConfig().getString("bossbar.color", "PURPLE").toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return BossBar.Color.PURPLE;
        }
    }

    private void removeBar(String id) {
        BossBar bar = bars.remove(id);
        Set<UUID> shown = viewers.remove(id);
        if (bar == null || shown == null) return;
        for (UUID uuid : shown) {
            Player p = Bukkit.getPlayer(uuid);
            if (p != null) p.hideBossBar(bar);
        }
    }

    // ---- Hologramme ----

    private void updateHologram(Mine mine, long now) {
        Spot spot = mine.hologram();
        Hologram current = holograms.get(mine.id());
        if (current != null && (!current.spot().equals(spot) || !current.entity().isValid())) {
            removeHologram(mine.id());
            current = null;
        }
        if (spot == null) return;
        String format = plugin.getConfig().getString("hologram.format", "{mine}\n{state}").replace("\\n", "\n")
                .replace("{state}", plugin.state(mine, now, false));
        var text = Text.of(plugin.fill(format, mine, mine.remainingSeconds(now)));
        if (current != null) {
            current.entity().text(text);
            return;
        }
        World world = Bukkit.getWorld(spot.world());
        if (world == null || !world.isChunkLoaded((int) Math.floor(spot.x()) >> 4, (int) Math.floor(spot.z()) >> 4)) return;
        TextDisplay entity = world.spawn(new Location(world, spot.x(), spot.y(), spot.z()), TextDisplay.class);
        entity.setPersistent(false);
        entity.setBillboard(Display.Billboard.CENTER);
        entity.text(text);
        holograms.put(mine.id(), new Hologram(entity, spot));
    }

    private void removeHologram(String id) {
        Hologram h = holograms.remove(id);
        if (h != null && h.entity().isValid()) h.entity().remove();
    }
}
