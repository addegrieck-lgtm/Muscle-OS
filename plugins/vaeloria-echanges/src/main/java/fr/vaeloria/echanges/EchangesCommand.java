package fr.vaeloria.echanges;

import fr.vaeloria.echanges.model.BookOffer;
import fr.vaeloria.echanges.model.BookTable;
import fr.vaeloria.echanges.model.Tier;
import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabExecutor;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Player;
import org.bukkit.entity.Villager;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** /echanges oeuf [n] · chances · give ‹joueur› [n] · reload */
public final class EchangesCommand implements TabExecutor {
    private final VaeloriaEchangesPlugin plugin;

    public EchangesCommand(VaeloriaEchangesPlugin plugin) { this.plugin = plugin; }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        String sub = args.length == 0 ? "aide" : args[0].toLowerCase(Locale.ROOT);
        switch (sub) {
            case "oeuf", "œuf" -> buyEgg(sender, args);
            case "chances" -> chances(sender);
            case "give" -> giveEgg(sender, args);
            case "reload" -> {
                if (!sender.hasPermission("vaeloria.echanges.admin")) return deny(sender);
                plugin.reload();
                plugin.msg(sender, "Configuration rechargée (" + plugin.settings().table().offers().size() + " livres).");
            }
            default -> help(sender);
        }
        return true;
    }

    private void help(CommandSender s) {
        Settings st = plugin.settings();
        plugin.msg(s, "&fÉchanges avec les villageois — tout se paie en émeraudes.");
        plugin.msg(s, "&e• Accroupi + clic droit &7sur un bibliothécaire, émeraudes en main : &fboost &7("
                + Emeralds.format(st.boostCost().next(0)) + " puis +" + st.boostCost().step() + ", max " + st.boostCost().max() + ").");
        if (st.eggPrice() > 0) plugin.msg(s, "&e• /echanges oeuf [n] &7: œuf de capture, " + Emeralds.format(st.eggPrice()) + ".");
        plugin.msg(s, "&e• /echanges chances &7: chances des livres (vise un bibliothécaire pour voir les siennes).");
    }

    private void buyEgg(CommandSender sender, String[] args) {
        if (!(sender instanceof Player p)) {
            plugin.msg(sender, "&cCommande réservée aux joueurs.");
            return;
        }
        if (!p.hasPermission("vaeloria.echanges.use")) {
            deny(p);
            return;
        }
        int price = plugin.settings().eggPrice();
        if (price <= 0) {
            plugin.msg(p, "&cL'œuf de capture n'est pas en vente.");
            return;
        }
        int n = args.length >= 2 ? parse(args[1], 1, 16) : 1;
        if (n < 0) {
            plugin.msg(p, "&cQuantité : de 1 à 16.");
            return;
        }
        int total = price * n;
        if (!Emeralds.take(p, total)) {
            plugin.msg(p, "&cIl faut &a" + Emeralds.format(total) + " &c(tu en as " + Emeralds.count(p) + ").");
            return;
        }
        CaptureListener.give(p, plugin.items().captureEgg(n), p.getLocation());
        plugin.msg(p, "&a" + n + " œuf" + (n > 1 ? "s" : "") + " de capture &7pour &a" + Emeralds.format(total) + "&7.");
    }

    private void giveEgg(CommandSender sender, String[] args) {
        if (!sender.hasPermission("vaeloria.echanges.admin")) {
            deny(sender);
            return;
        }
        if (args.length < 2) {
            plugin.msg(sender, "&c/echanges give ‹joueur› [n]");
            return;
        }
        Player target = Bukkit.getPlayerExact(args[1]);
        if (target == null) {
            plugin.msg(sender, "&cJoueur introuvable ou hors ligne : " + args[1]);
            return;
        }
        int n = args.length >= 3 ? parse(args[2], 1, 64) : 1;
        if (n < 0) {
            plugin.msg(sender, "&cQuantité : de 1 à 64.");
            return;
        }
        CaptureListener.give(target, plugin.items().captureEgg(n), target.getLocation());
        plugin.msg(sender, n + " œuf(s) de capture donné(s) à " + target.getName() + ".");
        plugin.getLogger().info(sender.getName() + " a donné " + n + " œuf(s) de capture à " + target.getName());
    }

    private void chances(CommandSender sender) {
        Settings st = plugin.settings();
        BookTable table = st.table();
        if (sender instanceof Player p) {
            Entity seen = p.getTargetEntity(6);
            if (seen instanceof Villager v && v.getProfession() == Villager.Profession.LIBRARIAN) {
                Trades t = plugin.trades();
                int luck = t.luck(v);
                Set<String> forbidden = t.forbidden(v);
                int next = Math.min(st.maxLuck(), luck + 1);
                plugin.msg(p, "&fCe bibliothécaire : &7chance &e" + luck + "/" + st.maxLuck() + "&7, prochain boost &a"
                        + Emeralds.format(st.boostCost().next(t.boosts(v))) + "&7.");
                if (!forbidden.isEmpty()) {
                    List<String> names = new ArrayList<>();
                    for (String id : forbidden) names.add(Books.nameOfId(id));
                    plugin.msg(p, "&7Ne proposera plus : &c" + String.join(", ", names));
                }
                plugin.msg(p, "&7Au prochain boost : " + odds(table.tierOdds(next, forbidden)));
                return;
            }
        }
        plugin.msg(sender, "&fChances d'un livre (sans boost) : " + odds(table.tierOdds(0, Set.of())));
        plugin.msg(sender, "&fChance maximale (" + st.maxLuck() + ") : " + odds(table.tierOdds(st.maxLuck(), Set.of())));
        for (BookOffer o : table.offers()) {
            if (o.tier() != Tier.EPIQUE && o.tier() != Tier.LEGENDAIRE) continue;
            plugin.msg(sender, "&8 • " + o.tier().label() + " &f" + Books.name(o) + " &7: " + pct(table.odds(o, 0, Set.of()))
                    + " → " + pct(table.odds(o, st.maxLuck(), Set.of())) + " &7· &a" + o.minPrice() + "–" + o.maxPrice() + " émeraudes");
        }
    }

    private static String odds(Map<Tier, Double> odds) {
        List<String> parts = new ArrayList<>();
        for (Tier t : Tier.values()) parts.add(t.label() + " &f" + pct(odds.getOrDefault(t, 0.0)));
        return String.join("&7, ", parts);
    }

    static String pct(double p) {
        double v = p * 100;
        String s = v >= 10 ? String.format(Locale.FRANCE, "%.0f", v) : String.format(Locale.FRANCE, "%.1f", v);
        return s + " %";
    }

    private static int parse(String s, int min, int max) {
        try {
            int n = Integer.parseInt(s);
            return n < min || n > max ? -1 : n;
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    private boolean deny(CommandSender s) {
        plugin.msg(s, "&cTu n'as pas la permission.");
        return true;
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        if (args.length == 1) {
            List<String> subs = new ArrayList<>(List.of("oeuf", "chances"));
            if (sender.hasPermission("vaeloria.echanges.admin")) subs.addAll(List.of("give", "reload"));
            return subs.stream().filter(x -> x.startsWith(args[0].toLowerCase(Locale.ROOT))).toList();
        }
        if (args.length == 2 && args[0].equalsIgnoreCase("give") && sender.hasPermission("vaeloria.echanges.admin")) {
            return Bukkit.getOnlinePlayers().stream().map(Player::getName)
                    .filter(n -> n.toLowerCase(Locale.ROOT).startsWith(args[1].toLowerCase(Locale.ROOT))).toList();
        }
        return List.of();
    }
}
