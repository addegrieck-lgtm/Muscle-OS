package fr.vaeloria.staff.opening;

import fr.vaeloria.staff.Perm;
import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.broadcast.BroadcastManager;
import fr.vaeloria.staff.util.Durations;
import fr.vaeloria.staff.util.Text;
import fr.vaeloria.staff.util.YamlFiles;
import net.kyori.adventure.bossbar.BossBar;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.title.Title;
import org.bukkit.Bukkit;
import org.bukkit.Color;
import org.bukkit.FireworkEffect;
import org.bukkit.NamespacedKey;
import org.bukkit.OfflinePlayer;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Firework;
import org.bukkit.entity.Player;
import org.bukkit.inventory.meta.FireworkMeta;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.scheduler.BukkitRunnable;

import java.io.File;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Ouverture du serveur : whitelist on/off, ouverture programmée avec compte à rebours, MOTD et message d'attente,
 * spectacle à l'ouverture, récompenses « fondateur » pour les premiers joueurs.
 * La whitelist utilisée est celle du serveur (compatible /whitelist add).
 */
public final class OpeningManager {
    private final VaeloriaStaffPlugin plugin;
    private final File file;
    private final NamespacedKey fireworkTag;
    /** Date d'ouverture programmée (ms), ou -1. Lue par le thread du ping serveur. */
    private volatile long openingAt = -1;
    /** Date de la dernière ouverture (ms), ou -1 : sert à la fenêtre « fondateur ». */
    private long openedAt = -1;
    /** Joueurs refusés par la whitelist : ils attendent l'ouverture. */
    private final Map<UUID, String> waiting = new ConcurrentHashMap<>();
    private final Set<UUID> rewarded = ConcurrentHashMap.newKeySet();
    private final BossBar bar = BossBar.bossBar(Component.empty(), 1f, BossBar.Color.YELLOW, BossBar.Overlay.PROGRESS);
    private final Set<UUID> barViewers = ConcurrentHashMap.newKeySet();
    private long lastAnnounced = -1;

    public OpeningManager(VaeloriaStaffPlugin plugin) {
        this.plugin = plugin;
        this.file = new File(plugin.getDataFolder(), "opening.yml");
        this.fireworkTag = new NamespacedKey(plugin, "opening_firework");
        Bukkit.getScheduler().runTaskTimer(plugin, this::tick, 20L, 20L);
    }

    // ---- État ----

    public boolean closed() {
        return Bukkit.hasWhitelist();
    }

    public ZonedDateTime scheduled() {
        long at = openingAt;
        return at < 0 ? null : Instant.ofEpochMilli(at).atZone(ZoneId.systemDefault());
    }

    public Duration remaining() {
        long at = openingAt;
        return at < 0 ? null : Duration.ofMillis(Math.max(0, at - System.currentTimeMillis()));
    }

    public Map<UUID, String> waiting() {
        return waiting;
    }

    /** Peut entrer quand le serveur est fermé : op, sur la whitelist, ou permission de contournement. */
    public static boolean allowed(Player p) {
        return p.isOp() || p.isWhitelisted() || p.hasPermission(Perm.WHITELIST_BYPASS);
    }

    public boolean isOpeningFirework(Entity e) {
        return e instanceof Firework && e.getPersistentDataContainer().has(fireworkTag, PersistentDataType.BYTE);
    }

    /** Remplace {countdown}, {date}, {waiting}. */
    public String placeholders(String s) {
        Duration left = remaining();
        ZonedDateTime at = scheduled();
        return s.replace("{countdown}", left == null ? "bientôt" : Durations.format(left))
                .replace("{date}", at == null ? "bientôt" : OpeningTimes.display(at))
                .replace("{waiting}", String.valueOf(waiting.size()));
    }

    public Component kickMessage() {
        return Text.of(placeholders(plugin.getConfig().getString("opening.kick-message",
                "&6&lVÆLORIA\n\n&fLe serveur n'est pas encore ouvert.\n&7Ouverture : &e{date}")));
    }

    /** MOTD de la liste des serveurs pendant la fermeture, ou {@code null} pour laisser celui du serveur. */
    public Component motd() {
        if (!closed() || !plugin.getConfig().getBoolean("opening.motd.enabled", true)) return null;
        String key = openingAt >= 0 ? "opening.motd.countdown" : "opening.motd.closed";
        String line = plugin.getConfig().getString(key);
        return line == null ? null : Text.of(placeholders(line));
    }

    // ---- Actions ----

    /** Ferme le serveur : whitelist activée, joueurs non autorisés expulsés avec le message d'attente. */
    public void close(CommandSender by) {
        Bukkit.setWhitelist(true);
        int kicked = 0;
        for (Player p : new ArrayList<>(Bukkit.getOnlinePlayers())) {
            if (!allowed(p)) {
                p.kick(kickMessage());
                kicked++;
            }
        }
        plugin.notifyStaff(by.getName() + " a &cfermé &7le serveur (whitelist activée, " + kicked + " joueur(s) expulsé(s))");
        save();
    }

    /** Ouvre le serveur. {@code show} : titre, sons, feux d'artifice. */
    public void open(CommandSender by, boolean show) {
        openingAt = -1;
        lastAnnounced = -1;
        hideBar();
        Bukkit.setWhitelist(false);
        openedAt = System.currentTimeMillis();
        save();
        plugin.notifyStaff(by.getName() + " a &aouvert &7le serveur");
        for (String c : plugin.getConfig().getStringList("opening.commands")) {
            Bukkit.dispatchCommand(Bukkit.getConsoleSender(), c.startsWith("/") ? c.substring(1) : c);
        }
        if (show) celebrate();
        for (Player p : Bukkit.getOnlinePlayers()) reward(p);
    }

    /** Programme l'ouverture (le serveur reste fermé jusque-là). */
    public void schedule(CommandSender by, ZonedDateTime at) {
        openingAt = at.toInstant().toEpochMilli();
        lastAnnounced = -1;
        save();
        plugin.notifyStaff(by.getName() + " a programmé l'ouverture : &f" + OpeningTimes.display(at)
                + (closed() ? "" : " &c(attention : la whitelist est désactivée)"));
    }

    public void cancelSchedule(CommandSender by) {
        openingAt = -1;
        hideBar();
        save();
        plugin.notifyStaff(by.getName() + " a annulé l'ouverture programmée");
    }

    /** Ajoute / retire un joueur de la whitelist (recherche du pseudo hors thread principal). */
    public void setWhitelisted(CommandSender by, String name, boolean on) {
        Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
            OfflinePlayer target = Bukkit.getOfflinePlayerIfCached(name);
            if (target == null) target = Bukkit.getOfflinePlayer(name);
            OfflinePlayer t = target;
            Bukkit.getScheduler().runTask(plugin, () -> {
                t.setWhitelisted(on);
                String shown = t.getName() == null ? name : t.getName();
                plugin.msg(by, "&f" + shown + (on ? " &aajouté à" : " &cretiré de") + " &7la whitelist.");
                if (!on && closed() && t.getPlayer() != null && !allowed(t.getPlayer())) t.getPlayer().kick(kickMessage());
            });
        });
    }

    /** Joueur refusé par la whitelist : on le compte parmi ceux qui attendent. */
    public void refused(UUID id, String name) {
        if (waiting.put(id, name) == null) save();
    }

    // ---- Compte à rebours ----

    private void tick() {
        long at = openingAt;
        if (at < 0) return;
        long left = Math.max(0, (at - System.currentTimeMillis() + 999) / 1000);
        if (left <= 0) {
            open(Bukkit.getConsoleSender(), plugin.getConfig().getBoolean("opening.fireworks", true));
            return;
        }
        if (left != lastAnnounced && plugin.getConfig().getLongList("opening.announce-at").contains(left)) {
            lastAnnounced = left;
            announce(left);
        }
        if (left <= plugin.getConfig().getLong("opening.bossbar-from-seconds", 3600)) {
            bar.name(Text.of(placeholders(plugin.getConfig().getString("opening.bossbar", "&6Ouverture dans &f{countdown}"))));
            long from = Math.max(1, plugin.getConfig().getLong("opening.bossbar-from-seconds", 3600));
            bar.progress(Math.max(0f, Math.min(1f, left / (float) from)));
            for (Player p : Bukkit.getOnlinePlayers()) {
                if (barViewers.add(p.getUniqueId())) p.showBossBar(bar);
            }
        }
    }

    private void announce(long seconds) {
        for (Player p : Bukkit.getOnlinePlayers()) {
            if (seconds <= 10) {
                p.showTitle(Title.title(Text.of("&6&l" + seconds), Text.of("&fOuverture de VÆLORIA"),
                        Title.Times.times(Duration.ZERO, Duration.ofMillis(900), Duration.ofMillis(100))));
                p.playSound(net.kyori.adventure.sound.Sound.sound(net.kyori.adventure.key.Key.key("block.note_block.pling"),
                        net.kyori.adventure.sound.Sound.Source.MASTER, 1f, 0.5f + (10 - seconds) * 0.1f));
            } else {
                p.sendMessage(Text.of(plugin.prefix() + placeholders(plugin.getConfig().getString("opening.announce-message",
                        "&6L'ouverture a lieu dans &f{countdown}&6 !"))));
                BroadcastManager.playSound(p, "block.note_block.bell");
            }
        }
    }

    private void hideBar() {
        for (UUID id : barViewers) {
            Player p = Bukkit.getPlayer(id);
            if (p != null) p.hideBossBar(bar);
        }
        barViewers.clear();
    }

    public void quit(Player p) {
        barViewers.remove(p.getUniqueId());
    }

    private void celebrate() {
        Title title = Title.title(Text.of(plugin.getConfig().getString("opening.title", "&6&lVÆLORIA EST OUVERT !")),
                Text.of(plugin.getConfig().getString("opening.subtitle", "&fBon jeu à tous !")),
                Title.Times.times(Duration.ofMillis(300), Duration.ofSeconds(5), Duration.ofSeconds(1)));
        for (Player p : Bukkit.getOnlinePlayers()) {
            p.showTitle(title);
            BroadcastManager.playSound(p, "ui.toast.challenge_complete");
            BroadcastManager.playSound(p, "entity.player.levelup");
        }
        Bukkit.broadcast(Text.of(plugin.prefix() + plugin.getConfig().getString("opening.broadcast", "&a&lLe serveur est ouvert !")));
        new BukkitRunnable() {
            int waves = 6;
            @Override public void run() {
                if (waves-- <= 0) { cancel(); return; }
                for (Player p : Bukkit.getOnlinePlayers()) firework(p);
            }
        }.runTaskTimer(plugin, 0L, 10L);
    }

    private void firework(Player p) {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        var at = p.getLocation().add(r.nextDouble(-4, 4), 1, r.nextDouble(-4, 4));
        Color[] palette = {Color.ORANGE, Color.YELLOW, Color.fromRGB(0xD4AF37), Color.WHITE, Color.RED};
        p.getWorld().spawn(at, Firework.class, fw -> {
            fw.getPersistentDataContainer().set(fireworkTag, PersistentDataType.BYTE, (byte) 1);
            FireworkMeta meta = fw.getFireworkMeta();
            meta.addEffect(FireworkEffect.builder()
                    .with(r.nextBoolean() ? FireworkEffect.Type.BALL_LARGE : FireworkEffect.Type.STAR)
                    .withColor(palette[r.nextInt(palette.length)], palette[r.nextInt(palette.length)])
                    .withFade(Color.WHITE).flicker(true).trail(true).build());
            meta.setPower(1);
            fw.setFireworkMeta(meta);
        });
    }

    // ---- Fondateurs ----

    /** Récompense unique des joueurs connectés dans les premières heures après l'ouverture. */
    public void reward(Player p) {
        long window = plugin.getConfig().getLong("opening.founder.hours", 48) * 3_600_000L;
        if (openedAt < 0 || closed() || System.currentTimeMillis() - openedAt > window || !rewarded.add(p.getUniqueId())) return;
        List<String> commands = new ArrayList<>(plugin.getConfig().getStringList("opening.founder.commands"));
        if (waiting.containsKey(p.getUniqueId())) commands.addAll(plugin.getConfig().getStringList("opening.founder.waiting-commands"));
        for (String c : commands) {
            String cmd = c.replace("{player}", p.getName()).replace("{uuid}", p.getUniqueId().toString());
            Bukkit.dispatchCommand(Bukkit.getConsoleSender(), cmd.startsWith("/") ? cmd.substring(1) : cmd);
        }
        String message = plugin.getConfig().getString("opening.founder.message", "");
        if (!message.isEmpty()) plugin.msg(p, message);
        if (waiting.containsKey(p.getUniqueId())) {
            String bonus = plugin.getConfig().getString("opening.founder.waiting-message", "");
            if (!bonus.isEmpty()) plugin.msg(p, bonus);
        }
        save();
    }

    // ---- Persistance ----

    public void load() {
        YamlConfiguration yml = YamlConfiguration.loadConfiguration(file);
        openingAt = yml.getLong("opening-at", -1);
        openedAt = yml.getLong("opened-at", -1);
        waiting.clear();
        ConfigurationSection w = yml.getConfigurationSection("waiting");
        if (w != null) {
            for (String key : w.getKeys(false)) {
                try {
                    waiting.put(UUID.fromString(key), w.getString(key, "?"));
                } catch (IllegalArgumentException ignored) {
                    // entrée corrompue
                }
            }
        }
        rewarded.clear();
        for (String s : yml.getStringList("rewarded")) {
            try {
                rewarded.add(UUID.fromString(s));
            } catch (IllegalArgumentException ignored) {
                // entrée corrompue
            }
        }
    }

    public void save() {
        YamlConfiguration yml = new YamlConfiguration();
        yml.options().setHeader(List.of("Ouverture VaeloriaStaff — géré en jeu avec /staff → Ouverture.",
                "waiting = joueurs refusés par la whitelist (ils attendaient l'ouverture)."));
        yml.set("opening-at", openingAt);
        yml.set("opened-at", openedAt);
        waiting.forEach((id, name) -> yml.set("waiting." + id, name));
        yml.set("rewarded", rewarded.stream().map(UUID::toString).toList());
        YamlFiles.save(yml, file, plugin.getLogger());
    }

    /** Remet la liste d'attente à zéro (nouvelle saison, nouvelle ouverture). */
    public void resetWaiting() {
        waiting.clear();
        rewarded.clear();
        openedAt = -1;
        save();
    }
}
