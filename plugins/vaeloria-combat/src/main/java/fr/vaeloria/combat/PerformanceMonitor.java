package fr.vaeloria.combat;

import com.destroystokyo.paper.event.server.ServerTickEndEvent;
import org.bukkit.Bukkit;
import org.bukkit.World;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.HashMap;
import java.util.Map;

/**
 * Mesure la durée réelle de chaque tick (MSPT) et protège le PvP quand le serveur sature :
 * en mode dégradé, la distance de simulation baisse (fermes, mobs, redstone éloignés tournent moins),
 * mais la distance d'affichage ne change pas — les joueurs voient toujours leurs adversaires arriver.
 */
public final class PerformanceMonitor implements Listener {
    private final JavaPlugin plugin;
    private final TickStats recent = new TickStats(100);   // 5 s
    private final TickStats minute = new TickStats(1200);  // 60 s
    private final Map<String, Integer> originalSimulation = new HashMap<>();
    private LagGuard guard;
    private boolean enabled;
    private int degradedSimulation;
    private boolean alerts;

    public PerformanceMonitor(JavaPlugin plugin) {
        this.plugin = plugin;
    }

    public void configure(ConfigurationSection c) {
        recover(); // un rechargement repart d'un état sain
        enabled = c.getBoolean("lag-guard", true);
        degradedSimulation = Math.max(2, c.getInt("degraded-simulation-distance", 3));
        alerts = c.getBoolean("staff-alerts", true);
        guard = new LagGuard(new LagGuard.Settings(
                c.getDouble("degrade-mspt", 45),
                c.getDouble("recover-mspt", 30),
                c.getLong("degrade-after-seconds", 10) * 1000L,
                c.getLong("recover-after-seconds", 60) * 1000L));
    }

    public void start() {
        Bukkit.getScheduler().runTaskTimer(plugin, this::evaluate, 20L, 20L);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onTickEnd(ServerTickEndEvent e) {
        recent.add(e.getTickDuration());
        minute.add(e.getTickDuration());
    }

    public TickStats recent() {
        return recent;
    }

    public TickStats minute() {
        return minute;
    }

    public boolean degraded() {
        return guard != null && guard.degraded();
    }

    private void evaluate() {
        if (!enabled || recent.size() < 20) return;
        switch (guard.update(recent.average(), System.currentTimeMillis())) {
            case DEGRADE -> degrade();
            case RECOVER -> recover();
            case NONE -> { }
        }
    }

    private void degrade() {
        for (World w : Bukkit.getWorlds()) {
            int current = w.getSimulationDistance();
            if (current <= degradedSimulation) continue;
            originalSimulation.putIfAbsent(w.getName(), current);
            w.setSimulationDistance(degradedSimulation);
        }
        notifyStaff(String.format("§c[PvP] §fMSPT moyen %.1f ms : mode dégradé (simulation réduite à %d chunks). "
                + "§7Lancer /spark profiler pour trouver la cause.", recent.average(), degradedSimulation));
    }

    /** Rend à chaque monde sa distance de simulation d'origine (aussi appelé à l'arrêt du plugin). */
    public void recover() {
        if (originalSimulation.isEmpty()) return;
        for (World w : Bukkit.getWorlds()) {
            Integer original = originalSimulation.remove(w.getName());
            if (original != null) w.setSimulationDistance(original);
        }
        originalSimulation.clear();
        notifyStaff(String.format("§a[PvP] §fMSPT revenu à %.1f ms : réglages normaux rétablis.", recent.average()));
    }

    private void notifyStaff(String message) {
        plugin.getLogger().info(message.replaceAll("§.", ""));
        if (alerts) Bukkit.broadcast(message, "vaeloria.combat.alerts");
    }
}
