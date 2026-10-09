package fr.vaeloria.staff.npc;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.util.Pos;
import fr.vaeloria.staff.util.Text;
import fr.vaeloria.staff.util.YamlFiles;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.NamespacedKey;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Ageable;
import org.bukkit.entity.Entity;
import org.bukkit.entity.EntityType;
import org.bukkit.entity.LivingEntity;
import org.bukkit.entity.PiglinAbstract;
import org.bukkit.entity.Player;
import org.bukkit.persistence.PersistentDataType;

import java.io.File;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;

/**
 * PNJ en mémoire + npcs.yml. Comme les pancartes, l'entité n'est pas enregistrée dans le monde :
 * elle est recréée quand son chunk est chargé (aucun doublon, aucune perte).
 */
public final class NpcManager {
    /** Apparences proposées (entités vivantes sans comportement gênant une fois l'IA coupée). */
    public static final List<EntityType> TYPES = List.of(
            EntityType.VILLAGER, EntityType.WANDERING_TRADER, EntityType.PILLAGER, EntityType.VINDICATOR,
            EntityType.EVOKER, EntityType.WITCH, EntityType.PIGLIN, EntityType.PIGLIN_BRUTE, EntityType.ZOMBIE,
            EntityType.SKELETON, EntityType.WITHER_SKELETON, EntityType.BLAZE, EntityType.ENDERMAN,
            EntityType.IRON_GOLEM, EntityType.SNOW_GOLEM, EntityType.ALLAY, EntityType.FOX, EntityType.WOLF,
            EntityType.CAT, EntityType.PANDA, EntityType.POLAR_BEAR, EntityType.AXOLOTL, EntityType.ARMOR_STAND);

    private final VaeloriaStaffPlugin plugin;
    private final File file;
    private final NamespacedKey tag;
    private final Map<String, Npc> npcs = new LinkedHashMap<>();

    public NpcManager(VaeloriaStaffPlugin plugin) {
        this.plugin = plugin;
        this.file = new File(plugin.getDataFolder(), "npcs.yml");
        this.tag = new NamespacedKey(plugin, "npc");
    }

    public Collection<Npc> all() { return npcs.values(); }
    public Npc get(String id) { return id == null ? null : npcs.get(id.toLowerCase()); }
    public List<String> ids() { return new ArrayList<>(npcs.keySet()); }
    public boolean exists(String id) { return npcs.containsKey(id); }

    /** Le PNJ représenté par cette entité, ou {@code null}. */
    public Npc of(Entity e) {
        return get(e.getPersistentDataContainer().get(tag, PersistentDataType.STRING));
    }

    public Npc create(String id, String name, Location at) {
        Npc npc = new Npc(id, name, Pos.of(at));
        npcs.put(id, npc);
        save();
        spawn(npc);
        return npc;
    }

    public void delete(Npc npc) {
        despawn(npc);
        npcs.remove(npc.id());
        save();
    }

    public void move(Npc npc, Location to) {
        npc.pos(Pos.of(to));
        update(npc);
    }

    /** Enregistre et recrée l'entité (apparence, nom, position). */
    public void update(Npc npc) {
        save();
        despawn(npc);
        spawn(npc);
    }

    /** Exécute les actions du PNJ pour ce joueur. */
    public void interact(Npc npc, Player player) {
        for (String m : npc.messages()) player.sendMessage(Text.of(Text.placeholders(m, player)));
        for (String raw : npc.commands()) {
            String c = Text.placeholders(raw, player).trim();
            if (c.toLowerCase().startsWith("[console]")) {
                c = c.substring("[console]".length()).trim();
                Bukkit.dispatchCommand(Bukkit.getConsoleSender(), c.startsWith("/") ? c.substring(1) : c);
            } else {
                player.performCommand(c.startsWith("/") ? c.substring(1) : c);
            }
        }
    }

    // ---- Entités ----

    private Entity entity(Npc npc) {
        if (npc.entity == null) return null;
        Entity e = Bukkit.getEntity(npc.entity);
        return e != null && e.isValid() ? e : null;
    }

    private void spawn(Npc npc) {
        if (entity(npc) != null || !npc.pos().isLoaded()) return;
        Location loc = npc.pos().toLocation();
        Class<? extends Entity> type = npc.type().getEntityClass();
        if (loc == null || type == null) return;
        Entity e = loc.getWorld().spawn(loc, type, entity -> configure(npc, entity));
        npc.entity = e.getUniqueId();
    }

    private void configure(Npc npc, Entity e) {
        e.setPersistent(false);
        e.getPersistentDataContainer().set(tag, PersistentDataType.STRING, npc.id());
        e.customName(Text.of(npc.name()));
        e.setCustomNameVisible(npc.nameVisible());
        e.setInvulnerable(true);
        e.setSilent(true);
        e.setGlowing(npc.glowing());
        e.setGravity(false);
        if (e instanceof LivingEntity living) {
            living.setAI(false);
            living.setCollidable(false);
            living.setRemoveWhenFarAway(false);
            living.setCanPickupItems(false);
        }
        if (e instanceof Ageable ageable) ageable.setAdult();
        if (e instanceof PiglinAbstract piglin) piglin.setImmuneToZombification(true);
    }

    private void despawn(Npc npc) {
        Entity e = entity(npc);
        if (e != null) e.remove();
        npc.entity = null;
    }

    /** Appelé régulièrement : recrée les PNJ dont le chunk est chargé et les remet en place s'ils ont bougé. */
    public void tick() {
        for (Npc npc : npcs.values()) {
            Entity e = entity(npc);
            if (e == null) {
                spawn(npc);
                continue;
            }
            Location want = npc.pos().toLocation();
            if (want != null && (e.getWorld() != want.getWorld() || e.getLocation().distanceSquared(want) > 0.04)) e.teleport(want);
        }
    }

    public void despawnAll() {
        npcs.values().forEach(this::despawn);
    }

    // ---- Persistance ----

    public void load() {
        despawnAll();
        npcs.clear();
        YamlConfiguration yml = YamlConfiguration.loadConfiguration(file);
        ConfigurationSection root = yml.getConfigurationSection("npcs");
        if (root != null) {
            for (String id : root.getKeys(false)) {
                ConfigurationSection s = root.getConfigurationSection(id);
                try {
                    Pos pos = Pos.read(s, "location");
                    if (pos == null) throw new IllegalArgumentException("position manquante");
                    Npc npc = new Npc(id, s.getString("name", id), pos);
                    npc.type(EntityType.valueOf(s.getString("type", "VILLAGER")));
                    npc.messages().addAll(s.getStringList("messages"));
                    npc.commands().addAll(s.getStringList("commands"));
                    npc.glowing(s.getBoolean("glowing", false));
                    npc.nameVisible(s.getBoolean("name-visible", true));
                    npcs.put(id, npc);
                } catch (RuntimeException e) {
                    plugin.getLogger().log(Level.WARNING, "PNJ illisible ignoré : " + id, e);
                }
            }
        }
        plugin.getLogger().info(npcs.size() + " PNJ chargé(s)");
    }

    public void save() {
        YamlConfiguration yml = new YamlConfiguration();
        yml.options().setHeader(List.of("PNJ VaeloriaStaff — modifiés en jeu avec /staff → PNJ."));
        for (Npc npc : npcs.values()) {
            ConfigurationSection s = yml.createSection("npcs." + npc.id());
            s.set("name", npc.name());
            s.set("type", npc.type().name());
            npc.pos().write(s, "location");
            s.set("messages", new ArrayList<>(npc.messages()));
            s.set("commands", new ArrayList<>(npc.commands()));
            s.set("glowing", npc.glowing());
            s.set("name-visible", npc.nameVisible());
        }
        YamlFiles.save(yml, file, plugin.getLogger());
    }
}
