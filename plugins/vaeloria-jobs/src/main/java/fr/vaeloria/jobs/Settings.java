package fr.vaeloria.jobs;

import fr.vaeloria.jobs.model.Effect;
import fr.vaeloria.jobs.model.LevelCurve;
import fr.vaeloria.jobs.model.SkillNode;
import fr.vaeloria.jobs.model.SkillTree;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.Registry;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.entity.EntityType;

import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.logging.Logger;

/** Lecture de config.yml. Une erreur dans un nœud est signalée et le nœud ignoré ; le reste fonctionne. */
public record Settings(LevelCurve curve, long resetCooldownMillis, boolean actionBar, Set<Integer> announceLevels,
                       boolean ignorePlaced, double spawnerMultiplier, boolean ignoreCreative, Set<String> effectWorlds,
                       Map<String, Job> jobs) {

    /** Un métier : nom, icône, arbre et sources d'XP. */
    public record Job(String id, String name, Material icon, String treeName, List<String> description, SkillTree tree,
                      Map<Material, Double> breakXp, Map<Material, Double> harvestXp,
                      Map<EntityType, Double> killXp, Map<EntityType, Double> breedXp,
                      Map<Material, Double> craftXp, Map<Material, Double> smeltXp,
                      double fishXp, double enchantPerLevel, double brewPerPotion, double smithXp) {}

    public Job job(String id) {
        return id == null ? null : jobs.get(id.toLowerCase(Locale.ROOT));
    }

    /** Matériaux dont la pose doit être suivie (cassés pour de l'XP). */
    public Set<Material> trackedBlocks() {
        Set<Material> s = new HashSet<>();
        for (Job j : jobs.values()) s.addAll(j.breakXp().keySet());
        return s;
    }

    public boolean effectsApplyIn(String world) {
        return effectWorlds.isEmpty() || effectWorlds.contains(world.toLowerCase(Locale.ROOT));
    }

    public static Settings load(FileConfiguration c, Logger log) {
        LevelCurve curve;
        try {
            curve = new LevelCurve(c.getDouble("progression.base", 20), c.getDouble("progression.exponent", 1.5),
                    c.getInt("progression.max-level", 30), c.getInt("progression.points-per-level", 1));
        } catch (IllegalArgumentException e) {
            log.severe("progression : " + e.getMessage() + " — valeurs par défaut utilisées.");
            curve = new LevelCurve(20, 1.5, 30, 1);
        }
        Set<String> worlds = new HashSet<>();
        for (String w : c.getStringList("effects.worlds")) worlds.add(w.toLowerCase(Locale.ROOT));

        Map<String, Job> jobs = new LinkedHashMap<>();
        ConfigurationSection js = c.getConfigurationSection("jobs");
        if (js != null) {
            for (String id : js.getKeys(false)) {
                ConfigurationSection s = js.getConfigurationSection(id);
                if (s == null) continue;
                String key = id.toLowerCase(Locale.ROOT);
                if (!key.matches("[a-z0-9_]+")) {
                    log.warning("Métier « " + id + " » : identifiant en minuscules, chiffres et _ uniquement. Ignoré.");
                    continue;
                }
                Job job = loadJob(key, s, curve, log);
                jobs.put(key, job);
            }
        }
        if (jobs.isEmpty()) log.warning("Aucun métier configuré.");
        return new Settings(curve, (long) (c.getDouble("progression.reset-cooldown-hours", 24) * 3_600_000L),
                c.getBoolean("progression.action-bar", true), new HashSet<>(c.getIntegerList("progression.announce-levels")),
                c.getBoolean("anti-abuse.ignore-placed-blocks", true), Math.max(0, c.getDouble("anti-abuse.spawner-multiplier", 0.25)),
                c.getBoolean("anti-abuse.ignore-creative", true), Collections.unmodifiableSet(worlds),
                Collections.unmodifiableMap(jobs));
    }

    private static Job loadJob(String id, ConfigurationSection s, LevelCurve curve, Logger log) {
        String where = "jobs." + id;
        List<SkillNode> nodes = new ArrayList<>();
        ConfigurationSection ns = s.getConfigurationSection("nodes");
        if (ns != null) {
            for (String nid : ns.getKeys(false)) {
                ConfigurationSection n = ns.getConfigurationSection(nid);
                if (n == null) continue;
                try {
                    nodes.add(loadNode(nid, n));
                } catch (IllegalArgumentException e) {
                    log.warning(where + ".nodes." + nid + " : " + e.getMessage() + " — nœud ignoré.");
                }
            }
        }
        SkillTree tree = new SkillTree(nodes);
        List<String> errors = tree.validate();
        if (!errors.isEmpty()) {
            errors.forEach(e -> log.severe(where + " : " + e));
            log.severe(where + " : arbre invalide, désactivé tant que la config n'est pas corrigée.");
            tree = new SkillTree(List.of());
        } else if (tree.totalCost() > curve.pointsAt(curve.maxLevel())) {
            log.warning(where + " : l'arbre coûte " + tree.totalCost() + " points mais le niveau max n'en donne que "
                    + curve.pointsAt(curve.maxLevel()) + " (des choix seront nécessaires).");
        }
        ConfigurationSection xp = s.getConfigurationSection("xp");
        return new Job(id, s.getString("name", id), material(s.getString("icon"), Material.BOOK, where, log),
                s.getString("tree", "Arbre de protection"), s.getStringList("description"), tree,
                materials(xp, "break", where, log, true), materials(xp, "harvest", where, log, true),
                entities(xp, "kill", where, log), entities(xp, "breed", where, log),
                materials(xp, "craft", where, log, false), materials(xp, "smelt", where, log, false),
                xp == null ? 0 : xp.getDouble("fish", 0), xp == null ? 0 : xp.getDouble("enchant-per-level", 0),
                xp == null ? 0 : xp.getDouble("brew-per-potion", 0), xp == null ? 0 : xp.getDouble("smith", 0));
    }

    private static SkillNode loadNode(String id, ConfigurationSection n) {
        if (!id.matches("[a-z0-9_]+")) throw new IllegalArgumentException("identifiant en minuscules, chiffres et _ uniquement");
        List<Effect> effects = new ArrayList<>();
        for (Map<?, ?> m : n.getMapList("effects")) effects.add(effect(m));
        String icon = n.getString("icon", "BOOK");
        if (Material.matchMaterial(icon) == null) throw new IllegalArgumentException("icône inconnue " + icon);
        return new SkillNode(id, n.getString("name", id), icon, n.getInt("slot", -1), n.getInt("level", 0),
                n.getInt("cost", 1), n.getStringList("requires"), effects, n.getStringList("description"),
                n.getIntegerList("links"));
    }

    private static Effect effect(Map<?, ?> m) {
        Object attribute = m.get("attribute");
        Object potion = m.get("potion");
        if (attribute != null) {
            Effect e = Effect.attribute(attribute.toString(), number(m.get("amount"), 0),
                    Effect.Operation.parse(m.get("operation") == null ? null : m.get("operation").toString()));
            if (Registry.ATTRIBUTE.get(NamespacedKey.minecraft(e.key())) == null) {
                throw new IllegalArgumentException("attribut vanilla inconnu « " + e.key() + " »");
            }
            return e;
        }
        if (potion != null) {
            Effect e = Effect.potion(potion.toString(), (int) number(m.get("level"), 1));
            if (Registry.EFFECT.get(NamespacedKey.minecraft(e.key())) == null) {
                throw new IllegalArgumentException("effet de potion vanilla inconnu « " + e.key() + " »");
            }
            return e;
        }
        throw new IllegalArgumentException("effet sans « attribute » ni « potion »");
    }

    private static double number(Object o, double def) {
        if (o instanceof Number n) return n.doubleValue();
        if (o == null) return def;
        try {
            return Double.parseDouble(o.toString());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("nombre invalide « " + o + " »");
        }
    }

    private static Material material(String name, Material def, String where, Logger log) {
        if (name == null) return def;
        Material m = Material.matchMaterial(name);
        if (m == null) {
            log.warning(where + " : matériau inconnu " + name);
            return def;
        }
        return m;
    }

    private static Map<Material, Double> materials(ConfigurationSection xp, String path, String where, Logger log, boolean blocks) {
        Map<Material, Double> map = new EnumMap<>(Material.class);
        ConfigurationSection s = xp == null ? null : xp.getConfigurationSection(path);
        if (s == null) return map;
        for (String k : s.getKeys(false)) {
            Material m = Material.matchMaterial(k);
            if (m == null || (blocks && !m.isBlock())) {
                log.warning(where + ".xp." + path + " : " + (blocks ? "bloc" : "objet") + " inconnu " + k);
                continue;
            }
            double v = s.getDouble(k);
            if (v > 0) map.put(m, v);
        }
        return map;
    }

    private static Map<EntityType, Double> entities(ConfigurationSection xp, String path, String where, Logger log) {
        Map<EntityType, Double> map = new EnumMap<>(EntityType.class);
        ConfigurationSection s = xp == null ? null : xp.getConfigurationSection(path);
        if (s == null) return map;
        for (String k : s.getKeys(false)) {
            EntityType t;
            try {
                t = EntityType.valueOf(k.toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                log.warning(where + ".xp." + path + " : entité inconnue " + k);
                continue;
            }
            double v = s.getDouble(k);
            if (v > 0) map.put(t, v);
        }
        return map;
    }
}
