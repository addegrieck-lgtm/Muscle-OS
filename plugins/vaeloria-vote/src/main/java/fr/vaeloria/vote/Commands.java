package fr.vaeloria.vote;

import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabExecutor;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** /vote, /roue, /votes (admin). */
final class Commands implements TabExecutor {
    private final VaeloriaVotePlugin plugin;

    Commands(VaeloriaVotePlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        return switch (command.getName().toLowerCase(Locale.ROOT)) {
            case "vote" -> vote(sender, args);
            case "roue" -> roue(sender, args);
            case "votes" -> admin(sender, args);
            default -> false;
        };
    }

    private boolean vote(CommandSender sender, String[] args) {
        if (!(sender instanceof Player p)) {
            sender.sendMessage("Commande réservée aux joueurs. Console : /votes give <joueur> <site>");
            return true;
        }
        if (args.length > 0 && (args[0].equalsIgnoreCase("verifier") || args[0].equalsIgnoreCase("check"))) {
            plugin.votes().verify(p);
            return true;
        }
        menu(p);
        return true;
    }

    private void menu(Player p) {
        Votes votes = plugin.votes();
        Settings s = votes.settings();
        PlayerVotes v = votes.data(p);
        long now = System.currentTimeMillis();
        int done = (int) s.sites().stream().filter(site -> !v.available(site, now)).count();

        p.sendMessage(Text.mm("<ruby>━━━━━━━━</ruby> <ruby_hi>◆</ruby_hi> <snow><b>VOTES VÆLORIA</b></snow> <ruby_hi>◆</ruby_hi> <ruby>━━━━━━━━"));
        for (VoteSite site : s.sites()) {
            if (v.available(site, now)) {
                p.sendMessage(Text.mm(" <loss>✘</loss> <snow>" + Text.esc(site.name()) + "</snow> <ash>—</ash> "
                        + "<click:open_url:'" + site.voteUrl().replace("'", "%27") + "'><hover:show_text:'<steel>Ouvrir le site de vote'>"
                        + "<ruby_hi><b>[VOTER]</b></ruby_hi></hover></click>"));
            } else {
                p.sendMessage(Text.mm(" <gain>✔</gain> <steel>" + Text.esc(site.name()) + " <ash>— de nouveau dans "
                        + Text.duration(v.nextVoteAt(site) - now)));
            }
        }
        p.sendMessage(Text.mm(" <steel>Aujourd'hui : <snow>" + v.sitesToday() + "/" + s.sites().size()
                + "</snow> <ash>·</ash> Série : <snow>" + v.streak(votes.today()) + " jour(s)</snow> <ash>·</ash> Total : <snow>" + v.total()));
        p.sendMessage(Text.mm(" <steel>Par vote : " + Text.describe(s.perVote(), votes.money())));
        p.sendMessage(Text.mm(" <steel>Bonus " + s.sites().size() + "/" + s.sites().size() + " : " + Text.describe(s.allSitesBonus(), votes.money())));
        if (!v.pot().isEmpty()) p.sendMessage(Text.mm(" <gold>Cagnotte du jour :</gold> " + Text.describe(v.pot(), votes.money())));
        if (v.spun()) {
            p.sendMessage(Text.mm(" <steel>Roue du jour : <snow>×" + v.multiplier() + "</snow> <ash>(prochaine demain ; les votes suivants sont versés directement)"));
        } else if (v.wheelReady(s.requiredSites())) {
            p.sendMessage(Text.mm(" <click:run_command:'/roue'><hover:show_text:'<steel>Lancer la roue du jour'><ruby_hi><b>[ 🎡 LANCER LA ROUE ]</b></ruby_hi></hover></click>"));
        } else {
            p.sendMessage(Text.mm(" <steel>Roue du jour : <ash>verrouillée (" + v.sitesToday() + "/" + s.requiredSites() + " votes)"));
        }
        if (done < s.sites().size()) {
            p.sendMessage(Text.mm(" <click:run_command:'/vote verifier'><hover:show_text:'<steel>Vérifier mes votes'><gain>[✔ J'ai voté]</gain></hover></click>"));
        }
        p.sendMessage(Text.mm("<ruby>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
    }

    private boolean roue(CommandSender sender, String[] args) {
        if (!(sender instanceof Player p)) {
            sender.sendMessage("Commande réservée aux joueurs.");
            return true;
        }
        String mode = args.length > 0 ? args[0].toLowerCase(Locale.ROOT) : "";
        switch (mode) {
            case "classique", "classic" -> plugin.wheelSpin().spin(p, WheelSpin.Mode.CLASSIC);
            case "risque", "quitte", "x4" -> {
                if (args.length > 1 && args[1].equalsIgnoreCase("confirmer")) {
                    plugin.wheelSpin().spin(p, WheelSpin.Mode.RISKY);
                } else {
                    Settings s = plugin.votes().settings();
                    p.sendMessage(Text.prefixed("<loss><b>Quitte ou double :</b></loss> <steel>" + odds(s.risky())
                            + ". <loss>Si tu perds, ta cagnotte du jour est perdue.</loss>"));
                    p.sendMessage(Text.mm("   <click:run_command:'/roue risque confirmer'><hover:show_text:'<loss>Je prends le risque'>"
                            + "<ruby_hi><b>[ CONFIRMER ]</b></ruby_hi></hover></click>   "
                            + "<click:run_command:'/roue'><hover:show_text:'<steel>Revenir au choix'><ash>[annuler]</ash></hover></click>"));
                }
            }
            default -> choice(p);
        }
        return true;
    }

    private void choice(Player p) {
        Votes votes = plugin.votes();
        Settings s = votes.settings();
        PlayerVotes v = votes.data(p);
        if (v.spun() || !v.wheelReady(s.requiredSites())) {
            plugin.wheelSpin().spin(p, WheelSpin.Mode.CLASSIC); // explique pourquoi la roue est fermée
            return;
        }
        p.sendMessage(Text.mm("<ruby>━━━━━━━━</ruby> <gold><b>🎡 ROUE DU JOUR</b></gold> <ruby>━━━━━━━━"));
        p.sendMessage(Text.mm(" <steel>Ta cagnotte : " + Text.describe(v.pot(), votes.money())));
        p.sendMessage(Text.mm(" <click:run_command:'/roue classique'><hover:show_text:'<steel>" + odds(s.classic()) + "'>"
                + "<gain><b>[ ROUE CLASSIQUE ]</b></gain></hover></click> <ash>" + range(s.classic()) + ", jamais rien perdu"));
        p.sendMessage(Text.mm(" <click:run_command:'/roue risque'><hover:show_text:'<steel>" + odds(s.risky()) + "'>"
                + "<ruby_hi><b>[ QUITTE OU DOUBLE ]</b></ruby_hi></hover></click> <ash>" + range(s.risky()) + " — tout ou rien"));
        p.sendMessage(Text.mm(" <ash>Une seule roue par jour. Survole un bouton pour voir les chances."));
    }

    private static String odds(Wheel w) {
        List<String> parts = new ArrayList<>();
        for (Wheel.Slice sl : w.slices()) parts.add("×" + sl.multiplier() + " : " + Math.round(w.percent(sl)) + " %");
        return String.join(", ", parts);
    }

    private static String range(Wheel w) {
        List<String> parts = new ArrayList<>();
        for (Wheel.Slice sl : w.slices()) parts.add("<snow>×" + sl.multiplier() + "</snow>");
        return String.join("<ash>/</ash>", parts);
    }

    private boolean admin(CommandSender sender, String[] args) {
        Votes votes = plugin.votes();
        if (args.length == 1 && args[0].equalsIgnoreCase("reload")) {
            plugin.reload();
            sender.sendMessage(Text.prefixed("<gain>VaeloriaVote rechargé :</gain> <steel>" + votes.settings().sites().size()
                    + " site(s), argent via " + Text.esc(votes.money().describe()) + "."));
            return true;
        }
        if (args.length == 3 && args[0].equalsIgnoreCase("give")) {
            VoteSite site = votes.settings().site(args[2]);
            OfflinePlayer target = Bukkit.getPlayerExact(args[1]);
            if (target == null) target = Bukkit.getOfflinePlayerIfCached(args[1]);
            if (site == null || target == null) {
                sender.sendMessage(Text.prefixed("<loss>Joueur ou site inconnu.</loss> <ash>Sites : " + siteIds()));
                return true;
            }
            String name = target.getName() != null ? target.getName() : args[1];
            boolean ok = votes.credit(target.getUniqueId(), name, site, Votes.Source.ADMIN);
            sender.sendMessage(Text.prefixed(ok ? "<gain>Vote " + Text.esc(site.name()) + " crédité à " + Text.esc(name) + "."
                    : "<loss>" + Text.esc(name) + " a déjà un vote " + Text.esc(site.name()) + " dans le délai du site : ignoré."));
            return true;
        }
        if (args.length == 2 && args[0].equalsIgnoreCase("info")) {
            Player target = Bukkit.getPlayerExact(args[1]);
            if (target == null) {
                sender.sendMessage(Text.prefixed("<loss>Joueur hors ligne."));
                return true;
            }
            PlayerVotes v = votes.data(target);
            sender.sendMessage(Text.prefixed("<snow>" + Text.esc(target.getName()) + "</snow> <steel>: " + v.sitesToday() + "/"
                    + votes.settings().sites().size() + " aujourd'hui, total " + v.total() + ", série " + v.streak(votes.today())
                    + ", roue " + (v.spun() ? "×" + v.multiplier() : "non lancée")));
            sender.sendMessage(Text.mm("<steel>Cagnotte : " + Text.describe(v.pot(), votes.money())));
            return true;
        }
        sender.sendMessage(Text.prefixed("<steel>/votes give <joueur> <site> <ash>|</ash> /votes info <joueur> <ash>|</ash> /votes reload"));
        return true;
    }

    private String siteIds() {
        return String.join(", ", plugin.votes().settings().sites().stream().map(VoteSite::id).toList());
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        String name = command.getName().toLowerCase(Locale.ROOT);
        List<String> options = switch (name) {
            case "vote" -> args.length == 1 ? List.of("verifier") : List.of();
            case "roue" -> args.length == 1 ? List.of("classique", "risque") : List.of();
            case "votes" -> switch (args.length) {
                case 1 -> List.of("give", "info", "reload");
                case 2 -> Bukkit.getOnlinePlayers().stream().map(Player::getName).toList();
                case 3 -> args[0].equalsIgnoreCase("give") ? plugin.votes().settings().sites().stream().map(VoteSite::id).toList() : List.of();
                default -> List.of();
            };
            default -> List.of();
        };
        String prefix = args.length == 0 ? "" : args[args.length - 1].toLowerCase(Locale.ROOT);
        return options.stream().filter(o -> o.toLowerCase(Locale.ROOT).startsWith(prefix)).toList();
    }
}
