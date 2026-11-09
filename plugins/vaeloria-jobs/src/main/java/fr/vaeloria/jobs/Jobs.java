package fr.vaeloria.jobs;

import fr.vaeloria.jobs.model.JobProgress;
import fr.vaeloria.jobs.model.LevelCurve;
import fr.vaeloria.jobs.model.PlayerJobs;
import fr.vaeloria.jobs.model.SkillNode;
import fr.vaeloria.jobs.model.SkillTree;
import net.kyori.adventure.title.Title;
import org.bukkit.Bukkit;
import org.bukkit.Sound;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.AsyncPlayerPreLoginEvent;
import org.bukkit.event.player.PlayerChangedWorldEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.player.PlayerRespawnEvent;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;

/** Données des joueurs connectés, gain d'XP, déblocage des nœuds et sauvegarde. */
public final class Jobs implements Listener {
    private final VaeloriaJobsPlugin plugin;
    private final Storage storage;
    private final Bonuses bonuses;
    /** Un seul fil d'écriture/lecture : un fichier n'est jamais lu pendant qu'une sauvegarde plus récente l'écrit. */
    private final ExecutorService io = Executors.newSingleThreadExecutor(r -> new Thread(r, "VaeloriaJobs-IO"));
    private final Map<UUID, PlayerJobs> online = new ConcurrentHashMap<>();
    private final Map<UUID, PlayerJobs> preloaded = new ConcurrentHashMap<>();
    private Settings settings;

    Jobs(VaeloriaJobsPlugin plugin, Storage storage, Bonuses bonuses) {
        this.plugin = plugin;
        this.storage = storage;
        this.bonuses = bonuses;
    }

    public Settings settings() { return settings; }

    void configure(Settings s) {
        this.settings = s;
        for (Player p : Bukkit.getOnlinePlayers()) {
            PlayerJobs data = data(p);
            sanitize(data);
            bonuses.refresh(p, data, s);
        }
    }

    /** Données d'un joueur connecté (chargées à la connexion ; secours synchrone sinon). */
    public PlayerJobs data(Player p) {
        return online.computeIfAbsent(p.getUniqueId(), id -> {
            PlayerJobs pre = preloaded.remove(id);
            if (pre != null) return pre;
            try {
                return io.submit(() -> storage.load(id)).get(5, TimeUnit.SECONDS);
            } catch (Exception e) {
                plugin.getLogger().log(Level.SEVERE, "Chargement des métiers de " + p.getName() + " impossible", e);
                return new PlayerJobs();
            }
        });
    }

    // ─────────────────────────── XP ───────────────────────────

    /** Ajoute de l'XP à un métier : barre d'action, passage de niveau, annonce. */
    public void addXp(Player p, Settings.Job job, double amount) {
        if (!(amount > 0)) return;
        LevelCurve curve = settings.curve();
        PlayerJobs data = data(p);
        JobProgress progress = data.get(job.id());
        int before = progress.level(curve);
        if (before >= curve.maxLevel()) return;
        int gained = progress.addXp(amount, curve);
        data.markDirty();
        int level = progress.level(curve);
        if (settings.actionBar()) {
            p.sendActionBar(Text.mm("<gold>+" + Text.number(amount) + " XP</gold> <snow>" + Text.esc(job.name())
                    + "</snow> <ash>·</ash> <steel>niv. " + level + "</steel> " + Text.bar(curve.progress(progress.xp()), 10)));
        }
        if (gained > 0) levelUp(p, job, before, level, progress.freePoints(curve, job.tree()));
    }

    private void levelUp(Player p, Settings.Job job, int before, int level, int freePoints) {
        p.showTitle(Title.title(Text.mm("<gold><b>" + Text.esc(job.name()) + " " + level + "</b></gold>"),
                Text.mm("<steel>" + freePoints + " point(s) à dépenser — <snow>/metiers</snow>"),
                Title.Times.times(Duration.ofMillis(200), Duration.ofMillis(2500), Duration.ofMillis(500))));
        p.playSound(p.getLocation(), Sound.ENTITY_PLAYER_LEVELUP, 0.8f, 1.1f);
        p.sendMessage(Text.prefixed("<steel>Niveau <gold>" + level + "</gold> en <snow>" + Text.esc(job.name())
                + "</snow> ! <click:run_command:'/metiers " + job.id() + "'><hover:show_text:'<steel>Ouvrir l'arbre'>"
                + "<gain>[Ouvrir l'arbre « " + Text.esc(job.treeName()) + " »]</gain></hover></click>"));
        for (int l = before + 1; l <= level; l++) {
            if (settings.announceLevels().contains(l)) {
                Bukkit.broadcast(Text.prefixed("<snow>" + Text.esc(p.getName()) + "</snow> <steel>atteint le niveau <gold>" + l
                        + "</gold> en <snow>" + Text.esc(job.name()) + "</snow> !"));
            }
        }
    }

    // ─────────────────────────── Arbre ───────────────────────────

    public SkillTree.Status unlock(Player p, Settings.Job job, SkillNode node) {
        PlayerJobs data = data(p);
        SkillTree.Status s = data.get(job.id()).unlock(node, settings.curve(), job.tree());
        if (s == SkillTree.Status.AVAILABLE) {
            data.markDirty();
            save(p.getUniqueId(), data);
            bonuses.refresh(p, data, settings);
            p.playSound(p.getLocation(), Sound.BLOCK_ANVIL_USE, 0.6f, 1.4f);
            p.sendMessage(Text.prefixed("<gain>Débloqué :</gain> <snow>" + Text.esc(node.name()) + "</snow> <ash>(" + Text.esc(job.treeName()) + ")"));
        }
        return s;
    }

    /** Délai restant avant la prochaine réinitialisation de l'arbre (0 = possible). */
    public long resetWait(Player p, Settings.Job job) {
        long last = data(p).get(job.id()).lastReset();
        return Math.max(0, last + settings.resetCooldownMillis() - System.currentTimeMillis());
    }

    /** Rend tous les points d'un arbre. {@code force} ignore le délai (admin). */
    public boolean resetTree(Player p, Settings.Job job, boolean force) {
        if (!force && resetWait(p, job) > 0) return false;
        PlayerJobs data = data(p);
        data.get(job.id()).resetTree(force ? 0 : System.currentTimeMillis());
        data.markDirty();
        save(p.getUniqueId(), data);
        bonuses.refresh(p, data, settings);
        return true;
    }

    /** Admin : remet un métier à zéro (XP et arbre). */
    public void wipe(Player p, Settings.Job job) {
        PlayerJobs data = data(p);
        data.all().remove(job.id());
        data.markDirty();
        save(p.getUniqueId(), data);
        bonuses.refresh(p, data, settings);
    }

    public void refresh(Player p) {
        bonuses.refresh(p, data(p), settings);
    }

    /** Retire les nœuds devenus inaccessibles après un changement de config. */
    private void sanitize(PlayerJobs data) {
        LevelCurve curve = settings.curve();
        for (Settings.Job job : settings.jobs().values()) {
            JobProgress progress = data.all().get(job.id());
            if (progress == null || progress.unlocked().isEmpty()) continue;
            int level = progress.level(curve);
            Set<String> valid = job.tree().sanitize(progress.unlocked(), level, curve.pointsAt(level));
            if (valid.size() != progress.unlocked().size()) {
                progress.unlocked().retainAll(valid);
                data.markDirty();
            }
        }
    }

    // ─────────────────────────── Sauvegarde ───────────────────────────

    private void save(UUID uuid, PlayerJobs data) {
        String yaml = Storage.serialize(data);
        data.markClean();
        io.execute(() -> {
            try {
                storage.write(uuid, yaml);
            } catch (IOException e) {
                plugin.getLogger().log(Level.SEVERE, "Sauvegarde des métiers de " + uuid + " impossible", e);
            }
        });
    }

    void autosave() {
        online.forEach((uuid, data) -> {
            if (data.dirty()) save(uuid, data);
        });
    }

    void shutdown() {
        autosave();
        for (Player p : Bukkit.getOnlinePlayers()) bonuses.clear(p);
        io.shutdown();
        try {
            if (!io.awaitTermination(10, TimeUnit.SECONDS)) plugin.getLogger().warning("Sauvegardes non terminées après 10 s.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    void tickPotions() {
        bonuses.tick(Bukkit.getOnlinePlayers());
    }

    // ─────────────────────────── Connexions ───────────────────────────

    @EventHandler(priority = EventPriority.MONITOR)
    public void onPreLogin(AsyncPlayerPreLoginEvent event) {
        if (event.getLoginResult() != AsyncPlayerPreLoginEvent.Result.ALLOWED) return;
        UUID id = event.getUniqueId();
        try {
            Future<PlayerJobs> f = io.submit(() -> storage.load(id));
            preloaded.put(id, f.get(5, TimeUnit.SECONDS));
        } catch (Exception e) {
            plugin.getLogger().log(Level.WARNING, "Préchargement des métiers de " + event.getName() + " impossible", e);
        }
    }

    @EventHandler(priority = EventPriority.LOWEST)
    public void onJoin(PlayerJoinEvent event) {
        Player p = event.getPlayer();
        PlayerJobs data = data(p);
        sanitize(data);
        bonuses.refresh(p, data, settings);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onQuit(PlayerQuitEvent event) {
        UUID id = event.getPlayer().getUniqueId();
        PlayerJobs data = online.remove(id);
        preloaded.remove(id);
        bonuses.forget(id);
        if (data != null && data.dirty()) save(id, data);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onRespawn(PlayerRespawnEvent event) {
        Player p = event.getPlayer();
        Bukkit.getScheduler().runTask(plugin, () -> {
            if (p.isOnline()) refresh(p);
        });
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onWorldChange(PlayerChangedWorldEvent event) {
        refresh(event.getPlayer());
    }
}
