package fr.vaeloria.fakeplayers;

import com.destroystokyo.paper.event.server.PaperServerListPingEvent;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDamageEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.logging.Level;

/**
 * VæloriaFakePlayers : faux joueurs dans la liste TAB, le compteur de la liste des serveurs, le chat
 * (connexions, déconnexions, messages) et, sur Minecraft 1.21.9+, sous forme de corps « mannequin » dans le monde.
 */
public final class FakePlayersPlugin extends JavaPlugin implements Listener {
    private final FakePlayerManager manager = new FakePlayerManager(this);
    private NamePool names;
    private BukkitTask ticker;
    private long seconds;
    /** Planning horaire du mode ambiance, null s'il est désactivé ou invalide. */
    private Schedule schedule;
    private ZoneId zone = ZoneId.systemDefault();
    /** Sans planning : cible qui dérive lentement entre auto.min et auto.max. */
    private int driftTarget = -1;
    private long nextStepAt;
    /** Arrivées étalées de /fp add <nombre> <durée> (en secondes de fonctionnement). */
    private final PriorityQueue<Long> pendingArrivals = new PriorityQueue<>();

    @Override
    public void onEnable() {
        saveDefaultConfig();
        names = new NamePool(getConfig().getStringList("names"), new Random());
        loadSchedule();

        TabList tab = TabList.NONE;
        if (getConfig().getBoolean("tab.enabled", true)) {
            if (getServer().getPluginManager().isPluginEnabled("packetevents")) {
                tab = new PacketEventsTabList(f -> manager.render("tab.display-name", f));
            } else {
                getLogger().warning("PacketEvents absent : les faux joueurs n'apparaîtront pas dans la liste TAB.");
            }
        }
        Bodies bodies = null;
        if (Bodies.supported()) {
            bodies = new Bodies(this, getConfig().getBoolean("bodies.invulnerable", true));
        } else {
            getLogger().warning("Entité Mannequin indisponible (Minecraft < 1.21.9) : corps désactivés.");
        }
        manager.services(tab, bodies);

        getServer().getPluginManager().registerEvents(this, this);
        FakeCommand command = new FakeCommand(this);
        getCommand("fakeplayers").setExecutor(command);
        getCommand("fakeplayers").setTabCompleter(command);

        restore();
        ticker = Bukkit.getScheduler().runTaskTimer(this, this::tick, 20L, 20L);
        getLogger().info("VæloriaFakePlayers actif — " + manager.count() + " faux joueur(s) restauré(s).");
    }

    @Override
    public void onDisable() {
        if (ticker != null) ticker.cancel();
        save();
        manager.removeAll(true);
    }

    public FakePlayerManager manager() { return manager; }

    public NamePool names() { return names; }

    /** Recharge config.yml sans perdre les faux joueurs connectés. */
    public void reload() {
        reloadConfig();
        names = new NamePool(getConfig().getStringList("names"), new Random());
        loadSchedule();
    }

    Schedule schedule() { return schedule; }

    LocalDateTime now() { return LocalDateTime.now(zone); }

    /** Cible actuelle du mode ambiance (faux joueurs « auto » uniquement). */
    int ambientTarget() {
        ConfigurationSection auto = getConfig().getConfigurationSection("auto");
        int min = auto == null ? 0 : Math.max(0, auto.getInt("min", 3));
        int max = auto == null ? 0 : Math.max(min, auto.getInt("max", 10));
        if (schedule != null) return schedule.target(now(), min, max);
        if (driftTarget < 0) driftTarget = min;
        return Math.max(min, Math.min(max, driftTarget));
    }

    /** Programme n arrivées réparties au hasard sur la durée donnée. */
    void scheduleArrivals(int n, long durationSeconds) {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        for (int i = 0; i < n; i++) pendingArrivals.add(seconds + 1 + r.nextLong(Math.max(1, durationSeconds)));
    }

    int pendingArrivals() { return pendingArrivals.size(); }

    void clearPendingArrivals() { pendingArrivals.clear(); }

    private void loadSchedule() {
        schedule = null;
        ConfigurationSection cfg = getConfig().getConfigurationSection("schedule");
        if (cfg == null || !cfg.getBoolean("enabled", false)) return;
        try {
            zone = ZoneId.of(cfg.getString("timezone", "Europe/Paris"));
            Map<String, double[]> curves = new HashMap<>();
            ConfigurationSection cs = cfg.getConfigurationSection("curves");
            if (cs != null) for (String key : cs.getKeys(false)) {
                List<Double> values = cs.getDoubleList(key);
                if (values.size() != 24) {
                    getLogger().warning("schedule.curves." + key + " doit avoir 24 valeurs : courbe par défaut utilisée.");
                    continue;
                }
                curves.put(key, values.stream().mapToDouble(Double::doubleValue).toArray());
            }
            List<Schedule.Period> periods = new ArrayList<>();
            for (Map<?, ?> m : cfg.getMapList("school-holidays.periods")) {
                Set<String> zones = new HashSet<>();
                for (String z : String.valueOf(m.get("zones")).split(",")) zones.add(z.trim().toUpperCase(Locale.ROOT));
                Object name = m.get("name");
                periods.add(new Schedule.Period(date(m.get("from")), date(m.get("to")), zones,
                        name == null ? "vacances" : name.toString()));
            }
            Set<String> zones = new HashSet<>();
            for (String z : cfg.getStringList("school-holidays.zones")) zones.add(z.trim().toUpperCase(Locale.ROOT));
            Set<LocalDate> extra = new HashSet<>();
            for (Object d : cfg.getList("extra-days-off", List.of())) extra.add(date(d));
            schedule = new Schedule(Schedule.Curves.from(curves, Schedule.DEFAULT_CURVES), periods, zones,
                    cfg.getBoolean("french-public-holidays", true), extra, cfg.getDouble("daily-variation", 0.15),
                    cfg.getDouble("noise", 0.10), cfg.getString("seed", "vaeloria").hashCode());
            LocalDate last = periods.stream().map(Schedule.Period::to).max(LocalDate::compareTo).orElse(null);
            if (last == null || last.isBefore(LocalDate.now(zone))) {
                getLogger().warning("Aucune période de vacances scolaires à venir dans schedule.school-holidays : "
                        + "mets à jour le calendrier (voir le README).");
            }
        } catch (RuntimeException e) {
            getLogger().log(Level.WARNING, "Section schedule invalide : planning désactivé.", e);
            schedule = null;
        }
    }

    /** Accepte "2026-10-17" (texte) ou une date YAML non entre guillemets. */
    private static LocalDate date(Object value) {
        if (value instanceof java.util.Date d) return d.toInstant().atZone(ZoneOffset.UTC).toLocalDate();
        if (value == null) throw new IllegalArgumentException("date manquante");
        return LocalDate.parse(value.toString().trim());
    }

    // --- Boucle : ambiance (arrivées/départs), chat automatique, corps, ping ---

    private void tick() {
        seconds++;
        manager.tick(seconds);
        ambient();
        autoChat();
    }

    private void ambient() {
        while (!pendingArrivals.isEmpty() && pendingArrivals.peek() <= seconds) {
            pendingArrivals.poll();
            spawnRandom(false, false);
        }
        ConfigurationSection auto = getConfig().getConfigurationSection("auto");
        if (auto == null || !auto.getBoolean("enabled", false)) return;
        ThreadLocalRandom r = ThreadLocalRandom.current();
        if (schedule == null && seconds % Math.max(5, auto.getLong("interval-seconds", 60)) == 0) {
            int min = auto.getInt("min", 3), max = Math.max(min, auto.getInt("max", 10));
            if (driftTarget < 0) driftTarget = min;
            if (r.nextDouble() < auto.getDouble("join-chance", 0.5)) driftTarget = Math.min(max, driftTarget + 1);
            else if (r.nextDouble() < auto.getDouble("leave-chance", 0.3)) driftTarget = Math.max(min, driftTarget - 1);
        }
        if (seconds < nextStepAt) return;

        // Un pas à la fois : une arrivée ou un départ, séparés d'un délai aléatoire.
        int target = ambientTarget();
        List<FakePlayer> autos = manager.all().stream().filter(FakePlayer::auto).toList();
        int gap = Math.abs(target - autos.size());
        if (autos.size() < target) {
            spawnRandom(true, false);
        } else if (autos.size() > target) {
            manager.remove(autos.get(r.nextInt(autos.size())).name(), false);
        } else if (!autos.isEmpty() && r.nextDouble() < auto.getDouble("churn-chance", 0.15)) {
            // Rotation : quelqu'un part, un autre arrivera au pas suivant.
            manager.remove(autos.get(r.nextInt(autos.size())).name(), false);
        }
        long stepMin = Math.max(1, auto.getLong("step-seconds.min", 15));
        long stepMax = Math.max(stepMin, auto.getLong("step-seconds.max", 90));
        long delay = stepMin + r.nextLong(stepMax - stepMin + 1);
        nextStepAt = seconds + Math.max(1, delay / Math.max(1, gap / 5)); // rattrape plus vite un gros écart
    }

    private void autoChat() {
        ConfigurationSection chat = getConfig().getConfigurationSection("chat.auto");
        if (chat == null || !chat.getBoolean("enabled", false) || manager.count() == 0) return;
        if (seconds % Math.max(5, chat.getLong("interval-seconds", 90)) != 0) return;
        List<String> messages = chat.getStringList("messages");
        if (messages.isEmpty() || ThreadLocalRandom.current().nextDouble() >= chat.getDouble("chance", 0.5)) return;
        List<FakePlayer> all = List.copyOf(manager.all());
        ThreadLocalRandom r = ThreadLocalRandom.current();
        manager.chat(all.get(r.nextInt(all.size())), messages.get(r.nextInt(messages.size())));
    }

    /** Crée un faux joueur au pseudo aléatoire, sans corps. Retourne null si aucun pseudo libre. */
    FakePlayer spawnRandom(boolean auto, boolean silent) {
        String name = names.next(manager.takenNames());
        return name == null ? null : manager.spawn(name, auto, null, silent);
    }

    // --- Événements ---

    @EventHandler(priority = EventPriority.MONITOR)
    public void onJoin(PlayerJoinEvent event) {
        // Un vrai joueur prend le pseudo d'un faux : le faux s'efface (sinon doublon dans le TAB).
        FakePlayer clash = manager.get(event.getPlayer().getName());
        if (clash != null) manager.remove(clash.name(), true);
        Bukkit.getScheduler().runTaskLater(this, () -> {
            if (event.getPlayer().isOnline()) manager.showAllTo(event.getPlayer());
        }, 2L);
    }

    @EventHandler
    public void onPing(PaperServerListPingEvent event) {
        if (!getConfig().getBoolean("server-list.include-fakes", false) || manager.count() == 0) return;
        event.setNumPlayers(event.getNumPlayers() + manager.count());
        int sample = getConfig().getInt("server-list.sample-size", 12);
        for (FakePlayer fake : manager.all()) {
            if (event.getListedPlayers().size() >= sample) break;
            event.getListedPlayers().add(new PaperServerListPingEvent.ListedPlayerInfo(fake.name(), fake.uuid()));
        }
    }

    @EventHandler(ignoreCancelled = true)
    public void onDamage(EntityDamageEvent event) {
        Bodies bodies = manager.bodies();
        if (bodies != null && getConfig().getBoolean("bodies.invulnerable", true) && bodies.isBody(event.getEntity())) {
            event.setCancelled(true);
        }
    }

    // --- Persistance (fakes.yml) : les faux joueurs créés par un admin survivent aux redémarrages ---

    private File dataFile() { return new File(getDataFolder(), "fakes.yml"); }

    private void save() {
        if (!getConfig().getBoolean("persist", true)) return;
        YamlConfiguration yaml = new YamlConfiguration();
        int i = 0;
        for (FakePlayer fake : manager.all()) {
            if (fake.auto()) continue;
            String path = "fakes." + i++;
            yaml.set(path + ".name", fake.name());
            Location at = fake.bodyLocation();
            if (at != null) yaml.set(path + ".body", at);
        }
        try {
            yaml.save(dataFile());
        } catch (IOException e) {
            getLogger().log(Level.WARNING, "Impossible d'enregistrer fakes.yml", e);
        }
    }

    private void restore() {
        if (!getConfig().getBoolean("persist", true) || !dataFile().exists()) return;
        ConfigurationSection section = YamlConfiguration.loadConfiguration(dataFile()).getConfigurationSection("fakes");
        if (section == null) return;
        for (String key : section.getKeys(false)) {
            String name = section.getString(key + ".name");
            Location body;
            try {
                body = section.getLocation(key + ".body");
            } catch (IllegalArgumentException e) { // monde supprimé ou non chargé
                body = null;
            }
            if (manager.spawn(name, false, body, true) == null) {
                getLogger().warning("Faux joueur ignoré à la restauration : " + name);
            }
        }
    }
}
