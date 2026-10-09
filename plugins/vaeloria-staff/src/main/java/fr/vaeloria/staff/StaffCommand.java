package fr.vaeloria.staff;

import fr.vaeloria.staff.broadcast.Broadcast;
import fr.vaeloria.staff.broadcast.BroadcastType;
import fr.vaeloria.staff.gui.StaffHubMenu;
import fr.vaeloria.staff.image.ImagesMenu;
import fr.vaeloria.staff.moderation.PlayerMenu;
import fr.vaeloria.staff.moderation.PlayersMenu;
import fr.vaeloria.staff.util.Durations;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabExecutor;
import org.bukkit.entity.Player;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * /staff                                  menu principal
 * /staff mode · vanish                    mode staff · invisibilité
 * /staff joueurs · joueur <j>             liste · fiche d'un joueur
 * /staff freeze|invsee|endersee <j>
 * /staff warn|kick <j> <raison>
 * /staff mute|ban <j> <durée> [raison] · unmute <j>
 * /staff annonce <id>                     envoyer une annonce enregistrée (console, blocs de commande…)
 * /staff dire <chat|titre|action|boss> <texte, lignes séparées par |>
 * /staff image [lien|fichier] [LxH]
 * /staff chat lock|unlock|clear · reload
 * /sc [message]                           chat staff (sans message : bascule)
 */
public final class StaffCommand implements TabExecutor {
    private static final List<String> SUBS = List.of("mode", "vanish", "joueurs", "joueur", "freeze", "invsee", "endersee",
            "warn", "kick", "mute", "unmute", "ban", "annonce", "dire", "image", "chat", "reload");

    private final VaeloriaStaffPlugin plugin;

    public StaffCommand(VaeloriaStaffPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (command.getName().equalsIgnoreCase("sc")) return staffChat(sender, args);
        if (args.length == 0) {
            if (sender instanceof Player p && need(p, Perm.USE)) new StaffHubMenu(plugin, p).open();
            else if (!(sender instanceof Player)) help(sender);
            return true;
        }
        String sub = args[0].toLowerCase(Locale.ROOT);
        switch (sub) {
            case "mode" -> { if (player(sender) instanceof Player p && need(p, Perm.MODE)) plugin.staffMode().toggle(p); }
            case "vanish", "v" -> {
                if (player(sender) instanceof Player p && need(p, Perm.VANISH)) {
                    plugin.vanish().toggle(p);
                    if (plugin.staffMode().is(p)) plugin.staffMode().giveTools(p);
                }
            }
            case "joueurs" -> { if (player(sender) instanceof Player p && need(p, Perm.USE)) new PlayersMenu(plugin, p).open(); }
            case "joueur", "player" -> {
                if (player(sender) instanceof Player p && need(p, Perm.USE) && online(sender, args, 1) instanceof Player t) {
                    new PlayerMenu(plugin, p, t).open();
                }
            }
            case "freeze" -> {
                if (player(sender) instanceof Player p && need(p, Perm.FREEZE) && online(sender, args, 1) instanceof Player t) {
                    plugin.freeze().toggle(p, t);
                }
            }
            case "invsee", "endersee" -> {
                if (player(sender) instanceof Player p && need(p, Perm.INVSEE) && online(sender, args, 1) instanceof Player t) {
                    plugin.openInventory(p, t, sub.equals("endersee"));
                }
            }
            case "warn", "kick" -> {
                if (!need(sender, sub.equals("warn") ? Perm.WARN : Perm.KICK)) return true;
                if (!(online(sender, args, 1) instanceof Player t)) return true;
                String reason = args.length > 2 ? String.join(" ", Arrays.copyOfRange(args, 2, args.length))
                        : plugin.getConfig().getString("sanctions.default-reason", "Non-respect du règlement");
                if (sub.equals("warn")) plugin.sanctions().warn(sender, t, reason);
                else plugin.sanctions().kick(sender, t, reason);
            }
            case "mute", "ban" -> timed(sender, sub, args);
            case "unmute" -> {
                if (need(sender, Perm.MUTE) && known(sender, args, 1) instanceof OfflinePlayer t) plugin.sanctions().unmute(sender, t);
            }
            case "annonce" -> {
                if (!need(sender, Perm.BROADCAST)) return true;
                Broadcast b = args.length > 1 ? plugin.broadcasts().get(args[1]) : null;
                if (b == null) plugin.msg(sender, "&cAnnonce inconnue. Annonces : &f" + String.join(", ", plugin.broadcasts().ids()));
                else plugin.broadcasts().send(b);
            }
            case "dire", "say" -> {
                if (!need(sender, Perm.BROADCAST)) return true;
                BroadcastType type = args.length > 2 ? VaeloriaStaffPlugin.parseType(args[1]) : null;
                if (type == null) plugin.msg(sender, "&c/staff dire <chat|titre|action|boss> <texte> &7(lignes séparées par |)");
                else plugin.quickBroadcast(type, String.join(" ", Arrays.copyOfRange(args, 2, args.length)));
            }
            case "image" -> {
                if (!(player(sender) instanceof Player p) || !need(p, Perm.IMAGE)) return true;
                if (args.length == 1) ImagesMenu.start(plugin, p);
                else ImagesMenu.load(plugin, p, args[1], args.length > 2 ? String.join(" ", Arrays.copyOfRange(args, 2, args.length)) : null);
            }
            case "chat" -> {
                if (!need(sender, Perm.CHAT_MANAGE)) return true;
                String action = args.length > 1 ? args[1].toLowerCase(Locale.ROOT) : "";
                switch (action) {
                    case "lock" -> plugin.chat().lock(sender, true);
                    case "unlock" -> plugin.chat().lock(sender, false);
                    case "clear" -> plugin.chat().clear(sender);
                    default -> plugin.msg(sender, "&c/staff chat <lock|unlock|clear>");
                }
            }
            case "reload" -> {
                if (!need(sender, Perm.RELOAD)) return true;
                plugin.reload();
                plugin.msg(sender, "VaeloriaStaff rechargé.");
            }
            default -> help(sender);
        }
        return true;
    }

    private void timed(CommandSender sender, String sub, String[] args) {
        if (!need(sender, sub.equals("mute") ? Perm.MUTE : Perm.BAN)) return;
        if (args.length < 3) {
            plugin.msg(sender, "&c/staff " + sub + " <joueur> <durée|perm> [raison] &7(ex. 30m, 2h, 7d, 1w)");
            return;
        }
        if (!(known(sender, args, 1) instanceof OfflinePlayer t)) return;
        Duration d;
        try {
            d = Durations.parse(args[2]);
        } catch (IllegalArgumentException e) {
            plugin.msg(sender, "&cDurée illisible : &f" + args[2] + " &c(ex. 30m, 2h, 7d, perm).");
            return;
        }
        String reason = args.length > 3 ? String.join(" ", Arrays.copyOfRange(args, 3, args.length))
                : plugin.getConfig().getString("sanctions.default-reason", "Non-respect du règlement");
        if (sub.equals("mute")) plugin.sanctions().mute(sender, t, d, reason);
        else plugin.sanctions().ban(sender, t, d, reason);
    }

    private boolean staffChat(CommandSender sender, String[] args) {
        if (!need(sender, Perm.CHAT)) return true;
        if (args.length > 0) {
            plugin.chat().staffMessage(sender, String.join(" ", args));
        } else if (sender instanceof Player p) {
            boolean on = plugin.chat().toggle(p);
            plugin.msg(p, "Chat staff " + (on ? "&aactivé &7: tes messages vont au staff." : "&cdésactivé&7."));
        }
        return true;
    }

    private void help(CommandSender sender) {
        plugin.msg(sender, "&f/staff &7menu · &f/staff mode|vanish &7· &f/staff joueur <j>");
        plugin.msg(sender, "&f/staff freeze|invsee|endersee <j> &7· &f/staff warn|kick <j> <raison>");
        plugin.msg(sender, "&f/staff mute|ban <j> <durée|perm> [raison] &7· &f/staff unmute <j>");
        plugin.msg(sender, "&f/staff annonce <id> &7· &f/staff dire <chat|titre|action|boss> <texte>");
        plugin.msg(sender, "&f/staff image [lien] [LxH] &7· &f/staff chat lock|unlock|clear &7· &f/sc <msg>");
    }

    // ---- Aides ----

    private Player player(CommandSender sender) {
        if (sender instanceof Player p) return p;
        plugin.msg(sender, "&cCommande réservée aux joueurs.");
        return null;
    }

    private boolean need(CommandSender sender, String perm) {
        if (sender.hasPermission(perm)) return true;
        plugin.msg(sender, "&cTu n'as pas la permission.");
        return false;
    }

    private Player online(CommandSender sender, String[] args, int i) {
        Player t = args.length > i ? Bukkit.getPlayerExact(args[i]) : null;
        if (t == null) plugin.msg(sender, args.length > i ? "&cJoueur non connecté : &f" + args[i] : "&cIndique un joueur.");
        return t;
    }

    /** Joueur connecté ou déjà venu sur le serveur (mute / ban hors ligne). */
    private OfflinePlayer known(CommandSender sender, String[] args, int i) {
        if (args.length <= i) {
            plugin.msg(sender, "&cIndique un joueur.");
            return null;
        }
        Player online = Bukkit.getPlayerExact(args[i]);
        if (online != null) return online;
        OfflinePlayer cached = Bukkit.getOfflinePlayerIfCached(args[i]);
        if (cached == null) plugin.msg(sender, "&cJoueur jamais venu sur le serveur : &f" + args[i]);
        return cached;
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        if (command.getName().equalsIgnoreCase("sc")) return List.of();
        List<String> out = new ArrayList<>();
        if (args.length == 1) {
            out.addAll(SUBS);
        } else if (args.length == 2) {
            switch (args[0].toLowerCase(Locale.ROOT)) {
                case "joueur", "freeze", "invsee", "endersee", "warn", "kick", "mute", "unmute", "ban" ->
                        Bukkit.getOnlinePlayers().forEach(p -> out.add(p.getName()));
                case "annonce" -> out.addAll(plugin.broadcasts().ids());
                case "dire" -> out.addAll(List.of("chat", "titre", "action", "boss"));
                case "image" -> out.addAll(plugin.images().files());
                case "chat" -> out.addAll(List.of("lock", "unlock", "clear"));
                default -> {}
            }
        } else if (args.length == 3 && (args[0].equalsIgnoreCase("mute") || args[0].equalsIgnoreCase("ban"))) {
            out.addAll(List.of("30m", "1h", "1d", "7d", "30d", "perm"));
        } else if (args.length == 3 && args[0].equalsIgnoreCase("image")) {
            out.addAll(List.of("2x2", "3x2", "4x3", "6x4"));
        }
        String last = args[args.length - 1].toLowerCase(Locale.ROOT);
        out.removeIf(s -> !s.toLowerCase(Locale.ROOT).startsWith(last));
        return out;
    }
}
