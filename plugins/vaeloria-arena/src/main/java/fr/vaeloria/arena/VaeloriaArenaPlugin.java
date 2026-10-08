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

/**
 * VæloriaArena : des bots s'affrontent en équipes (Rouge / Bleu) dans une arène, en stuff diamant P4 U3.
 * Spectacle pour les joueurs autour (titres, kill feed, MVP) ; les bots ne touchent jamais les joueurs.
 */
public final class VaeloriaArenaPlugin extends JavaPlugin implements Listener {
    private NamespacedKey botKey;
    private ArenaMatch match;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        botKey = new NamespacedKey(this, "bot");
        getServer().getPluginManager().registerEvents(this, this);
        // Bots laissés par un arrêt brutal du serveur.
        for (World w : Bukkit.getWorlds()) w.getEntities().forEach(this::removeIfOrphan);
    }

    @Override
    public void onDisable() {
        if (match != null) match.abort();
    }

    NamespacedKey botKey() {
        return botKey;
    }

    void matchFinished(ArenaMatch m) {
        if (match == m) match = null;
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
                sender.sendMessage("§aConfiguration rechargée (appliquée au prochain combat).");
            }
            default -> {
                sender.sendMessage("§6/" + label + " setcentre [rayon] §7— centre de l'arène à ta position");
                sender.sendMessage("§6/" + label + " start [bots par équipe] §7— lance un combat P4 U3");
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

    private void start(CommandSender sender, String[] args) {
        if (match != null) {
            sender.sendMessage("§cUn combat est déjà en cours (/botarena stop).");
            return;
        }
        World world = Bukkit.getWorld(getConfig().getString("arena.world", ""));
        if (world == null) {
            sender.sendMessage("§cArène non configurée : place-toi au centre et fais /botarena setcentre.");
            return;
        }
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
        Location center = new Location(world, getConfig().getDouble("arena.x"), getConfig().getDouble("arena.y"),
                getConfig().getDouble("arena.z"));
        match = new ArenaMatch(this, center, getConfig().getDouble("arena.radius", 20), size);
        match.start();
        sender.sendMessage("§aCombat " + size + "v" + size + " lancé.");
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
