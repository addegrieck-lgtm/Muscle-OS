package fr.vaeloria.tab;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.TextColor;
import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.resolver.Placeholder;
import net.kyori.adventure.text.minimessage.tag.resolver.TagResolver;
import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.permissions.Permission;
import org.bukkit.permissions.PermissionDefault;
import org.bukkit.plugin.PluginManager;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;
import org.bukkit.util.CachedServerIcon;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.InputStream;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * VaeloriaTab : présentation en jeu aux couleurs du logo VÆLORIA.
 * TAB : en-tête avec wordmark argent animé et Æ rubis, pied de page (joueurs, ping, TPS, serveur, grade),
 * noms préfixés et triés par grade. Écran Multijoueur : {@link ServerListListener}. Chat et annonces : {@link ChatListener}.
 */
public final class VaeloriaTabPlugin extends JavaPlugin {
    private final MiniMessage mm = MiniMessage.miniMessage();

    // Lus aussi par le ping de la liste des serveurs, hors du thread principal.
    private volatile TabSettings settings;
    private volatile ServerListSettings serverList;
    private volatile MessagesSettings messages;
    /** Grade de chaque joueur connecté, lu par le chat (asynchrone). */
    private final Map<UUID, Rank> ranks = new ConcurrentHashMap<>();
    private volatile TagResolver paletteTags;
    private volatile CachedServerIcon icon;
    private volatile int frame;
    private BukkitTask task;
    private long ticks;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        getServer().getPluginManager().registerEvents(new ServerListListener(this), this);
        getServer().getPluginManager().registerEvents(new ChatListener(this), this);
        if (!load()) {
            getServer().getPluginManager().disablePlugin(this);
            return;
        }
        getLogger().info("VaeloriaTab actif — " + settings.ranks().size() + " grades");
    }

    @Override
    public void onDisable() {
        if (task != null) task.cancel();
        for (Player p : Bukkit.getOnlinePlayers()) {
            p.sendPlayerListHeaderAndFooter(Component.empty(), Component.empty());
            p.playerListName(null);
            p.setPlayerListOrder(0);
        }
    }

    /** (Re)charge la configuration et relance l'animation. Faux si la configuration est invalide. */
    private boolean load() {
        reloadConfig();
        TabSettings next;
        try {
            next = TabSettings.load(getConfig());
        } catch (IllegalArgumentException e) {
            getLogger().severe("config.yml invalide : " + e.getMessage());
            return false;
        }
        settings = next;
        ServerListSettings nextList = ServerListSettings.load(getConfig());
        MessagesSettings nextMessages = MessagesSettings.load(getConfig());
        icon = loadIcon();

        TagResolver.Builder palette = TagResolver.builder();
        settings.palette().forEach((name, hex) -> palette.resolver(Placeholder.styling(name, TextColor.fromHexString(hex))));
        paletteTags = palette.build();
        messages = nextMessages;
        serverList = nextList; // en dernier : le ping (asynchrone) ne lit rien d'incomplet au premier chargement

        // Sans déclaration, une permission inconnue est accordée aux ops : chaque op serait « Fondateur ».
        PluginManager pm = getServer().getPluginManager();
        for (Rank r : settings.ranks()) {
            if (!r.isDefault() && pm.getPermission(r.permission()) == null) {
                pm.addPermission(new Permission(r.permission(), PermissionDefault.FALSE));
            }
        }
        if (!nextMessages.silentPermission().isBlank() && pm.getPermission(nextMessages.silentPermission()) == null) {
            pm.addPermission(new Permission(nextMessages.silentPermission(), PermissionDefault.FALSE));
        }
        if (nextList.maintenance()) getLogger().warning("Mode maintenance actif : seuls les joueurs avec "
                + ServerListListener.MAINTENANCE_BYPASS + " peuvent se connecter.");

        if (task != null) task.cancel();
        ticks = 0;
        task = Bukkit.getScheduler().runTaskTimer(this, this::tick, 1L, settings.refreshTicks());
        for (Player p : Bukkit.getOnlinePlayers()) updateName(p);
        return true;
    }

    /** Icône 64×64 : server-icon.png du dossier du plugin si présent, sinon celle du logo embarquée. */
    private CachedServerIcon loadIcon() {
        File custom = new File(getDataFolder(), "server-icon.png");
        try (InputStream in = custom.isFile() ? new java.io.FileInputStream(custom) : getResource("server-icon.png")) {
            if (in == null) return null;
            BufferedImage img = ImageIO.read(in);
            return img == null ? null : Bukkit.loadServerIcon(img);
        } catch (Exception e) {
            getLogger().warning("Icône de serveur ignorée (PNG 64×64 attendu) : " + e.getMessage());
            return null;
        }
    }

    TabSettings settings() {
        return settings;
    }

    ServerListSettings serverList() {
        return serverList;
    }

    MessagesSettings messages() {
        return messages;
    }

    TagResolver paletteTags() {
        return paletteTags;
    }

    CachedServerIcon icon() {
        return icon;
    }

    /** Wordmark à l'image courante de l'animation. */
    Component logo() {
        return mm.deserialize(settings.logo().render(frame), paletteTags);
    }

    private void tick() {
        TabSettings s = settings;
        frame++;
        Component logo = logo();
        double tps = Math.min(20.0, Bukkit.getTPS()[0]);
        boolean names = ticks % s.namesRefreshTicks() < s.refreshTicks();
        ticks += s.refreshTicks();

        for (Player p : Bukkit.getOnlinePlayers()) {
            if (names) updateName(p);
            TagResolver tags = playerTags(s, p, logo, tps);
            p.sendPlayerListHeaderAndFooter(mm.deserialize(s.header(), tags), mm.deserialize(s.footer(), tags));
        }
    }

    private TagResolver playerTags(TabSettings s, Player p, Component logo, double tps) {
        int ping = p.getPing();
        long visible = Bukkit.getOnlinePlayers().stream().filter(p::canSee).count();
        Rank rank = cachedRank(p);
        return TagResolver.resolver(
                paletteTags,
                Placeholder.component("logo", logo),
                Placeholder.unparsed("player", p.getName()),
                Placeholder.component("rank", rank == null ? Component.empty() : mm.deserialize(rank.display(), paletteTags)),
                Placeholder.unparsed("online", Long.toString(visible)),
                Placeholder.unparsed("max", Integer.toString(Bukkit.getMaxPlayers())),
                Placeholder.unparsed("ping", Integer.toString(ping)),
                Placeholder.unparsed("tps", String.format(Locale.ROOT, "%.1f", tps)),
                Placeholder.unparsed("server", s.serverName()),
                Placeholder.unparsed("world", p.getWorld().getName()),
                Placeholder.styling("ping_color", TextColor.fromHexString(s.ping().color(ping))),
                Placeholder.styling("tps_color", TextColor.fromHexString(s.tps().color(tps))));
    }

    private Rank rankOf(Player p) {
        return Rank.resolve(settings.ranks(), p::hasPermission);
    }

    /** Grade en cache (thread du chat) ; calculé s'il manque. */
    Rank cachedRank(Player p) {
        Rank r = ranks.get(p.getUniqueId());
        return r != null ? r : rankOf(p);
    }

    void forget(Player p) {
        ranks.remove(p.getUniqueId());
    }

    /** Nom du joueur au format de son grade, le même que dans le TAB. */
    Component tabName(Player p, Rank rank) {
        if (rank == null) return Component.text(p.getName());
        return mm.deserialize(rank.format(), TagResolver.resolver(paletteTags, Placeholder.unparsed("player", p.getName())));
    }

    /** Variables communes au chat et aux annonces. */
    TagResolver playerTags(Player p, Rank rank, Component tabName) {
        return TagResolver.resolver(
                Placeholder.unparsed("player", p.getName()),
                Placeholder.component("tab_name", tabName),
                Placeholder.component("rank", rank == null ? Component.empty() : mm.deserialize(rank.display(), paletteTags)),
                Placeholder.unparsed("server", settings.serverName()));
    }

    /** Recalcule le grade : nom et ordre dans le TAB, cache du chat. */
    Rank updateName(Player p) {
        Rank rank = rankOf(p);
        if (rank == null) {
            ranks.remove(p.getUniqueId());
            p.playerListName(null);
            p.setPlayerListOrder(0);
            return null;
        }
        ranks.put(p.getUniqueId(), rank);
        p.playerListName(tabName(p, rank));
        p.setPlayerListOrder(rank.order());
        return rank;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (args.length == 1 && args[0].equalsIgnoreCase("reload")) {
            sender.sendMessage(load()
                    ? mm.deserialize("<#D21F2F>◆</#D21F2F> <#D9DCE2>VaeloriaTab rechargé"
                            + (serverList.maintenance() ? " <#D21F2F>(maintenance active)" : "") + ".")
                    : mm.deserialize("<#D21F2F>config.yml invalide, voir la console : ancienne configuration conservée."));
            return true;
        }
        return false;
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        return args.length == 1 ? List.of("reload") : List.of();
    }
}
