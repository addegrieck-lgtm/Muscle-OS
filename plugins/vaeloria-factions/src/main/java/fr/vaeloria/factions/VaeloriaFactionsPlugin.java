package fr.vaeloria.factions;

import fr.vaeloria.factions.command.FactionCommand;
import fr.vaeloria.factions.gui.Menus;
import fr.vaeloria.factions.listener.ChatListener;
import fr.vaeloria.factions.listener.CombatListener;
import fr.vaeloria.factions.listener.ExplosionListener;
import fr.vaeloria.factions.listener.MenuListener;
import fr.vaeloria.factions.listener.ObsidianListener;
import fr.vaeloria.factions.listener.PlayerListener;
import fr.vaeloria.factions.listener.ProtectionListener;
import fr.vaeloria.factions.model.FPlayer;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.Role;
import fr.vaeloria.factions.rules.PowerMath;
import fr.vaeloria.factions.service.AccessService;
import fr.vaeloria.factions.service.Bank;
import fr.vaeloria.factions.service.Banks;
import fr.vaeloria.factions.service.BridgeHook;
import fr.vaeloria.factions.service.ChestService;
import fr.vaeloria.factions.service.ClaimService;
import fr.vaeloria.factions.service.CombatService;
import fr.vaeloria.factions.service.DiscordService;
import fr.vaeloria.factions.service.LogService;
import fr.vaeloria.factions.service.WarService;
import fr.vaeloria.factions.service.FactionManager;
import fr.vaeloria.factions.service.ObsidianService;
import fr.vaeloria.factions.service.RaidService;
import fr.vaeloria.factions.service.ScoreboardService;
import fr.vaeloria.factions.service.TeleportService;
import fr.vaeloria.factions.service.TerritoryService;
import fr.vaeloria.factions.storage.Store;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import org.bukkit.Bukkit;
import org.bukkit.command.PluginCommand;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;

/**
 * VæloriaFactions — le Faction à l'ancienne (power, surclaim, /f map, TNT) avec les outils d'aujourd'hui
 * (menus, bouclier, alertes de raid, synchronisation avec le site).
 */
public final class VaeloriaFactionsPlugin extends JavaPlugin {
    private static VaeloriaFactionsPlugin instance;

    private final Settings settings = new Settings();
    private Store store;
    private Store.State state;
    private FactionManager manager;
    private BridgeHook bridge;
    private Bank bank = Bank.NONE;
    private RaidService raid;
    private AccessService access;
    private ClaimService claims;
    private ObsidianService obsidian;
    private TeleportService teleports;
    private TerritoryService territory;
    private ScoreboardService scoreboard;
    private ChestService chests;
    private Menus menus;
    private LogService logs;
    private DiscordService discord;
    private CombatService combat;
    private WarService wars;
    private fr.vaeloria.factions.service.TotemService totems;
    private fr.vaeloria.factions.service.ChatPrompt prompts;
    private fr.vaeloria.factions.gui.TotemAdminMenu totemAdmin;
    private final fr.vaeloria.factions.rules.FarmGuard farmGuard = new fr.vaeloria.factions.rules.FarmGuard();
    private final List<BukkitTask> tasks = new ArrayList<>();
    private volatile boolean saving;

    /** API pour les autres plugins du réseau (KOTH, guerres…). */
    public static VaeloriaFactionsPlugin get() { return instance; }

    @Override
    public void onEnable() {
        instance = this;
        saveDefaultConfig();
        settings.load(getConfig());
        Msg.load(this);
        try {
            store = new Store(getDataFolder().toPath().resolve("data"));
            state = store.loadState();
            manager = new FactionManager(settings);
            manager.load(store.loadFactions(), store.loadPlayers(), store.loadClaims());
        } catch (IOException | RuntimeException e) {
            // Données illisibles : on refuse de démarrer plutôt que d'écraser les factions par des fichiers vides.
            getLogger().log(Level.SEVERE, "Lecture des données impossible : plugin désactivé pour protéger les sauvegardes", e);
            store = null;
            getServer().getPluginManager().disablePlugin(this);
            return;
        }
        bridge = new BridgeHook(getLogger());
        logs = new LogService(settings, manager);
        discord = new DiscordService(settings, getLogger());
        combat = new CombatService(settings);
        wars = new WarService(settings, manager, state, bridge, discord, logs);
        totems = new fr.vaeloria.factions.service.TotemService(this, settings, state);
        totems.purgeOrphans();
        prompts = new fr.vaeloria.factions.service.ChatPrompt(this);
        totemAdmin = new fr.vaeloria.factions.gui.TotemAdminMenu(this);
        for (String bad : settings.totemScheduleErrors) getLogger().warning("totem.schedule : entrée illisible « " + bad + " »");
        bank = Banks.detect();
        raid = new RaidService(settings, manager, state);
        access = new AccessService(settings, manager, raid);
        claims = new ClaimService(settings, manager, raid, bridge);
        obsidian = new ObsidianService(this, settings, state);
        teleports = new TeleportService(this, settings);
        territory = new TerritoryService(this, settings, manager, raid);
        scoreboard = new ScoreboardService(settings, manager, raid);
        chests = new ChestService(settings, getLogger());
        menus = new Menus(this);
        obsidian.registerRecipe();
        purgeInactive();

        var pm = getServer().getPluginManager();
        pm.registerEvents(new ProtectionListener(this), this);
        pm.registerEvents(new ExplosionListener(this), this);
        pm.registerEvents(new ObsidianListener(this), this);
        pm.registerEvents(new CombatListener(this), this);
        pm.registerEvents(new PlayerListener(this), this);
        pm.registerEvents(new ChatListener(this), this);
        pm.registerEvents(new MenuListener(this), this);
        pm.registerEvents(new fr.vaeloria.factions.listener.TotemListener(this), this);
        pm.registerEvents(prompts, this);

        FactionCommand cmd = new FactionCommand(this);
        PluginCommand f = getCommand("f");
        if (f != null) {
            f.setExecutor(cmd);
            f.setTabCompleter(cmd);
        }
        startTasks();
        for (Player p : Bukkit.getOnlinePlayers()) {
            manager.fplayer(p);
            scoreboard.show(p);
        }
        getLogger().info("VæloriaFactions actif : " + manager.playerFactions().size() + " factions, "
                + (bank.available() ? "banque Vault" : "sans banque") + (bridge.active() ? ", synchronisé avec le site" : ""));
    }

    private void startTasks() {
        tasks.forEach(BukkitTask::cancel);
        tasks.clear();
        var sch = Bukkit.getScheduler();
        tasks.add(sch.runTaskTimer(this, this::regenPower, 1200L, 1200L));
        tasks.add(sch.runTaskTimer(this, () -> {
            raid.tick();
            territory.tickFly();
            combat.tick();
            wars.tick();
            totems.tick();
            purgeInvites();
        }, 20L, 20L));
        tasks.add(sch.runTaskTimer(this, scoreboard::updateAll, 40L, settings.scoreboardRefreshTicks));
        tasks.add(sch.runTaskTimer(this, () -> totems.tickDigs(), 1L, 1L));
        long autosave = settings.autosaveMinutes * 1200L;
        tasks.add(sch.runTaskTimer(this, () -> { if (manager.consumeDirty()) save(true); }, autosave, autosave));
        long snap = settings.snapshotMinutes * 1200L;
        tasks.add(sch.runTaskTimer(this, this::snapshots, 200L, snap));
    }

    private void regenPower() {
        double r = settings.regenPerMinute;
        if (r == 0) return;
        if (settings.offlineRegen) {
            for (FPlayer fp : manager.players()) regen(fp, r);
        } else {
            for (Player p : Bukkit.getOnlinePlayers()) regen(manager.fplayer(p), r);
        }
    }

    private void regen(FPlayer fp, double r) {
        double next = PowerMath.round(PowerMath.clamp(fp.power + r, settings.powerMin, settings.powerMax));
        if (next != fp.power) {
            fp.power = next;
            manager.markDirty();
        }
    }

    private void purgeInvites() {
        long now = System.currentTimeMillis();
        farmGuard.purge(now, settings.farmCooldownMinutes * 60_000L);
        for (Faction f : manager.playerFactions()) f.invites.values().removeIf(t -> t < now);
    }

    private void snapshots() {
        if (!bridge.active()) return;
        for (Faction f : manager.playerFactions()) bridge.snapshot(f, manager.power(f), manager.maxPower(f), f.claims.size());
    }

    /** Membres inactifs depuis inactivity.days : retirés ; un chef inactif passe la main ; une faction vide disparaît. */
    private void purgeInactive() {
        if (settings.inactivityDays <= 0) return;
        long limit = System.currentTimeMillis() - settings.inactivityDays * 86_400_000L;
        int removed = 0;
        for (Faction f : manager.playerFactions()) {
            for (UUID u : new ArrayList<>(f.members.keySet())) {
                FPlayer fp = manager.fplayer(u);
                if (fp == null || fp.lastSeen == 0 || fp.lastSeen >= limit) continue;
                boolean wasLeader = f.role(u) == Role.CHEF;
                manager.removeMember(f, u);
                bridge.leave(f, u, manager.nameOf(u));
                removed++;
                if (wasLeader && !f.members.isEmpty()) {
                    UUID heir = f.members.entrySet().stream().max(Map.Entry.comparingByValue()).get().getKey();
                    manager.setRole(f, heir, Role.CHEF);
                    bridge.join(f, heir, manager.nameOf(heir), Role.CHEF);
                }
            }
            if (f.members.isEmpty()) disband(f);
        }
        if (removed > 0) getLogger().info(removed + " membre(s) inactif(s) retiré(s).");
    }

    /** Dissolution complète : claims, coffre, barres de raid, site. */
    public void disband(Faction f) {
        wars.onDisband(f);
        chests.closeAll(f);
        raid.hideBar(f.id);
        for (Player p : manager.online(f)) {
            FPlayer fp = manager.fplayer(p);
            if (fp.flying) territory.setFly(p, false);
            fp.chatMode = FPlayer.ChatMode.PUBLIC;
            fp.autoClaim = false;
        }
        bridge.disband(f);
        manager.disband(f);
    }

    public void reloadAll() {
        reloadConfig();
        settings.load(getConfig());
        Msg.load(this);
        obsidian.registerRecipe();
        for (String bad : settings.totemScheduleErrors) getLogger().warning("totem.schedule : entrée illisible « " + bad + " »");
        scoreboard.clear();
        for (Player p : Bukkit.getOnlinePlayers()) scoreboard.show(p);
        startTasks();
    }

    /** Sérialise sur le thread principal, écrit sur disque en asynchrone (ou tout de suite à l'arrêt). */
    public void save(boolean async) {
        if (store == null) return;
        for (Faction f : manager.all()) chests.encode(f);
        Store.Snapshot snap = store.snapshot(new ArrayList<>(manager.all()), new ArrayList<>(manager.players()), manager.claimSnapshot(), state);
        Runnable write = () -> {
            try {
                snap.write();
            } catch (IOException e) {
                getLogger().log(Level.SEVERE, "Sauvegarde des factions impossible", e);
                manager.markDirty();
            }
        };
        if (async && isEnabled()) Bukkit.getScheduler().runTaskAsynchronously(this, write);
        else write.run();
    }

    @Override
    public void onDisable() {
        tasks.forEach(BukkitTask::cancel);
        if (store == null) return;
        for (Player p : Bukkit.getOnlinePlayers()) {
            FPlayer fp = manager.fplayer(p);
            if (fp.flying) territory.setFly(p, false);
            var holder = p.getOpenInventory().getTopInventory().getHolder(false);
            if (holder instanceof ChestService.Holder || holder instanceof fr.vaeloria.factions.gui.Menu) p.closeInventory();
        }
        raid.hideAll();
        totems.shutdown();
        scoreboard.clear();
        obsidian.unregisterRecipe();
        save(false);
        instance = null;
    }

    public Settings settings() { return settings; }
    public FactionManager manager() { return manager; }
    public BridgeHook bridge() { return bridge; }
    public Bank bank() { return bank; }
    public RaidService raid() { return raid; }
    public AccessService access() { return access; }
    public ClaimService claims() { return claims; }
    public ObsidianService obsidian() { return obsidian; }
    public TeleportService teleports() { return teleports; }
    public TerritoryService territory() { return territory; }
    public ScoreboardService scoreboard() { return scoreboard; }
    public ChestService chests() { return chests; }
    public Menus menus() { return menus; }
    public LogService logs() { return logs; }
    public DiscordService discord() { return discord; }
    public CombatService combat() { return combat; }
    public WarService wars() { return wars; }
    public fr.vaeloria.factions.service.TotemService totems() { return totems; }
    public fr.vaeloria.factions.service.ChatPrompt prompts() { return prompts; }
    public fr.vaeloria.factions.gui.TotemAdminMenu totemAdmin() { return totemAdmin; }

    /** Modifie config.yml depuis un menu : écrit le fichier (commentaires conservés) et applique aussitôt. */
    public void setConfigValue(String path, Object value) {
        getConfig().set(path, value);
        saveConfig();
        settings.load(getConfig());
        for (String bad : settings.totemScheduleErrors) getLogger().warning("totem.schedule : entrée illisible « " + bad + " »");
    }
    public fr.vaeloria.factions.rules.FarmGuard farmGuard() { return farmGuard; }
}
