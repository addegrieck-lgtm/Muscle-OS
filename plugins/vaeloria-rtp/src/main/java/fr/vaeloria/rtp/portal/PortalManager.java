package fr.vaeloria.rtp.portal;

import fr.vaeloria.rtp.RtpWorld;
import fr.vaeloria.rtp.VaeloriaRtpPlugin;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Sound;
import org.bukkit.World;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerMoveEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.scheduler.BukkitTask;
import org.bukkit.util.Vector;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.logging.Level;

import static fr.vaeloria.rtp.Messages.p;

/** Portails (portals.yml) : détection d'entrée, téléportation et particules. */
public final class PortalManager implements Listener {
    private final VaeloriaRtpPlugin plugin;
    private final File file;
    private final Map<String, Portal> portals = new LinkedHashMap<>();
    private final Map<String, PortalStyle> styles = new LinkedHashMap<>();
    private final Map<UUID, Long> lastUse = new ConcurrentHashMap<>();
    private BukkitTask particleTask;
    private long tick;

    public PortalManager(VaeloriaRtpPlugin plugin) {
        this.plugin = plugin;
        this.file = new File(plugin.getDataFolder(), "portals.yml");
    }

    public void reload() {
        styles.clear();
        ConfigurationSection st = plugin.getConfig().getConfigurationSection("portals.styles");
        if (st != null) {
            for (String id : st.getKeys(false)) {
                ConfigurationSection s = st.getConfigurationSection(id);
                if (s != null) styles.put(id.toLowerCase(Locale.ROOT), PortalStyle.load(id.toLowerCase(Locale.ROOT), s, plugin.getLogger()));
            }
        }
        portals.clear();
        ConfigurationSection root = YamlConfiguration.loadConfiguration(file).getConfigurationSection("portals");
        if (root != null) {
            for (String name : root.getKeys(false)) {
                ConfigurationSection s = root.getConfigurationSection(name);
                if (s == null) continue;
                try {
                    Portal portal = Portal.fromMap(name, s.getValues(false));
                    portals.put(portal.name(), portal);
                } catch (RuntimeException e) {
                    plugin.getLogger().warning("Portail « " + name + " » ignoré : " + e.getMessage());
                }
            }
        }
        if (particleTask != null) particleTask.cancel();
        long interval = Math.max(1, plugin.getConfig().getLong("portals.particle-interval-ticks", 4));
        particleTask = Bukkit.getScheduler().runTaskTimer(plugin, this::animate, interval, interval);
    }

    public void save() {
        YamlConfiguration yaml = new YamlConfiguration();
        yaml.options().setHeader(List.of("Portails du RTP VÆLORIA. À gérer en jeu : /rtpadmin → Portails, ou /rtpadmin portal."));
        for (Portal p : portals.values()) yaml.set("portals." + p.name(), p.toMap());
        try {
            yaml.save(file);
        } catch (IOException e) {
            plugin.getLogger().log(Level.SEVERE, "Impossible d'enregistrer portals.yml", e);
        }
    }

    public Portal get(String name) {
        return name == null ? null : portals.get(name.toLowerCase(Locale.ROOT));
    }

    public Collection<Portal> all() {
        List<Portal> list = new ArrayList<>(portals.values());
        list.sort(Comparator.comparing(Portal::name));
        return list;
    }

    /** @throws IllegalArgumentException nom pris, invalide ou zone trop grande */
    public Portal create(String name, String world, Cuboid zone) {
        if (get(name) != null) throw new IllegalArgumentException("Un portail « " + name + " » existe déjà");
        checkVolume(zone);
        Portal portal = new Portal(name, world, zone, defaultStyle().id());
        portals.put(portal.name(), portal);
        save();
        return portal;
    }

    public void checkVolume(Cuboid zone) {
        int max = plugin.getConfig().getInt("portals.max-volume", 2000);
        if (zone.volume() > max) {
            throw new IllegalArgumentException("Zone trop grande : " + zone.volume() + " blocs (max " + max + ", portals.max-volume)");
        }
    }

    public boolean remove(String name) {
        boolean removed = portals.remove(name.toLowerCase(Locale.ROOT)) != null;
        if (removed) save();
        return removed;
    }

    public Collection<PortalStyle> styles() {
        return styles.values();
    }

    public PortalStyle style(String id) {
        PortalStyle s = id == null ? null : styles.get(id.toLowerCase(Locale.ROOT));
        return s != null ? s : defaultStyle();
    }

    public PortalStyle defaultStyle() {
        PortalStyle s = styles.get(plugin.getConfig().getString("portals.default-style", "vaeloria").toLowerCase(Locale.ROOT));
        if (s != null) return s;
        if (!styles.isEmpty()) return styles.values().iterator().next();
        // Aucun style configuré : un style minimal pour ne jamais planter.
        YamlConfiguration fallback = new YamlConfiguration();
        fallback.set("layers", List.of(Map.of("particle", "PORTAL")));
        return PortalStyle.load("defaut", fallback, plugin.getLogger());
    }

    public Portal at(Location loc) {
        String world = loc.getWorld().getName();
        for (Portal p : portals.values()) {
            if (p.enabled() && p.world().equals(world) && p.zone().contains(loc.getBlockX(), loc.getBlockY(), loc.getBlockZ())) return p;
        }
        return null;
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onMove(PlayerMoveEvent e) {
        if (!e.hasChangedBlock() || portals.isEmpty()) return;
        Portal portal = at(e.getTo());
        // Déclenché seulement en entrant : rester dans le portail ne relance rien.
        if (portal == null || portal == at(e.getFrom())) return;
        Player player = e.getPlayer();
        long now = System.currentTimeMillis();
        Long last = lastUse.get(player.getUniqueId());
        if (last != null && now - last < 2000) return;
        lastUse.put(player.getUniqueId(), now);
        use(player, portal, e.getFrom());
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent e) {
        lastUse.remove(e.getPlayer().getUniqueId());
    }

    private void use(Player player, Portal portal, Location from) {
        var msg = plugin.messages();
        if (portal.permissionRequired() && !player.hasPermission(portal.permissionNode())) {
            msg.send(player, "portal-no-permission");
            pushBack(player, portal, from);
            return;
        }
        switch (portal.destination()) {
            case NONE -> {
                if (player.hasPermission("vaeloria.rtp.admin")) msg.send(player, "portal-no-destination", p("portal", portal.name()));
            }
            case LOCATION -> {
                World world = Bukkit.getWorld(portal.destWorld());
                if (world == null) {
                    msg.send(player, "portal-unavailable");
                    pushBack(player, portal, from);
                    return;
                }
                Location dest = new Location(world, portal.destX(), portal.destY(), portal.destZ(), portal.destYaw(), portal.destPitch());
                PortalStyle style = style(portal.style());
                style.burst(player.getWorld(), player.getX(), player.getY(), player.getZ(), 30);
                player.playSound(player.getLocation(), Sound.BLOCK_PORTAL_TRAVEL, 0.25f, 1.6f);
                player.teleportAsync(dest).thenAccept(ok -> Bukkit.getScheduler().runTask(plugin, () -> {
                    if (!Boolean.TRUE.equals(ok)) return;
                    plugin.teleports().protectFromFall(player);
                    style.burst(world, dest.getX(), dest.getY(), dest.getZ(), 40);
                    world.playSound(dest, Sound.ENTITY_ENDERMAN_TELEPORT, 1f, 1.2f);
                }));
            }
            case RTP -> {
                RtpWorld target = plugin.registry().get(portal.rtpWorld());
                if (target == null) {
                    msg.send(player, "portal-unavailable");
                    pushBack(player, portal, from);
                    return;
                }
                style(portal.style()).burst(player.getWorld(), player.getX(), player.getY(), player.getZ(), 30);
                if (!plugin.teleports().request(player, target, false, true)) pushBack(player, portal, from);
            }
        }
    }

    /** Repousse le joueur hors du portail quand il ne peut pas l'utiliser. */
    private void pushBack(Player player, Portal portal, Location from) {
        Cuboid z = portal.zone();
        Vector away = new Vector(from.getX() - z.centerX(), 0, from.getZ() - z.centerZ());
        if (away.lengthSquared() < 0.01) away = player.getLocation().getDirection().multiply(-1).setY(0);
        if (away.lengthSquared() < 0.01) away = new Vector(1, 0, 0);
        player.setVelocity(away.normalize().multiply(0.6).setY(0.35));
    }

    /** Particules dans chaque portail qui a un joueur à proximité. */
    private void animate() {
        tick++;
        var cfg = plugin.getConfig();
        double density = cfg.getDouble("portals.density", 0.4);
        int maxPerPortal = cfg.getInt("portals.max-particles-per-portal", 60);
        double viewSq = Math.pow(cfg.getDouble("portals.view-distance", 48), 2);
        boolean sound = cfg.getBoolean("portals.ambient-sound", true);
        ThreadLocalRandom r = ThreadLocalRandom.current();
        for (Portal portal : portals.values()) {
            if (!portal.enabled()) continue;
            World world = Bukkit.getWorld(portal.world());
            if (world == null) continue;
            Cuboid z = portal.zone();
            if (!world.isChunkLoaded((int) Math.floor(z.centerX()) >> 4, (int) Math.floor(z.centerZ()) >> 4)) continue;
            Location center = new Location(world, z.centerX(), z.centerY(), z.centerZ());
            boolean watched = false;
            for (Player pl : world.getPlayers()) {
                if (pl.getLocation().distanceSquared(center) <= viewSq) {
                    watched = true;
                    break;
                }
            }
            if (!watched) continue;
            PortalStyle style = style(portal.style());
            int count = (int) Math.min(maxPerPortal, Math.max(4, Math.round(z.volume() * density)));
            for (int i = 0; i < count; i++) {
                style.spawn(world, r.nextDouble(z.minX(), z.maxX() + 1), r.nextDouble(z.minY(), z.maxY() + 1),
                        r.nextDouble(z.minZ(), z.maxZ() + 1));
            }
            if (sound && tick % 20 == 0 && r.nextInt(3) == 0) world.playSound(center, Sound.BLOCK_PORTAL_AMBIENT, 0.3f, 1.4f);
        }
    }

    public void shutdown() {
        if (particleTask != null) particleTask.cancel();
    }
}
