package fr.vaeloria.rtp.gui;

import fr.vaeloria.rtp.Messages;
import fr.vaeloria.rtp.VaeloriaRtpPlugin;
import io.papermc.paper.event.player.AsyncChatEvent;
import net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.scheduler.BukkitTask;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

/** Saisie d'une valeur dans le chat (interface admin). « annuler » pour revenir sans rien changer. */
public final class ChatPrompt implements Listener {
    private record Prompt(Consumer<String> onInput, Runnable onCancel, BukkitTask timeout) {}

    private final VaeloriaRtpPlugin plugin;
    private final Map<UUID, Prompt> prompts = new ConcurrentHashMap<>();

    public ChatPrompt(VaeloriaRtpPlugin plugin) {
        this.plugin = plugin;
    }

    public void ask(Player player, String question, Consumer<String> onInput, Runnable onCancel) {
        player.closeInventory();
        Prompt old = prompts.remove(player.getUniqueId());
        if (old != null) old.timeout().cancel();
        BukkitTask timeout = Bukkit.getScheduler().runTaskLater(plugin, () -> {
            if (prompts.remove(player.getUniqueId()) != null && player.isOnline()) {
                plugin.messages().send(player, "prompt-timeout");
            }
        }, 20L * 60);
        prompts.put(player.getUniqueId(), new Prompt(onInput, onCancel, timeout));
        plugin.messages().send(player, "prompt", Messages.rich("question", question));
    }

    @EventHandler(priority = EventPriority.LOWEST)
    public void onChat(AsyncChatEvent e) {
        Prompt prompt = prompts.remove(e.getPlayer().getUniqueId());
        if (prompt == null) return;
        e.setCancelled(true);
        prompt.timeout().cancel();
        String text = PlainTextComponentSerializer.plainText().serialize(e.message()).trim();
        Bukkit.getScheduler().runTask(plugin, () -> {
            if (text.equalsIgnoreCase("annuler") || text.equalsIgnoreCase("cancel")) prompt.onCancel().run();
            else prompt.onInput().accept(text);
        });
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent e) {
        Prompt prompt = prompts.remove(e.getPlayer().getUniqueId());
        if (prompt != null) prompt.timeout().cancel();
    }
}
