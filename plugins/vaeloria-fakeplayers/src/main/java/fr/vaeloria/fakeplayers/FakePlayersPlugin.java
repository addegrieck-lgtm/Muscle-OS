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
import java.util.List;
import java.util.Random;
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

    @Override
    public void onEnable() {
        saveDefaultConfig();
        names = new NamePool(getConfig().getStringList("names"), new Random());

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
    }

    // --- Boucle : ambiance (arrivées/départs), chat automatique, corps, ping ---

    private void tick() {
        seconds++;
        manager.tick(seconds);
        ambient();
        autoChat();
    }

    private void ambient() {
        ConfigurationSection auto = getConfig().getConfigurationSection("auto");
        if (auto == null || !auto.getBoolean("enabled", false)) return;
        int min = auto.getInt("min", 3), max = Math.max(min, auto.getInt("max", 10));
        List<FakePlayer> autos = manager.all().stream().filter(FakePlayer::auto).toList();
        if (autos.size() < min) { // remplissage progressif : un par seconde
            spawnRandom(true, false);
            return;
        }
        long interval = Math.max(5, auto.getLong("interval-seconds", 60));
        if (seconds % interval != 0) return;
        ThreadLocalRandom r = ThreadLocalRandom.current();
        if (autos.size() < max && r.nextDouble() < auto.getDouble("join-chance", 0.5)) {
            spawnRandom(true, false);
        } else if (autos.size() > min && r.nextDouble() < auto.getDouble("leave-chance", 0.3)) {
            manager.remove(autos.get(r.nextInt(autos.size())).name(), false);
        }
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
