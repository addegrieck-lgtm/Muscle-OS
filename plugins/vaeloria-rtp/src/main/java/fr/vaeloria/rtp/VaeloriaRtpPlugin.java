package fr.vaeloria.rtp;

import fr.vaeloria.rtp.gui.AdminMenu;
import fr.vaeloria.rtp.gui.ChatPrompt;
import fr.vaeloria.rtp.gui.MenuListener;
import fr.vaeloria.rtp.gui.PlayerMenu;
import fr.vaeloria.rtp.gui.WorldEditorMenu;
import org.bukkit.Bukkit;
import org.bukkit.World;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;

import static fr.vaeloria.rtp.Messages.p;
import static fr.vaeloria.rtp.Messages.rich;

/**
 * VæloriaRTP : téléportation aléatoire multi-mondes.
 * /rtp ouvre un menu de choix du monde ; /rtpadmin ouvre l'interface d'administration.
 */
public final class VaeloriaRtpPlugin extends JavaPlugin {
    private Messages messages;
    private WorldRegistry registry;
    private Cooldowns cooldowns;
    private SafeLocationFinder finder;
    private TeleportService teleports;
    private ChatPrompt chatPrompt;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        messages = new Messages(this);
        registry = new WorldRegistry(this);
        cooldowns = new Cooldowns(System::currentTimeMillis, true);
        finder = new SafeLocationFinder(this);
        teleports = new TeleportService(this);
        chatPrompt = new ChatPrompt(this);
        reloadAll();

        var pm = getServer().getPluginManager();
        pm.registerEvents(teleports, this);
        pm.registerEvents(chatPrompt, this);
        pm.registerEvents(new MenuListener(), this);
        getLogger().info("VæloriaRTP actif — " + registry.all().size() + " monde(s) configuré(s)");
    }

    @Override
    public void onDisable() {
        if (teleports != null) teleports.cancelAll();
    }

    public void reloadAll() {
        reloadConfig();
        registry.load();
        finder.reload();
        cooldowns.perWorld(getConfig().getBoolean("teleport.cooldown-per-world", true));
    }

    public Messages messages() { return messages; }
    public WorldRegistry registry() { return registry; }
    public Cooldowns cooldowns() { return cooldowns; }
    public SafeLocationFinder finder() { return finder; }
    public TeleportService teleports() { return teleports; }
    public ChatPrompt chatPrompt() { return chatPrompt; }

    @Override
    public boolean onCommand(@NotNull CommandSender sender, @NotNull Command command, @NotNull String label, String @NotNull [] args) {
        return switch (command.getName().toLowerCase(Locale.ROOT)) {
            case "rtp" -> rtp(sender, args);
            case "rtpadmin" -> admin(sender, args);
            default -> false;
        };
    }

    /** /rtp, /rtp <monde>, /rtp <monde> <joueur> (forcé, pour la console, les PNJ ou les portails). */
    private boolean rtp(CommandSender sender, String[] args) {
        if (args.length >= 2) {
            if (!sender.hasPermission("vaeloria.rtp.others")) {
                messages.send(sender, "no-permission");
                return true;
            }
            RtpWorld w = registry.get(args[0]);
            Player target = Bukkit.getPlayerExact(args[1]);
            if (w == null) {
                messages.send(sender, "unknown-world", p("world", args[0]));
            } else if (target == null) {
                messages.send(sender, "unknown-player", p("player", args[1]));
            } else if (teleports.request(target, w, true)) {
                messages.send(sender, "forced", p("player", target.getName()), rich("world", w.displayName()));
            } else {
                messages.send(sender, "forced-failed", p("player", target.getName()), rich("world", w.displayName()));
            }
            return true;
        }
        if (!(sender instanceof Player player)) {
            messages.send(sender, "players-only");
            return true;
        }
        if (args.length == 1) {
            RtpWorld w = registry.get(args[0]);
            if (w == null || (!w.enabled() && !player.hasPermission("vaeloria.rtp.admin"))) {
                messages.send(sender, "unknown-world", p("world", args[0]));
                return true;
            }
            teleports.request(player, w, false);
            return true;
        }
        new PlayerMenu(this, player).open();
        return true;
    }

    private boolean admin(CommandSender sender, String[] args) {
        if (args.length == 0 || args[0].equalsIgnoreCase("gui")) {
            if (sender instanceof Player player) new AdminMenu(this, player).open();
            else adminHelp(sender);
            return true;
        }
        switch (args[0].toLowerCase(Locale.ROOT)) {
            case "reload" -> {
                reloadAll();
                messages.send(sender, "reloaded");
            }
            case "list" -> {
                if (registry.all().isEmpty()) messages.send(sender, "admin-list-empty");
                for (RtpWorld w : registry.all()) {
                    messages.send(sender, "admin-list-entry", p("world", w.worldName()), rich("name", w.displayName()),
                            p("state", Bukkit.getWorld(w.worldName()) == null ? "non chargé" : w.enabled() ? "activé" : "désactivé"),
                            p("min", w.minRadius()), p("max", w.maxRadius()));
                }
            }
            case "add" -> {
                if (args.length < 2) return usage(sender, "/rtpadmin add <monde>");
                World world = Bukkit.getWorld(args[1]);
                if (world == null) {
                    messages.send(sender, "unknown-world", p("world", args[1]));
                } else {
                    registry.add(world);
                    messages.send(sender, "admin-added", p("world", world.getName()));
                }
            }
            case "remove" -> {
                if (args.length < 2) return usage(sender, "/rtpadmin remove <monde>");
                if (registry.remove(args[1])) messages.send(sender, "admin-removed", p("world", args[1]));
                else messages.send(sender, "unknown-world", p("world", args[1]));
            }
            case "edit" -> {
                if (args.length < 2) return usage(sender, "/rtpadmin edit <monde>");
                RtpWorld w = registry.get(args[1]);
                if (w == null) messages.send(sender, "unknown-world", p("world", args[1]));
                else if (sender instanceof Player player) new WorldEditorMenu(this, player, w).open();
                else messages.send(sender, "players-only");
            }
            case "set" -> {
                if (args.length < 4) return usage(sender, "/rtpadmin set <monde> <réglage> <valeur…>");
                RtpWorld w = registry.get(args[1]);
                if (w == null) {
                    messages.send(sender, "unknown-world", p("world", args[1]));
                    return true;
                }
                try {
                    w.set(args[2], String.join(" ", Arrays.copyOfRange(args, 3, args.length)));
                    registry.save();
                    messages.send(sender, "admin-saved");
                } catch (IllegalArgumentException e) {
                    messages.send(sender, "admin-invalid", p("error", e.getMessage()));
                }
            }
            case "resetcooldown" -> {
                if (args.length < 2) return usage(sender, "/rtpadmin resetcooldown <joueur>");
                Player target = Bukkit.getPlayerExact(args[1]);
                if (target == null) {
                    messages.send(sender, "unknown-player", p("player", args[1]));
                } else {
                    cooldowns.reset(target.getUniqueId());
                    messages.send(sender, "admin-cooldown-reset", p("player", target.getName()));
                }
            }
            default -> adminHelp(sender);
        }
        return true;
    }

    private boolean usage(CommandSender sender, String usage) {
        messages.send(sender, "usage", p("usage", usage));
        return true;
    }

    private void adminHelp(CommandSender sender) {
        for (String line : getConfig().getStringList("messages.admin-help")) sender.sendMessage(messages.parse(line));
    }

    @Override
    public List<String> onTabComplete(@NotNull CommandSender sender, @NotNull Command command, @NotNull String alias, String @NotNull [] args) {
        List<String> options = new ArrayList<>();
        if (command.getName().equalsIgnoreCase("rtp")) {
            if (args.length == 1) {
                boolean admin = sender.hasPermission("vaeloria.rtp.admin");
                registry.all().stream().filter(w -> admin || w.enabled()).map(RtpWorld::worldName).forEach(options::add);
            } else if (args.length == 2 && sender.hasPermission("vaeloria.rtp.others")) {
                Bukkit.getOnlinePlayers().forEach(pl -> options.add(pl.getName()));
            }
        } else if (sender.hasPermission("vaeloria.rtp.admin")) {
            if (args.length == 1) {
                options.addAll(List.of("gui", "list", "add", "remove", "edit", "set", "reload", "resetcooldown"));
            } else if (args.length == 2) {
                switch (args[0].toLowerCase(Locale.ROOT)) {
                    case "add" -> registry.unconfigured().forEach(w -> options.add(w.getName()));
                    case "remove", "edit", "set" -> registry.all().forEach(w -> options.add(w.worldName()));
                    case "resetcooldown" -> Bukkit.getOnlinePlayers().forEach(pl -> options.add(pl.getName()));
                    default -> { }
                }
            } else if (args.length == 3 && args[0].equalsIgnoreCase("set")) {
                options.addAll(RtpWorld.KEYS);
            } else if (args.length == 4 && args[0].equalsIgnoreCase("set")) {
                switch (args[2].toLowerCase(Locale.ROOT)) {
                    case "enabled", "permission" -> options.addAll(List.of("true", "false"));
                    case "shape" -> options.addAll(Stream.of(RtpWorld.Shape.values()).map(Enum::name).toList());
                    case "max-y" -> options.add("auto");
                    default -> { }
                }
            }
        }
        String prefix = args.length == 0 ? "" : args[args.length - 1].toLowerCase(Locale.ROOT);
        return options.stream().filter(o -> o.toLowerCase(Locale.ROOT).startsWith(prefix)).toList();
    }
}
