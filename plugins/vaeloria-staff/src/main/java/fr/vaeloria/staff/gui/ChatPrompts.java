package fr.vaeloria.staff.gui;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.util.Text;
import io.papermc.paper.event.player.AsyncChatEvent;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerQuitEvent;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

/** Saisie de texte par le chat (noms, lore, commandes). Le message n'est jamais diffusé. */
public final class ChatPrompts implements Listener {
    private record Prompt(Consumer<String> onInput, Runnable onCancel) {}

    private final VaeloriaStaffPlugin plugin;
    private final Map<UUID, Prompt> pending = new ConcurrentHashMap<>();

    public ChatPrompts(VaeloriaStaffPlugin plugin) {
        this.plugin = plugin;
    }

    /** Ferme le menu, pose la question ; « annuler » appelle {@code onCancel}. Les rappels s'exécutent sur le thread principal. */
    public void ask(Player player, String question, Consumer<String> onInput, Runnable onCancel) {
        player.closeInventory();
        pending.put(player.getUniqueId(), new Prompt(onInput, onCancel));
        plugin.msg(player, question);
        plugin.msg(player, "&8(tape &7annuler &8pour revenir)");
    }

    public boolean isWaiting(Player player) {
        return pending.containsKey(player.getUniqueId());
    }

    public void cancel(Player player) {
        pending.remove(player.getUniqueId());
    }

    @EventHandler(priority = EventPriority.LOWEST)
    public void onChat(AsyncChatEvent event) {
        Prompt prompt = pending.remove(event.getPlayer().getUniqueId());
        if (prompt == null) return;
        event.setCancelled(true);
        String input = Text.plain(event.message()).trim();
        Bukkit.getScheduler().runTask(plugin, () -> {
            if (!event.getPlayer().isOnline()) return;
            if (input.equalsIgnoreCase("annuler") || input.equalsIgnoreCase("cancel")) prompt.onCancel().run();
            else prompt.onInput().accept(input);
        });
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent event) {
        pending.remove(event.getPlayer().getUniqueId());
    }
}
