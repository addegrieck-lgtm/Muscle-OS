package fr.vaeloria.factions.listener;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.FPlayer;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.Relation;
import fr.vaeloria.factions.rules.PowerMath;
import fr.vaeloria.factions.service.FactionManager;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import org.bukkit.Bukkit;
import org.bukkit.entity.Entity;
import org.bukkit.entity.LivingEntity;
import org.bukkit.entity.Player;
import org.bukkit.entity.Projectile;
import org.bukkit.entity.TNTPrimed;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDamageByEntityEvent;
import org.bukkit.event.entity.PlayerDeathEvent;
import org.bukkit.event.entity.PotionSplashEvent;
import org.bukkit.potion.PotionEffect;

/** PvP entre factions (tir ami, alliés, safezone) et perte de power à la mort. */
public final class CombatListener implements Listener {
    private final VaeloriaFactionsPlugin plugin;
    private final FactionManager manager;

    public CombatListener(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
        this.manager = plugin.manager();
    }

    private Settings s() { return plugin.settings(); }

    private static boolean sameAddress(Player a, Player b) {
        var x = a.getAddress();
        var y = b.getAddress();
        return x != null && y != null && x.getAddress() != null && x.getAddress().equals(y.getAddress())
                && !x.getAddress().isLoopbackAddress();
    }

    private static Player attacker(Entity damager) {
        if (damager instanceof Player p) return p;
        if (damager instanceof Projectile pr && pr.getShooter() instanceof Player p) return p;
        if (damager instanceof org.bukkit.entity.AreaEffectCloud c && c.getSource() instanceof Player p) return p;
        if (damager instanceof TNTPrimed t && t.getSource() instanceof Player p) return p;
        return null;
    }

    /** Raison du refus, ou null si le coup est permis. */
    private String denyReason(Player attacker, Player victim) {
        if (attacker.equals(victim)) return null;
        Faction za = manager.factionAt(attacker.getLocation());
        Faction zv = manager.factionAt(victim.getLocation());
        if (za != null && za.isSafezone() || zv != null && zv.isSafezone()) return "pvp.safezone";
        Faction zone = zv;
        if (zone != null && zone.isWarzone()) {
            // En warzone, seuls les membres d'une même faction restent protégés du tir ami.
            return manager.relation(attacker, victim) == Relation.MEMBRE && !s().friendlyFire ? "pvp.member" : null;
        }
        Relation r = manager.relation(attacker, victim);
        if (r == Relation.MEMBRE && !s().friendlyFire) return "pvp.member";
        if (r == Relation.ALLIE && !s().allyPvp) return "pvp.ally";
        if (r == Relation.TREVE && !s().trucePvp) return "pvp.truce";
        return null;
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onDamage(EntityDamageByEntityEvent e) {
        if (!(e.getEntity() instanceof Player victim)) return;
        Player a = attacker(e.getDamager());
        if (a == null || a.equals(victim)) return;
        String reason = denyReason(a, victim);
        if (reason != null) {
            e.setCancelled(true);
            if (!(e.getDamager() instanceof TNTPrimed)) a.sendActionBar(Msg.get(reason, "player", victim.getName()));
            return;
        }
        // Combat : le vol de faction est coupé des deux côtés.
        for (Player p : new Player[]{a, victim}) {
            FPlayer fp = manager.fplayer(p);
            if (fp.flying) {
                plugin.territory().setFly(p, false);
                Msg.send(p, "fly.combat");
            }
        }
        plugin.teleports().cancel(victim, true);
    }

    /** Le coup est définitivement porté (aucun plugin ne l'a annulé) : les deux joueurs passent en combat. */
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onDamageDone(EntityDamageByEntityEvent e) {
        if (!(e.getEntity() instanceof Player victim)) return;
        Player a = attacker(e.getDamager());
        if (a == null || a.equals(victim)) return;
        plugin.combat().tag(a, victim);
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onCommand(org.bukkit.event.player.PlayerCommandPreprocessEvent e) {
        Player p = e.getPlayer();
        if (!plugin.combat().inCombat(p) || !plugin.combat().blocked(e.getMessage())) return;
        e.setCancelled(true);
        Msg.send(p, "combat.command-blocked", "seconds", (plugin.combat().remaining(p) + 999) / 1000);
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onTeleport(org.bukkit.event.player.PlayerTeleportEvent e) {
        var cause = e.getCause();
        if (cause != org.bukkit.event.player.PlayerTeleportEvent.TeleportCause.COMMAND) return;
        Player p = e.getPlayer();
        if (plugin.combat().inCombat(p) && !p.hasPermission("vaeloria.factions.bypass.combat")) {
            e.setCancelled(true);
            Msg.send(p, "combat.teleport-blocked", "seconds", (plugin.combat().remaining(p) + 999) / 1000);
        }
    }

    /** Combat-log : se déconnecter en combat, c'est mourir (inventaire au sol, power perdu, kill pour l'agresseur). */
    @EventHandler(priority = EventPriority.LOWEST)
    public void onQuit(org.bukkit.event.player.PlayerQuitEvent e) {
        Player p = e.getPlayer();
        // Arrêt du serveur : tout le monde est « déconnecté », personne ne doit mourir pour autant.
        if (Bukkit.isStopping() || !s().combatKillOnLogout || !plugin.combat().inCombat(p) || p.isDead()) {
            plugin.combat().untag(p.getUniqueId());
            return;
        }
        Player killer = plugin.combat().lastAttacker(p);
        if (killer != null) p.setKiller(killer);
        Bukkit.broadcast(Msg.prefixed("combat.logout-broadcast", "player", p.getName()));
        Faction f = manager.factionOf(p);
        if (f != null) {
            plugin.discord().combatLog(f, p.getName());
            plugin.logs().add(f, "COMBAT", p.getName(), "s'est déconnecté en combat");
        }
        p.setHealth(0);
        plugin.combat().untag(p.getUniqueId());
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onSplash(PotionSplashEvent e) {
        if (!(e.getPotion().getShooter() instanceof Player a)) return;
        boolean harmful = false;
        for (PotionEffect pe : e.getPotion().getEffects()) {
            if (pe.getType().getEffectCategory() == org.bukkit.potion.PotionEffectType.Category.HARMFUL) harmful = true;
        }
        if (!harmful) return;
        for (LivingEntity le : e.getAffectedEntities()) {
            if (le instanceof Player v && !v.equals(a) && denyReason(a, v) != null) e.setIntensity(v, 0);
        }
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onDeath(PlayerDeathEvent e) {
        Player victim = e.getEntity();
        plugin.combat().untag(victim.getUniqueId());
        FPlayer fv = manager.fplayer(victim);
        Faction zone = manager.factionAt(victim.getLocation());
        Faction fac = manager.factionOf(victim);
        Player killer = victim.getKiller();
        if (killer != null && killer.equals(victim)) killer = null;

        // Anti-farm : même tueur, même victime dans la période, ou même adresse IP (double compte) → mort « gratuite ».
        boolean farmed = false;
        if (killer != null) {
            if (s().sameIpNoLoss && sameAddress(killer, victim)) farmed = true;
            else farmed = !plugin.farmGuard().shouldPenalize(killer.getUniqueId(), victim.getUniqueId(),
                    System.currentTimeMillis(), s().farmCooldownMinutes * 60_000L);
        }
        fv.deaths++;
        if (fac != null) fac.deaths++;
        if (killer != null && !farmed) {
            manager.fplayer(killer).kills++;
            Faction fk = manager.factionOf(killer);
            if (fk != null) {
                fk.kills++;
                plugin.wars().onKill(fk, fac, killer.getUniqueId(), victim.getUniqueId());
            }
        }
        manager.markDirty();
        if (zone != null && zone.isSafezone()) return;
        if (victim.hasPermission("vaeloria.factions.bypass.powerloss")) return;
        if (farmed) {
            Msg.send(victim, "power.farm-protected");
            return;
        }
        double loss = s().lossOnDeath * (zone != null && zone.isWarzone() ? s().warzoneLossMultiplier : 1);
        fv.power = PowerMath.round(PowerMath.clamp(fv.power - loss, s().powerMin, s().powerMax));
        Msg.send(victim, "power.lost", "loss", Msg.fmt(loss), "power", Msg.fmt(fv.power), "max", Msg.fmt(s().powerMax));
        if (fac != null && manager.isVulnerable(fac)) {
            for (Player m : manager.online(fac)) Msg.send(m, "power.faction-vulnerable");
        }
    }
}
