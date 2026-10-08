package fr.vaeloria.mines;

import fr.vaeloria.mines.model.BlockPos;
import fr.vaeloria.mines.model.Composition;
import fr.vaeloria.mines.model.Cuboid;
import fr.vaeloria.mines.model.Mine;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.entity.Player;
import org.bukkit.scheduler.BukkitRunnable;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Régénère la zone d'une mine par lots de « blocks-per-tick » blocs : une grande mine se remplit en quelques
 * ticks sans pic de lag. Les blocs sont posés sans physique (pas de sable qui tombe pendant le remplissage),
 * de bas en haut, et les joueurs présents dans la zone sont d'abord mis à l'abri.
 */
public final class MineResetter {
    public enum Cause { TIMER, PERCENT, MANUAL }

    private final VaeloriaMinesPlugin plugin;
    private final Map<String, Job> jobs = new HashMap<>();

    public MineResetter(VaeloriaMinesPlugin plugin) {
        this.plugin = plugin;
    }

    public boolean running() {
        return !jobs.isEmpty();
    }

    /** Lance la réinitialisation ; renvoie un message d'erreur, ou null si elle a démarré. */
    public String start(Mine mine, Cause cause) {
        if (mine.resetting()) return "réinitialisation déjà en cours";
        if (mine.region() == null) return "zone non définie";
        if (mine.composition().isEmpty()) return "aucun bloc choisi";
        World world = Bukkit.getWorld(mine.region().world());
        if (world == null) return "monde « " + mine.region().world() + " » non chargé";
        Map<Material, Integer> weights = new EnumMap<>(Material.class);
        mine.composition().weights().forEach((name, weight) -> {
            Material m = MineManager.block(name);
            if (m != null) weights.put(m, weight);
        });
        if (weights.isEmpty()) return "aucun bloc valide";

        long now = System.currentTimeMillis();
        long percent = Math.round(mine.minedPercent());
        evacuate(mine, world);
        mine.resetting(true);
        mine.mined(0);
        mine.restartTimer(now);
        plugin.mines().save();
        Job job = new Job(mine, world, new Composition.Picker<>(weights), cause, percent);
        jobs.put(mine.id(), job);
        job.runTaskTimer(plugin, 1L, 1L);
        return null;
    }

    /** Arrêt du serveur : on termine tout de suite les remplissages en cours. */
    public void finishAll() {
        for (Job job : List.copyOf(jobs.values())) {
            job.cancel();
            job.fill(Long.MAX_VALUE);
            job.done(false);
        }
    }

    /** Joueurs dans la zone (pieds ou tête) → point d'arrivée de la mine, sinon juste au-dessus de la zone. */
    private void evacuate(Mine mine, World world) {
        Cuboid r = mine.region();
        Location spawn = VaeloriaMinesPlugin.location(mine.spawn());
        for (Player p : world.getPlayers()) {
            Location l = p.getLocation();
            boolean inside = r.contains(world.getName(), l.getBlockX(), l.getBlockY(), l.getBlockZ())
                    || r.contains(world.getName(), l.getBlockX(), l.getBlockY() + 1, l.getBlockZ());
            if (!inside) continue;
            Location safe = spawn != null && !r.contains(spawn.getWorld().getName(), spawn.getBlockX(), spawn.getBlockY(), spawn.getBlockZ())
                    ? spawn
                    : new Location(world, l.getX(), r.maxY() + 1, l.getZ(), l.getYaw(), l.getPitch());
            p.teleport(safe);
            p.setFallDistance(0);
            plugin.msg(p, plugin.fill(plugin.getConfig().getString("messages.evacuated", ""), mine, 0));
        }
    }

    private final class Job extends BukkitRunnable {
        private final Mine mine;
        private final World world;
        private final Cuboid region;
        private final Composition.Picker<Material> picker;
        private final Cause cause;
        private final long minedPercent;
        private long index;

        Job(Mine mine, World world, Composition.Picker<Material> picker, Cause cause, long minedPercent) {
            this.mine = mine;
            this.world = world;
            this.region = mine.region();
            this.picker = picker;
            this.cause = cause;
            this.minedPercent = minedPercent;
        }

        @Override
        public void run() {
            fill(Math.max(1, plugin.getConfig().getInt("blocks-per-tick", 5000)));
            if (index >= region.volume()) {
                cancel();
                done(true);
            }
        }

        void fill(long budget) {
            ThreadLocalRandom random = ThreadLocalRandom.current();
            long volume = region.volume();
            for (long n = 0; n < budget && index < volume; n++, index++) {
                BlockPos pos = region.at(index);
                Block block = world.getBlockAt(pos.x(), pos.y(), pos.z());
                Material m = picker.pick(random);
                if (block.getType() != m) block.setType(m, false);
            }
        }

        void done(boolean announce) {
            jobs.remove(mine.id());
            mine.resetting(false);
            mine.mined(0);
            if (!announce || !mine.announce()) return;
            String template = cause == Cause.PERCENT
                    ? plugin.getConfig().getString("messages.reset-percent", "{mine} &7s'est réinitialisée !")
                            .replace("{percent}", Long.toString(minedPercent))
                    : plugin.getConfig().getString("messages.reset", "{mine} &7s'est réinitialisée !");
            plugin.announce(mine, template, mine.intervalSeconds());
        }
    }
}
