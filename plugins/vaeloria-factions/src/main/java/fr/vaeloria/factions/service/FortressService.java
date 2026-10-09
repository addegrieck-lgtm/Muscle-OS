package fr.vaeloria.factions.service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.FortressDef;
import fr.vaeloria.factions.model.Pos;
import fr.vaeloria.factions.rules.FortressRules;
import fr.vaeloria.factions.rules.TotemSchedule;
import fr.vaeloria.factions.storage.Store;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import net.kyori.adventure.bossbar.BossBar;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.title.Title;
import org.bukkit.Bukkit;
import org.bukkit.GameMode;
import org.bukkit.Location;
import org.bukkit.Particle;
import org.bukkit.Sound;
import org.bukkit.World;
import org.bukkit.block.data.BlockData;
import org.bukkit.entity.Player;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * La Forteresse : plusieurs factions prennent d'assaut le Temple-Tour. Inscriptions, puis chaque combattant apparaît
 * seul, au hasard dans la forêt, et doit retrouver son équipe ; les portes s'ouvrent pour l'assaut, puis se referment : qui est dehors est éliminé, ceux de l'intérieur
 * ont un court délai pour gagner le sommet du donjon, ensuite seul le sommet compte. Une mort = éliminé.
 * La dernière faction en vie au sommet gagne ; à la fin du temps, la plus nombreuse au sommet.
 */
public final class FortressService {
    public enum Phase { IDLE, REGISTRATION, PREPARATION, ASSAULT, CLOSED }

    public enum StartResult { OK, DISABLED, NOT_CONFIGURED, ALREADY_RUNNING, NOT_ENOUGH_PLAYERS }

    private final VaeloriaFactionsPlugin plugin;
    private final Settings settings;
    private final Store.State state;

    private Phase phase = Phase.IDLE;
    private long endsAt;
    private long closedAt;
    private String eventId;
    private String lastScheduleKey;
    /** Inscrits (pendant les inscriptions), puis participants : joueur → faction. */
    private final Map<UUID, String> registered = new LinkedHashMap<>();
    private final Map<UUID, String> alive = new LinkedHashMap<>();
    private final Set<UUID> eliminated = new HashSet<>();
    private final Map<UUID, String> names = new HashMap<>();
    /** Où renvoyer chaque participant à la fin (ou à son élimination). */
    private final Map<UUID, Location> origins = new HashMap<>();
    /** Joueurs à renvoyer à leur prochaine apparition / connexion. */
    private final Map<UUID, Location> pendingReturn = new HashMap<>();
    /** Faction de chaque participant, éliminé ou non. */
    private final Map<UUID, String> teamOf = new HashMap<>();
    private boolean teleporting;
    private final BossBar bar = BossBar.bossBar(Component.empty(), 1f, BossBar.Color.RED, BossBar.Overlay.NOTCHED_10);

    public FortressService(VaeloriaFactionsPlugin plugin, Settings settings, Store.State state) {
        this.plugin = plugin;
        this.settings = settings;
        this.state = state;
    }

    public Phase phase() { return phase; }
    public FortressDef def() { return state.fortress; }
    public long remaining() { return Math.max(0, endsAt - System.currentTimeMillis()); }
    public boolean running() { return phase != Phase.IDLE && phase != Phase.REGISTRATION; }
    public boolean isTeleporting() { return teleporting; }
    public Map<UUID, String> registered() { return registered; }

    public boolean isAlive(UUID id) { return running() && alive.containsKey(id); }

    /** Le participant est engagé : téléportations par commande et élytres interdites. */
    public boolean isLocked(Player p) { return isAlive(p.getUniqueId()); }

    /** Pas de perte de power pour une mort dans la Forteresse (sauf réglage contraire). */
    public boolean noPowerLoss(UUID id) {
        return !settings.fortressPowerLoss && running() && (alive.containsKey(id) || eliminated.contains(id));
    }

    /**
     * PvP entre deux participants : null = ne concerne pas la Forteresse ; TRUE = autorisé (même entre alliés) ;
     * FALSE = même faction.
     */
    public Boolean pvp(Player a, Player v) {
        if (!running() || !alive.containsKey(a.getUniqueId()) || !alive.containsKey(v.getUniqueId())) return null;
        if (phase == Phase.PREPARATION) return Boolean.FALSE;
        return !alive.get(a.getUniqueId()).equals(alive.get(v.getUniqueId())) || settings.friendlyFire;
    }

    public boolean inArena(Location l) {
        FortressDef d = def();
        return d != null && d.arena != null && l.getWorld() != null && l.getWorld().getName().equals(d.world) && d.arena.contains(l);
    }

    private boolean in(FortressDef.Box b, Location l) {
        FortressDef d = def();
        return b != null && d != null && l.getWorld() != null && l.getWorld().getName().equals(d.world) && b.contains(l);
    }

    // ── Mise en place ──

    /** Schéma livré avec le plugin, copié dans plugins/VaeloriaFactions/forteresse/ (utilisable aussi avec WorldEdit). */
    public Path exportSchematic() throws IOException {
        Path dir = plugin.getDataFolder().toPath().resolve("forteresse");
        Files.createDirectories(dir);
        // Une copie que le staff n'a pas modifiée est remplacée par celle du jar à chaque mise à jour du plugin ;
        // un fichier modifié à la main (empreinte différente de la dernière copie livrée) est conservé.
        Path stamp = dir.resolve(".livree");
        java.util.Properties delivered = new java.util.Properties();
        if (Files.exists(stamp)) try (InputStream in = Files.newInputStream(stamp)) { delivered.load(in); }
        boolean changed = false;
        for (String f : List.of("forteresse.schem", "layout.json")) {
            byte[] bundled;
            try (InputStream in = plugin.getResource("forteresse/" + f)) {
                if (in == null) continue;
                bundled = in.readAllBytes();
            }
            Path out = dir.resolve(f);
            String newHash = sha(bundled);
            if (Files.exists(out)) {
                String current = sha(Files.readAllBytes(out));
                if (current.equals(newHash)) continue;
                String last = delivered.getProperty(f);
                if (last != null && !current.equals(last)) continue; // modifié par le staff : on n'y touche pas
            }
            Files.write(out, bundled);
            delivered.setProperty(f, newHash);
            changed = true;
        }
        if (changed) try (var o = Files.newOutputStream(stamp)) { delivered.store(o, "Empreintes des fichiers livrés par VæloriaFactions"); }
        return dir;
    }

    private static String sha(byte[] b) {
        try {
            return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(b));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private InputStream open(String file) throws IOException {
        Path p = exportSchematic().resolve(file);
        return Files.newInputStream(p);
    }

    /** Applique le plan (layout.json) autour de l'origine : là où l'on se tenait pour coller le schéma. */
    public void configureFromLayout(Location origin) throws IOException {
        JsonObject j;
        try (InputStream in = open("layout.json")) {
            j = new Gson().fromJson(new InputStreamReader(in, StandardCharsets.UTF_8), JsonObject.class);
        }
        int ox = origin.getBlockX(), oy = origin.getBlockY(), oz = origin.getBlockZ();
        World w = origin.getWorld();
        FortressDef d = new FortressDef();
        d.world = w.getName();
        d.origin = Pos.of(new Location(w, ox + 0.5, oy, oz + 0.5));
        for (JsonElement e : j.getAsJsonArray("gates")) {
            JsonObject g = e.getAsJsonObject();
            FortressDef.Gate gate = new FortressDef.Gate();
            gate.name = g.get("name").getAsString();
            gate.box = box(g, ox, oy, oz);
            gate.block = g.get("block").getAsString();
            d.gates.add(gate);
        }
        d.summit = box(j.getAsJsonObject("summit"), ox, oy, oz);
        d.area = box(j.getAsJsonObject("fortress"), ox, oy, oz);
        if (j.has("arena")) d.arena = box(j.getAsJsonObject("arena"), ox, oy, oz);
        if (j.has("spawns")) {
            for (JsonElement e : j.getAsJsonArray("spawns")) {
                JsonObject c = e.getAsJsonObject();
                int x = c.get("x").getAsInt(), z = c.get("z").getAsInt();
                // Regard tourné vers la tour.
                float yaw = (float) Math.toDegrees(Math.atan2(x, -z));
                d.spawns.add(Pos.of(new Location(w, ox + x + 0.5, oy + c.get("y").getAsInt(), oz + z + 0.5, yaw, 0f)));
            }
        }
        if (j.has("lobby")) {
            JsonObject lb = j.getAsJsonObject("lobby");
            d.lobby = Pos.of(new Location(w, ox + lb.get("x").getAsInt() + 0.5, oy + lb.get("y").getAsInt(), oz + lb.get("z").getAsInt() + 0.5, 0f, 0f));
        }
        state.fortress = d;
        plugin.manager().markDirty();
    }

    private static FortressDef.Box box(JsonObject o, int ox, int oy, int oz) {
        JsonArray a = o.getAsJsonArray("min"), b = o.getAsJsonArray("max");
        return FortressDef.Box.of(ox + a.get(0).getAsInt(), oy + a.get(1).getAsInt(), oz + a.get(2).getAsInt(),
                ox + b.get(0).getAsInt(), oy + b.get(1).getAsInt(), oz + b.get(2).getAsInt());
    }

    /** Construit la forteresse et sa carte à cet endroit, puis la configure. */
    public void build(org.bukkit.command.CommandSender p, Location origin) {
        SchematicPaster.Schematic s;
        try (InputStream in = open("forteresse.schem")) {
            s = SchematicPaster.read(in);
        } catch (IOException | RuntimeException e) {
            p.sendMessage(Msg.prefixed("fortress.build-error", "error", String.valueOf(e.getMessage())));
            return;
        }
        Location o = origin.getBlock().getLocation();
        p.sendMessage(Msg.prefixed("fortress.build-start", "x", o.getBlockX(), "y", o.getBlockY(), "z", o.getBlockZ()));
        SchematicPaster.paste(plugin, s, o, 40_000,
                pct -> {
                    if (p instanceof Player pl) pl.sendActionBar(Msg.get("fortress.build-progress", "percent", pct));
                    else p.sendMessage(Msg.get("fortress.build-progress", "percent", pct));
                },
                placed -> {
                    try {
                        configureFromLayout(o);
                        p.sendMessage(Msg.prefixed("fortress.build-done", "count", placed));
                    } catch (IOException e) {
                        p.sendMessage(Msg.prefixed("fortress.build-error", "error", String.valueOf(e.getMessage())));
                    }
                });
    }

    // ── Portes ──

    public void setGates(boolean open) {
        FortressDef d = def();
        if (d == null) return;
        World w = Bukkit.getWorld(d.world);
        if (w == null) return;
        for (FortressDef.Gate g : d.gates) {
            BlockData closed;
            try {
                closed = Bukkit.createBlockData(g.block);
            } catch (IllegalArgumentException e) {
                closed = Bukkit.createBlockData(org.bukkit.Material.IRON_BARS);
            }
            BlockData air = Bukkit.createBlockData(org.bukkit.Material.AIR);
            for (int x = g.box.x1; x <= g.box.x2; x++)
                for (int y = g.box.y1; y <= g.box.y2; y++)
                    for (int z = g.box.z1; z <= g.box.z2; z++)
                        w.getBlockAt(x, y, z).setBlockData(open ? air : closed, false);
            Location c = new Location(w, (g.box.x1 + g.box.x2) / 2.0 + 0.5, g.box.y1 + 1, (g.box.z1 + g.box.z2) / 2.0 + 0.5);
            w.playSound(c, open ? Sound.BLOCK_IRON_DOOR_OPEN : Sound.BLOCK_ANVIL_LAND, 2f, open ? 0.5f : 0.6f);
            w.spawnParticle(Particle.CLOUD, c, 30, 1.5, 2, 1.5, 0.02);
        }
    }

    // ── Déroulement ──

    public StartResult openRegistration(boolean scheduled) {
        if (!settings.fortressEnabled) return StartResult.DISABLED;
        FortressDef d = def();
        if (d == null || !d.ready() || Bukkit.getWorld(d.world) == null) return StartResult.NOT_CONFIGURED;
        if (phase != Phase.IDLE) return StartResult.ALREADY_RUNNING;
        if (scheduled && Bukkit.getOnlinePlayers().size() < settings.fortressMinOnline) return StartResult.NOT_ENOUGH_PLAYERS;
        reset();
        eventId = "forteresse-" + System.currentTimeMillis();
        phase = Phase.REGISTRATION;
        endsAt = System.currentTimeMillis() + settings.fortressRegistrationMinutes * 60_000L;
        setGates(false);
        Bukkit.broadcast(Msg.prefixed("fortress.registration-open", "time", Msg.duration(endsAt - System.currentTimeMillis()),
                "min", settings.fortressMinPlayers));
        Title t = Title.title(Msg.get("fortress.title"), Msg.get("fortress.registration-subtitle"),
                Title.Times.times(Duration.ofMillis(300), Duration.ofSeconds(4), Duration.ofMillis(600)));
        for (Player p : Bukkit.getOnlinePlayers()) {
            p.showTitle(t);
            p.playSound(p.getLocation(), Sound.EVENT_RAID_HORN, 1f, 1f);
            p.showBossBar(bar);
        }
        plugin.discord().totem("🏰 Forteresse", "Les inscriptions à la **Forteresse** sont ouvertes : `/f war rejoindre` !");
        return StartResult.OK;
    }

    public void join(Player p) {
        if (phase != Phase.REGISTRATION) { Msg.send(p, "fortress.not-registering"); return; }
        Faction f = plugin.manager().factionOf(p);
        if (f == null || f.system) { Msg.send(p, "error.no-faction"); return; }
        if (registered.containsKey(p.getUniqueId())) { Msg.send(p, "fortress.already-registered"); return; }
        if (plugin.combat().inCombat(p)) { Msg.send(p, "fortress.in-combat"); return; }
        long mine = registered.values().stream().filter(f.id::equals).count();
        if (!FortressRules.canRegister((int) mine, settings.fortressMaxPlayers)) {
            Msg.send(p, "fortress.faction-full", "max", settings.fortressMaxPlayers);
            return;
        }
        registered.put(p.getUniqueId(), f.id);
        names.put(p.getUniqueId(), p.getName());
        int n = (int) mine + 1;
        for (Player m : plugin.manager().online(f)) Msg.send(m, "fortress.registered", "player", p.getName(), "count", n);
        p.showBossBar(bar);
    }

    public void leave(Player p) {
        if (phase == Phase.REGISTRATION && registered.remove(p.getUniqueId()) != null) {
            Msg.send(p, "fortress.unregistered");
            return;
        }
        if (isAlive(p.getUniqueId())) {
            eliminate(p.getUniqueId(), "fortress.out-gave-up", true);
            return;
        }
        Msg.send(p, "fortress.not-registered");
    }

    /** Un point d'apparition par combattant : ceux du plan, sinon des endroits au hasard dans la carte. */
    private List<Location> spawnSpots(int count) {
        FortressDef d = def();
        List<Location> out = new ArrayList<>();
        List<Location> pts = new ArrayList<>();
        for (Pos p : d.spawns) {
            Location l = p.toLocation();
            if (l != null) pts.add(l);
        }
        if (pts.isEmpty()) pts = randomGround(Math.max(count * 3, 30));
        List<int[]> xz = new ArrayList<>();
        for (Location l : pts) xz.add(new int[]{l.getBlockX(), l.getBlockZ()});
        for (int i : FortressRules.pickSpawns(count, xz, 12, java.util.concurrent.ThreadLocalRandom.current())) out.add(pts.get(i));
        return out;
    }

    /** Endroits au sol (sous les arbres) dans la carte, hors de l'enceinte. */
    private List<Location> randomGround(int n) {
        FortressDef d = def();
        List<Location> l = new ArrayList<>();
        World w = Bukkit.getWorld(d.world);
        if (w == null || d.arena == null) return l;
        var r = java.util.concurrent.ThreadLocalRandom.current();
        for (int t = 0; t < n * 20 && l.size() < n; t++) {
            int x = r.nextInt(d.arena.x1 + 2, d.arena.x2 - 1), z = r.nextInt(d.arena.z1 + 2, d.arena.z2 - 1);
            int y = w.getHighestBlockYAt(x, z, org.bukkit.HeightMap.MOTION_BLOCKING_NO_LEAVES);
            Location at = new Location(w, x + 0.5, y + 1, z + 0.5);
            if (y + 1 > d.arena.y2 || d.area.contains(at) || !w.getBlockAt(x, y, z).getType().isSolid()) continue;
            if (!w.getBlockAt(x, y + 1, z).isPassable() || !w.getBlockAt(x, y + 2, z).isPassable()) continue;
            l.add(at);
        }
        return l;
    }

    /** Fin des inscriptions : chaque combattant apparaît seul, au hasard dans la forêt. */
    private void startBattle() {
        registered.keySet().removeIf(id -> Bukkit.getPlayer(id) == null);
        Map<String, Integer> counts = FortressRules.aliveByFaction(registered.values());
        List<String> teams = FortressRules.eligible(counts, settings.fortressMinPlayers);
        for (var e : new ArrayList<>(registered.entrySet())) {
            if (!teams.contains(e.getValue())) {
                Player p = Bukkit.getPlayer(e.getKey());
                if (p != null) Msg.send(p, "fortress.faction-too-small", "min", settings.fortressMinPlayers);
                registered.remove(e.getKey());
            }
        }
        if (teams.size() < settings.fortressMinFactions) {
            Bukkit.broadcast(Msg.prefixed("fortress.cancelled", "min", settings.fortressMinFactions));
            stopQuietly();
            return;
        }
        FortressDef d = def();
        List<UUID> fighters = new ArrayList<>(registered.keySet());
        java.util.Collections.shuffle(fighters);
        List<Location> spots = spawnSpots(fighters.size());
        teleporting = true;
        try {
            for (int i = 0; i < fighters.size(); i++) {
                UUID id = fighters.get(i);
                Player p = Bukkit.getPlayer(id);
                Location to = i < spots.size() ? spots.get(i) : null;
                if (p == null || to == null) continue;
                String fid = registered.get(id);
                origins.put(id, p.getLocation());
                alive.put(id, fid);
                teamOf.put(id, fid);
                plugin.territory().setFly(p, false);
                p.teleport(to);
                p.setFallDistance(0);
            }
        } finally {
            teleporting = false;
        }
        Title lost = Title.title(Msg.get("fortress.lost-title"), Msg.get("fortress.lost-subtitle", "seconds", settings.fortressPreparationSeconds),
                Title.Times.times(Duration.ofMillis(300), Duration.ofSeconds(4), Duration.ofMillis(700)));
        for (UUID id : alive.keySet()) {
            Player p = Bukkit.getPlayer(id);
            if (p != null) {
                p.showTitle(lost);
                p.playSound(p.getLocation(), Sound.AMBIENT_CAVE, 1f, 1f);
            }
        }
        registered.clear();
        phase = Phase.PREPARATION;
        endsAt = System.currentTimeMillis() + settings.fortressPreparationSeconds * 1000L;
        List<String> teamNames = new ArrayList<>();
        for (String id : teams) {
            Faction f = plugin.manager().byId(id);
            if (f != null) teamNames.add(f.name);
        }
        Bukkit.broadcast(Msg.prefixed("fortress.battle-start", "teams", String.join(", ", teamNames), "count", alive.size(),
                "seconds", settings.fortressPreparationSeconds));
        plugin.bridge().eventStart(eventId, "Forteresse de VÆLORIA", "siege", "Forteresse");
        plugin.discord().totem("🏰 Forteresse", "La bataille commence : " + String.join(", ", teamNames) + " (" + alive.size() + " combattants).");
    }

    public void tick() {
        long now = System.currentTimeMillis();
        switch (phase) {
            case IDLE -> scheduleTick();
            case REGISTRATION -> {
                if (now >= endsAt) startBattle();
            }
            case PREPARATION -> {
                dropOffline();
                long left = endsAt - now;
                if (left <= 5000 && left > 0) {
                    Title t = Title.title(Msg.get("fortress.countdown", "seconds", (left + 999) / 1000), Component.empty(),
                            Title.Times.times(Duration.ZERO, Duration.ofMillis(1100), Duration.ZERO));
                    for (UUID id : alive.keySet()) {
                        Player p = Bukkit.getPlayer(id);
                        if (p != null) {
                            p.showTitle(t);
                            p.playSound(p.getLocation(), Sound.BLOCK_NOTE_BLOCK_HAT, 1f, 1f);
                        }
                    }
                }
                if (now >= endsAt) openAssault();
                else checkWin();
            }
            case ASSAULT -> {
                dropOffline();
                if (now >= endsAt) closeGates();
                else checkWin();
            }
            case CLOSED -> {
                dropOffline();
                long grace = FortressRules.graceLeft(closedAt, settings.fortressSummitGraceSeconds * 1000L, now);
                for (UUID id : new ArrayList<>(alive.keySet())) {
                    Player p = Bukkit.getPlayer(id);
                    if (p == null || p.isDead()) continue;
                    if (!in(def().area, p.getLocation())) {
                        eliminate(id, "fortress.out-left", true);
                    } else if (!in(def().summit, p.getLocation())) {
                        if (grace <= 0) eliminate(id, "fortress.out-summit", true);
                        else p.sendActionBar(Msg.get("fortress.reach-summit", "seconds", (grace + 999) / 1000));
                    }
                }
                if (phase == Phase.CLOSED) {
                    if (now >= endsAt) timeout();
                    else checkWin();
                }
            }
        }
        if (phase != Phase.IDLE) {
            expelIntruders();
            refreshBar(now);
        }
    }

    private void scheduleTick() {
        if (settings.fortressSchedule.isEmpty()) return;
        ZonedDateTime now = ZonedDateTime.now(settings.zone);
        String k = now.getDayOfYear() + ":" + now.getHour() + ":" + now.getMinute();
        if (k.equals(lastScheduleKey)) return;
        lastScheduleKey = k;
        for (TotemSchedule.Entry e : settings.fortressSchedule) {
            if (!e.matches(now)) continue;
            StartResult r = openRegistration(true);
            if (r != StartResult.OK) plugin.getLogger().warning("Forteresse programmée non lancée : " + r);
            break;
        }
    }

    private void openAssault() {
        phase = Phase.ASSAULT;
        endsAt = System.currentTimeMillis() + settings.fortressAssaultMinutes * 60_000L;
        setGates(true);
        Title t = Title.title(Msg.get("fortress.gates-open-title"), Msg.get("fortress.gates-open-subtitle"),
                Title.Times.times(Duration.ofMillis(200), Duration.ofSeconds(3), Duration.ofMillis(500)));
        for (UUID id : alive.keySet()) {
            Player p = Bukkit.getPlayer(id);
            if (p != null) {
                p.showTitle(t);
                p.playSound(p.getLocation(), Sound.EVENT_RAID_HORN, 1f, 1.2f);
            }
        }
        Bukkit.broadcast(Msg.prefixed("fortress.gates-open", "time", Msg.duration(endsAt - System.currentTimeMillis())));
    }

    private void closeGates() {
        phase = Phase.CLOSED;
        closedAt = System.currentTimeMillis();
        endsAt = closedAt + settings.fortressBattleMinutes * 60_000L;
        setGates(false);
        Bukkit.broadcast(Msg.prefixed("fortress.gates-closed", "seconds", settings.fortressSummitGraceSeconds));
        Title t = Title.title(Msg.get("fortress.gates-closed-title"), Msg.get("fortress.gates-closed-subtitle",
                "seconds", settings.fortressSummitGraceSeconds), Title.Times.times(Duration.ofMillis(200), Duration.ofSeconds(3), Duration.ofMillis(500)));
        for (UUID id : new ArrayList<>(alive.keySet())) {
            Player p = Bukkit.getPlayer(id);
            if (p == null) continue;
            p.showTitle(t);
            p.playSound(p.getLocation(), Sound.BLOCK_BELL_USE, 1f, 0.6f);
            if (!p.isDead() && !in(def().area, p.getLocation())) eliminate(id, "fortress.out-outside", true);
        }
        checkWin();
    }

    private void dropOffline() {
        for (UUID id : new ArrayList<>(alive.keySet())) {
            if (Bukkit.getPlayer(id) == null) eliminate(id, "fortress.out-quit", false);
        }
    }

    /** Les non-participants trouvés dans l'enceinte pendant la bataille sont renvoyés dehors. */
    private void expelIntruders() {
        if (!running()) return;
        FortressDef d = def();
        for (Player p : Bukkit.getOnlinePlayers()) {
            if (alive.containsKey(p.getUniqueId()) || p.getGameMode() == GameMode.SPECTATOR || p.getGameMode() == GameMode.CREATIVE) continue;
            if (!in(d.area, p.getLocation())) continue;
            Location to = d.lobby != null ? d.lobby.toLocation() : null;
            if (to == null) to = p.getWorld().getSpawnLocation();
            safeTeleport(p, to);
            Msg.send(p, "fortress.intruder");
        }
    }

    public void eliminate(UUID id, String reasonKey, boolean sendHome) {
        String fid = alive.remove(id);
        if (fid == null) return;
        eliminated.add(id);
        Player p = Bukkit.getPlayer(id);
        Faction f = plugin.manager().byId(fid);
        String name = names.getOrDefault(id, p == null ? "?" : p.getName());
        int teams = (int) FortressRules.aliveByFaction(alive.values()).values().stream().filter(v -> v > 0).count();
        broadcastToEvent(Msg.prefixed(reasonKey, "player", name, "faction", f == null ? "?" : f.name, "teams", teams));
        Location home = origins.get(id);
        if (p != null) {
            p.hideBossBar(bar);
            if (sendHome && !p.isDead()) {
                safeTeleport(p, home != null ? home : p.getWorld().getSpawnLocation());
            } else if (home != null) {
                pendingReturn.put(id, home);
            }
        } else if (home != null) {
            pendingReturn.put(id, home);
        }
    }

    private void broadcastToEvent(Component c) {
        Set<UUID> to = new HashSet<>(alive.keySet());
        to.addAll(eliminated);
        for (UUID id : to) {
            Player p = Bukkit.getPlayer(id);
            if (p != null) p.sendMessage(c);
        }
    }

    private void checkWin() {
        if (!running()) return;
        Map<String, Integer> m = FortressRules.aliveByFaction(alive.values());
        switch (FortressRules.check(m)) {
            case WINNER -> finish(FortressRules.lastStanding(m), "last");
            case NOBODY -> finish(null, "nobody");
            default -> { }
        }
    }

    private void timeout() {
        Map<String, Integer> onSummit = new HashMap<>();
        for (var e : alive.entrySet()) {
            Player p = Bukkit.getPlayer(e.getKey());
            if (p != null && !p.isDead() && in(def().summit, p.getLocation())) onSummit.merge(e.getValue(), 1, Integer::sum);
        }
        finish(FortressRules.summitLeader(onSummit), "timeout");
    }

    private void finish(String factionId, String reason) {
        Faction f = plugin.manager().byId(factionId);
        Map<UUID, String> everyone = new LinkedHashMap<>();
        for (UUID id : alive.keySet()) everyone.put(id, names.getOrDefault(id, "?"));
        for (UUID id : eliminated) everyone.put(id, names.getOrDefault(id, "?"));
        if (f != null) {
            List<String> rewards = new ArrayList<>();
            if (settings.fortressRewardMoney > 0) {
                f.bank += settings.fortressRewardMoney;
                rewards.add(plugin.bank().format(settings.fortressRewardMoney) + " en banque");
            }
            f.fortressWins++;
            plugin.manager().markDirty();
            List<String> champions = new ArrayList<>();
            for (var e : alive.entrySet()) if (e.getValue().equals(f.id)) champions.add(names.getOrDefault(e.getKey(), "?"));
            for (var e : everyone.entrySet()) {
                if (!f.id.equals(teamOf.get(e.getKey()))) continue;
                for (String cmd : settings.fortressRewardCommands) {
                    String c = cmd.replace("{player}", e.getValue()).replace("{faction}", f.name);
                    Bukkit.dispatchCommand(Bukkit.getConsoleSender(), c.startsWith("/") ? c.substring(1) : c);
                }
            }
            Bukkit.broadcast(Msg.prefixed("timeout".equals(reason) ? "fortress.won-timeout" : "fortress.won",
                    "faction", f.name, "players", String.join(", ", champions)));
            Title t = Title.title(Msg.get("fortress.win-title"), Msg.get("fortress.win-subtitle", "faction", f.name),
                    Title.Times.times(Duration.ofMillis(300), Duration.ofSeconds(5), Duration.ofMillis(800)));
            for (Player o : Bukkit.getOnlinePlayers()) o.showTitle(t);
            for (Player m : plugin.manager().online(f)) {
                m.playSound(m.getLocation(), Sound.UI_TOAST_CHALLENGE_COMPLETE, 1f, 1f);
                if (!rewards.isEmpty()) Msg.send(m, "fortress.reward", "rewards", String.join(", ", rewards));
            }
            plugin.logs().add(f, "FORTERESSE", String.join(", ", champions), "a remporté la Forteresse");
            plugin.discord().totem("🏰 Forteresse", "**" + f.name + "** tient le sommet de la Forteresse ! (" + String.join(", ", champions) + ")");
        } else {
            Bukkit.broadcast(Msg.prefixed(switch (reason) {
                case "timeout" -> "fortress.draw";
                case "stopped" -> "fortress.stopped";
                default -> "fortress.nobody";
            }));
        }
        if (eventId != null && !everyone.isEmpty()) plugin.bridge().eventEnd(eventId, everyone);
        // Les survivants ont quelques secondes pour ramasser le butin, puis tout le monde rentre.
        Map<UUID, Location> back = new HashMap<>();
        for (UUID id : alive.keySet()) if (origins.containsKey(id)) back.put(id, origins.get(id));
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            for (var e : back.entrySet()) {
                Player p = Bukkit.getPlayer(e.getKey());
                if (p == null) pendingReturn.put(e.getKey(), e.getValue());
                else if (!p.isDead()) safeTeleport(p, e.getValue());
                else pendingReturn.put(e.getKey(), e.getValue());
            }
        }, "stopped".equals(reason) ? 1L : 15 * 20L);
        stopQuietly();
    }

    /** Arrêt par le staff : sans vainqueur, tout le monde rentre. */
    public void stop() {
        if (phase == Phase.IDLE) return;
        if (phase == Phase.REGISTRATION) {
            Bukkit.broadcast(Msg.prefixed("fortress.stopped"));
            stopQuietly();
            return;
        }
        finish(null, "stopped");
    }

    private void stopQuietly() {
        for (Player p : Bukkit.getOnlinePlayers()) p.hideBossBar(bar);
        setGates(false);
        phase = Phase.IDLE;
        registered.clear();
        alive.clear();
        // teamOf, eliminated / origins restent jusqu'au prochain lancement : reset() les vide.
    }

    private void reset() {
        registered.clear();
        alive.clear();
        eliminated.clear();
        names.clear();
        origins.clear();
        teamOf.clear();
    }

    private void refreshBar(long now) {
        int teams = (int) FortressRules.aliveByFaction(alive.values()).values().stream().filter(v -> v > 0).count();
        Component name = switch (phase) {
            case REGISTRATION -> Msg.get("fortress.bar-registration", "count", registered.size(), "time", Msg.duration(endsAt - now));
            case PREPARATION -> Msg.get("fortress.bar-preparation", "time", Msg.duration(endsAt - now), "teams", teams);
            case ASSAULT -> Msg.get("fortress.bar-assault", "time", Msg.duration(endsAt - now), "teams", teams, "count", alive.size());
            case CLOSED -> Msg.get("fortress.bar-closed", "time", Msg.duration(endsAt - now), "teams", teams, "count", alive.size());
            default -> Component.empty();
        };
        long total = switch (phase) {
            case REGISTRATION -> settings.fortressRegistrationMinutes * 60_000L;
            case PREPARATION -> settings.fortressPreparationSeconds * 1000L;
            case ASSAULT -> settings.fortressAssaultMinutes * 60_000L;
            case CLOSED -> settings.fortressBattleMinutes * 60_000L;
            default -> 1;
        };
        bar.name(name);
        bar.color(phase == Phase.CLOSED ? BossBar.Color.RED : phase == Phase.ASSAULT ? BossBar.Color.YELLOW : BossBar.Color.WHITE);
        bar.progress(Math.max(0f, Math.min(1f, (endsAt - now) / (float) total)));
    }

    // ── Joueurs ──

    private void safeTeleport(Player p, Location to) {
        teleporting = true;
        try {
            p.teleport(to);
            p.setFallDistance(0);
        } finally {
            teleporting = false;
        }
    }

    public void onDeath(Player p) {
        if (!isAlive(p.getUniqueId())) return;
        eliminate(p.getUniqueId(), "fortress.out-dead", false);
    }

    /** Lieu de réapparition d'un participant éliminé (null = normal). */
    public Location respawnFor(Player p) {
        return pendingReturn.remove(p.getUniqueId());
    }

    public void onJoin(Player p) {
        Location back = pendingReturn.remove(p.getUniqueId());
        if (back != null) Bukkit.getScheduler().runTask(plugin, () -> safeTeleport(p, back));
        if (phase == Phase.REGISTRATION || alive.containsKey(p.getUniqueId())) p.showBossBar(bar);
    }

    public void onQuit(Player p) {
        if (phase == Phase.REGISTRATION) registered.remove(p.getUniqueId());
        if (isAlive(p.getUniqueId())) eliminate(p.getUniqueId(), "fortress.out-quit", false);
    }

    public void shutdown() {
        if (phase == Phase.IDLE) return;
        // Arrêt du serveur : on rend chacun à sa position d'origine tout de suite.
        for (var e : origins.entrySet()) {
            Player p = Bukkit.getPlayer(e.getKey());
            if (p != null && alive.containsKey(e.getKey())) safeTeleport(p, e.getValue());
        }
        Bukkit.broadcast(Msg.prefixed("fortress.stopped"));
        stopQuietly();
    }

    // ── Affichage ──

    public void status(org.bukkit.command.CommandSender s) {
        FortressDef d = def();
        if (d == null || !d.ready()) {
            Msg.send(s, "fortress.status-unset");
            return;
        }
        switch (phase) {
            case IDLE -> Msg.send(s, "fortress.status-idle", "schedule", scheduleText());
            case REGISTRATION -> {
                Map<String, Integer> c = FortressRules.aliveByFaction(registered.values());
                Msg.send(s, "fortress.status-registration", "time", Msg.duration(remaining()), "teams", teamsText(c));
            }
            default -> Msg.send(s, "fortress.status-running", "phase", Msg.raw("fortress.phase." + phase.name().toLowerCase(java.util.Locale.ROOT)),
                    "time", Msg.duration(remaining()), "teams", teamsText(FortressRules.aliveByFaction(alive.values())));
        }
    }

    private String teamsText(Map<String, Integer> counts) {
        if (counts.isEmpty()) return "aucune";
        List<String> l = new ArrayList<>();
        for (var e : counts.entrySet()) {
            Faction f = plugin.manager().byId(e.getKey());
            l.add((f == null ? "?" : f.name) + " (" + e.getValue() + ")");
        }
        return String.join(", ", l);
    }

    public String scheduleText() {
        List<String> raw = plugin.getConfig().getStringList("fortress.schedule");
        return raw.isEmpty() ? "lancement par le staff" : String.join(", ", raw);
    }

    /** Montre au staff les portes, le sommet et l'enceinte pendant quelques secondes. */
    public void showZones(Player p) {
        FortressDef d = def();
        if (d == null) return;
        World w = Bukkit.getWorld(d.world);
        if (w == null) return;
        new org.bukkit.scheduler.BukkitRunnable() {
            int n = 0;

            @Override
            public void run() {
                if (++n > 10 || !p.isOnline()) { cancel(); return; }
                outline(p, w, d.summit, Particle.HAPPY_VILLAGER);
                outline(p, w, d.area, Particle.FLAME);
                for (FortressDef.Gate g : d.gates) outline(p, w, g.box, Particle.END_ROD);
                for (Pos c : d.spawns) {
                    Location l = c.toLocation();
                    if (l != null && l.getWorld() == p.getWorld() && l.distanceSquared(p.getLocation()) < 80 * 80)
                        p.spawnParticle(Particle.TOTEM_OF_UNDYING, l.clone().add(0, 1, 0), 6, 0.3, 0.6, 0.3, 0);
                }
            }
        }.runTaskTimer(plugin, 0L, 20L);
    }

    private static void outline(Player p, World w, FortressDef.Box b, Particle part) {
        if (b == null) return;
        double step = Math.max(1, (b.x2 - b.x1 + b.z2 - b.z1) / 60.0);
        for (double x = b.x1; x <= b.x2 + 1; x += step) {
            for (int y : new int[]{b.y1, Math.min(b.y2 + 1, b.y1 + 3)}) {
                p.spawnParticle(part, new Location(w, x, y, b.z1), 1, 0, 0, 0, 0);
                p.spawnParticle(part, new Location(w, x, y, b.z2 + 1), 1, 0, 0, 0, 0);
            }
        }
        for (double z = b.z1; z <= b.z2 + 1; z += step) {
            for (int y : new int[]{b.y1, Math.min(b.y2 + 1, b.y1 + 3)}) {
                p.spawnParticle(part, new Location(w, b.x1, y, z), 1, 0, 0, 0, 0);
                p.spawnParticle(part, new Location(w, b.x2 + 1, y, z), 1, 0, 0, 0, 0);
            }
        }
    }
}
