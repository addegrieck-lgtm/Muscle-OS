package fr.vaeloria.staff.moderation;

import fr.vaeloria.staff.Perm;
import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.util.Text;
import net.kyori.adventure.text.Component;
import org.bukkit.Bukkit;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Chat staff, verrouillage et nettoyage du chat public. */
public final class ChatControl {
    private final VaeloriaStaffPlugin plugin;
    private final Set<UUID> staffChat = ConcurrentHashMap.newKeySet();
    private volatile boolean locked;

    public ChatControl(VaeloriaStaffPlugin plugin) {
        this.plugin = plugin;
    }

    public boolean locked() { return locked; }

    public void lock(CommandSender by, boolean locked) {
        this.locked = locked;
        Bukkit.broadcast(Text.of(plugin.prefix() + (locked
                ? "&cLe chat est verrouillé par le staff."
                : "&aLe chat est de nouveau ouvert.")));
        plugin.getLogger().info(by.getName() + (locked ? " a verrouillé le chat" : " a rouvert le chat"));
    }

    public void clear(CommandSender by) {
        Component blank = Component.text(" ");
        for (Player p : Bukkit.getOnlinePlayers()) {
            if (p.hasPermission(Perm.CHAT_BYPASS)) continue;
            for (int i = 0; i < 100; i++) p.sendMessage(blank);
        }
        Bukkit.broadcast(Text.of(plugin.prefix() + "Le chat a été nettoyé par &f" + by.getName() + "&7."));
    }

    /** Mode « tout ce que j'écris va au chat staff ». */
    public boolean toggle(Player p) {
        if (staffChat.remove(p.getUniqueId())) return false;
        staffChat.add(p.getUniqueId());
        return true;
    }

    public boolean inStaffChat(Player p) {
        return staffChat.contains(p.getUniqueId());
    }

    public void quit(Player p) {
        staffChat.remove(p.getUniqueId());
    }

    /** Message au chat staff (sûr depuis le thread du chat). */
    public void staffMessage(CommandSender from, String message) {
        Component line = Text.of(plugin.getConfig().getString("staff-chat.format", "&d[Staff] &f{player} &8» &d")
                .replace("{player}", from.getName())).append(Component.text(message));
        for (Player p : Bukkit.getOnlinePlayers()) if (p.hasPermission(Perm.CHAT)) p.sendMessage(line);
        Bukkit.getConsoleSender().sendMessage(line);
    }
}
