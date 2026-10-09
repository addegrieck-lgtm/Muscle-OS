package fr.vaeloria.staff.moderation;

import fr.vaeloria.staff.Perm;
import fr.vaeloria.staff.VaeloriaStaffPlugin;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;

import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Invisibilité staff : caché aux joueurs sans {@code vaeloria.staff.vanish.see}. Conservée à la reconnexion. */
public final class Vanish {
    private final VaeloriaStaffPlugin plugin;
    private final Set<UUID> vanished = ConcurrentHashMap.newKeySet();

    public Vanish(VaeloriaStaffPlugin plugin) {
        this.plugin = plugin;
    }

    public boolean is(Player p) {
        return vanished.contains(p.getUniqueId());
    }

    public void toggle(Player p) {
        set(p, !is(p));
    }

    public void set(Player p, boolean on) {
        if (on) vanished.add(p.getUniqueId());
        else vanished.remove(p.getUniqueId());
        apply(p);
        p.setCollidable(!on);
        p.setAffectsSpawning(!on);
        plugin.msg(p, on ? "Tu es maintenant &binvisible&7." : "Tu es de nouveau &fvisible&7.");
    }

    /** Cache / montre {@code p} à tous les joueurs selon son état. */
    private void apply(Player p) {
        for (Player other : Bukkit.getOnlinePlayers()) {
            if (other.equals(p)) continue;
            if (is(p) && !other.hasPermission(Perm.VANISH_SEE)) other.hidePlayer(plugin, p);
            else other.showPlayer(plugin, p);
        }
    }

    /** Connexion : le nouveau venu ne voit pas les staffs invisibles, et reste invisible s'il l'était. */
    public void onJoin(Player joining) {
        for (Player other : Bukkit.getOnlinePlayers()) {
            if (!other.equals(joining) && is(other) && !joining.hasPermission(Perm.VANISH_SEE)) joining.hidePlayer(plugin, other);
        }
        if (is(joining)) {
            apply(joining);
            joining.setCollidable(false);
            joining.setAffectsSpawning(false);
            plugin.msg(joining, "Tu es toujours &binvisible&7.");
        }
    }

    public void showAll() {
        for (Player p : Bukkit.getOnlinePlayers()) {
            for (Player other : Bukkit.getOnlinePlayers()) other.showPlayer(plugin, p);
        }
    }
}
