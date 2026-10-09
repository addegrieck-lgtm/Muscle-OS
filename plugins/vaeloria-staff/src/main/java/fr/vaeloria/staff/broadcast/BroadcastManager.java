package fr.vaeloria.staff.broadcast;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.util.Text;
import fr.vaeloria.staff.util.YamlFiles;
import net.kyori.adventure.bossbar.BossBar;
import net.kyori.adventure.key.Key;
import net.kyori.adventure.sound.Sound;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.title.Title;
import org.bukkit.Bukkit;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.scheduler.BukkitRunnable;
import org.bukkit.scheduler.BukkitTask;

import java.io.File;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.logging.Level;

/** Annonces en mémoire + broadcasts.yml, envoi de chaque type et rotation automatique. */
public final class BroadcastManager {
    private final VaeloriaStaffPlugin plugin;
    private final File file;
    private final Map<String, Broadcast> broadcasts = new LinkedHashMap<>();
    private int interval = 300;
    private boolean random;
    private int minPlayers;
    private int elapsed;
    private int cursor;
    private BukkitTask task;

    public BroadcastManager(VaeloriaStaffPlugin plugin) {
        this.plugin = plugin;
        this.file = new File(plugin.getDataFolder(), "broadcasts.yml");
    }

    public Collection<Broadcast> all() { return broadcasts.values(); }
    public Broadcast get(String id) { return id == null ? null : broadcasts.get(id.toLowerCase()); }
    public List<String> ids() { return new ArrayList<>(broadcasts.keySet()); }
    public boolean exists(String id) { return broadcasts.containsKey(id); }
    public int interval() { return interval; }
    public void interval(int seconds) { interval = Math.max(10, Math.min(86_400, seconds)); elapsed = 0; save(); }
    public boolean random() { return random; }
    public void random(boolean random) { this.random = random; save(); }
    public int minPlayers() { return minPlayers; }
    public void minPlayers(int n) { minPlayers = Math.max(0, n); save(); }

    public Broadcast create(String id, String name) {
        Broadcast b = new Broadcast(id, name);
        b.lines().add("&6&lVÆLORIA &8» &f" + Text.strip(name));
        broadcasts.put(id, b);
        save();
        return b;
    }

    public void delete(Broadcast b) {
        broadcasts.remove(b.id());
        save();
    }

    // ---- Envoi ----

    /** Envoie à tous les joueurs concernés (permission de l'annonce). */
    public void send(Broadcast b) {
        for (Player p : Bukkit.getOnlinePlayers()) {
            if (b.permission() == null || p.hasPermission(b.permission())) send(b, p);
        }
        if (b.type() == BroadcastType.CHAT && b.permission() == null) {
            for (String line : b.lines()) Bukkit.getConsoleSender().sendMessage(Text.of(Text.placeholders(line, null)));
        }
    }

    public void send(Broadcast b, Player p) {
        List<Component> lines = b.lines().stream().map(l -> Text.of(Text.placeholders(l, p))).toList();
        Component first = lines.isEmpty() ? Component.empty() : lines.get(0);
        switch (b.type()) {
            case CHAT -> lines.forEach(p::sendMessage);
            case TITLE -> p.showTitle(Title.title(first, lines.size() > 1 ? lines.get(1) : Component.empty(),
                    Title.Times.times(Duration.ofMillis(500), Duration.ofSeconds(b.seconds()), Duration.ofMillis(750))));
            case ACTIONBAR -> actionBar(p, first, b.seconds());
            case BOSSBAR -> bossBar(p, first, b.color(), b.seconds());
        }
        playSound(p, b.sound());
    }

    public static void playSound(Player p, String sound) {
        if (sound == null || sound.isBlank()) return;
        try {
            p.playSound(Sound.sound(Key.key(sound), Sound.Source.MASTER, 1f, 1f));
        } catch (RuntimeException ignored) {
            // clé de son invalide saisie par un admin : on n'interrompt pas l'annonce
        }
    }

    /** La barre d'action disparaît après ~3 s : on la renvoie jusqu'à la fin de la durée. */
    private void actionBar(Player p, Component text, int seconds) {
        new BukkitRunnable() {
            int left = seconds;
            @Override public void run() {
                if (!p.isOnline() || left <= 0) { cancel(); return; }
                p.sendActionBar(text);
                left -= 2;
            }
        }.runTaskTimer(plugin, 0L, 40L);
    }

    private void bossBar(Player p, Component text, BossBar.Color color, int seconds) {
        BossBar bar = BossBar.bossBar(text, 1f, color, BossBar.Overlay.PROGRESS);
        p.showBossBar(bar);
        int total = seconds * 4;
        new BukkitRunnable() {
            int left = total;
            @Override public void run() {
                if (!p.isOnline() || left <= 0) {
                    p.hideBossBar(bar);
                    cancel();
                    return;
                }
                bar.progress(Math.max(0f, Math.min(1f, left / (float) total)));
                left--;
            }
        }.runTaskTimer(plugin, 0L, 5L);
    }

    // ---- Rotation automatique ----

    public void start() {
        stop();
        task = Bukkit.getScheduler().runTaskTimer(plugin, this::tick, 20L, 20L);
    }

    public void stop() {
        if (task != null) task.cancel();
        task = null;
    }

    private void tick() {
        if (++elapsed < interval) return;
        elapsed = 0;
        if (Bukkit.getOnlinePlayers().size() < Math.max(1, minPlayers)) return;
        List<Broadcast> pool = broadcasts.values().stream().filter(Broadcast::auto).toList();
        if (pool.isEmpty()) return;
        Broadcast next = random ? pool.get(ThreadLocalRandom.current().nextInt(pool.size())) : pool.get(cursor++ % pool.size());
        send(next);
    }

    /** Secondes avant la prochaine annonce automatique. */
    public int secondsLeft() {
        return Math.max(0, interval - elapsed);
    }

    // ---- Persistance ----

    public void load() {
        broadcasts.clear();
        YamlConfiguration yml = YamlConfiguration.loadConfiguration(file);
        interval = Math.max(10, yml.getInt("settings.interval-seconds", plugin.getConfig().getInt("broadcasts.default-interval-seconds", 300)));
        random = yml.getBoolean("settings.random", false);
        minPlayers = yml.getInt("settings.min-players", 1);
        ConfigurationSection root = yml.getConfigurationSection("broadcasts");
        if (root != null) {
            for (String id : root.getKeys(false)) {
                ConfigurationSection s = root.getConfigurationSection(id);
                try {
                    Broadcast b = new Broadcast(id, s.getString("name", id));
                    b.type(BroadcastType.valueOf(s.getString("type", "CHAT")));
                    b.lines().addAll(s.getStringList("lines"));
                    b.auto(s.getBoolean("auto", false));
                    b.sound(s.getString("sound"));
                    b.seconds(s.getInt("seconds", 5));
                    b.permission(s.getString("permission"));
                    b.color(BossBar.Color.valueOf(s.getString("bossbar-color", "YELLOW")));
                    broadcasts.put(id, b);
                } catch (RuntimeException e) {
                    plugin.getLogger().log(Level.WARNING, "Annonce illisible ignorée : " + id, e);
                }
            }
        }
        plugin.getLogger().info(broadcasts.size() + " annonce(s) chargée(s)");
    }

    public void save() {
        YamlConfiguration yml = new YamlConfiguration();
        yml.options().setHeader(List.of("Annonces VaeloriaStaff — modifiées en jeu avec /staff → Annonces."));
        yml.set("settings.interval-seconds", interval);
        yml.set("settings.random", random);
        yml.set("settings.min-players", minPlayers);
        for (Broadcast b : broadcasts.values()) {
            String base = "broadcasts." + b.id() + ".";
            yml.set(base + "name", b.name());
            yml.set(base + "type", b.type().name());
            yml.set(base + "lines", new ArrayList<>(b.lines()));
            yml.set(base + "auto", b.auto());
            yml.set(base + "sound", b.sound());
            yml.set(base + "seconds", b.seconds());
            yml.set(base + "permission", b.permission());
            yml.set(base + "bossbar-color", b.color().name());
        }
        YamlFiles.save(yml, file, plugin.getLogger());
    }
}
