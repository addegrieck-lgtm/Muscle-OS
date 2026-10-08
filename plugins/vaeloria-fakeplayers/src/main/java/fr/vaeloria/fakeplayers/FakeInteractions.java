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
        reloadRules();
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

    /** Commande / sous-commandes / position du pseudo, lues depuis interactions.commands (copie thread-safe). */
    private record TabRule(List<String> commands, List<String> subcommands, int arg) {}

    private volatile List<TabRule> tabRules = List.of();

    /** À appeler au démarrage et après /fp reload. */
    void reloadRules() {
        List<TabRule> rules = new ArrayList<>();
        for (Map<?, ?> rule : plugin.getConfig().getMapList("interactions.commands")) {
            int index = rule.get("arg") instanceof Number n ? n.intValue() : 1;
            rules.add(new TabRule(strings(rule.get("commands")), strings(rule.get("subcommands")), index));
        }
        tabRules = List.copyOf(rules);
    }

    /** Suggestions synchrones (commandes Bukkit classiques). */
    @EventHandler(priority = EventPriority.HIGH)
    public void onTabComplete(TabCompleteEvent event) {
        List<String> merged = suggest(event.getBuffer(), event.getCompletions());
        if (merged != null) event.setCompletions(merged);
    }

    /**
     * Suggestions asynchrones de Paper : certains plugins (Essentials…) répondent ici et l'événement synchrone
     * n'a alors jamais lieu. On complète leur réponse sans la remplacer.
     */
    @EventHandler(priority = EventPriority.HIGHEST)
    public void onAsyncTabComplete(com.destroystokyo.paper.event.server.AsyncTabCompleteEvent event) {
        if (!event.isCommand() || !event.isHandled()) return; // non traité : l'événement synchrone suivra
        List<String> existing = new ArrayList<>();
        for (var c : event.completions()) existing.add(c.suggestion());
        List<String> merged = suggest(event.getBuffer(), existing);
        if (merged == null) return;
        List<com.destroystokyo.paper.event.server.AsyncTabCompleteEvent.Completion> out = new ArrayList<>(event.completions());
        for (String name : merged) {
            if (!existing.contains(name)) out.add(com.destroystokyo.paper.event.server.AsyncTabCompleteEvent.Completion.completion(name));
        }
        event.completions(out);
    }

    /**
     * Ajoute les pseudos des faux joueurs qui commencent par le mot en cours. Pour les commandes de
     * interactions.commands, à la position du pseudo, même si le plugin ne propose personne (quand on est seul) ;
     * pour les autres commandes, seulement si elles proposent déjà des pseudos de vrais joueurs.
     * Thread-safe (appelée aussi hors du thread principal). Retourne null s'il n'y a rien à changer.
     */
    private List<String> suggest(String buffer, List<String> existing) {
        if (!enabled() || buffer == null || !buffer.startsWith("/")) return null;
        List<String> fakes = plugin.manager().namesSnapshot();
        if (fakes.isEmpty()) return null;
        String[] tokens = buffer.substring(1).split(" ", -1); // -1 : garde le mot vide après une espace finale
        if (tokens.length < 2) return null;
        String label = tokens[0].toLowerCase(Locale.ROOT);
        if (label.contains(":")) label = label.substring(label.indexOf(':') + 1);
        int position = tokens.length - 1;
        String token = tokens[position].toLowerCase(Locale.ROOT);

        boolean ruleMatches = false;
        for (TabRule rule : tabRules) {
            if (!rule.commands().contains(label) || rule.arg() != position) continue;
            if (!rule.subcommands().isEmpty() && !rule.subcommands().contains(tokens[1].toLowerCase(Locale.ROOT))) continue;
            ruleMatches = true;
            break;
        }
        if (!ruleMatches) {
            Set<String> online = new HashSet<>();
            for (Player p : Bukkit.getOnlinePlayers()) online.add(p.getName().toLowerCase(Locale.ROOT));
            if (existing.stream().noneMatch(c -> online.contains(c.toLowerCase(Locale.ROOT)))) return null;
        }
        List<String> merged = new ArrayList<>(existing);
        boolean changed = false;
        for (String name : fakes) {
            if (name.toLowerCase(Locale.ROOT).startsWith(token) && !merged.contains(name)) {
                merged.add(name);
                changed = true;
            }
        }
        if (!changed) return null;
        merged.sort(String.CASE_INSENSITIVE_ORDER);
        return merged;
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
        String answer = chat.whisperReply(fake, text, sender.getName());
        if (answer == null) return true;
        // Le temps de lire le message, puis de taper la réponse.
        long ticks = 20L * (w.getInt("delay-seconds.min", 2) + r.nextInt(Math.max(1, w.getInt("delay-seconds.max", 10)
                - w.getInt("delay-seconds.min", 2) + 1))) + chat.typingTicks(answer);
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            if (plugin.manager().get(fake.name()) != fake || fake.leaving() || !stillThere(sender)) return;
            send(sender, w.getString("incoming", ""), fake, answer);
        }, ticks);
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

    /**
     * /tpa, /tpahere, /duel, /f invite… : « demande envoyée », puis acceptation, refus ou expiration.
     * Acceptée (si la règle a teleport: to-target ou to-sender et que les corps sont disponibles) :
     * le faux joueur prend un corps dans le monde et la téléportation a lieu après le délai habituel.
     */
    private boolean request(CommandSender sender, FakePlayer fake, String label, Map<?, ?> rule) {
        String id = key(sender) + "|" + label + "|" + fake.name();
        if (!pending.add(id)) {
            send(sender, str(rule, "already", "<red>Tu as déjà envoyé une demande à <target>."), fake, "");
            return true;
        }
        send(sender, str(rule, "sent", "<gold>Demande envoyée à <red><target></red>."), fake, "");
        ThreadLocalRandom r = ThreadLocalRandom.current();
        String teleport = str(rule, "teleport", "none");
        boolean canAccept = !teleport.equals("none") && sender instanceof Player && plugin.manager().bodies() != null;
        double accept = canAccept ? num(rule, "accept-chance", 0.5) : 0;
        double refuse = num(rule, "refuse-chance", 0.4);
        long expire = (long) num(rule, "expire-seconds", 120);
        double roll = r.nextDouble();
        String outcome = roll < accept ? "accepted" : roll < accept + refuse ? "refused" : "expired";
        long delay = outcome.equals("expired") ? expire : 3 + r.nextLong(Math.max(1, Math.min(expire - 3, 30)));
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            pending.remove(id);
            if (!stillThere(sender)) return;
            if (plugin.manager().get(fake.name()) != fake || fake.leaving()) { // parti entre-temps
                send(sender, str(rule, "expired", "<red>Ta demande à <target> a expiré."), fake, "");
                return;
            }
            switch (outcome) {
                case "accepted" -> accepted((Player) sender, fake, rule, teleport);
                case "refused" -> send(sender, str(rule, "refused", "<red><target> a refusé ta demande."), fake, "");
                default -> send(sender, str(rule, "expired", "<red>Ta demande à <target> a expiré."), fake, "");
            }
        }, delay * 20L);
        return true;
    }

    private void accepted(Player player, FakePlayer fake, Map<?, ?> rule, String teleport) {
        send(player, str(rule, "accepted", "<red><target></red> <gold>a accepté ta demande."), fake, "");
        long warmup = (long) num(rule, "warmup-seconds", 3);
        if (warmup > 0) send(player, str(rule, "teleporting", "<gold>Téléportation dans <red>" + warmup + "</red> secondes…"), fake, "");
        Location start = player.getLocation();
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            if (!player.isOnline() || plugin.manager().get(fake.name()) != fake || fake.leaving()) return;
            if (warmup > 0 && rule.get("cancel-on-move") != Boolean.FALSE
                    && (player.getWorld() != start.getWorld() || player.getLocation().distanceSquared(start) > 1)) {
                send(player, str(rule, "cancelled", "<red>Téléportation annulée : tu as bougé."), fake, "");
                return;
            }
            if (teleport.equals("to-sender")) {
                Location near = beside(player.getLocation());
                plugin.manager().moveBody(fake, near);
            } else {
                if (!fake.hasBody()) {
                    Location spot = randomSpot(player);
                    if (spot == null) {
                        send(player, str(rule, "expired", "<red>Ta demande à <target> a expiré."), fake, "");
                        return;
                    }
                    plugin.manager().moveBody(fake, spot);
                }
                player.teleport(beside(fake.bodyLocation()));
            }
        }, Math.max(1, warmup * 20L));
    }

    /** Emplacement de surface au hasard pour un faux joueur sans corps (interactions.teleport). */
    private Location randomSpot(Player player) {
        ConfigurationSection t = plugin.getConfig().getConfigurationSection("interactions.teleport");
        String worldName = t == null ? "" : t.getString("world", "");
        org.bukkit.World world = worldName.isEmpty() ? Bukkit.getWorlds().get(0) : Bukkit.getWorld(worldName);
        if (world == null) world = player.getWorld();
        int min = t == null ? 300 : t.getInt("min-radius", 300), max = t == null ? 3000 : Math.max(min + 1, t.getInt("max-radius", 3000));
        Location center = world.getSpawnLocation();
        ThreadLocalRandom r = ThreadLocalRandom.current();
        for (int attempt = 0; attempt < 15; attempt++) {
            double angle = r.nextDouble(Math.PI * 2), dist = min + r.nextDouble(max - min);
            int x = center.getBlockX() + (int) (Math.cos(angle) * dist), z = center.getBlockZ() + (int) (Math.sin(angle) * dist);
            if (!world.getWorldBorder().isInside(new Location(world, x, 0, z))) continue;
            org.bukkit.block.Block ground = world.getHighestBlockAt(x, z);
            if (ground.isLiquid() || !ground.getType().isSolid() || ground.getY() <= world.getMinHeight()) continue;
            return new Location(world, x + 0.5, ground.getY() + 1, z + 0.5, r.nextFloat() * 360, 0);
        }
        return null;
    }

    /** Position à côté d'un point, posée sur le sol (pour ne pas se retrouver dans le corps ou dans un mur). */
    private static Location beside(Location at) {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        double angle = r.nextDouble(Math.PI * 2);
        Location l = at.clone().add(Math.cos(angle) * 1.5, 0, Math.sin(angle) * 1.5);
        if (l.getBlock().getType().isSolid() || !l.clone().subtract(0, 1, 0).getBlock().getType().isSolid()) return at.clone();
        l.setDirection(at.toVector().subtract(l.toVector())); // face au faux joueur
        return l;
    }

    private static double num(Map<?, ?> rule, String key, double def) {
        return rule.get(key) instanceof Number n ? n.doubleValue() : def;
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
