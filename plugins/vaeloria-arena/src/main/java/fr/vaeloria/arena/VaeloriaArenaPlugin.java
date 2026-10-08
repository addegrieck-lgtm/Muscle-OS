package fr.vaeloria.arena;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.NamespacedKey;
import org.bukkit.World;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Entity;
import org.bukkit.entity.LivingEntity;
import org.bukkit.entity.Player;
import org.bukkit.entity.Projectile;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityCombustByBlockEvent;
import org.bukkit.event.entity.EntityCombustByEntityEvent;
import org.bukkit.event.entity.EntityCombustEvent;
import org.bukkit.event.entity.EntityDamageByEntityEvent;
import org.bukkit.event.entity.EntityDeathEvent;
import org.bukkit.event.entity.EntityTargetEvent;
import org.bukkit.event.entity.EntityTransformEvent;
import org.bukkit.event.world.EntitiesLoadEvent;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.List;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;

/**
 * VæloriaArena : des bots s'affrontent en équipes (Rouge / Bleu) dans une arène, en stuff diamant P4 U3,
 * hache Sharpness V en main. Avant chaque combat, les joueurs parient leur monnaie sur une équipe (pari mutuel,
 * via Vault). Spectacle pour les joueurs autour (titres, kill feed, MVP) ; les bots ne touchent jamais les joueurs.
 */
public final class VaeloriaArenaPlugin extends JavaPlugin implements Listener {
    private NamespacedKey botKey;
    private ArenaMatch match;
    private Bank bank;
    private long lastMatchEndMillis = System.currentTimeMillis();

    @Override
    public void onEnable() {
        saveDefaultConfig();
        botKey = new NamespacedKey(this, "bot");
        bank = Bank.create();
        if (bank == null) getLogger().warning("Vault ou plugin d'économie absent : les combats auront lieu SANS paris.");
        BetDesk.refundLeftovers(this, bank);
        getServer().getPluginManager().registerEvents(this, this);
        // Bots laissés par un arrêt brutal du serveur.
        for (World w : Bukkit.getWorlds()) w.getEntities().forEach(this::removeIfOrphan);
        Bukkit.getScheduler().runTaskTimer(this, this::autoMatch, 20L * 60, 20L * 30);
    }

    /** Combats automatiques à l'arène du spawn (auto.enabled), s'il y a assez de joueurs connectés. */
    private void autoMatch() {
        if (!getConfig().getBoolean("auto.enabled", false) || match != null) return;
        if (Bukkit.getOnlinePlayers().size() < getConfig().getInt("auto.min-players-online", 3)) return;
        long interval = getConfig().getLong("auto.interval-minutes", 20) * 60_000L;
        if (System.currentTimeMillis() - lastMatchEndMillis < interval) return;
        List<Integer> sizes = getConfig().getIntegerList("auto.team-sizes");
        int size = sizes.isEmpty() ? getConfig().getInt("match.default-team-size", 3)
                : sizes.get(ThreadLocalRandom.current().nextInt(sizes.size()));
        String error = startMatch(Math.max(1, Math.min(size, getConfig().getInt("match.max-team-size", 10))));
        if (error != null) getLogger().warning("Combat automatique impossible : " + error);
    }

    @Override
    public void onDisable() {
        if (match != null) match.abort();
    }

    NamespacedKey botKey() {
        return botKey;
    }

    void matchFinished(ArenaMatch m) {
        if (match == m) {
            match = null;
            lastMatchEndMillis = System.currentTimeMillis();
        }
    }

    private boolean isTaggedBot(Entity e) {
        return e.getPersistentDataContainer().has(botKey, PersistentDataType.STRING);
    }

    private void removeIfOrphan(Entity e) {
        if (isTaggedBot(e) && (match == null || !match.owns(e))) e.remove();
    }

    private ArenaMatch.Bot liveBot(Entity e) {
        return match == null ? null : match.bot(e);
    }

    // ------------------------------------------------------------------ commandes

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (command.getName().equalsIgnoreCase("pari")) {
            pari(sender, label, args);
            return true;
        }
        String sub = args.length == 0 ? "aide" : args[0].toLowerCase(Locale.ROOT);
        switch (sub) {
            case "setcentre", "setcenter" -> setCenter(sender, args);
            case "start", "lancer" -> start(sender, args);
            case "stop" -> {
                if (match == null) sender.sendMessage("§7Aucun combat en cours.");
                else match.abort();
            }
            case "statut", "status" -> sender.sendMessage(match == null ? "§7Aucun combat en cours." : "§6Arène : §f" + match.status());
            case "reload" -> {
                reloadConfig();
                if (bank == null) bank = Bank.create();
                sender.sendMessage("§aConfiguration rechargée (appliquée au prochain combat).");
            }
            default -> {
                sender.sendMessage("§6/" + label + " setcentre [rayon] §7— centre de l'arène à ta position");
                sender.sendMessage("§6/" + label + " start [bots par équipe] §7— lance un combat P4 U3 (paris d'abord)");
                sender.sendMessage("§7Paris : " + (bank == null ? "§cdésactivés (Vault absent)" : "§aactifs") + "§7 — combats auto : "
                        + (getConfig().getBoolean("auto.enabled") ? "§aoui" : "§cnon"));
                sender.sendMessage("§6/" + label + " stop §7| §6statut §7| §6reload");
            }
        }
        return true;
    }

    private void setCenter(CommandSender sender, String[] args) {
        if (!(sender instanceof Player p)) {
            sender.sendMessage("§cCommande réservée aux joueurs.");
            return;
        }
        Location l = p.getLocation();
        getConfig().set("arena.world", l.getWorld().getName());
        getConfig().set("arena.x", l.getBlockX() + 0.5);
        getConfig().set("arena.y", (double) l.getBlockY());
        getConfig().set("arena.z", l.getBlockZ() + 0.5);
        if (args.length > 1) {
            Integer r = parseInt(args[1]);
            if (r == null || r < 5 || r > 100) {
                sender.sendMessage("§cRayon invalide (5 à 100).");
                return;
            }
            getConfig().set("arena.radius", r);
        }
        saveConfig();
        sender.sendMessage("§aCentre de l'arène défini ici, rayon " + getConfig().getInt("arena.radius") + " blocs.");
    }

    private void pari(CommandSender sender, String label, String[] args) {
        if (!(sender instanceof Player p)) {
            sender.sendMessage("§cCommande réservée aux joueurs.");
            return;
        }
        if (match == null) {
            p.sendMessage(Msg.of("<gray>Aucun combat en cours. Les paris ouvrent à l'annonce du prochain combat de bots."));
            return;
        }
        if (args.length == 0) {
            match.betInfo(p);
            return;
        }
        Team team = switch (args[0].toLowerCase(Locale.ROOT)) {
            case "rouge", "r", "red" -> Team.ROUGE;
            case "bleu", "b", "blue" -> Team.BLEU;
            default -> null;
        };
        Double amount = args.length > 1 ? parseAmount(args[1]) : null;
        if (team == null || amount == null) {
            p.sendMessage(Msg.of("<gray>Usage : <white>/" + label + " rouge|bleu <mise></white> — ex. /" + label + " rouge 500"));
            return;
        }
        match.bet(p, team, amount);
    }

    /** « 500 », « 1,5k », « 2m ». Null si invalide. */
    static Double parseAmount(String s) {
        String t = s.trim().toLowerCase(Locale.ROOT).replace(',', '.').replace("_", "");
        double mult = 1;
        if (t.endsWith("k")) mult = 1_000;
        else if (t.endsWith("m")) mult = 1_000_000;
        if (mult > 1) t = t.substring(0, t.length() - 1);
        try {
            double v = Double.parseDouble(t) * mult;
            return Double.isFinite(v) && v > 0 ? Math.floor(v * 100) / 100.0 : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private void start(CommandSender sender, String[] args) {
        int max = getConfig().getInt("match.max-team-size", 10);
        int size = getConfig().getInt("match.default-team-size", 3);
        if (args.length > 1) {
            Integer n = parseInt(args[1]);
            if (n == null || n < 1 || n > max) {
                sender.sendMessage("§cNombre de bots par équipe invalide (1 à " + max + ").");
                return;
            }
            size = n;
        }
        String error = startMatch(size);
        sender.sendMessage(error == null ? "§aCombat " + size + "v" + size + " lancé." : "§c" + error);
    }

    /** Lance un combat ; message d'erreur ou null. */
    private String startMatch(int size) {
        if (match != null) return "Un combat est déjà en cours (/botarena stop).";
        World world = Bukkit.getWorld(getConfig().getString("arena.world", ""));
        if (world == null) return "Arène non configurée : place-toi au centre et fais /botarena setcentre.";
        Location center = new Location(world, getConfig().getDouble("arena.x"), getConfig().getDouble("arena.y"),
                getConfig().getDouble("arena.z"));
        match = new ArenaMatch(this, center, getConfig().getDouble("arena.radius", 18), size, bank);
        match.start();
        return null;
    }

    private static Integer parseInt(String s) {
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        if (command.getName().equalsIgnoreCase("pari")) {
            if (args.length == 1) return List.of("rouge", "bleu").stream().filter(t -> t.startsWith(args[0].toLowerCase(Locale.ROOT))).toList();
            if (args.length == 2) return List.of("100", "500", "1000", "5000");
            return List.of();
        }
        if (args.length == 1) {
            String p = args[0].toLowerCase(Locale.ROOT);
            return List.of("setcentre", "start", "stop", "statut", "reload").stream().filter(s -> s.startsWith(p)).toList();
        }
        if (args.length == 2 && args[0].equalsIgnoreCase("start")) return List.of("1", "2", "3", "5");
        return List.of();
    }

    // ------------------------------------------------------------------ comportement des bots

    /** Un bot ne cible que les bots vivants de l'équipe adverse (jamais les joueurs). */
    @EventHandler(ignoreCancelled = true)
    public void onTarget(EntityTargetEvent e) {
        ArenaMatch.Bot bot = liveBot(e.getEntity());
        if (bot == null || e.getTarget() == null) return;
        ArenaMatch.Bot target = liveBot(e.getTarget());
        if (target == null || target.team == bot.team || target.dead) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onDamage(EntityDamageByEntityEvent e) {
        Entity damager = e.getDamager();
        if (damager instanceof Projectile proj && proj.getShooter() instanceof Entity shooter) damager = shooter;
        ArenaMatch.Bot attacker = liveBot(damager);
        ArenaMatch.Bot victim = liveBot(e.getEntity());
        if (attacker != null) {
            // Pas de tir ami, et les bots ne blessent rien d'autre que l'équipe adverse.
            if (victim == null || victim.team == attacker.team) e.setCancelled(true);
            else match.recordHit(e.getEntity(), damager);
            return;
        }
        if (victim != null && damager instanceof Player && !getConfig().getBoolean("spectators.players-can-hit-bots", false)) {
            e.setCancelled(true);
        }
    }

    @EventHandler
    public void onDeath(EntityDeathEvent e) {
        LivingEntity dead = e.getEntity();
        if (!isTaggedBot(dead)) return;
        e.getDrops().clear();
        e.setDroppedExp(0);
        if (match != null) match.onDeath(dead);
    }

    /** Pas de combustion au soleil ; l'aura de feu et la lave restent actives. */
    @EventHandler(ignoreCancelled = true)
    public void onCombust(EntityCombustEvent e) {
        if (e instanceof EntityCombustByEntityEvent || e instanceof EntityCombustByBlockEvent) return;
        if (isTaggedBot(e.getEntity())) e.setCancelled(true);
    }

    /** Un zombie noyé ne devient pas un drowned. */
    @EventHandler(ignoreCancelled = true)
    public void onTransform(EntityTransformEvent e) {
        if (isTaggedBot(e.getEntity())) e.setCancelled(true);
    }

    @EventHandler
    public void onEntitiesLoad(EntitiesLoadEvent e) {
        e.getEntities().forEach(this::removeIfOrphan);
    }
}
