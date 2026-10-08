package fr.vaeloria.factions.listener;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.FPlayer;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.Relation;
import fr.vaeloria.factions.service.FactionManager;
import fr.vaeloria.factions.util.Msg;
import io.papermc.paper.event.player.AsyncChatEvent;
import net.kyori.adventure.audience.Audience;
import net.kyori.adventure.text.Component;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;

/**
 * Chat de faction / d'alliance, et tag de faction devant les messages publics, coloré selon la relation
 * avec CHAQUE lecteur (rendu individuel de Paper).
 */
public final class ChatListener implements Listener {
    private final VaeloriaFactionsPlugin plugin;
    private final FactionManager manager;

    public ChatListener(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
        this.manager = plugin.manager();
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onChat(AsyncChatEvent e) {
        Player sender = e.getPlayer();
        FPlayer fp = manager.fplayer(sender);
        Faction f = manager.factionOf(sender);
        if (f == null && fp.chatMode != FPlayer.ChatMode.PUBLIC) fp.chatMode = FPlayer.ChatMode.PUBLIC;

        if (fp.chatMode == FPlayer.ChatMode.FACTION || fp.chatMode == FPlayer.ChatMode.ALLY) {
            boolean ally = fp.chatMode == FPlayer.ChatMode.ALLY;
            e.viewers().removeIf(a -> {
                if (!(a instanceof Player v)) return false; // la console voit tout
                Relation r = manager.relation(f, manager.factionOf(v));
                return !(r == Relation.MEMBRE || ally && r == Relation.ALLIE) && !v.hasPermission("vaeloria.factions.spy");
            });
            String role = f.role(sender.getUniqueId()).prefix();
            e.renderer((source, displayName, message, viewer) -> Msg.get(ally ? "chat.ally-format" : "chat.faction-format",
                    "faction", f.name, "role", role, "player", displayName, "message", message));
            return;
        }

        if (!plugin.settings().chatTags || f == null) return;
        var original = e.renderer();
        e.renderer((source, displayName, message, viewer) -> {
            Component base = original.render(source, displayName, message, viewer);
            Relation r = viewer instanceof Player v ? manager.relation(f, manager.factionOf(v)) : Relation.NEUTRE;
            String role = f.role(source.getUniqueId()) == null ? "" : f.role(source.getUniqueId()).prefix();
            return Msg.get("chat.public-tag", "color", r.color(), "role", role, "faction", f.name).append(base);
        });
    }

    public static void sendFactionMessage(FactionManager manager, Faction f, Component c) {
        for (Player p : manager.online(f)) p.sendMessage(c);
        Audience console = Bukkit.getConsoleSender();
        console.sendMessage(c);
    }
}
