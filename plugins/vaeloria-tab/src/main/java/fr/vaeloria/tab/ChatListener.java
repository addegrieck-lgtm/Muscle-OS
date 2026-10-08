package fr.vaeloria.tab;

import io.papermc.paper.chat.ChatRenderer;
import io.papermc.paper.event.player.AsyncChatEvent;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.event.ClickEvent;
import net.kyori.adventure.text.event.HoverEvent;
import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.resolver.Placeholder;
import net.kyori.adventure.text.minimessage.tag.resolver.TagResolver;
import org.bukkit.Bukkit;
import org.bukkit.Statistic;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.metadata.MetadataValue;

/**
 * Chat au format du grade (comme dans le TAB) et annonces de connexion / déconnexion.
 * Le tag de faction est ajouté devant par VæloriaFactions (voir {@link #onChat}).
 * Le texte tapé par le joueur est inséré tel quel : il ne peut pas injecter de balises MiniMessage.
 */
final class ChatListener implements Listener {
    private final VaeloriaTabPlugin plugin;
    private final MiniMessage mm = MiniMessage.miniMessage();

    ChatListener(VaeloriaTabPlugin plugin) {
        this.plugin = plugin;
    }

    /**
     * Priorité LOW : VæloriaFactions (HIGH) passe après et enveloppe ce rendu avec le tag de faction,
     * coloré selon la relation avec chaque lecteur. Au même niveau, l'ordre dépendrait du chargement
     * des plugins et l'un écraserait l'autre.
     */
    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onChat(AsyncChatEvent e) {
        MessagesSettings m = plugin.messages();
        if (m == null || !m.chatEnabled()) return;
        // Résolu au moment de l'envoi, sur le thread du chat : grade en cache, mis à jour par le TAB.
        Rank rank = plugin.cachedRank(e.getPlayer());
        e.renderer(ChatRenderer.viewerUnaware((source, displayName, message) -> {
            Component name = plugin.tabName(source, rank);
            TagResolver base = TagResolver.resolver(plugin.paletteTags(), plugin.playerTags(source, rank, name));
            if (!m.chatHover().isBlank()) name = name.hoverEvent(HoverEvent.showText(mm.deserialize(m.chatHover(), base)));
            if (!m.chatClick().isBlank()) name = name.clickEvent(ClickEvent.suggestCommand(m.chatClick().replace("<player>", source.getName())));
            String format = Rank.or(rank == null ? null : rank.chat(), m.chatFormat());
            return mm.deserialize(format, TagResolver.resolver(base,
                    Placeholder.component("name", name),
                    Placeholder.component("message", message)));
        }));
    }

    /**
     * MONITOR : EssentialsX réécrit le message en HIGHEST (custom-join-message, ou null s'il est vide).
     * Passer après lui est le seul moyen d'afficher l'annonce de VaeloriaTab quelle que soit sa config.
     */
    @EventHandler(priority = EventPriority.MONITOR)
    public void onJoin(PlayerJoinEvent e) {
        Player p = e.getPlayer();
        Rank rank = plugin.updateName(p);
        MessagesSettings m = plugin.messages();
        if (m == null || !m.joinQuitEnabled()) return;

        TagResolver tags = TagResolver.resolver(plugin.paletteTags(), plugin.playerTags(p, rank, plugin.tabName(p, rank)),
                Placeholder.unparsed("online", Integer.toString(Bukkit.getOnlinePlayers().size())));
        if (silent(p, m)) {
            e.joinMessage(null);
        } else if (firstJoin(p) && !m.firstJoin().isBlank()) {
            int unique = Bukkit.getOfflinePlayers().length; // nouveau joueur seulement : rare
            e.joinMessage(mm.deserialize(m.firstJoin(), TagResolver.resolver(tags, Placeholder.unparsed("unique", Integer.toString(unique)))));
        } else {
            e.joinMessage(announce(Rank.or(rank == null ? null : rank.join(), m.join()), tags));
        }
        for (String line : m.welcome()) p.sendMessage(mm.deserialize(line, tags));
    }

    /** MONITOR, comme {@link #onJoin} : EssentialsX remplace aussi le message de départ en HIGHEST. */
    @EventHandler(priority = EventPriority.MONITOR)
    public void onQuit(PlayerQuitEvent e) {
        Player p = e.getPlayer();
        MessagesSettings m = plugin.messages();
        Rank rank = plugin.cachedRank(p);
        plugin.forget(p);
        if (m == null || !m.joinQuitEnabled()) return;
        if (silent(p, m)) {
            e.quitMessage(null);
            return;
        }
        TagResolver tags = TagResolver.resolver(plugin.paletteTags(), plugin.playerTags(p, rank, plugin.tabName(p, rank)),
                Placeholder.unparsed("online", Integer.toString(Bukkit.getOnlinePlayers().size() - 1)));
        e.quitMessage(announce(Rank.or(rank == null ? null : rank.quit(), m.quit()), tags));
    }

    /**
     * Première connexion : le joueur n'a encore jamais quitté le serveur. {@code hasPlayedBefore()} n'est pas
     * fiable sur Paper récent, qui enregistre les données du joueur avant l'événement de connexion.
     */
    private static boolean firstJoin(Player p) {
        return p.getStatistic(Statistic.LEAVE_GAME) == 0;
    }

    /** Format vide = pas d'annonce. */
    private Component announce(String format, TagResolver tags) {
        return format == null || format.isBlank() ? null : mm.deserialize(format, tags);
    }

    /** Staff discret (permission) ou joueur en vanish (métadonnée posée par Essentials, SuperVanish…). */
    private static boolean silent(Player p, MessagesSettings m) {
        if (!m.silentPermission().isBlank() && p.hasPermission(m.silentPermission())) return true;
        for (MetadataValue v : p.getMetadata("vanished")) if (v.asBoolean()) return true;
        return false;
    }
}
