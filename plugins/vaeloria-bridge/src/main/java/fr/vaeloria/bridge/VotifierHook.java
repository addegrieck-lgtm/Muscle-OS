package fr.vaeloria.bridge;

import org.bukkit.event.Event;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.plugin.Plugin;
import org.bukkit.plugin.java.JavaPlugin;

import java.lang.reflect.Method;
import java.util.logging.Level;

/**
 * Relais des votes reçus par Votifier / NuVotifier vers l'API (événement SERVER_VOTE).
 * Branché par réflexion : aucune dépendance de compilation, le pont fonctionne aussi sans Votifier.
 * L'API retrouve le site de vote par le nom du service et applique le délai de revote ;
 * les récompenses (influence, commande en jeu) sont décidées côté API, pas ici.
 */
final class VotifierHook implements Listener {
    private static final String EVENT_CLASS = "com.vexsoftware.votifier.model.VotifierEvent";

    private VotifierHook() {}

    /** @return true si Votifier est présent et l'écoute active. */
    static boolean register(JavaPlugin plugin, String serverName) {
        Plugin votifier = plugin.getServer().getPluginManager().getPlugin("Votifier");
        if (votifier == null || !votifier.isEnabled()) return false;
        try {
            @SuppressWarnings("unchecked")
            Class<? extends Event> eventClass = (Class<? extends Event>) Class.forName(EVENT_CLASS, true, votifier.getClass().getClassLoader());
            Method getVote = eventClass.getMethod("getVote");
            VotifierHook listener = new VotifierHook();
            plugin.getServer().getPluginManager().registerEvent(eventClass, listener, EventPriority.MONITOR, (l, event) -> {
                if (!eventClass.isInstance(event)) return;
                try {
                    Object vote = getVote.invoke(event);
                    Class<?> v = vote.getClass();
                    String service = (String) v.getMethod("getServiceName").invoke(vote);
                    String username = (String) v.getMethod("getUsername").invoke(vote);
                    String address = (String) v.getMethod("getAddress").invoke(vote);
                    var json = Events.serverVote(serverName, service, username, address);
                    if (json != null) VaeloriaBridgePlugin.emit(json);
                } catch (ReflectiveOperationException | ClassCastException e) {
                    plugin.getLogger().log(Level.WARNING, "Vote Votifier illisible", e);
                }
            }, plugin, false);
            return true;
        } catch (ReflectiveOperationException | ClassCastException e) {
            plugin.getLogger().log(Level.WARNING, "Votifier détecté mais incompatible : votes en jeu non relayés", e);
            return false;
        }
    }
}
