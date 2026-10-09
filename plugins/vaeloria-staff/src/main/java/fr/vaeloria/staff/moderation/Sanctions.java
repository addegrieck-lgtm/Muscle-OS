package fr.vaeloria.staff.moderation;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.util.Durations;
import fr.vaeloria.staff.util.Text;
import net.kyori.adventure.title.Title;
import org.bukkit.OfflinePlayer;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.logging.Level;

/** Avertir, expulser, rendre muet, bannir — chaque sanction est notifiée au staff et écrite dans sanctions.log. */
public final class Sanctions {
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final VaeloriaStaffPlugin plugin;
    private final File log;

    public Sanctions(VaeloriaStaffPlugin plugin) {
        this.plugin = plugin;
        this.log = new File(plugin.getDataFolder(), "sanctions.log");
    }

    public void warn(CommandSender by, Player target, String reason) {
        target.showTitle(Title.title(Text.of("&c&lAVERTISSEMENT"), Text.of("&f" + reason),
                Title.Times.times(Duration.ofMillis(300), Duration.ofSeconds(5), Duration.ofMillis(500))));
        plugin.msg(target, "&cTu as reçu un avertissement : &f" + reason);
        report("AVERTISSEMENT", by, target.getName(), "", reason);
    }

    public void kick(CommandSender by, Player target, String reason) {
        target.kick(Text.of(plugin.getConfig().getString("sanctions.kick-screen", "&c&lVÆLORIA\n\n&fTu as été expulsé.\n&7Raison : &f{reason}")
                .replace("{reason}", reason)));
        report("EXPULSION", by, target.getName(), "", reason);
    }

    public void mute(CommandSender by, OfflinePlayer target, Duration duration, String reason) {
        long until = duration == null ? -1 : System.currentTimeMillis() + duration.toMillis();
        plugin.mutes().mute(target.getUniqueId(), new Mutes.Mute(name(target), until, reason, by.getName()));
        Player online = target.getPlayer();
        if (online != null) plugin.msg(online, "&cTu es muet (" + Durations.format(duration) + ") : &f" + reason);
        report("MUTE", by, name(target), " (" + Durations.format(duration) + ")", reason);
    }

    public void unmute(CommandSender by, OfflinePlayer target) {
        if (!plugin.mutes().unmute(target.getUniqueId())) {
            plugin.msg(by, "&c" + name(target) + " n'est pas muet.");
            return;
        }
        Player online = target.getPlayer();
        if (online != null) plugin.msg(online, "&aTu peux de nouveau parler.");
        report("UNMUTE", by, name(target), "", "-");
    }

    public void ban(CommandSender by, OfflinePlayer target, Duration duration, String reason) {
        target.ban(reason, duration, by.getName());
        Player online = target.getPlayer();
        if (online != null) {
            online.kick(Text.of(plugin.getConfig().getString("sanctions.ban-screen", "&c&lVÆLORIA\n\n&fTu es banni ({duration}).\n&7Raison : &f{reason}")
                    .replace("{reason}", reason).replace("{duration}", Durations.format(duration))));
        }
        report("BAN", by, name(target), " (" + Durations.format(duration) + ")", reason);
    }

    private static String name(OfflinePlayer p) {
        return p.getName() == null ? p.getUniqueId().toString() : p.getName();
    }

    private void report(String type, CommandSender by, String target, String length, String reason) {
        plugin.notifyStaff("&c" + type + " &f" + target + length + " &7par &f" + by.getName() + " &8· &7" + reason);
        String line = LocalDateTime.now().format(DATE) + " | " + type + " | " + target + length + " | par " + by.getName() + " | " + reason;
        plugin.getLogger().info(line);
        try (PrintWriter out = new PrintWriter(new FileWriter(log, true))) {
            out.println(line);
        } catch (IOException e) {
            plugin.getLogger().log(Level.WARNING, "Impossible d'écrire sanctions.log", e);
        }
    }
}
