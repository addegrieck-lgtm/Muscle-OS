package fr.vaeloria.factions.model;

import org.bukkit.inventory.Inventory;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Une faction. Les champs publics non transient sont sérialisés tels quels dans factions.json. */
public final class Faction {
    public static final String SAFEZONE = "safezone";
    public static final String WARZONE = "warzone";

    public String id;
    public String name;
    public String description = "";
    public long createdAt;
    public boolean open;
    /** Zone système (safezone / warzone) : pas de membres, pas de power. */
    public boolean system;

    public Map<UUID, Role> members = new LinkedHashMap<>();
    /** Souhait de relation envers une autre faction (id → relation). */
    public Map<String, Relation> wishes = new HashMap<>();
    public Map<FPerm, Role> perms = new EnumMap<>(FPerm.class);

    public Pos home;
    public Map<String, Pos> warps = new LinkedHashMap<>();
    public double bank;
    public double powerBoost;

    /** Heure (0-23) de début du bouclier quotidien, -1 si désactivé. */
    public int shieldStart = -1;
    public long shieldChangedAt;

    /** Contenu du coffre de faction, encodé (ItemStack#serializeAsBytes en Base64), null = case vide. */
    public List<String> chest;

    public int kills;
    public int deaths;
    public int raidsDone;
    public int raidsSuffered;
    public int overclaimsDone;
    public int overclaimsSuffered;
    public long blocksDestroyed;
    public int warsWon;
    public int warsLost;
    public int totemsWon;

    /** Webhook Discord de la faction (alertes de pillage, guerres). Jamais affiché en entier. */
    public String discordWebhook;
    /** Mentionner @everyone sur les alertes de pillage. */
    public boolean discordPing;

    /** Journal (/f logs), du plus ancien au plus récent, borné par logs.max. */
    public java.util.List<LogEntry> logs = new java.util.ArrayList<>();

    // ── État d'exécution (non sauvegardé) ──
    public transient Set<ChunkPos> claims;
    public transient Map<UUID, Long> invites;
    public transient Inventory chestInventory;
    /** Fin du verrou de pillage (epoch ms) : pas d'unclaim, de dissolution ni de bouclier pendant un raid. */
    public transient long raidUntil;
    public transient long lastRaidAlert;
    public transient Set<String> raidAttackers;
    public transient ChunkPos lastRaidChunk;
    /** Bilan du pillage en cours, envoyé à la fin du raid. */
    public transient RaidReport raidReport;

    public Faction() {}

    public Faction(String id, String name) {
        this.id = id;
        this.name = name;
        this.createdAt = System.currentTimeMillis();
        initTransient();
    }

    public void initTransient() {
        if (members == null) members = new LinkedHashMap<>();
        if (wishes == null) wishes = new HashMap<>();
        if (perms == null) perms = new EnumMap<>(FPerm.class);
        if (warps == null) warps = new LinkedHashMap<>();
        if (description == null) description = "";
        if (logs == null) logs = new java.util.ArrayList<>();
        claims = ConcurrentHashMap.newKeySet();
        invites = new ConcurrentHashMap<>();
        raidAttackers = new HashSet<>();
    }

    public boolean isSafezone() { return SAFEZONE.equals(id); }
    public boolean isWarzone() { return WARZONE.equals(id); }

    public UUID leader() {
        for (Map.Entry<UUID, Role> e : members.entrySet()) if (e.getValue() == Role.CHEF) return e.getKey();
        return null;
    }

    public Role role(UUID uuid) { return members.get(uuid); }

    public Role permRole(FPerm perm) {
        Role r = perms.get(perm);
        return r == null ? perm.defaultRole() : r;
    }

    public boolean can(UUID uuid, FPerm perm) {
        Role r = members.get(uuid);
        return r != null && r.atLeast(permRole(perm));
    }

    public Relation wishToward(String otherId) {
        Relation r = wishes.get(otherId);
        return r == null ? Relation.NEUTRE : r;
    }

    public boolean inRaid() { return raidUntil > System.currentTimeMillis(); }
}
