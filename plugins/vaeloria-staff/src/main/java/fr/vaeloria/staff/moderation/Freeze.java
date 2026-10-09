package fr.vaeloria.staff.moderation;

import fr.vaeloria.staff.Perm;
import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.util.Text;
import net.kyori.adventure.title.Title;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;

import java.time.Duration;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Joueurs immobilisés (vérification anti-triche, explication avec le staff). */
public final class Freeze {
    private final VaeloriaStaffPlugin plugin;
    private final Set<UUID> frozen = ConcurrentHashMap.newKeySet();

    public Freeze(VaeloriaStaffPlugin plugin) {
        this.plugin = plugin;
        Bukkit.getScheduler().runTaskTimer(plugin, () -> remindAll(), 40L, 60L);
    }

    public boolean is(Player p) {
        return frozen.contains(p.getUniqueId());
    }

    public void toggle(Player staff, Player target) {
        if (target.hasPermission(Perm.FREEZE) && !is(target) && !staff.isOp()) {
            plugin.msg(staff, "&cImpossible d'immobiliser un membre du staff.");
            return;
        }
        if (frozen.remove(target.getUniqueId())) {
            target.clearTitle();
            plugin.msg(target, "&aTu peux de nouveau bouger.");
            plugin.notifyStaff(staff.getName() + " a libéré &f" + target.getName());
        } else {
            frozen.add(target.getUniqueId());
            target.setFlying(false);
            remind(target);
            plugin.notifyStaff(staff.getName() + " a immobilisé &f" + target.getName());
        }
    }

    public void release(UUID id) {
        frozen.remove(id);
    }

    private void remindAll() {
        for (UUID id : frozen) {
            Player p = Bukkit.getPlayer(id);
            if (p != null) remind(p);
        }
    }

    private void remind(Player p) {
        p.showTitle(Title.title(Text.of(plugin.getConfig().getString("freeze.title", "&c&lIMMOBILISÉ")),
                Text.of(plugin.getConfig().getString("freeze.subtitle", "&fNe te déconnecte pas, un membre du staff arrive.")),
                Title.Times.times(Duration.ZERO, Duration.ofSeconds(4), Duration.ofMillis(250))));
    }
}
