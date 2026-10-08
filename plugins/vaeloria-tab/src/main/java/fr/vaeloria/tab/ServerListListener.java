package fr.vaeloria.tab;

import com.destroystokyo.paper.event.server.PaperServerListPingEvent;
import com.destroystokyo.paper.event.server.PaperServerListPingEvent.ListedPlayerInfo;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.resolver.Placeholder;
import net.kyori.adventure.text.minimessage.tag.resolver.TagResolver;
import net.kyori.adventure.text.serializer.legacy.LegacyComponentSerializer;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerLoginEvent;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Écran Multijoueur : MOTD, icône, bulle du compteur de joueurs, texte de version et maintenance.
 * Appelé hors du thread principal : ne lit que des champs immuables ou volatils du plugin.
 */
final class ServerListListener implements Listener {
    static final String MAINTENANCE_BYPASS = "vaeloria.maintenance.bypass";

    private final VaeloriaTabPlugin plugin;
    private final MiniMessage mm = MiniMessage.miniMessage();
    // La bulle et le texte de version sont des chaînes « § » : les couleurs hex y sont ramenées aux 16 couleurs.
    private final LegacyComponentSerializer legacy = LegacyComponentSerializer.legacySection();

    ServerListListener(VaeloriaTabPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler(priority = EventPriority.HIGH)
    public void onPing(PaperServerListPingEvent e) {
        ServerListSettings s = plugin.serverList();
        if (s == null || !s.enabled()) return;

        if (s.maxPlayers() > 0) e.setMaxPlayers(s.maxPlayers());
        TagResolver tags = TagResolver.resolver(
                plugin.paletteTags(),
                Placeholder.component("logo", plugin.logo()),
                Placeholder.unparsed("online", Integer.toString(e.getNumPlayers())),
                Placeholder.unparsed("max", Integer.toString(e.getMaxPlayers())),
                Placeholder.unparsed("server", plugin.settings().serverName()));

        Component line1 = mm.deserialize(s.line1(), tags);
        Component line2 = mm.deserialize(s.line2At(System.currentTimeMillis()), tags);
        if (s.center()) {
            line1 = MotdLayout.center(line1, MotdLayout.MOTD_WIDTH);
            line2 = MotdLayout.center(line2, MotdLayout.MOTD_WIDTH);
        }
        e.motd(line1.append(Component.newline()).append(line2));

        if (plugin.icon() != null) e.setServerIcon(plugin.icon());

        if (!s.hover().isEmpty()) {
            List<ListedPlayerInfo> listed = e.getListedPlayers();
            List<ListedPlayerInfo> lines = new ArrayList<>();
            for (String line : s.hover()) lines.add(info(legacy.serialize(mm.deserialize(line, tags))));
            if (s.hoverPlayers() && !e.shouldHidePlayers() && !listed.isEmpty()) {
                String bullet = legacy.serialize(mm.deserialize("  <dark_red>◆</dark_red> <white>"));
                listed.stream().limit(s.hoverPlayersMax()).forEach(p -> lines.add(new ListedPlayerInfo(bullet + p.name(), p.id())));
                if (e.getNumPlayers() > s.hoverPlayersMax()) {
                    lines.add(info(legacy.serialize(mm.deserialize("  <dark_gray>… et " + (e.getNumPlayers() - s.hoverPlayersMax()) + " autres", tags))));
                }
            }
            listed.clear();
            listed.addAll(lines);
        }

        if (s.maintenance()) {
            // Un protocole invalide fait afficher le texte de version à la place du compteur de joueurs.
            e.setVersion(legacy.serialize(mm.deserialize(s.maintenanceVersion(), tags)));
            e.setProtocolVersion(-1);
        } else if (!s.versionText().isBlank()) {
            // Visible seulement par les clients d'une version incompatible.
            e.setVersion(legacy.serialize(mm.deserialize(s.versionText(), tags)));
        }
    }

    @EventHandler(priority = EventPriority.HIGH)
    public void onLogin(PlayerLoginEvent e) {
        ServerListSettings s = plugin.serverList();
        if (s == null || !s.enabled() || !s.maintenance()) return;
        if (e.getPlayer().hasPermission(MAINTENANCE_BYPASS)) return;
        e.disallow(PlayerLoginEvent.Result.KICK_OTHER, mm.deserialize(s.maintenanceKick(), plugin.paletteTags()));
    }

    private static ListedPlayerInfo info(String text) {
        return new ListedPlayerInfo(text, UUID.nameUUIDFromBytes(text.getBytes(StandardCharsets.UTF_8)));
    }
}
