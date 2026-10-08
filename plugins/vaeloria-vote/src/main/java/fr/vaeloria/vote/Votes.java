package fr.vaeloria.vote;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.title.Title;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.OfflinePlayer;
import org.bukkit.Sound;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.inventory.ItemStack;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;

/** Votes, cagnottes, livraisons et rappels. Toutes les méthodes s'exécutent sur le thread principal. */
final class Votes implements Listener {
    enum Source { API, VOTIFIER, ADMIN, TEST }

    private final VaeloriaVotePlugin plugin;
    private final Storage storage;
    private final VoteChecker checker = new VoteChecker();
    // Toute donnée lue reste en mémoire (quelques centaines d'octets par joueur) : on ne relit jamais un
    // fichier qu'une écriture en file d'attente pourrait encore modifier.
    private final Map<UUID, PlayerVotes> cache = new HashMap<>();
    // Un seul fil d'écriture : les sauvegardes d'un même joueur arrivent sur le disque dans l'ordre.
    private final ExecutorService writer = Executors.newSingleThreadExecutor(r -> new Thread(r, "VaeloriaVote-save"));
    private final Map<UUID, Long> lastReminder = new HashMap<>();
    private final Map<UUID, Long> lastCheck = new HashMap<>();
    private final Set<String> checking = new HashSet<>();
    private final IpLocks locks;
    private long ticks;
    private Settings settings;
    private Money money;

    Votes(VaeloriaVotePlugin plugin, Storage storage) throws IOException {
        this.plugin = plugin;
        this.storage = storage;
        this.locks = storage.loadLocks();
    }

    void configure(Settings settings, Money money) {
        this.settings = settings;
        this.money = money;
    }

    Settings settings() { return settings; }
    Money money() { return money; }

    LocalDate today() {
        return LocalDate.now(settings.zone());
    }

    // ── Données ──────────────────────────────────────────────────────

    PlayerVotes data(Player p) {
        return data(p.getUniqueId());
    }

    PlayerVotes data(UUID uuid) {
        PlayerVotes v = cache.computeIfAbsent(uuid, this::loadOrEmpty);
        if (v.rollover(today())) save(uuid, v);
        return v;
    }

    private PlayerVotes loadOrEmpty(UUID uuid) {
        try {
            return storage.load(uuid);
        } catch (Exception e) {
            plugin.getLogger().log(Level.SEVERE, "Données de vote illisibles pour " + uuid + " (fichier conservé, joueur repart de zéro)", e);
            return new PlayerVotes();
        }
    }

    void save(UUID uuid, PlayerVotes v) {
        String json = Storage.serialize(v);
        writer.execute(() -> {
            try {
                storage.write(uuid, json);
            } catch (IOException e) {
                plugin.getLogger().log(Level.SEVERE, "Sauvegarde des votes impossible pour " + uuid, e);
            }
        });
    }

    /** Arrêt du serveur : termine les écritures en attente. */
    void saveAllNow() {
        writer.shutdown();
        try {
            if (!writer.awaitTermination(10, TimeUnit.SECONDS)) plugin.getLogger().severe("Sauvegardes des votes interrompues.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        try {
            locks.prune(System.currentTimeMillis());
            storage.writeLocks(Storage.serialize(locks));
        } catch (IOException e) {
            plugin.getLogger().log(Level.SEVERE, "Sauvegarde de ip-locks.json impossible", e);
        }
    }

    @EventHandler
    public void onJoin(PlayerJoinEvent e) {
        Player p = e.getPlayer();
        data(p);
        // Premier rappel peu après l'arrivée, puis toutes les « interval-minutes ».
        lastReminder.put(p.getUniqueId(), System.currentTimeMillis() - settings.reminderIntervalMillis() + settings.reminderFirstDelayMillis());
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            if (p.isOnline()) deliver(p, "<steel>Récompenses de vote en attente versées :");
        }, 60L);
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent e) {
        UUID uuid = e.getPlayer().getUniqueId();
        lastReminder.remove(uuid);
        lastCheck.remove(uuid);
    }

    // ── Crédit d'un vote ─────────────────────────────────────────────

    /** Joueur en ligne ou non. Respecte toujours le délai du site : un même vote n'est jamais payé deux fois. */
    boolean credit(UUID uuid, String name, VoteSite site, Source source) {
        Player p = Bukkit.getPlayer(uuid);
        PlayerVotes v = data(uuid);
        PlayerVotes.Credit c = v.vote(site, System.currentTimeMillis(), today(), settings.perVote(),
                settings.allSitesBonus(), settings.sites().size(), settings.moneyCapPerDay());
        if (!c.accepted()) return false;
        save(uuid, v);
        plugin.getLogger().info("Vote " + site.id() + " de " + name + " (" + source + ", " + c.sitesToday() + "/" + settings.sites().size() + ")");
        plugin.emitBridge("VOTE", uuid, name, site.id());

        int n = settings.sites().size();
        if (settings.broadcastVotes()) {
            Component msg = Text.prefixed("<snow>" + Text.esc(name) + "</snow> <steel>a voté pour VÆLORIA sur <gold>"
                    + Text.esc(site.name()) + "</gold> <ash>(" + c.sitesToday() + "/" + n + ")</ash> "
                    + "<click:run_command:'/vote'><hover:show_text:'<steel>Voter aussi'><ruby_hi>[/vote]</ruby_hi></hover></click>");
            for (Player other : Bukkit.getOnlinePlayers()) if (!other.getUniqueId().equals(uuid)) other.sendMessage(msg);
        }
        if (p == null) return true;

        p.playSound(p.getLocation(), Sound.ENTITY_EXPERIENCE_ORB_PICKUP, 1f, 1.2f);
        if (c.toPot()) {
            p.sendMessage(Text.prefixed("<gain>Vote reçu sur " + Text.esc(site.name()) + " !</gain> <steel>Ajouté à ta cagnotte : "
                    + Text.describe(c.reward(), money)));
        } else {
            p.sendMessage(Text.prefixed("<gain>Vote reçu sur " + Text.esc(site.name()) + " !</gain>"));
            deliver(p, "<steel>Versé :");
        }
        if (c.completedAll()) {
            p.sendMessage(Text.prefixed("<gold><b>3/3 !</b></gold> <steel>Bonus de fidélité ajouté. Série : <snow>"
                    + v.streak(today()) + " jour(s)</snow>."));
        }
        if (v.wheelReady(settings.requiredSites())) {
            p.showTitle(Title.title(Text.mm("<gold><b>LA ROUE EST PRÊTE"), Text.mm("<steel>Multiplie ta cagnotte : <snow>/roue"),
                    Title.Times.times(Duration.ofMillis(200), Duration.ofSeconds(3), Duration.ofMillis(500))));
            p.sendMessage(Text.prefixed("<steel>Ta cagnotte : " + Text.describe(v.pot(), money)));
            p.sendMessage(Text.mm("   <click:run_command:'/roue'><hover:show_text:'<steel>Lancer la roue du jour'>"
                    + "<ruby_hi><b>[ 🎡 LANCER LA ROUE ]</b></ruby_hi></hover></click>"));
        } else if (c.toPot()) {
            int missing = settings.requiredSites() - v.sitesToday();
            if (missing > 0) p.sendMessage(Text.prefixed("<steel>Encore <snow>" + missing + "</snow> vote(s) pour débloquer la roue du jour (×2, ×3… ou ×4)."));
        }
        return true;
    }

    /** Vote reçu par NuVotifier (nom de service configuré par site). */
    void creditVotifier(String service, String username) {
        VoteSite site = null;
        for (VoteSite s : settings.sites()) {
            if (!s.votifierService().isBlank() && s.votifierService().equalsIgnoreCase(service)) site = s;
        }
        if (site == null) {
            plugin.getLogger().info("Vote Votifier ignoré : service « " + service + " » non associé à un site (votifier-service).");
            return;
        }
        OfflinePlayer target = Bukkit.getPlayerExact(username);
        if (target == null) target = Bukkit.getOfflinePlayerIfCached(username);
        if (target == null) {
            plugin.getLogger().info("Vote Votifier ignoré : joueur « " + username + " » jamais venu sur le serveur.");
            return;
        }
        credit(target.getUniqueId(), target.getName() != null ? target.getName() : username, site, Source.VOTIFIER);
    }

    // ── « J'ai voté » : vérification par API ────────────────────────

    void verify(Player p) {
        long now = System.currentTimeMillis();
        Long last = lastCheck.get(p.getUniqueId());
        if (last != null && now - last < 10_000) {
            p.sendMessage(Text.prefixed("<loss>Patiente quelques secondes avant de revérifier."));
            return;
        }
        lastCheck.put(p.getUniqueId(), now);
        PlayerVotes v = data(p);
        List<VoteSite> todo = new ArrayList<>();
        for (VoteSite s : settings.sites()) if (v.available(s, now)) todo.add(s);
        if (todo.isEmpty()) {
            p.sendMessage(Text.prefixed("<gain>Tu as déjà voté partout.</gain> <steel>Merci ! Reviens quand les délais sont écoulés."));
            return;
        }
        InetSocketAddress addr = p.getAddress();
        String ip = addr != null && addr.getAddress() != null ? addr.getAddress().getHostAddress() : "";
        p.sendMessage(Text.prefixed("<steel>Vérification de tes votes…"));
        for (VoteSite site : todo) {
            if (!site.verifiable()) {
                if (settings.testMode()) {
                    credit(p.getUniqueId(), p.getName(), site, Source.TEST);
                } else if (site.votifierService().isBlank()) {
                    p.sendMessage(Text.prefixed("<ash>" + Text.esc(site.name()) + " : vérification automatique pas encore active."));
                } else {
                    p.sendMessage(Text.prefixed("<ash>" + Text.esc(site.name()) + " : ton vote arrive tout seul quelques secondes après le vote."));
                }
                continue;
            }
            String key = p.getUniqueId() + "|" + site.id();
            if (!checking.add(key)) continue;
            UUID uuid = p.getUniqueId();
            String name = p.getName();
            checker.check(site, name, uuid, ip, settings.checkTimeoutSeconds()).whenComplete((ok, err) ->
                    Bukkit.getScheduler().runTask(plugin, () -> {
                        checking.remove(key);
                        Player now2 = Bukkit.getPlayer(uuid);
                        if (err != null) {
                            plugin.getLogger().log(Level.FINE, "API de " + site.id() + " injoignable", err);
                            if (now2 != null) now2.sendMessage(Text.prefixed("<loss>" + Text.esc(site.name()) + " ne répond pas, réessaie dans une minute."));
                            return;
                        }
                        if (!ok) {
                            if (now2 != null) now2.sendMessage(Text.prefixed("<loss>" + Text.esc(site.name()) + " : vote introuvable.</loss> <ash>Le site peut mettre une minute à l'enregistrer."));
                            return;
                        }
                        if (!ip.isEmpty() && !locks.tryLock(site.id(), IpLocks.hash(ip), uuid, System.currentTimeMillis(), site.cooldownMillis())) {
                            if (now2 != null) now2.sendMessage(Text.prefixed("<loss>Ce vote (même connexion) a déjà été récupéré par un autre compte."));
                            return;
                        }
                        credit(uuid, name, site, Source.API);
                    }));
        }
    }

    // ── Livraison ────────────────────────────────────────────────────

    /** Verse tout ce qui attend dans « pending » (inventaire plein : posé aux pieds du joueur). */
    void deliver(Player p, String header) {
        PlayerVotes v = data(p);
        Reward r = v.takePending();
        if (r.isEmpty()) return;
        save(p.getUniqueId(), v);
        if (r.money() > 0 && !money.deposit(p, r.money())) {
            plugin.getLogger().severe("Versement de " + r.money() + " à " + p.getName() + " échoué (" + money.describe() + ").");
        }
        boolean dropped = false;
        for (Map.Entry<String, Integer> e : r.items().entrySet()) {
            Material m = Material.matchMaterial(e.getKey());
            if (m == null || !m.isItem()) continue;
            int left = e.getValue();
            while (left > 0) {
                int n = Math.min(left, m.getMaxStackSize());
                left -= n;
                for (ItemStack rest : p.getInventory().addItem(new ItemStack(m, n)).values()) {
                    p.getWorld().dropItemNaturally(p.getLocation(), rest);
                    dropped = true;
                }
            }
        }
        p.sendMessage(Text.prefixed(header + " " + Text.describe(r, money)));
        if (dropped) p.sendMessage(Text.prefixed("<loss>Inventaire plein : le reste est à tes pieds."));
    }

    // ── Rappels ──────────────────────────────────────────────────────

    /** Toutes les 20 s : changement de jour, livraisons en attente, rappel si un vote ou la roue attend. */
    void tick() {
        long now = System.currentTimeMillis();
        for (Player p : Bukkit.getOnlinePlayers()) {
            PlayerVotes v = data(p);
            if (!v.pending().isEmpty() && !plugin.wheelSpin().spinning(p)) deliver(p, "<steel>Versé :");
            if (p.hasPermission("vaeloria.vote.noreminder")) continue;
            long last = lastReminder.getOrDefault(p.getUniqueId(), 0L);
            if (now - last < settings.reminderIntervalMillis()) continue;
            boolean votesMissing = settings.sites().stream().anyMatch(s -> v.available(s, now));
            boolean wheel = v.wheelReady(settings.requiredSites());
            if (!votesMissing && !wheel) continue;
            lastReminder.put(p.getUniqueId(), now);
            remind(p, v, now, votesMissing);
        }
        if (++ticks % 30 == 0) { // ~10 min
            locks.prune(now);
            String json = Storage.serialize(locks);
            writer.execute(() -> {
                try {
                    storage.writeLocks(json);
                } catch (IOException e) {
                    plugin.getLogger().log(Level.WARNING, "Sauvegarde de ip-locks.json impossible", e);
                }
            });
        }
    }

    private void remind(Player p, PlayerVotes v, long now, boolean votesMissing) {
        if (votesMissing) {
            int done = (int) settings.sites().stream().filter(s -> !v.available(s, now)).count();
            p.sendMessage(Text.mm(" "));
            p.sendMessage(Text.prefixed("<gold><b>VOTE POUR VÆLORIA</b></gold> <ash>(" + done + "/" + settings.sites().size()
                    + ")</ash> <steel>— chaque vote fait grandir le serveur."));
            p.sendMessage(Text.mm("   " + siteButtons(v, now)));
            p.sendMessage(Text.mm("   <steel>Par vote : " + Text.describe(settings.perVote(), money)));
            p.sendMessage(Text.mm("   <steel>Les " + settings.sites().size() + " votes : <gold>bonus</gold> + <gold>roue du jour</gold> jusqu'à <gold>×4</gold>."));
            p.sendMessage(Text.mm("   <click:run_command:'/vote verifier'><hover:show_text:'<steel>Vérifier mes votes'>"
                    + "<gain>[✔ J'ai voté]</gain></hover></click>"));
            if (settings.reminderTitle()) {
                p.showTitle(Title.title(Text.mm("<ruby_hi><b>/vote"), Text.mm("<steel>Tes votes t'attendent <ash>(" + done + "/" + settings.sites().size() + ")"),
                        Title.Times.times(Duration.ofMillis(200), Duration.ofMillis(2500), Duration.ofMillis(500))));
            }
        } else {
            p.sendMessage(Text.prefixed("<gold>Ta roue du jour t'attend !</gold> <steel>Cagnotte : " + Text.describe(v.pot(), money)
                    + " <click:run_command:'/roue'><hover:show_text:'<steel>Lancer la roue'><ruby_hi>[🎡 /roue]</ruby_hi></hover></click>"));
        }
        if (settings.reminderSound()) p.playSound(p.getLocation(), Sound.BLOCK_NOTE_BLOCK_PLING, 0.8f, 1.4f);
    }

    /** Boutons cliquables des sites encore à voter. */
    String siteButtons(PlayerVotes v, long now) {
        List<String> parts = new ArrayList<>();
        for (VoteSite s : settings.sites()) {
            if (v.available(s, now)) {
                parts.add("<click:open_url:'" + s.voteUrl().replace("'", "%27") + "'><hover:show_text:'<steel>Ouvrir " + Text.esc(s.name())
                        + "'><ruby_hi><b>[" + Text.esc(s.name()) + "]</b></ruby_hi></hover></click>");
            } else {
                parts.add("<ash><st>" + Text.esc(s.name()) + "</st> ✔</ash>");
            }
        }
        return String.join("  ", parts);
    }
}
