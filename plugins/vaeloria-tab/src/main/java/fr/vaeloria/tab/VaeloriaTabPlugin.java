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
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.permissions.Permission;
import org.bukkit.permissions.PermissionDefault;
import org.bukkit.plugin.PluginManager;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

import java.util.List;
import java.util.Locale;

/**
 * VaeloriaTab : liste des joueurs aux couleurs du logo VÆLORIA.
 * En-tête avec wordmark argent animé et Æ rubis, pied de page (joueurs, ping, TPS, serveur, grade),
 * noms préfixés par le grade et liste triée par grade.
 */
public final class VaeloriaTabPlugin extends JavaPlugin implements Listener {
    private final MiniMessage mm = MiniMessage.miniMessage();

    private TabSettings settings;
    private TagResolver paletteTags;
    private BukkitTask task;
    private int frame;
    private long ticks;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        getServer().getPluginManager().registerEvents(this, this);
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

        TagResolver.Builder palette = TagResolver.builder();
        settings.palette().forEach((name, hex) -> palette.resolver(Placeholder.styling(name, TextColor.fromHexString(hex))));
        paletteTags = palette.build();

        // Sans déclaration, une permission inconnue est accordée aux ops : chaque op serait « Fondateur ».
        PluginManager pm = getServer().getPluginManager();
        for (Rank r : settings.ranks()) {
            if (!r.isDefault() && pm.getPermission(r.permission()) == null) {
                pm.addPermission(new Permission(r.permission(), PermissionDefault.FALSE));
            }
        }

        if (task != null) task.cancel();
        ticks = 0;
        task = Bukkit.getScheduler().runTaskTimer(this, this::tick, 1L, settings.refreshTicks());
        for (Player p : Bukkit.getOnlinePlayers()) updateName(p);
        return true;
    }

    private void tick() {
        TabSettings s = settings;
        frame++;
        Component logo = mm.deserialize(s.logo().render(frame), paletteTags);
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
        Rank rank = rankOf(p);
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

    private void updateName(Player p) {
        Rank rank = rankOf(p);
        if (rank == null) {
            p.playerListName(null);
            p.setPlayerListOrder(0);
            return;
        }
        p.playerListName(mm.deserialize(rank.format(), TagResolver.resolver(paletteTags, Placeholder.unparsed("player", p.getName()))));
        p.setPlayerListOrder(rank.order());
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onJoin(PlayerJoinEvent e) {
        if (settings != null) updateName(e.getPlayer());
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (args.length == 1 && args[0].equalsIgnoreCase("reload")) {
            sender.sendMessage(load()
                    ? mm.deserialize("<#D21F2F>◆</#D21F2F> <#D9DCE2>VaeloriaTab rechargé.")
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
