package fr.vaeloria.fakeplayers.market;

import fr.vaeloria.fakeplayers.brain.Text;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lecture d'une demande d'objet écrite dans le chat : « je cherche casque protection IV », « qqn vend 16 perles ? »,
 * « wtb épée diam sharp 5 ». Retourne le matériau Bukkit, la quantité et les enchantements (clés minecraft:…), ou
 * null si le message n'est pas une demande ou si l'objet n'est pas reconnu. Indépendant de Bukkit.
 */
public record ItemRequest(String material, int amount, Map<String, Integer> enchants, String label) {

    /** Mots qui font d'un message une demande d'achat (texte normalisé, mots entiers). */
    private static final List<String> WANT = List.of("je cherche", "jcherche", "cherche", "je recherche", "recherche",
            "qui vend", "qqn vend", "qq1 vend", "quelqu un vend", "quelqu un aurait", "qqn aurait", "qui aurait",
            "qui a", "qqn a", "qq1 a", "quelqu un a", "qui me vend", "qqn me vend", "besoin d", "besoin de",
            "j ai besoin", "jai besoin", "j achete", "jachete", "achete", "wtb", "vous avez", "vous auriez",
            "y a qqn qui vend", "qui peut me vendre");
    /** Il vend, il ne cherche pas. */
    private static final List<String> SELLING = List.of("je vends", "jvends", "vends", "wts", "a vendre", "je vend");

    private record Piece(String suffix, String label, Set<String> allowed) {}

    private static final Set<String> ARMOR = Set.of("protection", "unbreaking", "mending", "thorns",
            "fire_protection", "blast_protection", "projectile_protection");
    private static final Set<String> MELEE = Set.of("sharpness", "unbreaking", "mending", "fire_aspect", "looting",
            "knockback", "smite", "sweeping_edge");
    private static final Set<String> TOOL = Set.of("efficiency", "unbreaking", "mending", "fortune", "silk_touch");

    private static final Map<String, Piece> PIECES = new LinkedHashMap<>();
    private static final Map<String, String> TIERS = new LinkedHashMap<>();
    private static final Map<String, String> TIER_LABEL = Map.of("DIAMOND", "diam", "IRON", "fer",
            "NETHERITE", "netherite", "GOLDEN", "or", "CHAINMAIL", "maille", "LEATHER", "cuir", "STONE", "pierre");

    /** Objets simples : matériau, quantité par défaut, nom court pour le chat. */
    private record Simple(String material, int defaultAmount, String label, Set<String> allowed) {}
    private static final Map<String, Simple> SIMPLE = new LinkedHashMap<>();

    /** Enchantements : alias → clé minecraft. */
    private static final Map<String, String> ENCHANTS = new LinkedHashMap<>();
    private static final Map<String, Integer> MAX_LEVEL = Map.ofEntries(Map.entry("protection", 4),
            Map.entry("sharpness", 5), Map.entry("unbreaking", 3), Map.entry("efficiency", 5), Map.entry("fortune", 3),
            Map.entry("silk_touch", 1), Map.entry("mending", 1), Map.entry("power", 5), Map.entry("punch", 2),
            Map.entry("flame", 1), Map.entry("infinity", 1), Map.entry("feather_falling", 4),
            Map.entry("depth_strider", 3), Map.entry("respiration", 3), Map.entry("thorns", 3),
            Map.entry("fire_aspect", 2), Map.entry("looting", 3), Map.entry("knockback", 2), Map.entry("smite", 5),
            Map.entry("sweeping_edge", 3), Map.entry("fire_protection", 4), Map.entry("blast_protection", 4),
            Map.entry("projectile_protection", 4), Map.entry("aqua_affinity", 1));
    private static final Map<String, String> ENCHANT_LABEL = Map.ofEntries(Map.entry("protection", "prot"),
            Map.entry("sharpness", "tranchant"), Map.entry("unbreaking", "solidité"), Map.entry("efficiency", "effi"),
            Map.entry("fortune", "fortune"), Map.entry("silk_touch", "toucher de soie"),
            Map.entry("mending", "raccommodage"), Map.entry("power", "puissance"), Map.entry("punch", "frappe"),
            Map.entry("flame", "flamme"), Map.entry("infinity", "infinité"), Map.entry("feather_falling", "chute amortie"),
            Map.entry("depth_strider", "agilité aquatique"), Map.entry("respiration", "apnée"),
            Map.entry("thorns", "épines"), Map.entry("fire_aspect", "aura de feu"), Map.entry("looting", "butin"),
            Map.entry("knockback", "recul"), Map.entry("smite", "châtiment"), Map.entry("sweeping_edge", "affilage"),
            Map.entry("fire_protection", "prot feu"), Map.entry("blast_protection", "prot explosions"),
            Map.entry("projectile_protection", "prot projectiles"), Map.entry("aqua_affinity", "affinité aquatique"));

    static {
        Set<String> boots = union(ARMOR, Set.of("feather_falling", "depth_strider"));
        Set<String> helmet = union(ARMOR, Set.of("respiration", "aqua_affinity"));
        piece("HELMET", "casque", helmet, "casque", "casques", "helmet");
        piece("CHESTPLATE", "plastron", ARMOR, "plastron", "plastrons", "plastro", "chestplate", "plast");
        piece("LEGGINGS", "jambières", ARMOR, "jambieres", "jambiere", "jambière", "pantalon", "jambs", "leggings");
        piece("BOOTS", "bottes", boots, "bottes", "botte", "boots");
        piece("SWORD", "épée", MELEE, "epee", "epees", "sword", "epe");
        piece("AXE", "hache", union(TOOL, Set.of("sharpness", "smite")), "hache", "haches", "axe");
        piece("PICKAXE", "pioche", TOOL, "pioche", "pioches", "pickaxe", "pio");
        piece("SHOVEL", "pelle", TOOL, "pelle", "pelles", "shovel");

        tier("NETHERITE", "netherite", "netherit", "neth");
        tier("DIAMOND", "diamant", "diamants", "diam", "dia");
        tier("IRON", "fer");
        tier("GOLDEN", "or", "dore", "doree");
        tier("CHAINMAIL", "maille", "mailles", "cotte de maille");
        tier("LEATHER", "cuir");
        tier("STONE", "pierre");

        Set<String> bow = Set.of("power", "punch", "flame", "infinity", "unbreaking", "mending");
        simple("BOW", 1, "arc", bow, "arc", "arcs", "bow");
        simple("CROSSBOW", 1, "arbalète", Set.of("unbreaking", "mending", "quick_charge", "multishot", "piercing"),
                "arbalete", "arbaletes", "crossbow");
        simple("SHIELD", 1, "bouclier", Set.of("unbreaking", "mending"), "bouclier", "shield");
        simple("TRIDENT", 1, "trident", Set.of(), "trident");
        simple("ELYTRA", 1, "élytres", Set.of(), "elytra", "elytres", "elytre", "elytras", "ely");
        simple("TOTEM_OF_UNDYING", 1, "totem", Set.of(), "totem", "totems", "totem d immortalite");
        simple("ENCHANTED_GOLDEN_APPLE", 4, "pommes de notch", Set.of(), "pomme de notch", "pommes de notch",
                "pomme cheat", "pommes cheat", "notch apple", "god apple", "cheat apple", "egap");
        simple("GOLDEN_APPLE", 16, "pommes d'or", Set.of(), "pomme d or", "pommes d or", "pomme doree", "pommes dorees",
                "gapple", "gapples", "gap", "gaps", "pommes en or", "pomme en or");
        simple("ENDER_PEARL", 16, "perles", Set.of(), "perle", "perles", "ender pearl", "ender pearls", "epearl",
                "epearls", "pearl", "pearls", "perles de l ender", "perle de l ender", "ep");
        simple("OBSIDIAN", 64, "obsi", Set.of(), "obsi", "obsidienne", "obsidian", "obsidiennes", "obsis");
        simple("EXPERIENCE_BOTTLE", 64, "fioles d'xp", Set.of(), "fiole d xp", "fioles d xp", "bouteille d xp",
                "bouteilles d xp", "xp bottle", "xp bottles", "fioles", "bouteilles xp");
        simple("BLAZE_ROD", 16, "blaze rods", Set.of(), "blaze rod", "blaze rods", "baton de blaze", "batons de blaze",
                "blazerod", "blazerods");
        simple("GOLDEN_CARROT", 64, "carottes dorées", Set.of(), "carotte doree", "carottes dorees", "golden carrot",
                "golden carrots", "carottes d or", "carotte d or");
        simple("TNT", 32, "tnt", Set.of(), "tnt");
        simple("ARROW", 64, "flèches", Set.of(), "fleche", "fleches", "arrow", "arrows");
        simple("COOKED_BEEF", 64, "steaks", Set.of(), "steak", "steaks", "boeuf cuit");
        simple("EMERALD", 32, "émeraudes", Set.of(), "emeraude", "emeraudes", "emerald", "emeralds");
        simple("IRON_INGOT", 64, "lingots de fer", Set.of(), "lingot de fer", "lingots de fer", "iron", "fer en lingot");
        simple("GOLD_INGOT", 64, "lingots d'or", Set.of(), "lingot d or", "lingots d or");
        simple("NETHERITE_INGOT", 1, "lingot de netherite", Set.of(), "lingot de netherite", "lingots de netherite",
                "netherite ingot");
        simple("DIAMOND", 16, "diamants", Set.of(), "diamant", "diamants", "diams", "diamond", "diamonds");
        simple("ENDER_CHEST", 1, "ender chest", Set.of(), "ender chest", "enderchest", "coffre de l ender", "ec");
        simple("SHULKER_BOX", 1, "shulker", Set.of(), "shulker", "shulkers", "shulker box", "boite de shulker");
        simple("ENCHANTING_TABLE", 1, "table d'enchant", Set.of(), "table d enchant", "table d enchantement",
                "table enchant");
        simple("ANVIL", 1, "enclume", Set.of(), "enclume", "anvil");
        simple("BEACON", 1, "beacon", Set.of(), "beacon", "balise");
        simple("SPLASH_POTION", 8, "potions", Set.of(), "potion", "potions", "popo", "popos");
        simple("ENCHANTED_BOOK", 1, "livre", MAX_LEVEL.keySet(), "livre", "livres", "livre enchante",
                "livres enchantes", "book", "bouquin");

        enchant("protection", "protection", "prot", "protec", "protect");
        enchant("sharpness", "tranchant", "sharpness", "sharp", "tranch");
        enchant("unbreaking", "solidite", "unbreaking", "unbr", "unbreak", "solid");
        enchant("efficiency", "efficacite", "efficiency", "effi", "eff", "efficace");
        enchant("fortune", "fortune");
        enchant("silk_touch", "toucher de soie", "silk touch", "silk", "soie", "toucher soie");
        enchant("mending", "raccommodage", "raccomodage", "mending", "raccom", "racco");
        enchant("power", "puissance", "power");
        enchant("punch", "frappe", "punch");
        enchant("flame", "flamme", "flame");
        enchant("infinity", "infinite", "infinity", "infini", "infinie");
        enchant("feather_falling", "chute amortie", "feather falling", "feather");
        enchant("depth_strider", "agilite aquatique", "depth strider", "depth");
        enchant("respiration", "apnee", "respiration");
        enchant("thorns", "epines", "thorns", "epine");
        enchant("fire_aspect", "aura de feu", "fire aspect", "aura feu");
        enchant("looting", "butin", "looting");
        enchant("knockback", "recul", "knockback", "kb");
        enchant("smite", "chatiment", "smite");
        enchant("sweeping_edge", "affilage", "sweeping edge", "sweeping");
        enchant("fire_protection", "protection contre le feu", "fire protection", "prot feu");
        enchant("blast_protection", "protection contre les explosions", "blast protection", "prot explo");
        enchant("projectile_protection", "protection contre les projectiles", "projectile protection");
    }

    /** « p4 », « t5 », « e5 », « s3 », « u3 » : raccourcis courants (protection IV, tranchant V…). */
    private static final Pattern SHORT = Pattern.compile("\\b([ptesu])([1-5])\\b");
    private static final Map<String, String> SHORT_KEYS = Map.of("p", "protection", "t", "sharpness",
            "e", "efficiency", "s", "unbreaking", "u", "unbreaking");
    private static final Pattern LEVEL = Pattern.compile("^(?:lvl |niveau |level |niv )?(v|iv|iii|ii|i|[1-5])\\b");
    private static final Pattern QTY = Pattern.compile("(?:\\bx ?(\\d{1,4})\\b|\\b(\\d{1,4}) ?x\\b|"
            + "\\b(?:un|une|deux|trois|quatre|cinq|dix|\\d{1,2}) (stacks?)\\b|\\b(stacks?)\\b|\\b(\\d{1,4})\\b)");

    /** Demande reconnue dans un message brut, ou null. */
    public static ItemRequest parse(String message) {
        String n = Text.normalize(message.replace("'", " ").replace("’", " "));
        if (n.isEmpty()) return null;
        boolean wants = false;
        for (String w : WANT) if (Text.containsWords(n, w)) { wants = true; break; }
        if (!wants) return null;
        for (String s : SELLING) if (Text.containsWords(n, s)) return null;

        // Objet : d'abord les pièces d'armure et les outils (avec leur matière), puis les objets simples.
        String material = null, label = null;
        Set<String> allowed = Set.of();
        int defAmount = 1, at = -1;
        for (Map.Entry<String, Piece> e : PIECES.entrySet()) {
            int i = indexOfWords(n, e.getKey());
            if (i >= 0 && (at < 0 || i < at)) {
                at = i;
                Piece p = e.getValue();
                String tier = tierNear(n, i + e.getKey().length());
                String tierKey = tier == null ? "DIAMOND" : tier; // casque protection IV : en diamant par défaut
                material = tierKey + "_" + p.suffix();
                label = p.label() + " " + TIER_LABEL.get(tierKey);
                allowed = p.allowed();
            }
        }
        if (material == null) {
            for (Map.Entry<String, Simple> e : SIMPLE.entrySet()) {
                int i = indexOfWords(n, e.getKey());
                if (i < 0 || (at >= 0 && i >= at)) continue;
                // « livre » : seulement avec un enchantement, sinon c'est un livre normal ou une phrase.
                at = i;
                Simple s = e.getValue();
                material = s.material();
                label = s.label();
                allowed = s.allowed();
                defAmount = s.defaultAmount();
            }
        }
        if (material == null) return null;

        Map<String, Integer> enchants = enchantments(n);
        for (String key : enchants.keySet()) if (!allowed.contains(key)) return null; // « arc tranchant » : incohérent
        if (material.equals("ENCHANTED_BOOK")) {
            if (enchants.size() != 1) return null; // un livre = un enchantement, comme au shop
        }
        if (material.equals("BOW") && enchants.containsKey("infinity") && enchants.containsKey("mending")) return null;
        if (material.equals("SPLASH_POTION")) return null; // type de potion trop vague pour un prix juste

        int amount = defAmount == 1 ? 1 : quantity(n, defAmount);
        StringBuilder full = new StringBuilder(amount > 1 ? amount + " " + label : label);
        for (Map.Entry<String, Integer> e : enchants.entrySet()) {
            full.append(' ').append(ENCHANT_LABEL.getOrDefault(e.getKey(), e.getKey()));
            if (MAX_LEVEL.getOrDefault(e.getKey(), 1) > 1) full.append(' ').append(e.getValue());
        }
        return new ItemRequest(material, amount, Map.copyOf(enchants), full.toString());
    }

    /** Enchantements cités, avec leur niveau (niveau maximum si non précisé). */
    static Map<String, Integer> enchantments(String n) {
        Map<String, Integer> out = new LinkedHashMap<>();
        // Les alias les plus longs d'abord (« protection contre le feu » avant « protection »).
        List<Map.Entry<String, String>> aliases = new ArrayList<>(ENCHANTS.entrySet());
        aliases.sort((a, b) -> b.getKey().length() - a.getKey().length());
        String rest = " " + n + " ";
        for (Map.Entry<String, String> e : aliases) {
            String alias = " " + e.getKey() + " ";
            int i = rest.indexOf(alias);
            while (i >= 0) {
                String after = rest.substring(i + alias.length());
                Matcher m = LEVEL.matcher(after);
                int max = MAX_LEVEL.getOrDefault(e.getValue(), 1);
                int level = m.find() ? Math.min(max, roman(m.group(1))) : max;
                if (!out.containsKey(e.getValue())) out.put(e.getValue(), Math.max(1, level));
                rest = rest.substring(0, i) + " " + " ".repeat(alias.length() - 1) + rest.substring(i + alias.length());
                i = rest.indexOf(alias);
            }
        }
        Matcher s = SHORT.matcher(rest);
        while (s.find()) {
            String key = SHORT_KEYS.get(s.group(1));
            int level = Math.min(MAX_LEVEL.get(key), Integer.parseInt(s.group(2)));
            out.putIfAbsent(key, level);
        }
        return out;
    }

    private static int quantity(String n, int def) {
        Matcher m = QTY.matcher(n);
        while (m.find()) {
            if (m.group(1) != null) return clampQty(Integer.parseInt(m.group(1)));
            if (m.group(2) != null) return clampQty(Integer.parseInt(m.group(2)));
            if (m.group(3) != null || m.group(4) != null) return 64; // une annonce = une pile au plus
            if (m.group(5) != null) {
                int v = Integer.parseInt(m.group(5));
                if (v >= 1 && v <= 64 && !levelContext(n, m.start(5))) return v;
            }
        }
        return def;
    }

    /** « protection 4 » : ce 4 est un niveau, pas une quantité. */
    private static boolean levelContext(String n, int index) {
        String before = n.substring(0, index).trim();
        for (String alias : ENCHANTS.keySet()) if (before.endsWith(alias)) return true;
        return before.endsWith("lvl") || before.endsWith("niveau") || before.endsWith("level");
    }

    private static int clampQty(int v) { return Math.max(1, Math.min(64, v)); }

    private static int roman(String s) {
        return switch (s) {
            case "i" -> 1; case "ii" -> 2; case "iii" -> 3; case "iv" -> 4; case "v" -> 5;
            default -> Integer.parseInt(s);
        };
    }

    /** Matière juste après la pièce (« casque diam », « casque en diamant ») ou juste avant (« full diam casque »). */
    private static String tierNear(String n, int from) {
        String after = n.substring(Math.min(n.length(), from)).trim();
        if (after.startsWith("en ")) after = after.substring(3);
        if (after.startsWith("de ")) after = after.substring(3);
        for (Map.Entry<String, String> t : TIERS.entrySet()) {
            if ((after + " ").startsWith(t.getKey() + " ")) return t.getValue();
        }
        for (Map.Entry<String, String> t : TIERS.entrySet()) {
            if (t.getKey().equals("or")) continue; // « or » isolé : trop ambigu loin de la pièce
            if (Text.containsWords(n, t.getKey())) return t.getValue();
        }
        return null;
    }

    private static int indexOfWords(String n, String phrase) {
        int i = (" " + n + " ").indexOf(" " + phrase + " ");
        return i;
    }

    private static void piece(String suffix, String label, Set<String> allowed, String... aliases) {
        for (String a : aliases) PIECES.put(Text.normalize(a), new Piece(suffix, label, allowed));
    }

    private static void tier(String key, String... aliases) {
        for (String a : aliases) TIERS.put(a, key);
    }

    private static void simple(String material, int amount, String label, Set<String> allowed, String... aliases) {
        for (String a : aliases) SIMPLE.put(Text.normalize(a), new Simple(material, amount, label, allowed));
    }

    private static void enchant(String key, String... aliases) {
        for (String a : aliases) ENCHANTS.put(Text.normalize(a), key);
    }

    @SafeVarargs
    private static Set<String> union(Set<String>... sets) {
        java.util.HashSet<String> out = new java.util.HashSet<>();
        for (Set<String> s : sets) out.addAll(s);
        return Set.copyOf(out);
    }
}
