package fr.vaeloria.factions.service;

import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.LogEntry;
import fr.vaeloria.factions.rules.ItemDiff;
import fr.vaeloria.factions.util.Settings;
import org.bukkit.entity.Player;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Journal de faction : membres, territoire, banque, coffre, diplomatie, pillages. Lisible avec /f logs. */
public final class LogService {
    private final Settings settings;
    private final FactionManager manager;
    /** Contenu du coffre résumé à l'ouverture, par joueur, pour savoir ce qu'il a pris ou déposé. */
    private final Map<UUID, Map<String, Integer>> chestSnapshots = new ConcurrentHashMap<>();

    public LogService(Settings settings, FactionManager manager) {
        this.settings = settings;
        this.manager = manager;
    }

    public void add(Faction f, String type, String actor, String detail) {
        if (f == null || f.system) return;
        f.logs.add(new LogEntry(System.currentTimeMillis(), type, actor == null ? "—" : actor, detail == null ? "" : detail));
        int extra = f.logs.size() - settings.logsMax;
        if (extra > 0) f.logs.subList(0, extra).clear();
        manager.markDirty();
    }

    // ── Coffre ──

    public static Map<String, Integer> summarize(Inventory inv) {
        Map<String, Integer> m = new LinkedHashMap<>();
        for (ItemStack it : inv.getContents()) {
            if (it == null || it.getType().isAir()) continue;
            m.merge(label(it), it.getAmount(), Integer::sum);
        }
        return m;
    }

    private static String label(ItemStack it) {
        String base = it.getType().name().toLowerCase(Locale.ROOT).replace('_', ' ');
        if (it.hasItemMeta() && it.getItemMeta().hasDisplayName()) {
            String name = net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer.plainText()
                    .serialize(it.getItemMeta().displayName());
            return name + " (" + base + ")";
        }
        return base;
    }

    public void chestOpened(Player p, Inventory inv) {
        chestSnapshots.put(p.getUniqueId(), summarize(inv));
    }

    public void chestClosed(Player p, Faction f, Inventory inv) {
        Map<String, Integer> before = chestSnapshots.remove(p.getUniqueId());
        if (before == null) return;
        Map<String, Integer> diff = ItemDiff.diff(before, summarize(inv));
        if (diff.isEmpty()) return;
        java.util.List<String> taken = new java.util.ArrayList<>(), given = new java.util.ArrayList<>();
        diff.forEach((k, v) -> (v < 0 ? taken : given).add(Math.abs(v) + "× " + k));
        if (!taken.isEmpty()) add(f, "COFFRE-", p.getName(), "a retiré " + String.join(", ", taken));
        if (!given.isEmpty()) add(f, "COFFRE+", p.getName(), "a déposé " + String.join(", ", given));
    }

    public void forget(UUID uuid) { chestSnapshots.remove(uuid); }
}
