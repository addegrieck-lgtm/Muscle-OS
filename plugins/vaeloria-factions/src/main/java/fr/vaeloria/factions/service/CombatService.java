package fr.vaeloria.factions.service;

import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;

import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tag de combat : après un coup PvP, les deux joueurs sont « en combat » quelques secondes. Pendant ce temps, pas de
 * téléportation ni de commandes de fuite, et se déconnecter tue le joueur (combat-log), avec perte de power et
 * d'inventaire au profit de son dernier agresseur.
 */
public final class CombatService {
    public static final String BYPASS = "vaeloria.factions.bypass.combat";

    private final Settings settings;
    private final Map<UUID, Long> tagUntil = new ConcurrentHashMap<>();
    private final Map<UUID, UUID> lastAttacker = new ConcurrentHashMap<>();

    public CombatService(Settings settings) {
        this.settings = settings;
    }

    public void tag(Player attacker, Player victim) {
        if (settings.combatTagSeconds <= 0) return;
        long until = System.currentTimeMillis() + settings.combatTagSeconds * 1000L;
        for (Player p : new Player[]{attacker, victim}) {
            if (p.hasPermission(BYPASS)) continue;
            Long previous = tagUntil.put(p.getUniqueId(), until);
            if (previous == null || previous < System.currentTimeMillis()) Msg.send(p, "combat.tagged", "seconds", settings.combatTagSeconds);
        }
        lastAttacker.put(victim.getUniqueId(), attacker.getUniqueId());
    }

    public boolean inCombat(Player p) {
        Long t = tagUntil.get(p.getUniqueId());
        return t != null && t > System.currentTimeMillis();
    }

    public long remaining(Player p) {
        Long t = tagUntil.get(p.getUniqueId());
        return t == null ? 0 : Math.max(0, t - System.currentTimeMillis());
    }

    public void untag(UUID uuid) {
        tagUntil.remove(uuid);
        lastAttacker.remove(uuid);
    }

    public Player lastAttacker(Player victim) {
        UUID u = lastAttacker.get(victim.getUniqueId());
        return u == null ? null : Bukkit.getPlayer(u);
    }

    /** Commande interdite en combat ? Compare le début de la commande aux entrées de combat.blocked-commands. */
    public boolean blocked(String message) {
        String m = message.toLowerCase(Locale.ROOT).replaceFirst("^/", "").trim();
        // « /essentials:home » compte comme « /home ».
        String[] parts = m.split(" ", 2);
        String head = parts[0].substring(parts[0].indexOf(':') + 1);
        m = parts.length > 1 ? head + " " + parts[1] : head;
        for (String b : settings.combatBlockedCommands) {
            if (m.equals(b) || m.startsWith(b + " ")) return true;
        }
        return false;
    }

    /** Chaque seconde : compte à rebours dans la barre d'action, fin de combat. */
    public void tick() {
        long now = System.currentTimeMillis();
        for (Map.Entry<UUID, Long> e : tagUntil.entrySet()) {
            Player p = Bukkit.getPlayer(e.getKey());
            if (p == null) continue;
            long left = e.getValue() - now;
            if (left <= 0) {
                untag(e.getKey());
                Msg.send(p, "combat.ended");
            } else {
                p.sendActionBar(Msg.get("combat.actionbar", "seconds", (left + 999) / 1000));
            }
        }
    }
}
