package fr.vaeloria.factions.util;

import fr.vaeloria.factions.model.FPerm;
import org.bukkit.Material;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Lecture typée de config.yml. Rechargée par /f admin reload. */
public final class Settings {
    // Factions
    public int nameMin, nameMax, maxMembers, descMax, inviteMinutes;
    public boolean allowRename;
    // Power
    public double powerMax, powerMin, powerStart, regenPerMinute, lossOnDeath, warzoneLossMultiplier;
    public boolean offlineRegen;
    // Claims
    public double claimsPerPower;
    public int claimsMax, claimMaxRadius;
    public boolean mustBeConnected;
    public Set<String> disabledWorlds = new HashSet<>();
    // Surclaim
    public boolean overclaimEnabled, overclaimRequireEnemy, overclaimEdgeOnly, overclaimBroadcast;
    // Explosions / pillage
    public boolean explosionsWilderness, explosionsInClaims, offlineProtection;
    public int raidAlertCooldown, raidLockMinutes;
    public boolean raidBossbar, raidBroadcast;
    public boolean breachEnabled;
    public int breachMinutes;
    public Set<FPerm> breachAllows = EnumSet.noneOf(FPerm.class);
    public boolean protectLiquidFlow, protectFireSpread, protectPistons;
    // Bouclier
    public boolean shieldEnabled, shieldBlocksOverclaim;
    public int shieldHours, shieldCooldownHours;
    public java.time.ZoneId zone = java.time.ZoneId.of("Europe/Paris");
    // Obsidienne
    public boolean obsidianBlockGeneration, obsidianLootReplace, obsidianBarterReplace, obsidianProtectWither;
    public boolean obsidianWildShards;
    public int shardsMin, shardsMax, shardsPerObsidian, durabilityRadius;
    public double oreShardChance;
    public Material shardMaterial = Material.ECHO_SHARD;
    public Map<Material, Integer> reinforced = new EnumMap<>(Material.class);
    // Relations
    public int maxAllies, maxTruces;
    public boolean friendlyFire, allyPvp, trucePvp;
    public Set<FPerm> allyPerms = EnumSet.noneOf(FPerm.class);
    // Téléportation
    public int warmupSeconds, enemyRadius, maxWarps;
    public boolean homeInOwnClaim;
    // Divers
    public int chestRows;
    public boolean flyEnabled;
    public int flyEnemyRadius;
    public String territoryDisplay;
    public boolean chatTags, scoreboardEnabled, bankEnabled;
    public int scoreboardRefreshTicks, inactivityDays, snapshotMinutes, autosaveMinutes;
    // Anti-abus
    public int combatTagSeconds, farmCooldownMinutes, logsMax;
    public boolean combatKillOnLogout, sameIpNoLoss;
    public java.util.List<String> combatBlockedCommands = new java.util.ArrayList<>();
    // Discord
    public boolean discordEnabled;
    public String discordUrlPattern, discordGlobalWebhook;
    public Set<String> discordEvents = new HashSet<>();
    // Totem
    public boolean totemEnabled, totemHologram;
    public double totemBreakSeconds;
    /** Objet obligatoire pour frapper le totem ; null = n'importe lequel. */
    public Material totemRequiredItem;
    public int totemHeight, totemDurationMinutes, totemMinOnline;
    public Material totemMaterial = Material.OBSIDIAN;
    public double totemRewardMoney, totemRewardPower;
    public java.util.List<String> totemRewardCommands = new java.util.ArrayList<>();
    public java.util.List<fr.vaeloria.factions.rules.TotemSchedule.Entry> totemSchedule = new java.util.ArrayList<>();
    public java.util.List<String> totemScheduleErrors = new java.util.ArrayList<>();
    // Guerres
    public boolean warEnabled;
    public int warPreparationMinutes, warDurationHours, warCooldownHours, warMinMembers, warPointsKill, warPointsRaid, warPointsOverclaim;

    public void load(FileConfiguration c) {
        nameMin = c.getInt("factions.name-min", 3);
        nameMax = c.getInt("factions.name-max", 16);
        maxMembers = c.getInt("factions.max-members", 20);
        descMax = c.getInt("factions.description-max", 64);
        inviteMinutes = c.getInt("factions.invite-minutes", 10);
        allowRename = c.getBoolean("factions.allow-rename", true);

        powerMax = c.getDouble("power.max", 10);
        powerMin = c.getDouble("power.min", -10);
        powerStart = c.getDouble("power.start", 5);
        regenPerMinute = c.getDouble("power.regen-per-minute", 0.2);
        offlineRegen = c.getBoolean("power.offline-regen", false);
        lossOnDeath = c.getDouble("power.loss-on-death", 4);
        warzoneLossMultiplier = c.getDouble("power.warzone-loss-multiplier", 1.5);

        claimsPerPower = c.getDouble("claims.per-power", 1.0);
        claimsMax = c.getInt("claims.max", 120);
        claimMaxRadius = c.getInt("claims.max-radius", 5);
        mustBeConnected = c.getBoolean("claims.must-be-connected", true);
        disabledWorlds = new HashSet<>(c.getStringList("claims.disabled-worlds"));

        overclaimEnabled = c.getBoolean("overclaim.enabled", true);
        overclaimRequireEnemy = c.getBoolean("overclaim.require-enemy", true);
        overclaimEdgeOnly = c.getBoolean("overclaim.edge-only", true);
        overclaimBroadcast = c.getBoolean("overclaim.broadcast", true);

        explosionsWilderness = c.getBoolean("explosions.wilderness", true);
        explosionsInClaims = c.getBoolean("explosions.in-claims", true);
        offlineProtection = c.getBoolean("explosions.offline-protection", false);
        raidAlertCooldown = c.getInt("raid.alert-cooldown-seconds", 30);
        raidLockMinutes = c.getInt("raid.lock-minutes", 10);
        raidBossbar = c.getBoolean("raid.bossbar", true);
        raidBroadcast = c.getBoolean("raid.broadcast", true);
        breachEnabled = c.getBoolean("raid.breach.enabled", true);
        breachMinutes = c.getInt("raid.breach.minutes", 15);
        breachAllows = perms(c.getStringList("raid.breach.allow"));
        protectLiquidFlow = c.getBoolean("protection.liquid-flow", true);
        protectFireSpread = c.getBoolean("protection.fire-spread", true);
        protectPistons = c.getBoolean("protection.pistons", true);

        shieldEnabled = c.getBoolean("shield.enabled", true);
        shieldHours = Math.max(1, Math.min(23, c.getInt("shield.hours", 6)));
        shieldCooldownHours = c.getInt("shield.change-cooldown-hours", 72);
        shieldBlocksOverclaim = c.getBoolean("shield.blocks-overclaim", true);
        try {
            zone = java.time.ZoneId.of(c.getString("timezone", "Europe/Paris"));
        } catch (java.time.DateTimeException e) {
            zone = java.time.ZoneId.of("Europe/Paris");
        }

        obsidianBlockGeneration = c.getBoolean("obsidian.block-generation", true);
        obsidianWildShards = c.getBoolean("obsidian.wilderness-drops-shards", true);
        shardsMin = c.getInt("obsidian.shards.min", 1);
        shardsMax = Math.max(shardsMin, c.getInt("obsidian.shards.max", 3));
        shardsPerObsidian = Math.max(1, Math.min(9, c.getInt("obsidian.shards.per-obsidian", 9)));
        oreShardChance = c.getDouble("obsidian.shards.deepslate-ore-chance", 0.03);
        Material sm = Material.matchMaterial(c.getString("obsidian.shards.material", "ECHO_SHARD"));
        shardMaterial = sm == null || !sm.isItem() ? Material.ECHO_SHARD : sm;
        obsidianLootReplace = c.getBoolean("obsidian.replace-in-loot", true);
        obsidianBarterReplace = c.getBoolean("obsidian.replace-in-bartering", true);
        obsidianProtectWither = c.getBoolean("obsidian.protect-from-wither", true);
        durabilityRadius = c.getInt("obsidian.durability-radius", 3);
        reinforced = new EnumMap<>(Material.class);
        ConfigurationSection rs = c.getConfigurationSection("obsidian.durability");
        if (rs != null) {
            for (String k : rs.getKeys(false)) {
                Material m = Material.matchMaterial(k);
                if (m != null && m.isBlock()) reinforced.put(m, Math.max(0, rs.getInt(k)));
            }
        }

        maxAllies = c.getInt("relations.max-allies", 2);
        maxTruces = c.getInt("relations.max-truces", 4);
        friendlyFire = c.getBoolean("relations.friendly-fire", false);
        allyPvp = c.getBoolean("relations.ally-pvp", false);
        trucePvp = c.getBoolean("relations.truce-pvp", false);
        allyPerms = perms(c.getStringList("relations.ally-permissions"));

        warmupSeconds = c.getInt("teleport.warmup-seconds", 5);
        enemyRadius = c.getInt("teleport.enemy-radius", 16);
        homeInOwnClaim = c.getBoolean("teleport.home-must-be-in-claim", true);
        maxWarps = c.getInt("teleport.max-warps", 3);

        chestRows = Math.max(1, Math.min(6, c.getInt("chest.rows", 3)));
        flyEnabled = c.getBoolean("fly.enabled", true);
        flyEnemyRadius = c.getInt("fly.enemy-radius", 32);
        territoryDisplay = c.getString("territory.display", "TITLE").toUpperCase(Locale.ROOT);
        chatTags = c.getBoolean("chat.tags", true);
        scoreboardEnabled = c.getBoolean("scoreboard.enabled", true);
        scoreboardRefreshTicks = Math.max(10, c.getInt("scoreboard.refresh-ticks", 40));
        bankEnabled = c.getBoolean("bank.enabled", true);
        inactivityDays = c.getInt("inactivity.days", 0);
        snapshotMinutes = Math.max(1, c.getInt("bridge.snapshot-minutes", 5));
        autosaveMinutes = Math.max(1, c.getInt("autosave-minutes", 5));

        combatTagSeconds = Math.max(0, c.getInt("combat.tag-seconds", 15));
        combatKillOnLogout = c.getBoolean("combat.kill-on-logout", true);
        combatBlockedCommands = new java.util.ArrayList<>();
        for (String cmd : c.getStringList("combat.blocked-commands")) {
            combatBlockedCommands.add(cmd.toLowerCase(Locale.ROOT).replaceFirst("^/", "").trim());
        }
        farmCooldownMinutes = Math.max(0, c.getInt("power.farm-cooldown-minutes", 15));
        sameIpNoLoss = c.getBoolean("power.same-ip-no-loss", true);
        logsMax = Math.max(20, c.getInt("logs.max", 300));

        discordEnabled = c.getBoolean("discord.enabled", true);
        discordUrlPattern = c.getString("discord.url-pattern", "");
        discordGlobalWebhook = c.getString("discord.global-webhook", "");
        discordEvents = new HashSet<>();
        for (String e : c.getStringList("discord.events")) discordEvents.add(e.toUpperCase(Locale.ROOT));

        totemEnabled = c.getBoolean("totem.enabled", true);
        totemHeight = Math.max(1, Math.min(20, c.getInt("totem.height", 5)));
        Material tm = Material.matchMaterial(c.getString("totem.material", "OBSIDIAN"));
        totemMaterial = tm == null || !tm.isBlock() ? Material.OBSIDIAN : tm;
        totemBreakSeconds = Math.max(0.5, Math.min(120, c.getDouble("totem.break-seconds", 7.5)));
        String req = c.getString("totem.required-item", "DIAMOND_SWORD");
        totemRequiredItem = req == null || req.isBlank() || req.equalsIgnoreCase("AUCUN") || req.equalsIgnoreCase("ANY") ? null : Material.matchMaterial(req);
        totemHologram = c.getBoolean("totem.hologram", true);
        totemDurationMinutes = Math.max(1, c.getInt("totem.duration-minutes", 30));
        totemMinOnline = Math.max(0, c.getInt("totem.min-online", 0));
        totemRewardMoney = Math.max(0, c.getDouble("totem.reward.money", 0));
        totemRewardPower = c.getDouble("totem.reward.power-boost", 0);
        totemRewardCommands = new java.util.ArrayList<>(c.getStringList("totem.reward.commands"));
        totemSchedule = new java.util.ArrayList<>();
        totemScheduleErrors = new java.util.ArrayList<>();
        for (String e : c.getStringList("totem.schedule")) {
            var entry = fr.vaeloria.factions.rules.TotemSchedule.parse(e);
            if (entry == null) totemScheduleErrors.add(e);
            else totemSchedule.add(entry);
        }

        warEnabled = c.getBoolean("war.enabled", true);
        warPreparationMinutes = Math.max(0, c.getInt("war.preparation-minutes", 15));
        warDurationHours = Math.max(1, c.getInt("war.duration-hours", 48));
        warCooldownHours = Math.max(0, c.getInt("war.cooldown-hours", 72));
        warMinMembers = Math.max(1, c.getInt("war.min-members", 2));
        warPointsKill = c.getInt("war.points.kill", 1);
        warPointsRaid = c.getInt("war.points.raid", 5);
        warPointsOverclaim = c.getInt("war.points.overclaim", 10);
    }

    private static Set<FPerm> perms(java.util.List<String> names) {
        Set<FPerm> out = EnumSet.noneOf(FPerm.class);
        for (String n : names) {
            FPerm p = FPerm.parse(n);
            if (p != null) out.add(p);
        }
        return out;
    }
}
