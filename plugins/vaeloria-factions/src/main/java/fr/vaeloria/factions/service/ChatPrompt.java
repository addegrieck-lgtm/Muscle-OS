package fr.vaeloria.factions.service;

import fr.vaeloria.factions.util.Msg;
import io.papermc.paper.event.player.AsyncChatEvent;
import net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

/** Saisie dans le chat pour les menus : le prochain message du joueur est capturé (« annuler » pour abandonner). */
public final class ChatPrompt implements Listener {
    private final JavaPlugin plugin;
    private final Map<UUID, Pending> pending = new ConcurrentHashMap<>();

    private record Pending(Consumer<String> handler, long expires) {}

    public ChatPrompt(JavaPlugin plugin) {
        this.plugin = plugin;
    }

    public void ask(Player p, String question, Consumer<String> handler) {
        p.closeInventory();
        pending.put(p.getUniqueId(), new Pending(handler, System.currentTimeMillis() + 120_000));
        p.sendMessage(Msg.parse("<prefix><gold>" + question + "</gold> <dark_gray>(tape « annuler » pour abandonner)"));
    }

    @EventHandler(priority = EventPriority.LOWEST)
    public void onChat(AsyncChatEvent e) {
        Pending pd = pending.remove(e.getPlayer().getUniqueId());
        if (pd == null) return;
        e.setCancelled(true);
        if (pd.expires() < System.currentTimeMillis()) return;
        String text = PlainTextComponentSerializer.plainText().serialize(e.message()).trim();
        Player p = e.getPlayer();
        Bukkit.getScheduler().runTask(plugin, () -> {
            if (text.equalsIgnoreCase("annuler") || text.equalsIgnoreCase("cancel")) {
                p.sendMessage(Msg.parse("<prefix><gray>Saisie annulée."));
                return;
            }
            pd.handler().accept(text);
        });
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent e) {
        pending.remove(e.getPlayer().getUniqueId());
    }
}
