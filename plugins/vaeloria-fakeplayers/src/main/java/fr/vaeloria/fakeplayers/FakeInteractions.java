package fr.vaeloria.fakeplayers;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.resolver.Placeholder;
import net.kyori.adventure.text.minimessage.tag.resolver.TagResolver;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerCommandPreprocessEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.server.ServerCommandEvent;
import org.bukkit.event.server.TabCompleteEvent;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Commandes qui visent un faux joueur. Sans ce module, /msg, /tpa, /pay… répondent « joueur introuvable »,
 * ce qui trahit immédiatement les faux joueurs. Ici, la commande est interceptée (puis annulée) et reçoit une
 * réponse crédible : message privé (avec parfois une réponse), demande qui expire ou est refusée, /list complet,
 * kick/ban qui déconnecte le faux joueur, téléportation vers son corps. Les règles sont dans interactions.commands.
 */
final class FakeInteractions implements Listener {
    private static final MiniMessage MM = MiniMessage.miniMessage();

    private final FakePlayersPlugin plugin;
    private final AmbientChat chat;
    /** Dernier interlocuteur (faux joueur) de chaque vrai joueur, pour /r. Clé : UUID, ou null pour la console. */
    private final Map<String, String> lastPartner = new ConcurrentHashMap<>();
    /** Demandes en cours (expéditeur|commande|faux joueur), pour ne pas les empiler. */
    private final Set<String> pending = new HashSet<>();

    FakeInteractions(FakePlayersPlugin plugin, AmbientChat chat) {
        this.plugin = plugin;
        this.chat = chat;
    }

    @EventHandler(priority = EventPriority.LOWEST, ignoreCancelled = true)
    public void onPlayerCommand(PlayerCommandPreprocessEvent event) {
        if (handle(event.getPlayer(), event.getMessage())) event.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOWEST, ignoreCancelled = true)
    public void onConsoleCommand(ServerCommandEvent event) {
        if (handle(event.getSender(), "/" + event.getCommand())) event.setCancelled(true);
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent event) {
        lastPartner.remove(event.getPlayer().getUniqueId().toString());
    }

    /** Ajoute les faux joueurs aux suggestions des commandes de plugins qui proposent des pseudos. */
    @EventHandler(priority = EventPriority.HIGH)
    public void onTabComplete(TabCompleteEvent event) {
        if (!enabled() || event.getCompletions().isEmpty()) return;
        Set<String> online = new HashSet<>();
        for (Player p : Bukkit.getOnlinePlayers()) online.add(p.getName().toLowerCase(Locale.ROOT));
        boolean suggestsPlayers = event.getCompletions().stream().anyMatch(c -> online.contains(c.toLowerCase(Locale.ROOT)));
        if (!suggestsPlayers) return;
        String buffer = event.getBuffer();
        String token = buffer.endsWith(" ") ? "" : buffer.substring(buffer.lastIndexOf(' ') + 1).toLowerCase(Locale.ROOT);
        List<String> completions = new ArrayList<>(event.getCompletions());
        for (FakePlayer fake : plugin.manager().all()) {
            if (fake.name().toLowerCase(Locale.ROOT).startsWith(token) && !completions.contains(fake.name())) {
                completions.add(fake.name());
            }
        }
        completions.sort(String.CASE_INSENSITIVE_ORDER);
        event.setCompletions(completions);
    }

    private boolean enabled() {
        return plugin.getConfig().getBoolean("interactions.enabled", true);
    }

    /** @return true si la commande a été prise en charge (elle sera alors annulée). */
    private boolean handle(CommandSender sender, String message) {
        if (!enabled() || plugin.manager().count() == 0) return false;
        String[] args = message.substring(1).trim().split("\\s+");
        if (args.length == 0 || args[0].isEmpty()) return false;
        String label = args[0].toLowerCase(Locale.ROOT);
        if (label.contains(":")) label = label.substring(label.indexOf(':') + 1); // essentials:msg → msg

        for (Map<?, ?> rule : plugin.getConfig().getMapList("interactions.commands")) {
            if (!strings(rule.get("commands")).contains(label)) continue;
            List<String> subs = strings(rule.get("subcommands"));
            if (!subs.isEmpty() && (args.length < 2 || !subs.contains(args[1].toLowerCase(Locale.ROOT)))) continue;
            String action = String.valueOf(rule.get("action"));
            if (action.equals("list")) return list(sender);
            if (action.equals("reply")) return reply(sender, args);

            int index = rule.get("arg") instanceof Number n ? n.intValue() : 1;
            if (args.length <= index) return false;
            FakePlayer fake = plugin.manager().get(args[index]);
            if (fake == null || fake.leaving() || Bukkit.getPlayerExact(args[index]) != null) return false;
            String rest = String.join(" ", Arrays.copyOfRange(args, index + 1, args.length));
            return switch (action) {
                case "whisper" -> !rest.isEmpty() && whisper(sender, fake, rest);
                case "request" -> request(sender, fake, label, rule);
                case "message" -> send(sender, str(rule, "message", ""), fake, rest);
                case "disconnect" -> allowed(sender, label) && disconnect(sender, fake, rule);
                case "teleport" -> allowed(sender, label) && teleport(sender, fake);
                default -> false;
            };
        }
        return false;
    }

    // --- Actions ---

    private boolean whisper(CommandSender sender, FakePlayer fake, String text) {
        ConfigurationSection w = plugin.getConfig().getConfigurationSection("interactions.whisper");
        if (w == null) return false;
        send(sender, w.getString("outgoing", ""), fake, text);
        lastPartner.put(key(sender), fake.name());
        ThreadLocalRandom r = ThreadLocalRandom.current();
        if (r.nextDouble() >= w.getDouble("reply-chance", 0.6)) return true;
        List<String> answers = chat.ruleAnswers(text);
        if (answers.isEmpty()) answers = w.getStringList("answers");
        if (answers.isEmpty()) return true;
        String answer = answers.get(r.nextInt(answers.size())).replace("<player>", sender.getName());
        later(w, 4, 20, () -> {
            if (plugin.manager().get(fake.name()) != fake || fake.leaving() || !stillThere(sender)) return;
            send(sender, w.getString("incoming", ""), fake, answer);
        });
        return true;
    }

    private boolean reply(CommandSender sender, String[] args) {
        String partner = lastPartner.get(key(sender));
        FakePlayer fake = partner == null ? null : plugin.manager().get(partner);
        if (fake == null || args.length < 2) return false; // pas de conversation avec un faux joueur : commande normale
        return whisper(sender, fake, String.join(" ", Arrays.copyOfRange(args, 1, args.length)));
    }

    private boolean list(CommandSender sender) {
        List<String> names = new ArrayList<>();
        for (Player p : Bukkit.getOnlinePlayers()) names.add(p.getName());
        for (FakePlayer f : plugin.manager().all()) names.add(f.name());
        int max = plugin.getConfig().getInt("server-list.max-players", 0);
        String format = plugin.getConfig().getString("interactions.list.format",
                "<lang:commands.list.players:'<count>':'<max>':'<names>'>");
        sender.sendMessage(MM.deserialize(format, Placeholder.unparsed("count", String.valueOf(names.size())),
                Placeholder.unparsed("max", String.valueOf(max > 0 ? max : Bukkit.getMaxPlayers())),
                Placeholder.unparsed("names", String.join(", ", names))));
        return true;
    }

    /** /tpa, /duel, /f invite… : « demande envoyée », puis refus ou expiration. Jamais acceptée. */
    private boolean request(CommandSender sender, FakePlayer fake, String label, Map<?, ?> rule) {
        String id = key(sender) + "|" + label + "|" + fake.name();
        if (!pending.add(id)) {
            send(sender, str(rule, "already", "<red>Tu as déjà envoyé une demande à <target>."), fake, "");
            return true;
        }
        send(sender, str(rule, "sent", "<gold>Demande envoyée à <red><target></red>."), fake, "");
        ThreadLocalRandom r = ThreadLocalRandom.current();
        double refuseChance = rule.get("refuse-chance") instanceof Number n ? n.doubleValue() : 0.4;
        long expire = rule.get("expire-seconds") instanceof Number n ? n.longValue() : 120;
        boolean refuse = r.nextDouble() < refuseChance;
        long delay = refuse ? 5 + r.nextLong(Math.max(1, Math.min(expire - 5, 40))) : expire;
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            pending.remove(id);
            if (!stillThere(sender)) return;
            send(sender, str(rule, refuse ? "refused" : "expired", refuse ? "<red><target> a refusé ta demande."
                    : "<red>Ta demande à <target> a expiré."), fake, "");
        }, delay * 20L);
        return true;
    }

    private boolean disconnect(CommandSender sender, FakePlayer fake, Map<?, ?> rule) {
        send(sender, str(rule, "feedback", "<gray><target> a été déconnecté."), fake, "");
        plugin.manager().remove(fake.name(), false);
        return true;
    }

    private boolean teleport(CommandSender sender, FakePlayer fake) {
        if (!(sender instanceof Player player) || !fake.hasBody()) return false; // sans corps : message vanilla
        Location at = fake.bodyLocation();
        if (at == null || at.getWorld() == null) return false;
        player.teleport(at);
        return true;
    }

    // --- Outils ---

    /** La commande réelle existe-t-elle et l'expéditeur a-t-il le droit de l'utiliser ? */
    private static boolean allowed(CommandSender sender, String label) {
        Command command = Bukkit.getCommandMap().getCommand(label);
        if (command != null) return command.testPermissionSilent(sender);
        return sender.hasPermission("vaeloria.fakeplayers.admin");
    }

    private boolean send(CommandSender sender, String format, FakePlayer fake, String message) {
        if (format == null || format.isEmpty()) return true;
        Component text = MM.deserialize(format, TagResolver.resolver(
                Placeholder.unparsed("target", fake.name()),
                Placeholder.unparsed("player", sender.getName()),
                Placeholder.unparsed("message", message)));
        sender.sendMessage(text);
        return true;
    }

    private static boolean stillThere(CommandSender sender) {
        return !(sender instanceof Player p) || p.isOnline();
    }

    private static String key(CommandSender sender) {
        return sender instanceof Player p ? p.getUniqueId().toString() : new UUID(0, 0).toString();
    }

    private void later(ConfigurationSection section, int defMin, int defMax, Runnable task) {
        int min = Math.max(0, section.getInt("delay-seconds.min", defMin));
        int max = Math.max(min, section.getInt("delay-seconds.max", defMax));
        Bukkit.getScheduler().runTaskLater(plugin, task, 20L * (min + ThreadLocalRandom.current().nextInt(max - min + 1)) + 1);
    }

    private static String str(Map<?, ?> rule, String key, String def) {
        Object v = rule.get(key);
        return v == null ? def : v.toString();
    }

    private static List<String> strings(Object value) {
        List<String> out = new ArrayList<>();
        if (value instanceof List<?> list) for (Object o : list) if (o != null) out.add(o.toString().toLowerCase(Locale.ROOT));
        return out;
    }
}
