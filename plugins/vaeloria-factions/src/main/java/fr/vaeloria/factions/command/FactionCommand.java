package fr.vaeloria.factions.command;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.ChunkPos;
import fr.vaeloria.factions.model.FPerm;
import fr.vaeloria.factions.model.FPlayer;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.Pos;
import fr.vaeloria.factions.model.Relation;
import fr.vaeloria.factions.model.Role;
import fr.vaeloria.factions.rules.NameRules;
import fr.vaeloria.factions.rules.PowerMath;
import fr.vaeloria.factions.rules.ShieldWindow;
import fr.vaeloria.factions.service.ClaimService;
import fr.vaeloria.factions.service.FactionManager;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.JoinConfiguration;
import net.kyori.adventure.text.event.ClickEvent;
import net.kyori.adventure.text.event.HoverEvent;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;
import org.jetbrains.annotations.NotNull;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.function.ToDoubleFunction;

/** /f — toutes les sous-commandes, en français avec alias anglais historiques. */
public final class FactionCommand implements CommandExecutor, TabCompleter {
    private final VaeloriaFactionsPlugin plugin;
    private final Map<String, Sub> subs = new LinkedHashMap<>();
    private final Map<String, Sub> lookup = new LinkedHashMap<>();
    private final AdminCommand admin;

    @FunctionalInterface
    interface Handler { void run(CommandSender sender, Player player, String[] args); }

    @FunctionalInterface
    interface Completer { List<String> complete(CommandSender sender, String[] args); }

    record Sub(String name, String usage, String description, boolean playerOnly, String permission, Handler handler, Completer completer) {}

    public FactionCommand(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
        this.admin = new AdminCommand(plugin);
        String use = "vaeloria.factions.use";
        // Gestion
        reg("creer", "<nom>", "Fonder une faction", true, use, this::create, null, "create", "créer");
        reg("dissoudre", "", "Dissoudre ta faction", true, use, this::disband, null, "disband");
        reg("renommer", "<nom>", "Renommer la faction", true, use, this::rename, null, "rename", "tag");
        reg("desc", "<texte>", "Changer la description", true, use, this::desc, null, "description");
        reg("ouvrir", "", "Ouvrir / fermer la faction à tous", true, use, this::open, null, "open");
        reg("info", "[faction|joueur]", "Fiche d'une faction", false, use, this::info, (s, a) -> factionOrPlayerNames(), "show", "who", "f");
        reg("liste", "[page]", "Toutes les factions", false, use, this::list, null, "list", "ls");
        reg("top", "[power|claims|kills|pillages|surclaims|totems|banque]", "Classements", false, use, this::top,
                (s, a) -> List.of("power", "claims", "kills", "pillages", "surclaims", "totems", "banque"));
        reg("power", "[joueur]", "Power d'un joueur", false, use, this::power, (s, a) -> onlineNames(), "pow");
        reg("menu", "", "Menu de faction", true, use, (s, p, a) -> plugin.menus().openMain(p), null, "gui");
        // Membres
        reg("inviter", "<joueur>", "Inviter un joueur", true, use, this::invite, (s, a) -> onlineNames(), "invite", "inv");
        reg("desinviter", "<joueur>", "Retirer une invitation", true, use, this::uninvite, (s, a) -> onlineNames(), "deinvite", "uninvite");
        reg("rejoindre", "<faction>", "Rejoindre une faction", true, use, this::join, (s, a) -> factionNames(), "join", "accepter");
        reg("quitter", "", "Quitter ta faction", true, use, this::leave, null, "leave");
        reg("expulser", "<joueur>", "Expulser un membre", true, use, this::kick, (s, a) -> memberNames(s), "kick");
        reg("promouvoir", "<joueur>", "Monter un membre en grade", true, use, this::promote, (s, a) -> memberNames(s), "promote", "mod");
        reg("retrograder", "<joueur>", "Descendre un membre en grade", true, use, this::demote, (s, a) -> memberNames(s), "demote", "rétrograder");
        reg("chef", "<joueur>", "Transmettre la direction", true, use, this::leader, (s, a) -> memberNames(s), "leader", "owner");
        // Territoire
        reg("claim", "[rayon]", "Claim (ou surclaim) le chunk", true, use, this::claim, (s, a) -> List.of("1", "2", "3"));
        reg("unclaim", "[tout]", "Libérer le chunk", true, use, this::unclaim, (s, a) -> List.of("tout"), "declaim");
        reg("autoclaim", "", "Claim automatique en marchant", true, use, this::autoclaim, null, "ac");
        reg("carte", "[on|off]", "Carte du territoire", true, use, this::map, (s, a) -> List.of("on", "off"), "map");
        reg("voir", "", "Afficher les bordures du chunk", true, use, (s, p, a) -> plugin.territory().toggleSeeChunk(p), null, "seechunk", "sc");
        // Déplacements
        reg("home", "", "Aller au home de faction", true, use, this::home, null, "h");
        reg("sethome", "", "Définir le home", true, use, this::sethome, null);
        reg("warp", "[nom]", "Warps de faction", true, use, this::warp, (s, a) -> warpNames(s), "warps");
        reg("setwarp", "<nom>", "Créer un warp", true, use, this::setwarp, null);
        reg("delwarp", "<nom>", "Supprimer un warp", true, use, this::delwarp, (s, a) -> warpNames(s));
        reg("fly", "", "Voler dans ton territoire", true, use, this::fly, null, "vol");
        // Diplomatie
        reg("allie", "<faction>", "Proposer une alliance", true, use, (s, p, a) -> relation(p, a, Relation.ALLIE), (s, a) -> factionNames(), "ally", "allié");
        reg("treve", "<faction>", "Proposer une trêve", true, use, (s, p, a) -> relation(p, a, Relation.TREVE), (s, a) -> factionNames(), "truce", "trêve");
        reg("neutre", "<faction>", "Redevenir neutre", true, use, (s, p, a) -> relation(p, a, Relation.NEUTRE), (s, a) -> factionNames(), "neutral");
        reg("ennemi", "<faction>", "Déclarer la guerre", true, use, (s, p, a) -> relation(p, a, Relation.ENNEMI), (s, a) -> factionNames(), "enemy");
        reg("relations", "[faction]", "Relations d'une faction", false, use, this::relations, (s, a) -> factionNames(), "rel");
        // Faction
        reg("chat", "[f|a|p]", "Changer de canal de discussion", true, use, this::chat, (s, a) -> List.of("f", "a", "p"), "c");
        reg("banque", "[deposer|retirer] [montant]", "Banque de faction", true, use, this::bank, (s, a) -> a.length <= 2 ? List.of("deposer", "retirer") : List.of(), "bank", "money");
        reg("coffre", "", "Coffre de faction", true, use, this::chest, null, "chest", "vault");
        reg("perm", "[permission] [rang]", "Permissions par rang", true, use, this::perm, this::permComplete, "perms");
        reg("bouclier", "[heure 0-23|off]", "Bouclier anti-pillage quotidien", true, use, this::shield, (s, a) -> List.of("0", "2", "4", "20", "22", "off"), "shield");
        reg("guerre", "[declarer <faction>|abandonner]", "Guerres officielles", true, use, this::war,
                (s, a) -> a.length <= 1 ? List.of("declarer", "abandonner") : factionNames(), "war");
        reg("totem", "[liste|creer|supprimer|lancer|arreter]", "Événement Totem", false, use, this::totem,
                (s, a) -> a.length <= 1 ? (s.hasPermission("vaeloria.factions.admin") ? List.of("liste", "creer", "supprimer", "lancer", "arreter") : List.of("liste"))
                        : plugin.totems().definitions().stream().map(d -> d.name).toList());
        reg("logs", "[page]", "Journal de la faction", true, use, this::logs, null, "journal", "log");
        reg("discord", "[lien|off|test|ping]", "Alertes Discord de la faction", true, use, this::discord,
                (s, a) -> List.of("off", "test", "ping"), "webhook");
        reg("scoreboard", "", "Afficher / masquer le tableau", true, use, (s, p, a) -> plugin.scoreboard().toggle(p), null, "sb");
        reg("aide", "[page]", "Cette aide", false, use, this::help, null, "help", "?");
        reg("admin", "<…>", "Administration", false, "vaeloria.factions.admin", admin::run, admin::complete);
    }

    private void reg(String name, String usage, String desc, boolean playerOnly, String perm, Handler h, Completer c, String... aliases) {
        Sub s = new Sub(name, usage, desc, playerOnly, perm, h, c);
        subs.put(name, s);
        lookup.put(name, s);
        for (String a : aliases) lookup.put(a, s);
    }

    private FactionManager m() { return plugin.manager(); }
    private Settings s() { return plugin.settings(); }

    @Override
    public boolean onCommand(@NotNull CommandSender sender, @NotNull Command command, @NotNull String label, String[] args) {
        if (args.length == 0) {
            if (sender instanceof Player p) plugin.menus().openMain(p);
            else help(sender, null, args);
            return true;
        }
        Sub sub = lookup.get(args[0].toLowerCase(Locale.ROOT));
        if (sub == null) {
            Msg.send(sender, "error.unknown-command", "label", label);
            return true;
        }
        if (!sender.hasPermission(sub.permission())) {
            Msg.send(sender, "error.no-permission");
            return true;
        }
        if (sub.playerOnly() && !(sender instanceof Player)) {
            Msg.send(sender, "error.player-only");
            return true;
        }
        String[] rest = Arrays.copyOfRange(args, 1, args.length);
        sub.handler().run(sender, sender instanceof Player p ? p : null, rest);
        return true;
    }

    @Override
    public List<String> onTabComplete(@NotNull CommandSender sender, @NotNull Command command, @NotNull String alias, String[] args) {
        if (args.length == 1) {
            List<String> out = new ArrayList<>();
            for (Sub s : subs.values()) if (sender.hasPermission(s.permission())) out.add(s.name());
            return filter(out, args[0]);
        }
        Sub sub = lookup.get(args[0].toLowerCase(Locale.ROOT));
        if (sub == null || sub.completer() == null || !sender.hasPermission(sub.permission())) return List.of();
        String[] rest = Arrays.copyOfRange(args, 1, args.length);
        return filter(sub.completer().complete(sender, rest), args[args.length - 1]);
    }

    static List<String> filter(List<String> in, String prefix) {
        String p = prefix.toLowerCase(Locale.ROOT);
        List<String> out = new ArrayList<>();
        for (String s : in) if (s.toLowerCase(Locale.ROOT).startsWith(p)) out.add(s);
        return out;
    }

    List<String> factionNames() {
        List<String> l = new ArrayList<>();
        for (Faction f : m().playerFactions()) l.add(f.name);
        return l;
    }

    private List<String> factionOrPlayerNames() {
        List<String> l = factionNames();
        l.addAll(onlineNames());
        return l;
    }

    static List<String> onlineNames() {
        List<String> l = new ArrayList<>();
        for (Player p : Bukkit.getOnlinePlayers()) l.add(p.getName());
        return l;
    }

    private List<String> memberNames(CommandSender s) {
        if (!(s instanceof Player p)) return List.of();
        Faction f = m().factionOf(p);
        if (f == null) return List.of();
        List<String> l = new ArrayList<>();
        for (UUID u : f.members.keySet()) if (!u.equals(p.getUniqueId())) l.add(m().nameOf(u));
        return l;
    }

    private List<String> warpNames(CommandSender s) {
        if (!(s instanceof Player p)) return List.of();
        Faction f = m().factionOf(p);
        return f == null ? List.of() : new ArrayList<>(f.warps.keySet());
    }

    private List<String> permComplete(CommandSender s, String[] a) {
        if (a.length <= 1) return Arrays.stream(FPerm.values()).map(x -> x.name().toLowerCase(Locale.ROOT)).toList();
        return Arrays.stream(Role.values()).map(x -> x.name().toLowerCase(Locale.ROOT)).toList();
    }

    // ── Aides ──

    private Faction need(Player p) {
        Faction f = m().factionOf(p);
        if (f == null) Msg.send(p, "error.no-faction");
        return f;
    }

    private boolean can(Player p, Faction f, FPerm perm) {
        if (f.can(p.getUniqueId(), perm) || m().fplayer(p).adminBypass) return true;
        Msg.send(p, "error.rank", "perm", perm.label(), "role", f.permRole(perm).label());
        return false;
    }

    private boolean isLeader(Player p, Faction f) {
        if (f.role(p.getUniqueId()) == Role.CHEF || m().fplayer(p).adminBypass) return true;
        Msg.send(p, "error.leader-only");
        return false;
    }

    /** Faction par nom, ou faction du joueur nommé. */
    private Faction resolve(String arg) {
        Faction f = m().byName(arg);
        if (f != null) return f;
        Player online = Bukkit.getPlayerExact(arg);
        if (online != null) return m().factionOf(online);
        FPlayer fp = m().fplayerByName(arg);
        return fp == null ? null : m().factionOf(fp.uuid);
    }

    private UUID memberByName(Faction f, String name) {
        for (UUID u : f.members.keySet()) if (m().nameOf(u).equalsIgnoreCase(name)) return u;
        return null;
    }

    private void log(Faction f, String type, Player actor, String detail) {
        plugin.logs().add(f, type, actor == null ? "—" : actor.getName(), detail);
    }

    private boolean blockedByCombat(Player p) {
        if (!plugin.combat().inCombat(p)) return false;
        Msg.send(p, "combat.teleport-blocked", "seconds", (plugin.combat().remaining(p) + 999) / 1000);
        return true;
    }

    private void broadcastFaction(Faction f, String key, Object... kv) {
        for (Player p : m().online(f)) Msg.send(p, key, kv);
    }

    // ── Gestion ──

    private void create(CommandSender s, Player p, String[] a) {
        if (a.length < 1) { usage(p, "creer"); return; }
        if (m().factionOf(p) != null) { Msg.send(p, "error.already-in-faction"); return; }
        String name = a[0];
        if (!validName(p, name)) return;
        Faction f = m().create(name, p);
        plugin.bridge().create(f, p.getUniqueId(), p.getName());
        plugin.bridge().join(f, p.getUniqueId(), p.getName(), Role.CHEF);
        Bukkit.broadcast(Msg.prefixed("faction.created-broadcast", "player", p.getName(), "faction", f.name));
        Msg.send(p, "faction.created-tips");
    }

    private boolean validName(Player p, String name) {
        NameRules.Result r = NameRules.validate(name, s().nameMin, s().nameMax);
        if (r != NameRules.Result.OK) {
            Msg.send(p, "faction.name." + r.name().toLowerCase(Locale.ROOT), "min", s().nameMin, "max", Math.min(24, s().nameMax));
            return false;
        }
        if (m().byName(name) != null) {
            Msg.send(p, "faction.name.taken", "faction", name);
            return false;
        }
        return true;
    }

    private void disband(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null || !isLeader(p, f)) return;
        if (f.inRaid()) { Msg.send(p, "raid.locked", "time", Msg.duration(f.raidUntil - System.currentTimeMillis())); return; }
        if (a.length < 1 || !a[0].equalsIgnoreCase("confirmer")) {
            p.sendMessage(Msg.get("faction.disband-confirm"));
            return;
        }
        if (f.bank > 0 && plugin.bank().available()) plugin.bank().deposit(p, f.bank);
        plugin.disband(f);
        Bukkit.broadcast(Msg.prefixed("faction.disbanded-broadcast", "player", p.getName(), "faction", f.name));
    }

    private void rename(CommandSender s, Player p, String[] a) {
        if (!s().allowRename) { Msg.send(p, "error.disabled"); return; }
        Faction f = need(p);
        if (f == null || !isLeader(p, f)) return;
        if (a.length < 1) { usage(p, "renommer"); return; }
        if (plugin.wars().warOf(f) != null) { Msg.send(p, "war.locked"); return; }
        if (!validName(p, a[0])) return;
        String old = f.name;
        log(f, "FACTION", p, "a renommé la faction (" + old + " → " + a[0] + ")");
        // Le site identifie les factions par leur nom : on y recrée la faction sous son nouveau nom.
        plugin.bridge().disband(f);
        m().rename(f, a[0]);
        UUID leader = f.leader();
        if (leader != null) plugin.bridge().create(f, leader, m().nameOf(leader));
        f.members.forEach((u, r) -> plugin.bridge().join(f, u, m().nameOf(u), r));
        for (ChunkPos c : f.claims) plugin.bridge().claim(f, c, true);
        Bukkit.broadcast(Msg.prefixed("faction.renamed-broadcast", "old", old, "faction", f.name));
    }

    private void desc(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null) return;
        if (!f.role(p.getUniqueId()).atLeast(Role.OFFICIER)) { Msg.send(p, "error.officer-only"); return; }
        String d = String.join(" ", a).trim();
        if (d.length() > s().descMax) { Msg.send(p, "faction.desc-too-long", "max", s().descMax); return; }
        f.description = d;
        m().markDirty();
        log(f, "FACTION", p, "description : " + (d.isEmpty() ? "—" : d));
        broadcastFaction(f, "faction.desc-changed", "player", p.getName(), "desc", d.isEmpty() ? "—" : d);
    }

    private void open(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null) return;
        if (!f.role(p.getUniqueId()).atLeast(Role.OFFICIER)) { Msg.send(p, "error.officer-only"); return; }
        f.open = !f.open;
        m().markDirty();
        log(f, "FACTION", p, f.open ? "a ouvert la faction" : "a fermé la faction");
        broadcastFaction(f, f.open ? "faction.now-open" : "faction.now-closed", "player", p.getName());
    }

    private void info(CommandSender s, Player p, String[] a) {
        Faction f;
        if (a.length >= 1) {
            f = resolve(a[0]);
            if (f == null) { Msg.send(s, "error.faction-not-found", "faction", a[0]); return; }
        } else if (p != null) {
            f = need(p);
            if (f == null) return;
        } else {
            usage(s, "info");
            return;
        }
        Faction viewer = p == null ? null : m().factionOf(p);
        Relation rel = m().relation(viewer, f);
        String color = f.system ? "gold" : rel.color();
        s.sendMessage(Msg.get("info.header", "faction", f.name, "color", color));
        if (!f.description.isEmpty()) s.sendMessage(Msg.get("info.desc", "desc", f.description));
        if (f.system) return;
        s.sendMessage(Msg.get("info.meta", "relation", rel.label(), "color", color,
                "access", Msg.parse(f.open ? Msg.raw("info.open") : Msg.raw("info.closed")),
                "created", new SimpleDateFormat("dd/MM/yyyy").format(new Date(f.createdAt))));
        boolean vulnerable = m().isVulnerable(f);
        s.sendMessage(Msg.get("info.power", "power", Msg.fmt(m().power(f)), "max", Msg.fmt(m().maxPower(f)),
                "claims", f.claims.size(), "limit", m().landLimit(f),
                "state", Msg.parse(vulnerable ? Msg.raw("info.vulnerable") : "")));
        String shield = f.shieldStart < 0 ? Msg.raw("info.shield-none")
                : ShieldWindow.describe(f.shieldStart, s().shieldHours) + (plugin.raid().shielded(f) ? Msg.raw("info.shield-on") : "");
        s.sendMessage(Msg.get("info.shield", "shield", Msg.parse(shield)));
        if (f.inRaid()) s.sendMessage(Msg.get("info.raid", "time", Msg.duration(f.raidUntil - System.currentTimeMillis())));
        if (s().bankEnabled && plugin.bank().available()) s.sendMessage(Msg.get("info.bank", "bank", plugin.bank().format(f.bank)));
        UUID leader = f.leader();
        s.sendMessage(Msg.get("info.leader", "leader", leader == null ? "—" : m().nameOf(leader)));
        List<Component> on = new ArrayList<>(), off = new ArrayList<>();
        f.members.entrySet().stream().sorted((x, y) -> y.getValue().compareTo(x.getValue())).forEach(e -> {
            UUID u = e.getKey();
            Component c = Msg.parse("<white><rk><n>", "rk", e.getValue().prefix(), "n", m().nameOf(u))
                    .hoverEvent(HoverEvent.showText(Msg.get("info.member-hover", "role", e.getValue().label(),
                            "power", Msg.fmt(m().playerPower(u)), "max", Msg.fmt(s().powerMax))));
            (Bukkit.getPlayer(u) != null ? on : off).add(c);
        });
        Component sep = Msg.parse("<dark_gray>, ");
        s.sendMessage(Msg.get("info.online", "count", on.size()).append(Component.join(JoinConfiguration.separator(sep), on)));
        if (!off.isEmpty()) s.sendMessage(Msg.get("info.offline", "count", off.size()).append(Component.join(JoinConfiguration.separator(sep), off)));
        sendRelationLine(s, f, Relation.ALLIE, "info.allies");
        sendRelationLine(s, f, Relation.TREVE, "info.truces");
        sendRelationLine(s, f, Relation.ENNEMI, "info.enemies");
        s.sendMessage(Msg.get("info.stats", "kills", f.kills, "deaths", f.deaths, "raids", f.raidsDone, "raided", f.raidsSuffered,
                "oc", f.overclaimsDone, "ocs", f.overclaimsSuffered, "totems", f.totemsWon, "wars", f.warsWon));
    }

    private void sendRelationLine(CommandSender s, Faction f, Relation rel, String key) {
        List<Component> l = new ArrayList<>();
        for (Faction o : m().playerFactions()) {
            if (o != f && m().relation(f, o) == rel) {
                l.add(Msg.parse("<color><n>", "color", rel.color(), "n", o.name)
                        .clickEvent(ClickEvent.runCommand("/f info " + o.name)));
            }
        }
        if (l.isEmpty()) return;
        s.sendMessage(Msg.get(key, "count", l.size()).append(Component.join(JoinConfiguration.separator(Msg.parse("<dark_gray>, ")), l)));
    }

    private void list(CommandSender s, Player p, String[] a) {
        List<Faction> all = m().playerFactions();
        all.sort(Comparator.<Faction>comparingInt(f -> m().online(f).size()).reversed().thenComparing(f -> -m().power(f)));
        int perPage = 10;
        int pages = Math.max(1, (all.size() + perPage - 1) / perPage);
        int page = a.length > 0 ? parseInt(a[0], 1) : 1;
        page = Math.max(1, Math.min(pages, page));
        s.sendMessage(Msg.get("list.header", "page", page, "pages", pages, "count", all.size()));
        Faction viewer = p == null ? null : m().factionOf(p);
        for (int i = (page - 1) * perPage; i < Math.min(all.size(), page * perPage); i++) {
            Faction f = all.get(i);
            s.sendMessage(Msg.get("list.line", "color", m().relation(viewer, f).color(), "faction", f.name,
                    "online", m().online(f).size(), "members", f.members.size(),
                    "power", Msg.fmt(m().power(f)), "max", Msg.fmt(m().maxPower(f)), "claims", f.claims.size())
                    .clickEvent(ClickEvent.runCommand("/f info " + f.name))
                    .hoverEvent(HoverEvent.showText(Msg.get("list.hover"))));
        }
        if (page < pages) s.sendMessage(Msg.get("list.next", "next", page + 1).clickEvent(ClickEvent.runCommand("/f liste " + (page + 1))));
    }

    private void top(CommandSender s, Player p, String[] a) {
        String crit = a.length > 0 ? a[0].toLowerCase(Locale.ROOT) : "power";
        ToDoubleFunction<Faction> key;
        Function<Faction, String> show;
        switch (crit) {
            case "claims", "terres" -> { key = f -> f.claims.size(); show = f -> f.claims.size() + " claims"; crit = "claims"; }
            case "kills" -> { key = f -> f.kills; show = f -> f.kills + " kills"; }
            case "pillages", "raids" -> { key = f -> f.raidsDone; show = f -> f.raidsDone + " pillages"; crit = "pillages"; }
            case "totems", "totem" -> { key = f -> f.totemsWon; show = f -> f.totemsWon + " totems"; crit = "totems"; }
            case "surclaims", "overclaims" -> { key = f -> f.overclaimsDone; show = f -> f.overclaimsDone + " surclaims"; crit = "surclaims"; }
            case "banque", "argent", "money" -> { key = f -> f.bank; show = f -> plugin.bank().format(f.bank); crit = "banque"; }
            default -> { key = f -> m().power(f); show = f -> Msg.fmt(m().power(f)) + " power"; crit = "power"; }
        }
        List<Faction> all = m().playerFactions();
        all.sort(Comparator.comparingDouble(key).reversed());
        s.sendMessage(Msg.get("top.header", "criterion", crit));
        String[] medals = {"<gold>①", "<gray>②", "<#cd7f32>③"};
        for (int i = 0; i < Math.min(10, all.size()); i++) {
            Faction f = all.get(i);
            String rank = i < 3 ? medals[i] : "<dark_gray>" + (i + 1) + ".";
            s.sendMessage(Msg.parse(rank + " " + Msg.raw("top.line"), "faction", f.name, "value", show.apply(f))
                    .clickEvent(ClickEvent.runCommand("/f info " + f.name)));
        }
        if (all.isEmpty()) Msg.send(s, "top.empty");
    }

    private void power(CommandSender s, Player p, String[] a) {
        UUID target;
        String name;
        if (a.length > 0) {
            Player o = Bukkit.getPlayerExact(a[0]);
            FPlayer fp = o != null ? m().fplayer(o) : m().fplayerByName(a[0]);
            if (fp == null) { Msg.send(s, "error.player-not-found", "player", a[0]); return; }
            target = fp.uuid;
            name = fp.name;
        } else if (p != null) {
            target = p.getUniqueId();
            name = p.getName();
        } else { usage(s, "power"); return; }
        FPlayer fp = m().fplayer(target);
        double regen = s().regenPerMinute;
        long minutes = fp.power >= s().powerMax || regen <= 0 ? 0 : (long) Math.ceil((s().powerMax - fp.power) / regen);
        Msg.send(s, "power.show", "player", name, "power", Msg.fmt(fp.power), "max", Msg.fmt(s().powerMax),
                "full", minutes == 0 ? Msg.raw("power.full") : minutes + " min", "kills", fp.kills, "deaths", fp.deaths);
    }

    // ── Membres ──

    private void invite(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null || !can(p, f, FPerm.INVITE)) return;
        if (a.length < 1) { usage(p, "inviter"); return; }
        Player t = Bukkit.getPlayerExact(a[0]);
        if (t == null) { Msg.send(p, "error.player-offline", "player", a[0]); return; }
        if (m().factionOf(t) == f) { Msg.send(p, "invite.already-member", "player", t.getName()); return; }
        if (f.members.size() >= s().maxMembers) { Msg.send(p, "invite.full", "max", s().maxMembers); return; }
        f.invites.put(t.getUniqueId(), System.currentTimeMillis() + s().inviteMinutes * 60_000L);
        log(f, "MEMBRES", p, "a invité " + t.getName());
        broadcastFaction(f, "invite.sent", "player", p.getName(), "target", t.getName());
        t.sendMessage(Msg.prefixed("invite.received", "faction", f.name, "player", p.getName(), "minutes", s().inviteMinutes)
                .clickEvent(ClickEvent.runCommand("/f rejoindre " + f.name))
                .hoverEvent(HoverEvent.showText(Msg.get("invite.hover", "faction", f.name))));
    }

    private void uninvite(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null || !can(p, f, FPerm.INVITE)) return;
        if (a.length < 1) { usage(p, "desinviter"); return; }
        FPlayer t = m().fplayerByName(a[0]);
        if (t == null || f.invites.remove(t.uuid) == null) { Msg.send(p, "invite.none", "player", a[0]); return; }
        Msg.send(p, "invite.revoked", "player", t.name);
    }

    private void join(CommandSender s, Player p, String[] a) {
        if (a.length < 1) { usage(p, "rejoindre"); return; }
        if (m().factionOf(p) != null) { Msg.send(p, "error.already-in-faction"); return; }
        Faction f = m().byName(a[0]);
        if (f == null || f.system) { Msg.send(p, "error.faction-not-found", "faction", a[0]); return; }
        Long exp = f.invites.get(p.getUniqueId());
        boolean invited = exp != null && exp > System.currentTimeMillis();
        if (!invited && !f.open && !p.hasPermission("vaeloria.factions.admin")) { Msg.send(p, "invite.required", "faction", f.name); return; }
        if (f.members.size() >= s().maxMembers) { Msg.send(p, "invite.full", "max", s().maxMembers); return; }
        m().addMember(f, p.getUniqueId(), Role.RECRUE);
        plugin.bridge().join(f, p.getUniqueId(), p.getName(), Role.RECRUE);
        log(f, "MEMBRES", p, "a rejoint la faction");
        plugin.discord().member(f, p.getName() + " a rejoint la faction.");
        broadcastFaction(f, "member.joined", "player", p.getName(), "faction", f.name);
    }

    private void leave(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null) return;
        if (f.role(p.getUniqueId()) == Role.CHEF) {
            if (f.members.size() > 1) Msg.send(p, "member.leader-cannot-leave");
            else Msg.send(p, "member.leader-alone");
            return;
        }
        removeFromFaction(f, p.getUniqueId(), p.getName());
        log(f, "MEMBRES", p, "a quitté la faction");
        plugin.discord().member(f, p.getName() + " a quitté la faction.");
        Msg.send(p, "member.you-left", "faction", f.name);
        broadcastFaction(f, "member.left", "player", p.getName());
    }

    private void removeFromFaction(Faction f, UUID u, String name) {
        m().removeMember(f, u);
        plugin.bridge().leave(f, u, name);
        FPlayer fp = m().fplayer(u);
        if (fp != null) {
            fp.chatMode = FPlayer.ChatMode.PUBLIC;
            fp.autoClaim = false;
        }
        Player online = Bukkit.getPlayer(u);
        if (online != null) {
            if (fp != null && fp.flying) plugin.territory().setFly(online, false);
            if (online.getOpenInventory().getTopInventory().getHolder(false) instanceof fr.vaeloria.factions.service.ChestService.Holder h
                    && h.factionId.equals(f.id)) online.closeInventory();
        }
    }

    private void kick(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null || !can(p, f, FPerm.KICK)) return;
        if (a.length < 1) { usage(p, "expulser"); return; }
        UUID t = memberByName(f, a[0]);
        if (t == null) { Msg.send(p, "error.not-member", "player", a[0]); return; }
        if (t.equals(p.getUniqueId())) { Msg.send(p, "member.kick-self"); return; }
        if (!m().fplayer(p).adminBypass && f.role(t).ordinal() >= f.role(p.getUniqueId()).ordinal()) {
            Msg.send(p, "member.kick-higher"); return;
        }
        String name = m().nameOf(t);
        removeFromFaction(f, t, name);
        log(f, "MEMBRES", p, "a expulsé " + name);
        plugin.discord().member(f, name + " a été expulsé par " + p.getName() + ".");
        broadcastFaction(f, "member.kicked", "player", name, "by", p.getName());
        Player tp = Bukkit.getPlayer(t);
        if (tp != null) Msg.send(tp, "member.you-were-kicked", "faction", f.name, "by", p.getName());
    }

    private void promote(CommandSender s, Player p, String[] a) { changeRole(p, a, true); }

    private void demote(CommandSender s, Player p, String[] a) { changeRole(p, a, false); }

    private void changeRole(Player p, String[] a, boolean up) {
        Faction f = need(p);
        if (f == null) return;
        if (a.length < 1) { usage(p, up ? "promouvoir" : "retrograder"); return; }
        UUID t = memberByName(f, a[0]);
        if (t == null) { Msg.send(p, "error.not-member", "player", a[0]); return; }
        Role mine = m().fplayer(p).adminBypass ? Role.CHEF : f.role(p.getUniqueId());
        Role cur = f.role(t);
        Role next = up ? cur.next() : cur.previous();
        if (t.equals(p.getUniqueId()) || cur == Role.CHEF) { Msg.send(p, "member.role-denied"); return; }
        if (next == Role.CHEF) { Msg.send(p, "member.use-leader"); return; }
        if (next == cur) { Msg.send(p, up ? "member.role-max" : "member.role-min", "player", m().nameOf(t)); return; }
        // On ne gère que les rangs strictement inférieurs au sien.
        if (!mine.atLeast(Role.OFFICIER) || cur.ordinal() >= mine.ordinal() || next.ordinal() >= mine.ordinal()) {
            Msg.send(p, "member.role-denied"); return;
        }
        m().setRole(f, t, next);
        plugin.bridge().join(f, t, m().nameOf(t), next);
        log(f, "RANGS", p, (up ? "a promu " : "a rétrogradé ") + m().nameOf(t) + " → " + next.label());
        broadcastFaction(f, up ? "member.promoted" : "member.demoted", "player", m().nameOf(t), "role", next.label(), "by", p.getName());
    }

    private void leader(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null || !isLeader(p, f)) return;
        if (a.length < 1) { usage(p, "chef"); return; }
        UUID t = memberByName(f, a[0]);
        if (t == null || t.equals(p.getUniqueId())) { Msg.send(p, "error.not-member", "player", a[0]); return; }
        UUID old = f.leader();
        if (old != null) {
            m().setRole(f, old, Role.OFFICIER);
            plugin.bridge().join(f, old, m().nameOf(old), Role.OFFICIER);
        }
        m().setRole(f, t, Role.CHEF);
        plugin.bridge().join(f, t, m().nameOf(t), Role.CHEF);
        log(f, "RANGS", p, "a transmis la direction à " + m().nameOf(t));
        broadcastFaction(f, "member.new-leader", "player", m().nameOf(t));
    }

    // ── Territoire ──

    private void claim(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null || !can(p, f, FPerm.CLAIM)) return;
        ChunkPos here = ChunkPos.of(p.getLocation());
        int radius = a.length > 0 ? parseInt(a[0], 1) : 1;
        if (radius <= 1) {
            plugin.claims().claim(p, f, here, false);
            return;
        }
        if (radius > s().claimMaxRadius) { Msg.send(p, "claim.radius-too-big", "max", s().claimMaxRadius); return; }
        int n = plugin.claims().claimRadius(p, f, here, radius);
        Msg.send(p, "claim.radius-done", "count", n, "claims", f.claims.size(), "limit", m().landLimit(f));
    }

    private void unclaim(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null || !can(p, f, FPerm.UNCLAIM)) return;
        if (a.length > 0 && (a[0].equalsIgnoreCase("tout") || a[0].equalsIgnoreCase("all"))) {
            if (!isLeader(p, f)) return;
            if (f.inRaid()) { Msg.send(p, "raid.locked", "time", Msg.duration(f.raidUntil - System.currentTimeMillis())); return; }
            if (a.length < 2 || !a[1].equalsIgnoreCase("confirmer")) { p.sendMessage(Msg.get("claim.unclaimall-confirm")); return; }
            int n = plugin.claims().unclaimAll(f);
            log(f, "UNCLAIM", p, "a libéré tout le territoire (" + n + " chunks)");
            broadcastFaction(f, "claim.unclaimall-done", "count", n, "player", p.getName());
            return;
        }
        ChunkPos here = ChunkPos.of(p.getLocation());
        ClaimService.UnclaimResult r = plugin.claims().unclaim(f, here);
        switch (r) {
            case OK -> {
                Msg.send(p, "claim.unclaimed", "x", here.x(), "z", here.z());
                log(f, "UNCLAIM", p, "chunk " + here.x() + ", " + here.z());
            }
            case NOT_OWNED -> Msg.send(p, "claim.not-yours");
            case IN_RAID -> Msg.send(p, "raid.locked", "time", Msg.duration(f.raidUntil - System.currentTimeMillis()));
        }
    }

    private void autoclaim(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null || !can(p, f, FPerm.CLAIM)) return;
        FPlayer fp = m().fplayer(p);
        fp.autoClaim = !fp.autoClaim;
        Msg.send(p, fp.autoClaim ? "claim.auto-on" : "claim.auto-off");
        if (fp.autoClaim) plugin.claims().claim(p, f, ChunkPos.of(p.getLocation()), true);
    }

    private void map(CommandSender s, Player p, String[] a) {
        FPlayer fp = m().fplayer(p);
        if (a.length > 0) {
            fp.autoMap = a[0].equalsIgnoreCase("on");
            Msg.send(p, fp.autoMap ? "map.auto-on" : "map.auto-off");
        }
        plugin.territory().sendMap(p);
    }

    // ── Déplacements ──

    private boolean enemyBlocksTeleport(Player p) {
        if (p.hasPermission("vaeloria.factions.bypass.warmup")) return false;
        Player e = plugin.territory().enemyNearby(p, s().enemyRadius);
        if (e == null) return false;
        Msg.send(p, "teleport.enemy-nearby", "radius", s().enemyRadius);
        return true;
    }

    private void home(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null || !can(p, f, FPerm.HOME)) return;
        Location l = f.home == null ? null : f.home.toLocation();
        if (l == null) { Msg.send(p, "home.none"); return; }
        if (blockedByCombat(p) || enemyBlocksTeleport(p)) return;
        plugin.teleports().teleport(p, l, "home");
    }

    private void sethome(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null || !can(p, f, FPerm.SETHOME)) return;
        if (s().homeInOwnClaim && m().factionAt(p.getLocation()) != f) { Msg.send(p, "home.must-be-in-claim"); return; }
        f.home = Pos.of(p.getLocation());
        m().markDirty();
        log(f, "HOME", p, "a défini le home en " + p.getLocation().getBlockX() + ", " + p.getLocation().getBlockZ());
        broadcastFaction(f, "home.set", "player", p.getName());
    }

    private void warp(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null || !can(p, f, FPerm.WARP)) return;
        if (a.length < 1) {
            if (f.warps.isEmpty()) { Msg.send(p, "warp.none"); return; }
            List<Component> l = new ArrayList<>();
            for (String w : f.warps.keySet()) {
                l.add(Msg.parse("<aqua><n>", "n", w).clickEvent(ClickEvent.runCommand("/f warp " + w)));
            }
            p.sendMessage(Msg.get("warp.list", "count", l.size()).append(Component.join(JoinConfiguration.separator(Msg.parse("<dark_gray>, ")), l)));
            return;
        }
        Pos w = f.warps.get(a[0].toLowerCase(Locale.ROOT));
        Location l = w == null ? null : w.toLocation();
        if (l == null) { Msg.send(p, "warp.unknown", "warp", a[0]); return; }
        if (blockedByCombat(p) || enemyBlocksTeleport(p)) return;
        plugin.teleports().teleport(p, l, "warp " + a[0].toLowerCase(Locale.ROOT));
    }

    private void setwarp(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null || !can(p, f, FPerm.SETWARP)) return;
        if (a.length < 1 || !a[0].matches("[A-Za-z0-9_-]{1,16}")) { usage(p, "setwarp"); return; }
        String name = a[0].toLowerCase(Locale.ROOT);
        if (!f.warps.containsKey(name) && f.warps.size() >= s().maxWarps) { Msg.send(p, "warp.max", "max", s().maxWarps); return; }
        if (m().factionAt(p.getLocation()) != f) { Msg.send(p, "home.must-be-in-claim"); return; }
        f.warps.put(name, Pos.of(p.getLocation()));
        m().markDirty();
        log(f, "WARP", p, "a créé le warp " + name);
        broadcastFaction(f, "warp.set", "warp", name, "player", p.getName());
    }

    private void delwarp(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null || !can(p, f, FPerm.SETWARP)) return;
        if (a.length < 1) { usage(p, "delwarp"); return; }
        if (f.warps.remove(a[0].toLowerCase(Locale.ROOT)) == null) { Msg.send(p, "warp.unknown", "warp", a[0]); return; }
        m().markDirty();
        log(f, "WARP", p, "a supprimé le warp " + a[0].toLowerCase(Locale.ROOT));
        Msg.send(p, "warp.deleted", "warp", a[0]);
    }

    private void fly(CommandSender s, Player p, String[] a) {
        if (!s().flyEnabled) { Msg.send(p, "error.disabled"); return; }
        if (!p.hasPermission("vaeloria.factions.fly")) { Msg.send(p, "error.no-permission"); return; }
        FPlayer fp = m().fplayer(p);
        if (fp.flying) {
            plugin.territory().setFly(p, false);
            Msg.send(p, "fly.disabled");
            return;
        }
        Faction f = need(p);
        if (f == null || !can(p, f, FPerm.FLY)) return;
        if (!plugin.territory().canFlyHere(p)) { Msg.send(p, "fly.not-here"); return; }
        if (blockedByCombat(p)) return;
        if (!p.hasPermission("vaeloria.factions.bypass.fly") && plugin.territory().enemyNearby(p, s().flyEnemyRadius) != null) {
            Msg.send(p, "fly.enemy-nearby"); return;
        }
        plugin.territory().setFly(p, true);
        Msg.send(p, "fly.enabled");
    }

    // ── Diplomatie ──

    private void relation(Player p, String[] a, Relation wish) {
        Faction f = need(p);
        if (f == null || !can(p, f, FPerm.RELATION)) return;
        if (a.length < 1) { Msg.send(p, "relation.usage"); return; }
        Faction o = m().byName(a[0]);
        if (o == null || o.system) { Msg.send(p, "error.faction-not-found", "faction", a[0]); return; }
        if (o == f) { Msg.send(p, "relation.self"); return; }
        if (f.wishToward(o.id) == wish) { Msg.send(p, "relation.already", "faction", o.name, "relation", wish.label()); return; }
        if (wish != Relation.ENNEMI && plugin.wars().warBetween(f, o) != null) { Msg.send(p, "war.relation-locked", "faction", o.name); return; }
        Relation before = m().relation(f, o);
        if (wish == Relation.ALLIE && o.wishToward(f.id) == Relation.ALLIE && m().countRelations(f, Relation.ALLIE) >= s().maxAllies) {
            Msg.send(p, "relation.max-allies", "max", s().maxAllies); return;
        }
        if (wish == Relation.ALLIE && o.wishToward(f.id) == Relation.ALLIE && m().countRelations(o, Relation.ALLIE) >= s().maxAllies) {
            Msg.send(p, "relation.other-max-allies", "faction", o.name); return;
        }
        if (wish == Relation.TREVE && o.wishToward(f.id).ordinal() >= Relation.TREVE.ordinal() && m().countRelations(f, Relation.TREVE) >= s().maxTruces) {
            Msg.send(p, "relation.max-truces", "max", s().maxTruces); return;
        }
        if (wish == Relation.NEUTRE) f.wishes.remove(o.id);
        else f.wishes.put(o.id, wish);
        m().markDirty();
        log(f, "RELATION", p, wish.label() + " → " + o.name);
        Relation now = m().relation(f, o);
        if (now != before) {
            String key = "relation.now." + now.name().toLowerCase(Locale.ROOT);
            for (Player x : m().online(f)) Msg.send(x, key, "faction", o.name, "color", now.color());
            for (Player x : m().online(o)) Msg.send(x, key, "faction", f.name, "color", now.color());
            if (now == Relation.ENNEMI) Bukkit.broadcast(Msg.prefixed("relation.war-broadcast", "first", f.name, "second", o.name));
        }
        if (now != wish) {
            // L'autre camp doit accepter : on lui propose un clic.
            Msg.send(p, "relation.requested", "faction", o.name, "relation", wish.label());
            String cmd = switch (wish) {
                case ALLIE -> "allie";
                case TREVE -> "treve";
                case NEUTRE -> "neutre";
                default -> null;
            };
            if (cmd != null) {
                for (Player x : m().online(o)) {
                    if (o.can(x.getUniqueId(), FPerm.RELATION)) {
                        x.sendMessage(Msg.prefixed("relation.request-received", "faction", f.name, "relation", wish.label())
                                .clickEvent(ClickEvent.runCommand("/f " + cmd + " " + f.name)));
                    }
                }
            }
        }
    }

    private void relations(CommandSender s, Player p, String[] a) {
        Faction f = a.length > 0 ? m().byName(a[0]) : p == null ? null : m().factionOf(p);
        if (f == null || f.system) { Msg.send(s, a.length > 0 ? "error.faction-not-found" : "error.no-faction", "faction", a.length > 0 ? a[0] : ""); return; }
        s.sendMessage(Msg.get("relation.header", "faction", f.name));
        sendRelationLine(s, f, Relation.ALLIE, "info.allies");
        sendRelationLine(s, f, Relation.TREVE, "info.truces");
        sendRelationLine(s, f, Relation.ENNEMI, "info.enemies");
        // Demandes en attente dans les deux sens.
        for (Faction o : m().playerFactions()) {
            if (o == f) continue;
            Relation mine = f.wishToward(o.id), theirs = o.wishToward(f.id);
            if (mine.ordinal() > Relation.NEUTRE.ordinal() && theirs.ordinal() < mine.ordinal()) {
                s.sendMessage(Msg.get("relation.pending-out", "faction", o.name, "relation", mine.label()));
            } else if (theirs.ordinal() > Relation.NEUTRE.ordinal() && mine.ordinal() < theirs.ordinal()) {
                s.sendMessage(Msg.get("relation.pending-in", "faction", o.name, "relation", theirs.label()));
            }
        }
    }

    // ── Faction ──

    private void chat(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null) return;
        FPlayer fp = m().fplayer(p);
        FPlayer.ChatMode mode;
        if (a.length > 0) {
            mode = switch (a[0].toLowerCase(Locale.ROOT)) {
                case "f", "faction" -> FPlayer.ChatMode.FACTION;
                case "a", "allie", "ally" -> FPlayer.ChatMode.ALLY;
                default -> FPlayer.ChatMode.PUBLIC;
            };
        } else {
            mode = FPlayer.ChatMode.values()[(fp.chatMode.ordinal() + 1) % FPlayer.ChatMode.values().length];
        }
        fp.chatMode = mode;
        Msg.send(p, "chat.mode." + mode.name().toLowerCase(Locale.ROOT));
    }

    private void bank(CommandSender s, Player p, String[] a) {
        if (!s().bankEnabled || !plugin.bank().available()) { Msg.send(p, "bank.unavailable"); return; }
        Faction f = need(p);
        if (f == null) return;
        if (a.length < 2) {
            Msg.send(p, "bank.balance", "balance", plugin.bank().format(f.bank));
            return;
        }
        double amount;
        try {
            amount = Double.parseDouble(a[1].replace(',', '.'));
        } catch (NumberFormatException e) {
            amount = -1;
        }
        if (!(amount > 0) || Double.isInfinite(amount)) { Msg.send(p, "bank.invalid-amount"); return; }
        amount = Math.floor(amount * 100) / 100;
        switch (a[0].toLowerCase(Locale.ROOT)) {
            case "deposer", "déposer", "deposit", "d" -> {
                if (!plugin.bank().withdraw(p, amount)) { Msg.send(p, "bank.not-enough"); return; }
                f.bank = PowerMath.round(f.bank + amount);
                m().markDirty();
                log(f, "BANQUE+", p, "a déposé " + plugin.bank().format(amount));
                broadcastFaction(f, "bank.deposited", "player", p.getName(), "amount", plugin.bank().format(amount), "balance", plugin.bank().format(f.bank));
            }
            case "retirer", "withdraw", "r" -> {
                if (!can(p, f, FPerm.BANK_WITHDRAW)) return;
                if (f.bank < amount) { Msg.send(p, "bank.faction-not-enough"); return; }
                f.bank = PowerMath.round(f.bank - amount);
                if (!plugin.bank().deposit(p, amount)) {
                    f.bank = PowerMath.round(f.bank + amount);
                    Msg.send(p, "bank.unavailable");
                    return;
                }
                m().markDirty();
                log(f, "BANQUE-", p, "a retiré " + plugin.bank().format(amount));
                broadcastFaction(f, "bank.withdrew", "player", p.getName(), "amount", plugin.bank().format(amount), "balance", plugin.bank().format(f.bank));
            }
            default -> usage(p, "banque");
        }
    }

    private void chest(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null || !can(p, f, FPerm.CHEST)) return;
        var inv = plugin.chests().open(f);
        plugin.logs().chestOpened(p, inv);
        p.openInventory(inv);
    }

    private void perm(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null) return;
        if (a.length == 0) {
            plugin.menus().openPerms(p);
            return;
        }
        if (!isLeader(p, f)) return;
        FPerm perm = FPerm.parse(a[0]);
        Role role = a.length > 1 ? Role.parse(a[1]) : null;
        if (perm == null || role == null) { usage(p, "perm"); return; }
        f.perms.put(perm, role);
        m().markDirty();
        log(f, "PERMS", p, perm.label() + " → " + role.label());
        Msg.send(p, "perm.set", "perm", perm.label(), "role", role.label());
    }

    private void shield(CommandSender s, Player p, String[] a) {
        if (!s().shieldEnabled) { Msg.send(p, "error.disabled"); return; }
        Faction f = need(p);
        if (f == null) return;
        if (a.length == 0) {
            Msg.send(p, "shield.status", "window", ShieldWindow.describe(f.shieldStart, s().shieldHours),
                    "state", Msg.parse(plugin.raid().shielded(f) ? Msg.raw("shield.active") : Msg.raw("shield.inactive")),
                    "hours", s().shieldHours);
            return;
        }
        if (!can(p, f, FPerm.SHIELD)) return;
        if (f.inRaid()) { Msg.send(p, "raid.locked", "time", Msg.duration(f.raidUntil - System.currentTimeMillis())); return; }
        long cooldown = s().shieldCooldownHours * 3_600_000L;
        long since = System.currentTimeMillis() - f.shieldChangedAt;
        if (f.shieldChangedAt > 0 && since < cooldown && !m().fplayer(p).adminBypass) {
            Msg.send(p, "shield.cooldown", "time", Msg.duration(cooldown - since)); return;
        }
        if (plugin.raid().shielded(f)) { Msg.send(p, "shield.while-active"); return; }
        int start;
        if (a[0].equalsIgnoreCase("off")) start = -1;
        else {
            start = parseInt(a[0].replace("h", ""), -2);
            if (start < 0 || start > 23) { usage(p, "bouclier"); return; }
        }
        f.shieldStart = start;
        f.shieldChangedAt = System.currentTimeMillis();
        m().markDirty();
        log(f, "BOUCLIER", p, "bouclier : " + ShieldWindow.describe(start, s().shieldHours));
        broadcastFaction(f, "shield.set", "player", p.getName(), "window", ShieldWindow.describe(start, s().shieldHours));
    }

    // ── Guerres, journal, Discord ──

    private void war(CommandSender s, Player p, String[] a) {
        if (!s().warEnabled) { Msg.send(p, "error.disabled"); return; }
        Faction f = need(p);
        if (f == null) return;
        var ws = plugin.wars();
        if (a.length == 0) {
            var w = ws.warOf(f);
            if (w == null) { Msg.send(p, "war.none"); return; }
            long now = System.currentTimeMillis();
            Msg.send(p, "war.status", "attacker", w.attackerName, "defender", w.defenderName,
                    "ascore", w.attackerScore, "dscore", w.defenderScore,
                    "time", w.started ? Msg.duration(w.endAt - now) : Msg.duration(w.startAt - now),
                    "phase", Msg.raw(w.started ? "war.phase-active" : "war.phase-prep"),
                    "participants", w.participants.size());
            return;
        }
        switch (a[0].toLowerCase(Locale.ROOT)) {
            case "declarer", "déclarer", "declare" -> {
                if (!isLeader(p, f)) return;
                if (a.length < 2) { usage(p, "guerre"); return; }
                Faction o = m().byName(a[1]);
                if (o == null || o.system) { Msg.send(p, "error.faction-not-found", "faction", a[1]); return; }
                var r = ws.declare(f, o, p.getName());
                switch (r) {
                    case OK -> { }
                    case COOLDOWN -> Msg.send(p, "war.fail.cooldown", "time", Msg.duration(ws.cooldownRemaining(f, o)));
                    default -> Msg.send(p, "war.fail." + r.name().toLowerCase(Locale.ROOT), "faction", o.name, "min", s().warMinMembers);
                }
            }
            case "abandonner", "surrender" -> {
                if (!isLeader(p, f)) return;
                if (ws.warOf(f) == null) { Msg.send(p, "war.none"); return; }
                if (a.length < 2 || !a[1].equalsIgnoreCase("confirmer")) { p.sendMessage(Msg.get("war.surrender-confirm")); return; }
                ws.surrender(f);
            }
            default -> usage(p, "guerre");
        }
    }

    private void totem(CommandSender s, Player p, String[] a) {
        var ts = plugin.totems();
        if (a.length == 0) {
            s.sendMessage(ts.status());
            return;
        }
        String sub = a[0].toLowerCase(Locale.ROOT);
        if (sub.equals("liste") || sub.equals("list")) {
            var defs = ts.definitions();
            if (defs.isEmpty()) { Msg.send(s, "totem.none-defined"); return; }
            for (var d : defs) Msg.send(s, "totem.list-line", "totem", d.name, "world", d.world, "x", d.x, "y", d.y, "z", d.z);
            return;
        }
        if (!s.hasPermission("vaeloria.factions.admin")) { Msg.send(s, "error.no-permission"); return; }
        switch (sub) {
            case "creer", "créer", "create" -> {
                if (p == null) { Msg.send(s, "error.player-only"); return; }
                if (a.length < 2 || !a[1].matches("[A-Za-z0-9_-]{2,24}")) { Msg.send(s, "error.usage", "usage", "/f totem creer <nom>"); return; }
                var base = p.getLocation().getBlock();
                if (ts.create(a[1], base)) Msg.send(s, "totem.created", "totem", a[1], "x", base.getX(), "y", base.getY(), "z", base.getZ());
                else Msg.send(s, "totem.exists", "totem", a[1]);
            }
            case "supprimer", "delete" -> {
                if (a.length < 2) { Msg.send(s, "error.usage", "usage", "/f totem supprimer <nom>"); return; }
                Msg.send(s, ts.delete(a[1]) ? "totem.deleted" : "totem.unknown", "totem", a[1]);
            }
            case "lancer", "start" -> {
                String name = a.length > 1 ? a[1] : null;
                int minutes = a.length > 2 ? parseInt(a[2], 0) : 0;
                var r = ts.start(name, minutes, false);
                if (r != fr.vaeloria.factions.service.TotemService.StartResult.OK) {
                    Msg.send(s, "totem.start-fail." + r.name().toLowerCase(Locale.ROOT), "totem", name == null ? "" : name);
                }
            }
            case "arreter", "arrêter", "stop" -> {
                if (!ts.isActive()) { Msg.send(s, "totem.not-running"); return; }
                ts.stop(false);
            }
            default -> Msg.send(s, "error.usage", "usage", "/f totem [liste|creer|supprimer|lancer|arreter]");
        }
    }

    private void logs(CommandSender s, Player p, String[] a) {
        Faction f = need(p);
        if (f == null || !can(p, f, FPerm.LOGS)) return;
        if (f.logs.isEmpty()) { Msg.send(p, "logs.empty"); return; }
        int perPage = 10;
        int pages = Math.max(1, (f.logs.size() + perPage - 1) / perPage);
        int page = a.length > 0 ? Math.max(1, Math.min(pages, parseInt(a[0], 1))) : 1;
        p.sendMessage(Msg.get("logs.header", "page", page, "pages", pages));
        SimpleDateFormat fmt = new SimpleDateFormat("dd/MM HH:mm");
        // Du plus récent au plus ancien.
        for (int i = 0; i < perPage; i++) {
            int idx = f.logs.size() - 1 - ((page - 1) * perPage + i);
            if (idx < 0) break;
            var e = f.logs.get(idx);
            p.sendMessage(Msg.get("logs.line", "date", fmt.format(new Date(e.time)), "type", e.type, "actor", e.actor, "detail", e.detail));
        }
        if (page < pages) p.sendMessage(Msg.get("list.next", "next", page + 1).clickEvent(ClickEvent.runCommand("/f logs " + (page + 1))));
    }

    private void discord(CommandSender s, Player p, String[] a) {
        if (!s().discordEnabled) { Msg.send(p, "error.disabled"); return; }
        Faction f = need(p);
        if (f == null) return;
        if (a.length == 0) {
            Msg.send(p, "discord.status", "url", fr.vaeloria.factions.rules.WebhookRules.masked(f.discordWebhook),
                    "ping", Msg.raw(f.discordPing ? "discord.ping-on" : "discord.ping-off"));
            return;
        }
        if (!isLeader(p, f)) return;
        switch (a[0].toLowerCase(Locale.ROOT)) {
            case "off" -> {
                f.discordWebhook = null;
                m().markDirty();
                log(f, "DISCORD", p, "a retiré le webhook");
                Msg.send(p, "discord.removed");
            }
            case "ping" -> {
                f.discordPing = !f.discordPing;
                m().markDirty();
                Msg.send(p, f.discordPing ? "discord.ping-enabled" : "discord.ping-disabled");
            }
            case "test" -> plugin.discord().test(f, ok -> Bukkit.getScheduler().runTask(plugin, () ->
                    Msg.send(p, ok ? "discord.test-ok" : "discord.test-fail")));
            default -> {
                String url = a[0];
                if (!plugin.discord().validUrl(url)) { Msg.send(p, "discord.invalid"); return; }
                f.discordWebhook = url;
                m().markDirty();
                log(f, "DISCORD", p, "a relié un salon Discord");
                Msg.send(p, "discord.saved");
                plugin.discord().test(f, ok -> Bukkit.getScheduler().runTask(plugin, () ->
                        Msg.send(p, ok ? "discord.test-ok" : "discord.test-fail")));
            }
        }
    }

    private void help(CommandSender s, Player p, String[] a) {
        List<Sub> visible = new ArrayList<>();
        for (Sub sub : subs.values()) if (s.hasPermission(sub.permission())) visible.add(sub);
        int perPage = 10;
        int pages = Math.max(1, (visible.size() + perPage - 1) / perPage);
        int page = a.length > 0 ? Math.max(1, Math.min(pages, parseInt(a[0], 1))) : 1;
        s.sendMessage(Msg.get("help.header", "page", page, "pages", pages));
        for (int i = (page - 1) * perPage; i < Math.min(visible.size(), page * perPage); i++) {
            Sub sub = visible.get(i);
            String cmd = "/f " + sub.name() + (sub.usage().isEmpty() ? "" : " " + sub.usage());
            s.sendMessage(Msg.get("help.line", "command", cmd, "description", sub.description())
                    .clickEvent(ClickEvent.suggestCommand("/f " + sub.name() + " "))
                    .hoverEvent(HoverEvent.showText(Msg.get("help.hover"))));
        }
        if (page < pages) s.sendMessage(Msg.get("list.next", "next", page + 1).clickEvent(ClickEvent.runCommand("/f aide " + (page + 1))));
    }

    void usage(CommandSender s, String sub) {
        Sub x = subs.get(sub);
        Msg.send(s, "error.usage", "usage", "/f " + sub + (x == null || x.usage().isEmpty() ? "" : " " + x.usage()));
    }

    static int parseInt(String s, int def) {
        try {
            return Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            return def;
        }
    }
}
