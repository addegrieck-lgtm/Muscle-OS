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
    private static volatile FakePlayersPlugin instance;
    private final FakePlayerManager manager = new FakePlayerManager(this);
    private NamePool names;
    private BukkitTask ticker;
    private long seconds;
    /** Planning horaire du mode ambiance, null s'il est désactivé ou invalide. */
    private Schedule schedule;
    private ZoneId zone = ZoneId.systemDefault();
    /** Sans planning : cible qui dérive lentement entre auto.min et auto.max. */
    private int driftTarget = -1;
    private long nextJoinAt;
    private long nextLeaveAt;
    private AmbientChat chat;
    private FakeInteractions interactions;
    /** Arrivées étalées de /fp add <nombre> <durée> (en secondes de fonctionnement). */
    private final PriorityQueue<Long> pendingArrivals = new PriorityQueue<>();

    /**
     * API pour les autres plugins (TAB, scoreboard…), utilisable depuis n'importe quel thread :
     * nombre de faux joueurs connectés, à ajouter au nombre de vrais joueurs.
     * Appel par réflexion conseillé pour ne pas dépendre de ce plugin à la compilation (voir VaeloriaTab).
     */
    public static int fakeCount() {
        FakePlayersPlugin plugin = instance;
        return plugin == null ? 0 : plugin.manager.namesSnapshot().size();
    }

    /** Pseudos des faux joueurs connectés (copie immuable, n'importe quel thread). */
    public static List<String> fakeNames() {
        FakePlayersPlugin plugin = instance;
        return plugin == null ? List.of() : plugin.manager.namesSnapshot();
    }

    @Override
    public void onEnable() {
        instance = this;
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
        chat = new AmbientChat(this);
        getServer().getPluginManager().registerEvents(chat, this);
        interactions = new FakeInteractions(this, chat);
        getServer().getPluginManager().registerEvents(interactions, this);
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
        instance = null;
    }

    public FakePlayerManager manager() { return manager; }

    public NamePool names() { return names; }

    /** Recharge config.yml sans perdre les faux joueurs connectés. */
    public void reload() {
        reloadConfig();
        names = new NamePool(getConfig().getStringList("names"), new Random());
        loadSchedule();
        if (interactions != null) interactions.reloadRules();
    }

    Schedule schedule() { return schedule; }

    LocalDateTime now() { return LocalDateTime.now(zone); }

    /** Cible actuelle du mode ambiance (faux joueurs « auto » uniquement). */
    int ambientTarget() {
        ConfigurationSection auto = getConfig().getConfigurationSection("auto");
        int min = auto == null ? 0 : Math.max(0, auto.getInt("min", 3));
        int max = auto == null ? 0 : Math.max(min, auto.getInt("max", 10));
        if (schedule != null) return schedule.target(now(), min, max, hardCap());
        if (driftTarget < 0) driftTarget = min;
        return Math.max(min, Math.min(max, driftTarget));
    }

    /** Plafond absolu du mode ambiance (la variation aléatoire peut dépasser auto.max). */
    int hardCap() {
        int max = Math.max(0, getConfig().getInt("auto.max", 10));
        return Math.max(max, getConfig().getInt("auto.hard-cap", (int) Math.round(max * 1.25)));
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
        chat.tick();
    }

    /**
     * Mode ambiance. Chaque faux joueur « auto » a une durée de session ; quand elle est écoulée il part et un autre
     * le remplace. Arrivées et départs sont espacés d'un délai aléatoire (raccourci si l'écart à la cible est grand),
     * jamais plus d'une arrivée et d'un départ par seconde.
     */
    private void ambient() {
        while (!pendingArrivals.isEmpty() && pendingArrivals.peek() <= seconds) {
            pendingArrivals.poll();
            FakePlayer fake = spawnRandom(false, false);
            if (fake != null) chat.onFakeJoined(fake);
        }
        ConfigurationSection auto = getConfig().getConfigurationSection("auto");
        if (auto == null) return;
        ThreadLocalRandom r = ThreadLocalRandom.current();
        List<FakePlayer> autos = manager.all().stream().filter(f -> f.auto() && !f.leaving()).toList();
        if (!auto.getBoolean("enabled", false)) {
            // Mode coupé : les faux joueurs « auto » s'en vont petit à petit.
            if (!autos.isEmpty() && seconds >= nextLeaveAt) {
                depart(autos.get(r.nextInt(autos.size())));
                nextLeaveAt = seconds + delay(auto, "leave-delay-seconds", autos.size());
            }
            return;
        }
        if (schedule == null && seconds % Math.max(5, auto.getLong("interval-seconds", 60)) == 0) {
            int min = auto.getInt("min", 3), max = Math.max(min, auto.getInt("max", 10));
            if (driftTarget < 0) driftTarget = min;
            if (r.nextDouble() < auto.getDouble("join-chance", 0.5)) driftTarget = Math.min(max, driftTarget + 1);
            else if (r.nextDouble() < auto.getDouble("leave-chance", 0.3)) driftTarget = Math.max(min, driftTarget - 1);
        }

        long now = System.currentTimeMillis();
        for (FakePlayer f : autos) { // fin de session : au plus un départ par seconde
            if (f.leaveAt() > 0 && now >= f.leaveAt()) { depart(f); break; }
        }
        int target = ambientTarget(), count = autos.size();
        if (count < target && seconds >= nextJoinAt) {
            FakePlayer fake = spawnRandom(true, false);
            if (fake != null) {
                fake.leaveAt(now + sessionMillis(auto));
                chat.onFakeJoined(fake);
            }
            nextJoinAt = seconds + delay(auto, "join-delay-seconds", target - count);
        } else if (count > target && seconds >= nextLeaveAt) {
            depart(autos.get(r.nextInt(autos.size())));
            nextLeaveAt = seconds + delay(auto, "leave-delay-seconds", count - target);
        }
    }

    /** Délai aléatoire avant la prochaine arrivée/le prochain départ, divisé (jusqu'à 6×) quand l'écart est grand. */
    private static long delay(ConfigurationSection auto, String path, int gap) {
        long min = Math.max(1, auto.getLong(path + ".min", 4));
        long max = Math.max(min, auto.getLong(path + ".max", 45));
        long base = min + ThreadLocalRandom.current().nextLong(max - min + 1);
        int divisor = Math.max(1, Math.min(6, gap / 10));
        return Math.max(1, base / divisor);
    }

    /** Durée de session : beaucoup de sessions courtes, quelques longues (moyenne ≈ min + (max - min) / 3). */
    private static long sessionMillis(ConfigurationSection auto) {
        double min = Math.max(1, auto.getDouble("session-minutes.min", 10));
        double max = Math.max(min, auto.getDouble("session-minutes.max", 180));
        double u = ThreadLocalRandom.current().nextDouble();
        return (long) ((min + (max - min) * u * u) * 60_000);
    }

    AmbientChat chat() { return chat; }

    /** Départ d'un faux joueur, précédé parfois d'un « a+ » quelques secondes avant. */
    void depart(FakePlayer fake) {
        if (fake.leaving()) return;
        fake.leaving(true);
        manager.refreshSnapshot();
        long ticks = chat.onFakeLeaving(fake);
        if (ticks <= 0) {
            manager.remove(fake.name(), false);
        } else {
            Bukkit.getScheduler().runTaskLater(this, () -> {
                if (manager.get(fake.name()) == fake) manager.remove(fake.name(), false);
            }, ticks);
        }
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
        if (!getConfig().getBoolean("server-list.include-fakes", false)) return;
        int maxPlayers = getConfig().getInt("server-list.max-players", 0);
        if (maxPlayers > 0) event.setMaxPlayers(maxPlayers);
        if (manager.count() == 0) return;
        event.setNumPlayers(event.getNumPlayers() + manager.count());
        int sample = getConfig().getInt("server-list.sample-size", 12);
        List<FakePlayer> shuffled = new ArrayList<>(manager.all());
        java.util.Collections.shuffle(shuffled); // pas toujours les mêmes pseudos au survol
        for (FakePlayer fake : shuffled) {
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
