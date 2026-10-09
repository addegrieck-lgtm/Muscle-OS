package fr.vaeloria.fakeplayers.spawn;

import com.github.retrooper.packetevents.PacketEvents;
import com.github.retrooper.packetevents.event.PacketListenerAbstract;
import com.github.retrooper.packetevents.event.PacketListenerCommon;
import com.github.retrooper.packetevents.event.PacketReceiveEvent;
import com.github.retrooper.packetevents.manager.server.ServerVersion;
import com.github.retrooper.packetevents.protocol.entity.data.EntityData;
import com.github.retrooper.packetevents.protocol.entity.data.EntityDataTypes;
import com.github.retrooper.packetevents.protocol.entity.pose.EntityPose;
import com.github.retrooper.packetevents.protocol.entity.type.EntityTypes;
import com.github.retrooper.packetevents.protocol.packettype.PacketType;
import com.github.retrooper.packetevents.protocol.player.Equipment;
import com.github.retrooper.packetevents.protocol.player.EquipmentSlot;
import com.github.retrooper.packetevents.protocol.world.Location;
import com.github.retrooper.packetevents.util.Vector3d;
import com.github.retrooper.packetevents.wrapper.PacketWrapper;
import com.github.retrooper.packetevents.wrapper.play.client.WrapperPlayClientInteractEntity;
import com.github.retrooper.packetevents.wrapper.play.server.WrapperPlayServerDestroyEntities;
import com.github.retrooper.packetevents.wrapper.play.server.WrapperPlayServerEntityAnimation;
import com.github.retrooper.packetevents.wrapper.play.server.WrapperPlayServerEntityEquipment;
import com.github.retrooper.packetevents.wrapper.play.server.WrapperPlayServerEntityHeadLook;
import com.github.retrooper.packetevents.wrapper.play.server.WrapperPlayServerEntityMetadata;
import com.github.retrooper.packetevents.wrapper.play.server.WrapperPlayServerEntityRelativeMoveAndRotation;
import com.github.retrooper.packetevents.wrapper.play.server.WrapperPlayServerEntityTeleport;
import com.github.retrooper.packetevents.wrapper.play.server.WrapperPlayServerHurtAnimation;
import com.github.retrooper.packetevents.wrapper.play.server.WrapperPlayServerSpawnEntity;
import fr.vaeloria.fakeplayers.FakePlayer;
import fr.vaeloria.fakeplayers.FakePlayersPlugin;
import io.github.retrooper.packetevents.util.SpigotConversionUtil;
import org.bukkit.Bukkit;
import org.bukkit.Sound;
import org.bukkit.World;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.scheduler.BukkitTask;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Faux joueurs visibles au spawn : de vraies entités « joueur » envoyées par paquets (PacketEvents) aux joueurs
 * proches, avec le skin et le pseudo du faux joueur, sur toutes les versions 1.21. Aucune entité n'existe côté
 * serveur : rien n'est sauvegardé dans le monde, et les autres plugins ne les voient pas.
 *
 * <p>Comportement : arrivée au point d'apparition (comme après /spawn) ou par la porte, marche d'un lieu fréquenté
 * à l'autre (place, marché, arène…) en suivant le terrain et en évitant le vide, pauses où ils regardent les joueurs
 * proches, « spam shift », sauts, coups dans le vide ; réaction quand on les frappe ; départ par la porte.
 */
public final class SpawnBots {
    private static final int ID_BASE = 1_900_000_000;
    private static final double VIEW = 48;
    private static final double[] JUMP = {0.42, 0.75, 1.0, 1.17, 1.25, 1.25, 1.17, 1.0, 0.75, 0.42, 0.12, 0};

    private enum State { ARRIVING, WALKING, IDLE, USING, LEAVING }

    private final class Bot {
        final FakePlayer fake;
        final int id;
        final Loadout loadout;
        double x, y, z, speed;
        float yaw, headYaw, pitch;
        State state = State.ARRIVING;
        double tx, tz;
        long until;
        int stuck, sneakToggles, jump = -1, knock, side = 1;
        double knockX, knockZ;
        boolean sneaking;
        long nextGlance, lastHitReact;
        /** AFK : immobile, ne regarde personne, ne répond pas ; pseudos de ceux qui l'ont sollicité entre-temps. */
        long afkUntil;
        final Set<String> pingedWhileAfk = new HashSet<>();
        /** En route vers une zone AFK : il passera AFK en y arrivant. */
        boolean goingAfk;
        /** Bot avec qui il discute (groupe face à face), ou null. */
        Bot buddy;
        /** Poste visé ou utilisé (coffre de l'Ender, enclume…), ou null. */
        Station station;
        /** Ticks restants de l'animation « manger » ; objet tenu en main actuellement. */
        int eating;
        ItemStack held;
        final Set<UUID> viewers = new HashSet<>();

        Bot(FakePlayer fake, int id) {
            this.fake = fake;
            this.id = id;
            this.loadout = Loadout.of(fake.name());
            this.held = loadout.mainHand();
        }

        boolean afk() { return afkUntil > 0; }
    }

    private final FakePlayersPlugin plugin;
    private final Random random = new Random();
    private final Map<String, Bot> bots = new HashMap<>();
    private final Map<Integer, Bot> byId = new ConcurrentHashMap<>();
    private final int skinPartsIndex;
    private SpawnZone zone;
    private World world;
    private Terrain terrain;
    private BukkitTask task;
    private PacketListenerCommon listener;
    private long tick, nextArrival, nextExit;
    /** Postes repérés dans le spawn (coffres de l'Ender, enclumes, tables…), mis à jour toutes les 30 s. */
    private List<Station> stations = List.of();
    private int nextId = ID_BASE;

    public SpawnBots(FakePlayersPlugin plugin) {
        this.plugin = plugin;
        // 1.21.9 a ajouté la classe « Avatar » (mannequins) : l'index des parties de skin a reculé d'un cran.
        this.skinPartsIndex = PacketEvents.getAPI().getServerManager().getVersion().isNewerThanOrEquals(ServerVersion.V_1_21_9) ? 16 : 17;
    }

    // --- Cycle de vie ---

    public void start() {
        reload();
        task = Bukkit.getScheduler().runTaskTimer(plugin, this::tick, 1L, 1L);
        listener = PacketEvents.getAPI().getEventManager().registerListener(new PacketListenerAbstract() {
            @Override
            public void onPacketReceive(PacketReceiveEvent event) {
                if (event.getPacketType() != PacketType.Play.Client.INTERACT_ENTITY) return;
                WrapperPlayClientInteractEntity packet = new WrapperPlayClientInteractEntity(event);
                Bot bot = byId.get(packet.getEntityId());
                if (bot == null) return;
                event.setCancelled(true); // entité inconnue du serveur : rien à transmettre
                if (packet.getAction() != WrapperPlayClientInteractEntity.InteractAction.ATTACK) return;
                Player attacker = event.getPlayer();
                Bukkit.getScheduler().runTask(plugin, () -> hit(bot, attacker));
            }
        });
    }

    public void stop() {
        if (task != null) task.cancel();
        if (listener != null) PacketEvents.getAPI().getEventManager().unregisterListener(listener);
        for (Bot b : new ArrayList<>(bots.values())) despawnAll(b);
        bots.clear();
        byId.clear();
    }

    /** Relit spawn-bots dans config.yml. Les bots présents sont retirés : ils reviendront au nouvel emplacement. */
    public void reload() {
        for (Bot b : new ArrayList<>(bots.values())) remove(b);
        zone = null;
        ConfigurationSection c = plugin.getConfig().getConfigurationSection("spawn-bots");
        if (c == null || !c.getBoolean("enabled", false)) return;
        String worldName = c.getString("world", "");
        world = worldName.isEmpty() ? Bukkit.getWorlds().get(0) : Bukkit.getWorld(worldName);
        if (world == null) {
            plugin.getLogger().warning("spawn-bots : monde « " + worldName + " » introuvable, bots du spawn désactivés.");
            return;
        }
        int rotation = c.getInt("rotation", 0);
        double ax, ay, az;
        if (c.isConfigurationSection("anchor")) {
            ax = c.getDouble("anchor.x");
            ay = c.getDouble("anchor.y");
            az = c.getDouble("anchor.z");
        } else { // auto : point d'apparition du monde = lodestone du schematic
            org.bukkit.Location s = world.getSpawnLocation();
            double[] a = SpawnZone.anchorFromSpawnPoint(s.getX(), s.getY(), s.getZ(), rotation, c.getDouble("spawn-point.z", 62));
            ax = a[0];
            ay = a[1];
            az = a[2];
        }
        List<SpawnZone.Point> points = new ArrayList<>();
        ConfigurationSection ps = c.getConfigurationSection("points");
        if (ps != null) for (String k : ps.getKeys(false)) {
            points.add(new SpawnZone.Point(k, ps.getDouble(k + ".x"), ps.getDouble(k + ".z"), ps.getDouble(k + ".radius", 3),
                    ps.getDouble(k + ".weight", 1)));
        }
        if (points.isEmpty()) {
            plugin.getLogger().warning("spawn-bots.points est vide : bots du spawn désactivés.");
            return;
        }
        SpawnZone.Point arrival = new SpawnZone.Point("apparition", c.getDouble("spawn-point.x", 0), c.getDouble("spawn-point.z", 62),
                c.getDouble("spawn-point.radius", 1.5), 0);
        SpawnZone.Point exit = new SpawnZone.Point("sortie", c.getDouble("exit.x", 0), c.getDouble("exit.z", -58),
                c.getDouble("exit.radius", 2), 0);
        List<SpawnZone.Point> afkPoints = new ArrayList<>();
        ConfigurationSection as = c.getConfigurationSection("afk.points");
        if (as != null) for (String k : as.getKeys(false)) {
            afkPoints.add(new SpawnZone.Point(k, as.getDouble(k + ".x"), as.getDouble(k + ".z"), as.getDouble(k + ".radius", 3),
                    as.getDouble(k + ".weight", 1)));
        }
        zone = new SpawnZone(ax, ay, az, rotation, points, arrival, exit, afkPoints);
        terrain = new BukkitTerrain(world);
        stations = List.of();
    }

    /** Pour /fp spawnzone : ancre, bots, et part des lieux où l'on peut réellement marcher. */
    public List<String> describe() {
        List<String> out = new ArrayList<>();
        if (zone == null) {
            out.add("Bots du spawn désactivés (spawn-bots.enabled, monde ou points invalides).");
            return out;
        }
        double[] a = zone.toWorld(0, 0);
        out.add("Monde " + world.getName() + ", centre de l'arbre (sol) en " + Math.round(a[0]) + " " + Math.round(zone.floorFeet() - 1)
                + " " + Math.round(a[1]) + ", " + bots.size() + " bot(s) au spawn.");
        Random r = new Random(1);
        for (SpawnZone.Point p : zone.points()) {
            int ok = 0;
            for (int i = 0; i < 20; i++) if (!Double.isNaN(ground(zone.randomIn(p, r)))) ok++;
            out.add("  " + p.name() + " : " + ok * 5 + " % praticable" + (ok < 6 ? "  ← à vérifier (chunk non chargé ou repère faux)" : ""));
        }
        for (SpawnZone.Point p : zone.afkPoints()) {
            int ok = 0;
            for (int i = 0; i < 20; i++) if (!Double.isNaN(ground(zone.randomIn(p, r)))) ok++;
            out.add("  zone AFK " + p.name() + " : " + ok * 5 + " % praticable");
        }
        Map<Station.Kind, Integer> kinds = new java.util.EnumMap<>(Station.Kind.class);
        for (Station st : stations) kinds.merge(st.kind(), 1, Integer::sum);
        out.add("  postes repérés : " + (kinds.isEmpty() ? "aucun (tronçons non chargés ?)" : kinds.toString().toLowerCase(java.util.Locale.ROOT)));
        if (zone.afkPoints().isEmpty()) out.add("  pas de zone AFK : les bots passent AFK là où ils s'arrêtent (/fp spawnzone afk add <nom>)");
        for (Bot b : bots.values()) {
            String under = world.getBlockAt((int) Math.floor(b.x), (int) Math.floor(b.y - 0.01), (int) Math.floor(b.z)).getType().name();
            out.add(String.format(java.util.Locale.ROOT, "  bot %s : %s en %.1f %.1f %.1f sur %s, vu par %d", b.fake.name(),
                    b.afk() ? "afk" : b.state.name().toLowerCase(java.util.Locale.ROOT), b.x, b.y, b.z, under.toLowerCase(java.util.Locale.ROOT), b.viewers.size()));
        }
        return out;
    }

    // --- Boucle (chaque tick) ---

    private void tick() {
        tick++;
        if (zone == null) {
            if (!bots.isEmpty()) for (Bot b : new ArrayList<>(bots.values())) remove(b);
            return;
        }
        if (tick % 20 == 0) balance();
        if (tick % 600 == 1) scanStations();
        if (tick % 10 == 0) updateViewers();
        for (Bot b : new ArrayList<>(bots.values())) update(b);
    }

    /** Ajuste le nombre de bots au spawn : une part des faux joueurs « auto », entre min et max. */
    private void balance() {
        ConfigurationSection c = plugin.getConfig().getConfigurationSection("spawn-bots");
        bots.values().removeIf(b -> {
            boolean gone = plugin.manager().get(b.fake.name()) != b.fake || b.fake.leaving();
            if (gone) { despawnAll(b); byId.remove(b.id); }
            return gone;
        });
        List<FakePlayer> autos = plugin.manager().all().stream().filter(f -> f.auto() && !f.leaving()).toList();
        int target = (int) Math.round(autos.size() * c.getDouble("share", 0.18));
        target = Math.max(c.getInt("min", 4), Math.min(c.getInt("max", 20), target));
        target = Math.min(target, autos.size());
        long active = bots.values().stream().filter(b -> b.state != State.LEAVING).count();
        if (active < target && tick >= nextArrival) {
            List<FakePlayer> free = autos.stream().filter(f -> !bots.containsKey(f.name())).toList();
            if (!free.isEmpty()) add(free.get(random.nextInt(free.size())));
            int min = c.getInt("arrival-delay-seconds.min", 4), max = Math.max(min, c.getInt("arrival-delay-seconds.max", 20));
            nextArrival = tick + 20L * (min + random.nextInt(max - min + 1));
        } else if (active > target && tick >= nextExit) {
            List<Bot> staying = bots.values().stream().filter(b -> b.state != State.LEAVING).toList();
            leave(staying.get(random.nextInt(staying.size())));
            nextExit = tick + 20L * (10 + random.nextInt(40));
        }
    }

    private void add(FakePlayer fake) {
        add(fake, random.nextDouble() < plugin.getConfig().getDouble("spawn-bots.arrive-by-exit-chance", 0.3));
    }

    /**
     * Un faux joueur « auto » vient de se connecter : comme un vrai joueur, il apparaît souvent au point
     * d'apparition juste après son message de connexion, s'il reste de la place au spawn.
     */
    public void onLogin(FakePlayer fake) {
        if (zone == null || bots.containsKey(fake.name())) return;
        ConfigurationSection c = plugin.getConfig().getConfigurationSection("spawn-bots");
        if (c == null || random.nextDouble() >= c.getDouble("login-at-spawn-chance", 0.6)) return;
        long active = bots.values().stream().filter(b -> b.state != State.LEAVING).count();
        if (active >= c.getInt("max", 20)) return;
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            if (zone != null && plugin.manager().get(fake.name()) == fake && !fake.leaving()) add(fake, false);
        }, 10 + random.nextInt(30));
    }

    private void add(FakePlayer fake, boolean byGate) {
        SpawnZone.Point from = byGate ? zone.exit() : zone.arrival();
        for (int attempt = 0; attempt < 10; attempt++) {
            double[] at = zone.randomIn(from, random);
            double feet = ground(at);
            if (Double.isNaN(feet)) continue;
            Bot b = new Bot(fake, nextId++);
            b.x = at[0];
            b.y = feet;
            b.z = at[1];
            double[] center = zone.toWorld(0, 0); // regarde vers l'arbre en arrivant
            b.yaw = b.headYaw = Walker.yaw(center[0] - b.x, center[1] - b.z);
            b.speed = 0.17 + random.nextDouble() * 0.06;
            b.state = byGate ? State.IDLE : State.ARRIVING;
            b.until = tick + 20 + random.nextInt(50);
            bots.put(fake.name(), b);
            byId.put(b.id, b);
            return;
        }
    }

    private void leave(Bot b) {
        double[] out = zone.randomIn(zone.exit(), random);
        b.tx = out[0];
        b.tz = out[1];
        stopUsing(b);
        b.state = State.LEAVING;
        b.stuck = 0;
        endAfk(b, false);
        setSneak(b, false);
    }

    private void remove(Bot b) {
        stopUsing(b);
        b.fake.afk(false);
        for (Bot other : bots.values()) if (other.buddy == b) other.buddy = null;
        despawnAll(b);
        bots.remove(b.fake.name());
        byId.remove(b.id);
    }

    /** Appelé quand le faux joueur se déconnecte : son corps disparaît aussitôt. */
    public void forget(FakePlayer fake) {
        Bot b = bots.get(fake.name());
        if (b != null && b.fake == fake) remove(b);
    }

    /** Skin reçu : le client ne le relit qu'à l'apparition de l'entité, on la recrée. */
    public void respawn(FakePlayer fake) {
        Bot b = bots.get(fake.name());
        if (b == null) return;
        for (UUID id : new ArrayList<>(b.viewers)) {
            Player p = Bukkit.getPlayer(id);
            if (p == null) continue;
            send(p, new WrapperPlayServerDestroyEntities(b.id));
            Bukkit.getScheduler().runTaskLater(plugin, () -> { if (p.isOnline() && b.viewers.contains(p.getUniqueId())) spawnFor(p, b); }, 2L);
        }
    }

    // --- Comportement d'un bot ---

    private void update(Bot b) {
        double ox = b.x, oy = b.y, oz = b.z;
        float oyaw = b.yaw, ohead = b.headYaw, opitch = b.pitch;
        if (b.knock > 0) knockback(b);
        switch (b.state) {
            case ARRIVING -> {
                if (tick >= b.until) pickTarget(b);
            }
            case WALKING, LEAVING -> walk(b);
            case IDLE -> idle(b);
            case USING -> use(b);
        }
        if (b.sneakToggles > 0 && tick % 3 == 0) {
            setSneak(b, !b.sneaking);
            b.sneakToggles--;
            if (b.sneakToggles == 0) setSneak(b, false);
        }
        double jumpY = 0;
        if (b.jump >= 0) {
            jumpY = JUMP[b.jump] - (b.jump > 0 ? JUMP[b.jump - 1] : 0);
            b.jump = b.jump + 1 >= JUMP.length ? -1 : b.jump + 1;
        }
        b.y += jumpY;
        if (b.viewers.isEmpty()) return;
        if (tick % 100 == b.id % 100) { // resynchronisation régulière (les arrondis des déplacements relatifs dérivent)
            broadcast(b, () -> new WrapperPlayServerEntityTeleport(b.id, new Vector3d(b.x, b.y, b.z), b.yaw, b.pitch, true));
        } else if (b.x != ox || b.y != oy || b.z != oz || b.yaw != oyaw || b.pitch != opitch) {
            double dx = b.x - ox, dy = b.y - oy, dz = b.z - oz;
            broadcast(b, () -> new WrapperPlayServerEntityRelativeMoveAndRotation(b.id, dx, dy, dz, b.yaw, b.pitch, b.jump < 0));
        }
        if (b.headYaw != ohead) broadcast(b, () -> new WrapperPlayServerEntityHeadLook(b.id, b.headYaw));
    }

    private void pickTarget(Bot b) {
        double[] t = zone.randomIn(zone.pick(random), random);
        b.buddy = null;
        b.goingAfk = false;
        b.station = null;
        Station st = random.nextDouble() < plugin.getConfig().getDouble("spawn-bots.stations.chance", 0.25) ? freeStation() : null;
        if (st != null) { // va se servir d'un coffre de l'Ender, d'une enclume…
            b.station = st;
            b.tx = st.sx();
            b.tz = st.sz();
            b.stuck = 0;
            b.side = random.nextBoolean() ? 1 : -1;
            b.state = State.WALKING;
            b.speed = 0.17 + random.nextDouble() * 0.06;
            return;
        }
        SpawnZone.Point afkZone = zone.pickAfk(random);
        if (afkZone != null && random.nextDouble() < plugin.getConfig().getDouble("spawn-bots.afk.chance", 0.3)) {
            // Il va s'installer dans une zone AFK (pas de groupe : on y va pour être tranquille).
            for (int attempt = 0; attempt < 6; attempt++) {
                double[] spot = zone.randomIn(afkZone, random);
                if (Double.isNaN(ground(spot))) continue;
                b.tx = spot[0];
                b.tz = spot[1];
                b.goingAfk = true;
                b.stuck = 0;
                b.side = random.nextBoolean() ? 1 : -1;
                b.state = State.WALKING;
                b.speed = 0.17 + random.nextDouble() * 0.06;
                return;
            }
        }
        // Parfois il rejoint un autre bot pour « discuter » : il se place à 2 blocs, face à lui.
        if (random.nextDouble() < plugin.getConfig().getDouble("spawn-bots.group-chance", 0.35)) {
            List<Bot> idle = bots.values().stream().filter(o -> o != b && o.state == State.IDLE && !o.afk()).toList();
            if (!idle.isEmpty()) {
                Bot mate = idle.get(random.nextInt(idle.size()));
                double a = random.nextDouble() * Math.PI * 2, r = 1.6 + random.nextDouble() * 0.9;
                double[] spot = {mate.x + Math.cos(a) * r, mate.z + Math.sin(a) * r};
                if (!Double.isNaN(terrain.feet((int) Math.floor(spot[0]), mate.y, (int) Math.floor(spot[1])))) {
                    t = spot;
                    b.buddy = mate;
                    mate.buddy = mate.buddy == null ? b : mate.buddy;
                    mate.until = Math.max(mate.until, tick + 20L * (30 + random.nextInt(60)));
                }
            }
        }
        b.tx = t[0];
        b.tz = t[1];
        b.stuck = 0;
        b.side = random.nextBoolean() ? 1 : -1;
        b.state = State.WALKING;
        b.speed = random.nextDouble() < 0.12 ? 0.26 : 0.17 + random.nextDouble() * 0.06; // parfois en sprint
    }

    private void walk(Bot b) {
        double dist = Math.hypot(b.tx - b.x, b.tz - b.z);
        if (dist < 0.6) {
            if (b.state == State.LEAVING) { remove(b); return; } // passé la porte : il reste connecté ailleurs
            if (b.station != null) { startUsing(b); return; }
            b.state = State.IDLE;
            ConfigurationSection afk = plugin.getConfig().getConfigurationSection("spawn-bots.afk");
            // Avec des zones AFK, seuls ceux qui y sont allés passent AFK ; sans, n'importe où, au hasard.
            boolean goAfk = zone.afkPoints().isEmpty()
                    ? b.buddy == null && afk != null && random.nextDouble() < afk.getDouble("chance", 0.3)
                    : b.goingAfk;
            b.goingAfk = false;
            if (goAfk && afk != null) {
                int min = afk.getInt("minutes.min", 3), max = Math.max(min, afk.getInt("minutes.max", 25));
                b.afkUntil = tick + 20L * 60 * (min + random.nextInt(max - min + 1));
                b.until = b.afkUntil;
                b.fake.afk(true);
                b.pitch = (random.nextFloat() - 0.3f) * 25; // regard figé, souvent un peu vers le bas
                b.headYaw = b.yaw;
            } else {
                b.until = tick + 20L * (b.buddy != null ? 25 + random.nextInt(60) : 4 + random.nextInt(35));
            }
            return;
        }
        Walker.Step step = Walker.step(avoidPlayers(b), b.x, b.y, b.z, b.tx, b.tz, b.speed, b.side);
        if (step == null) {
            if (++b.stuck > 15) {
                b.station = null;
                if (b.state == State.LEAVING) remove(b); else pickTarget(b);
            }
            return;
        }
        b.stuck = 0;
        b.side = step.side();
        b.x = step.x();
        b.y = step.y();
        b.z = step.z();
        b.yaw = turn(b.yaw, step.yaw(), 30);
        b.headYaw = turn(b.headYaw, step.yaw(), 30);
        b.pitch = turn(b.pitch, 0, 10);
    }

    /**
     * Terrain où les cases occupées par un vrai joueur (à moins de 0,9 bloc) sont des obstacles : un joueur qui en
     * chevauche un autre le pousse, un bot qui lui marcherait dessus l'entraînerait sur des dizaines de blocs.
     */
    private Terrain avoidPlayers(Bot b) {
        List<double[]> near = new ArrayList<>();
        for (Player p : world.getPlayers()) {
            double dx = p.getX() - b.x, dz = p.getZ() - b.z;
            if (dx * dx + dz * dz < 36) near.add(new double[]{p.getX(), p.getZ()});
        }
        if (near.isEmpty()) return terrain;
        return (x, fromY, z) -> {
            for (double[] p : near) {
                if (Math.abs(p[0] - (x + 0.5)) < 1.2 && Math.abs(p[1] - (z + 0.5)) < 1.2
                        && Math.hypot(p[0] - (x + 0.5), p[1] - (z + 0.5)) < 1.1) return Double.NaN;
            }
            return terrain.feet(x, fromY, z);
        };
    }

    private void idle(Bot b) {
        if (b.afk()) { // un vrai AFK ne bouge pas du tout
            if (tick >= b.afkUntil) {
                endAfk(b, true);
                pickTarget(b);
            }
            return;
        }
        Player near = nearestPlayer(b, 7);
        Bot mate = b.buddy != null && bots.containsValue(b.buddy) && dist(b, b.buddy) < 4 ? b.buddy : null;
        if (near != null && (mate == null || random.nextDouble() < 0.6)) { // regarde le joueur proche
            lookAt(b, near.getX(), near.getEyeLocation().getY(), near.getZ());
            if (near.getLocation().distanceSquared(new org.bukkit.Location(world, b.x, b.y, b.z)) < 16
                    && b.sneakToggles == 0 && random.nextDouble() < 0.004) b.sneakToggles = 4 + 2 * random.nextInt(3);
        } else if (mate != null) { // face à celui avec qui il « discute »
            lookAt(b, mate.x, mate.y + 1.62, mate.z);
            if (random.nextDouble() < 0.003) b.sneakToggles = 2 + 2 * random.nextInt(2);
        } else if (tick >= b.nextGlance) { // jette un œil ailleurs de temps en temps
            b.headYaw = wrap(b.yaw + (random.nextFloat() - 0.5f) * 120);
            b.pitch = (random.nextFloat() - 0.4f) * 30;
            b.nextGlance = tick + 30 + random.nextInt(90);
        }
        if (b.eating > 0) eat(b);
        else if (random.nextDouble() < 0.0012) startEating(b);
        else if (random.nextDouble() < 0.0015) hold(b, b.held == b.loadout.mainHand() ? b.loadout.alt() : b.loadout.mainHand());
        if (b.jump < 0 && random.nextDouble() < 0.0015) b.jump = 0;
        if (random.nextDouble() < 0.002) broadcast(b, () -> new WrapperPlayServerEntityAnimation(b.id,
                WrapperPlayServerEntityAnimation.EntityAnimationType.SWING_MAIN_ARM));
        if (tick >= b.until && b.eating == 0) pickTarget(b);
    }

    private void lookAt(Bot b, double x, double eyeY, double z) {
        double dx = x - b.x, dz = z - b.z, dy = eyeY - (b.y + 1.62);
        b.headYaw = turn(b.headYaw, Walker.yaw(dx, dz), 20);
        b.pitch = turn(b.pitch, (float) -Math.toDegrees(Math.atan2(dy, Math.hypot(dx, dz))), 12);
        if (Math.abs(wrap(b.headYaw - b.yaw)) > 50) b.yaw = turn(b.yaw, b.headYaw, 15); // le corps suit la tête
    }

    private static double dist(Bot a, Bot b) {
        return Math.hypot(a.x - b.x, a.z - b.z);
    }

    /** Fin de l'AFK : s'il a été sollicité entre-temps, il s'excuse souvent (« dsl j'étais afk »). */
    private void endAfk(Bot b, boolean speak) {
        if (!b.afk()) return;
        b.afkUntil = 0;
        b.fake.afk(false);
        List<String> pinged = new ArrayList<>(b.pingedWhileAfk);
        b.pingedWhileAfk.clear();
        if (speak) plugin.afkBack(b.fake, pinged.isEmpty() ? null : pinged.get(random.nextInt(pinged.size())));
    }

    /** Un vrai joueur a sollicité un faux joueur AFK (message, mention, coup) : il le rattrapera à son retour. */
    public void pinged(FakePlayer fake, String player) {
        Bot b = bots.get(fake.name());
        if (b != null && b.afk()) b.pingedWhileAfk.add(player);
    }

    /** Bot avec qui ce faux joueur discute au spawn (pour que ce soit lui qui réponde), ou null. */
    public FakePlayer buddyOf(FakePlayer fake) {
        Bot b = bots.get(fake.name());
        return b != null && b.buddy != null && bots.containsValue(b.buddy) && dist(b, b.buddy) < 5 ? b.buddy.fake : null;
    }

    // Manger : nourriture en main, bras levé (main active) 1,6 s, bruits de mastication, rot à la fin.
    private void startEating(Bot b) {
        hold(b, b.loadout.food());
        b.eating = 32;
        broadcast(b, () -> new WrapperPlayServerEntityMetadata(b.id, List.of(new EntityData<>(8, EntityDataTypes.BYTE, (byte) 0x01))));
    }

    private void eat(Bot b) {
        b.eating--;
        org.bukkit.Location at = new org.bukkit.Location(world, b.x, b.y + 1.5, b.z);
        if (b.eating % 4 == 0 && b.eating > 0) world.playSound(at, Sound.ENTITY_GENERIC_EAT, 0.5f, 0.8f + random.nextFloat() * 0.4f);
        if (b.eating == 0) {
            broadcast(b, () -> new WrapperPlayServerEntityMetadata(b.id, List.of(new EntityData<>(8, EntityDataTypes.BYTE, (byte) 0))));
            world.playSound(at, Sound.ENTITY_PLAYER_BURP, 0.5f, 0.9f + random.nextFloat() * 0.2f);
            Bukkit.getScheduler().runTaskLater(plugin, () -> { if (bots.containsValue(b)) hold(b, b.loadout.mainHand()); },
                    20 + random.nextInt(60));
        }
    }

    /** Change l'objet en main (comme un changement d'emplacement dans la barre d'objets). */
    private void hold(Bot b, ItemStack item) {
        b.held = item;
        ItemStack shown = item == null ? new ItemStack(org.bukkit.Material.AIR) : item;
        broadcast(b, () -> new WrapperPlayServerEntityEquipment(b.id,
                List.of(new Equipment(EquipmentSlot.MAIN_HAND, SpigotConversionUtil.fromBukkitItemStack(shown)))));
    }

    // --- Postes : coffre de l'Ender, forge (enclume, table de forge, meule), enchantement, établi, four… ---

    /** Repère les blocs utilisables dans les tronçons chargés du spawn et la place où se tenir devant chacun. */
    private void scanStations() {
        if (zone == null) return;
        double[] c = zone.toWorld(0, 0);
        int cx = (int) Math.floor(c[0]), cz = (int) Math.floor(c[1]), floor = (int) Math.floor(zone.floorFeet()) - 1;
        int r = plugin.getConfig().getInt("spawn-bots.stations.radius", 100);
        List<Station> found = new ArrayList<>();
        for (org.bukkit.Chunk chunk : world.getLoadedChunks()) {
            int x0 = chunk.getX() << 4, z0 = chunk.getZ() << 4;
            if (x0 + 15 < cx - r || x0 > cx + r || z0 + 15 < cz - r || z0 > cz + r) continue;
            for (int dx = 0; dx < 16; dx++) for (int dz = 0; dz < 16; dz++) {
                for (int y = floor - 2; y <= floor + 8; y++) {
                    org.bukkit.block.Block block = chunk.getBlock(dx, y, dz);
                    Station.Kind kind = Station.Kind.of(block.getType());
                    if (kind == null) continue;
                    Station st = standFor(block, kind);
                    if (st != null) found.add(st);
                }
            }
        }
        stations = List.copyOf(found);
    }

    /** Place libre devant le bloc (d'abord sa face avant s'il est orienté), sur un sol praticable. */
    private Station standFor(org.bukkit.block.Block block, Station.Kind kind) {
        List<int[]> sides = new ArrayList<>(List.of(new int[]{0, -1}, new int[]{0, 1}, new int[]{-1, 0}, new int[]{1, 0}));
        if (block.getBlockData() instanceof org.bukkit.block.data.Directional d) {
            org.bukkit.block.BlockFace f = d.getFacing();
            sides.add(0, new int[]{f.getModX(), f.getModZ()});
        }
        for (int[] side : sides) {
            int x = block.getX() + side[0], z = block.getZ() + side[1];
            double feet = terrain.feet(x, block.getY(), z);
            if (!Double.isNaN(feet) && Math.abs(feet - block.getY()) <= 1.01) {
                return new Station(kind, block.getX(), block.getY(), block.getZ(), x + 0.5, feet, z + 0.5);
            }
        }
        return null;
    }

    /** Poste au hasard (selon le poids de son type) que personne n'utilise ou ne vise déjà. */
    private Station freeStation() {
        List<Station> free = new ArrayList<>();
        double total = 0;
        for (Station st : stations) {
            boolean taken = bots.values().stream().anyMatch(o -> st.equals(o.station));
            if (!taken) { free.add(st); total += st.kind().weight; }
        }
        double roll = random.nextDouble() * total;
        for (Station st : free) {
            roll -= st.kind().weight;
            if (roll < 0) return st;
        }
        return null;
    }

    private void startUsing(Bot b) {
        Station st = b.station;
        b.state = State.USING;
        b.until = tick + st.kind().minTicks + random.nextInt(st.kind().maxTicks - st.kind().minTicks + 1);
        b.yaw = b.headYaw = Walker.yaw(st.bx() + 0.5 - b.x, st.bz() + 0.5 - b.z);
        b.pitch = 35 + random.nextFloat() * 15; // regarde le bloc
        if (st.kind() == Station.Kind.ENDER_CHEST) {
            chestLid(b, st, true);
            world.playSound(new org.bukkit.Location(world, st.bx() + 0.5, st.by() + 0.5, st.bz() + 0.5), Sound.BLOCK_ENDER_CHEST_OPEN, 0.5f, 0.9f + random.nextFloat() * 0.1f);
        }
    }

    private void use(Bot b) {
        Station st = b.station;
        if (st == null) { b.state = State.IDLE; return; }
        boolean works = st.kind() == Station.Kind.ANVIL || st.kind() == Station.Kind.SMITHING
                || st.kind() == Station.Kind.GRINDSTONE || st.kind() == Station.Kind.CRAFTING;
        if (works && random.nextDouble() < 0.08) broadcast(b, () -> new WrapperPlayServerEntityAnimation(b.id,
                WrapperPlayServerEntityAnimation.EntityAnimationType.SWING_MAIN_ARM));
        if (st.kind().sound != null && random.nextDouble() < 0.035) world.playSound(
                new org.bukkit.Location(world, st.bx() + 0.5, st.by() + 0.5, st.bz() + 0.5), st.kind().sound, 0.6f, 0.9f + random.nextFloat() * 0.2f);
        if (st.kind() == Station.Kind.ENDER_CHEST && random.nextDouble() < 0.02) // range ses affaires
            hold(b, random.nextBoolean() ? b.loadout.alt() : b.loadout.food());
        if (tick >= b.until) {
            stopUsing(b);
            hold(b, b.loadout.mainHand());
            b.state = State.IDLE;
            b.until = tick + 20 + random.nextInt(80);
        }
    }

    private void stopUsing(Bot b) {
        Station st = b.station;
        if (st != null && b.state == State.USING && st.kind() == Station.Kind.ENDER_CHEST) {
            chestLid(b, st, false);
            world.playSound(new org.bukkit.Location(world, st.bx() + 0.5, st.by() + 0.5, st.bz() + 0.5), Sound.BLOCK_ENDER_CHEST_CLOSE, 0.5f, 0.9f + random.nextFloat() * 0.1f);
        }
        b.station = null;
    }

    /** Ouvre ou ferme le couvercle du coffre de l'Ender pour les joueurs proches (animation seulement). */
    private void chestLid(Bot b, Station st, boolean open) {
        for (Player p : world.getPlayers()) {
            if (p.getLocation().distanceSquared(new org.bukkit.Location(world, st.bx(), st.by(), st.bz())) > VIEW * VIEW) continue;
            var user = PacketEvents.getAPI().getPlayerManager().getUser(p);
            if (user == null) continue;
            int blockId = com.github.retrooper.packetevents.protocol.world.states.type.StateTypes.ENDER_CHEST.getMapped().getId(user.getClientVersion());
            send(p, new com.github.retrooper.packetevents.wrapper.play.server.WrapperPlayServerBlockAction(
                    new com.github.retrooper.packetevents.util.Vector3i(st.bx(), st.by(), st.bz()), 1, open ? 1 : 0, blockId));
        }
    }

    /** Un vrai joueur frappe le bot : animation et son de dégât, petit recul, il se tourne, parfois il parle. */
    private void hit(Bot b, Player attacker) {
        if (!bots.containsValue(b) || attacker == null || !attacker.isOnline() || attacker.getWorld() != world) return;
        double dx = b.x - attacker.getX(), dz = b.z - attacker.getZ(), len = Math.max(0.01, Math.hypot(dx, dz));
        if (len > 6) return; // hors de portée d'un vrai coup (client modifié)
        ConfigurationSection h = plugin.getConfig().getConfigurationSection("spawn-bots.hit");
        if (h == null || h.getBoolean("pvp-protected", true)) {
            // Spawn protégé : un vrai joueur frappé ne subit rien ; on envoie le même message que la protection.
            String msg = h == null ? "" : h.getString("protected-message", "");
            if (!msg.isEmpty()) attacker.sendMessage(net.kyori.adventure.text.minimessage.MiniMessage.miniMessage().deserialize(msg));
        } else {
            broadcast(b, () -> new WrapperPlayServerHurtAnimation(b.id, Walker.yaw(-dx, -dz)));
            world.playSound(new org.bukkit.Location(world, b.x, b.y, b.z), Sound.ENTITY_PLAYER_HURT, 1f, 0.9f + random.nextFloat() * 0.2f);
            b.knockX = dx / len * 0.18;
            b.knockZ = dz / len * 0.18;
            b.knock = 4;
        }
        if (b.afk()) { // AFK : ne réagit pas, mais s'en souviendra
            b.pingedWhileAfk.add(attacker.getName());
            return;
        }
        b.headYaw = b.yaw = Walker.yaw(-dx, -dz);
        if (b.state == State.WALKING && random.nextDouble() < 0.5) b.state = State.IDLE; // s'arrête pour voir
        b.until = Math.max(b.until, tick + 60);
        if (tick - b.lastHitReact > 20 * 15) {
            b.lastHitReact = tick;
            plugin.reactToHit(b.fake, attacker.getName());
        }
        if (random.nextDouble() < 0.25) // rend parfois le coup, dans le vide
            Bukkit.getScheduler().runTaskLater(plugin, () -> broadcast(b, () -> new WrapperPlayServerEntityAnimation(b.id,
                    WrapperPlayServerEntityAnimation.EntityAnimationType.SWING_MAIN_ARM)), 5 + random.nextInt(10));
    }

    private void knockback(Bot b) {
        b.knock--;
        double nx = b.x + b.knockX, nz = b.z + b.knockZ;
        double feet = terrain.feet((int) Math.floor(nx), b.y, (int) Math.floor(nz));
        double ahead = Double.isNaN(feet) ? Double.NaN
                : terrain.feet((int) Math.floor(nx + b.knockX * 4), feet, (int) Math.floor(nz + b.knockZ * 4));
        if (Double.isNaN(feet) || Double.isNaN(ahead)) { b.knock = 0; return; } // jamais poussé dans le vide
        b.x = nx;
        b.y = feet;
        b.z = nz;
    }

    // --- Visibilité (paquets) ---

    private void updateViewers() {
        for (Bot b : bots.values()) {
            for (Iterator<UUID> it = b.viewers.iterator(); it.hasNext(); ) {
                Player p = Bukkit.getPlayer(it.next());
                if (p == null || !inRange(p, b, VIEW + 8)) {
                    if (p != null) send(p, new WrapperPlayServerDestroyEntities(b.id));
                    it.remove();
                }
            }
            for (Player p : world.getPlayers()) {
                // 2 s après la connexion : l'entrée TAB du faux joueur (son profil) doit être arrivée avant l'entité.
                if (!b.viewers.contains(p.getUniqueId()) && p.getTicksLived() > 40 && inRange(p, b, VIEW)) {
                    b.viewers.add(p.getUniqueId());
                    spawnFor(p, b);
                }
            }
        }
    }

    private boolean inRange(Player p, Bot b, double range) {
        if (p.getWorld() != world) return false;
        double dx = p.getX() - b.x, dz = p.getZ() - b.z;
        return dx * dx + dz * dz < range * range;
    }

    private void spawnFor(Player p, Bot b) {
        send(p, new WrapperPlayServerSpawnEntity(b.id, b.fake.uuid(), EntityTypes.PLAYER, new Location(b.x, b.y, b.z, b.yaw, b.pitch),
                b.headYaw, 0, new Vector3d(0, 0, 0)));
        List<EntityData<?>> data = new ArrayList<>();
        data.add(new EntityData<>(skinPartsIndex, EntityDataTypes.BYTE, (byte) 0x7F)); // cape, veste, manches, chapeau…
        if (b.sneaking) {
            data.add(new EntityData<>(0, EntityDataTypes.BYTE, (byte) 0x02));
            data.add(new EntityData<>(6, EntityDataTypes.ENTITY_POSE, EntityPose.CROUCHING));
        }
        send(p, new WrapperPlayServerEntityMetadata(b.id, data));
        List<Equipment> eq = equipment(b.loadout, b.held);
        if (!eq.isEmpty()) send(p, new WrapperPlayServerEntityEquipment(b.id, eq));
        send(p, new WrapperPlayServerEntityHeadLook(b.id, b.headYaw));
    }

    private static List<Equipment> equipment(Loadout l, ItemStack held) {
        List<Equipment> out = new ArrayList<>();
        add(out, EquipmentSlot.HELMET, l.helmet());
        add(out, EquipmentSlot.CHEST_PLATE, l.chest());
        add(out, EquipmentSlot.LEGGINGS, l.legs());
        add(out, EquipmentSlot.BOOTS, l.boots());
        add(out, EquipmentSlot.MAIN_HAND, held);
        add(out, EquipmentSlot.OFF_HAND, l.offHand());
        return out;
    }

    private static void add(List<Equipment> out, EquipmentSlot slot, ItemStack item) {
        if (item != null) out.add(new Equipment(slot, SpigotConversionUtil.fromBukkitItemStack(item)));
    }

    private void setSneak(Bot b, boolean sneak) {
        if (b.sneaking == sneak) return;
        b.sneaking = sneak;
        broadcast(b, () -> new WrapperPlayServerEntityMetadata(b.id, List.of(
                new EntityData<>(0, EntityDataTypes.BYTE, (byte) (sneak ? 0x02 : 0)),
                new EntityData<>(6, EntityDataTypes.ENTITY_POSE, sneak ? EntityPose.CROUCHING : EntityPose.STANDING))));
    }

    private void despawnAll(Bot b) {
        for (UUID id : b.viewers) {
            Player p = Bukkit.getPlayer(id);
            if (p != null) send(p, new WrapperPlayServerDestroyEntities(b.id));
        }
        b.viewers.clear();
    }

    private void broadcast(Bot b, Supplier<PacketWrapper<?>> packet) {
        for (UUID id : b.viewers) {
            Player p = Bukkit.getPlayer(id);
            if (p != null) send(p, packet.get());
        }
    }

    private static void send(Player p, PacketWrapper<?> packet) {
        PacketEvents.getAPI().getPlayerManager().sendPacket(p, packet);
    }

    // --- Outils ---

    private double ground(double[] xz) {
        return terrain.feet((int) Math.floor(xz[0]), zone.floorFeet() + 1, (int) Math.floor(xz[1]));
    }

    private Player nearestPlayer(Bot b, double max) {
        Player best = null;
        double bestD = max * max;
        for (Player p : world.getPlayers()) {
            double dx = p.getX() - b.x, dy = p.getY() - b.y, dz = p.getZ() - b.z, d = dx * dx + dy * dy + dz * dz;
            if (d < bestD) { bestD = d; best = p; }
        }
        return best;
    }

    private static float wrap(float a) {
        a %= 360;
        if (a >= 180) a -= 360;
        if (a < -180) a += 360;
        return a;
    }

    /** Rotation progressive de {@code from} vers {@code to}, au plus {@code max} degrés. */
    private static float turn(float from, float to, float max) {
        float d = wrap(to - from);
        return wrap(from + Math.max(-max, Math.min(max, d)));
    }

    public int count() { return bots.size(); }

    /** Position (repère du spawn) d'un point du monde, ou null si le spawn n'est pas placé. */
    public double[] local(org.bukkit.Location at) {
        return zone == null || at.getWorld() != world ? null : zone.toLocal(at.getX(), at.getZ());
    }
}
