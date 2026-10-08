package fr.vaeloria.combat;

import org.bukkit.Bukkit;
import org.bukkit.attribute.Attribute;
import org.bukkit.attribute.AttributeInstance;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDamageByEntityEvent;
import org.bukkit.event.entity.EntityDamageEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.player.PlayerVelocityEvent;
import org.bukkit.util.Vector;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Combat 1.8 appliqué à l'identique à chaque joueur :
 * - pas de recharge d'attaque (vitesse d'attaque très élevée) ;
 * - délai d'invulnérabilité entre deux coups fixe ;
 * - pas de coup balayé ;
 * - knockback 1.8 déterministe ({@link Knockback}).
 *
 * Le recul est appliqué via PlayerVelocityEvent, c'est-à-dire dans le paquet de vélocité vanilla :
 * un anticheat à prédiction (GrimAC) le voit et l'anticipe comme un recul normal, donc pas de rubberband.
 */
public final class CombatListener implements Listener {
    private static final double VANILLA_ATTACK_SPEED = 4.0;
    private static final int VANILLA_NO_DAMAGE_TICKS = 20;

    private record Pending(int tick, Vector velocity) {}

    private final Map<UUID, Pending> pending = new HashMap<>();
    private boolean disableCooldown;
    private double attackSpeed;
    private int maxNoDamageTicks;
    private boolean disableSweep;
    private boolean knockbackEnabled;
    private Knockback.Settings kb = Knockback.Settings.VANILLA_1_8;

    public void configure(ConfigurationSection combat, ConfigurationSection knockback) {
        disableCooldown = combat.getBoolean("disable-attack-cooldown", true);
        attackSpeed = combat.getDouble("attack-speed", 1024.0);
        maxNoDamageTicks = combat.getInt("max-no-damage-ticks", VANILLA_NO_DAMAGE_TICKS);
        disableSweep = combat.getBoolean("disable-sweep", true);
        knockbackEnabled = knockback.getBoolean("enabled", true);
        Knockback.Settings d = Knockback.Settings.VANILLA_1_8;
        kb = new Knockback.Settings(
                Math.max(1.0, knockback.getDouble("friction", d.friction())),
                knockback.getDouble("horizontal", d.horizontal()),
                knockback.getDouble("vertical", d.vertical()),
                knockback.getDouble("vertical-limit", d.verticalLimit()),
                knockback.getDouble("extra-horizontal", d.extraHorizontal()),
                knockback.getDouble("extra-vertical", d.extraVertical()),
                knockback.getBoolean("ignore-knockback-resistance", d.ignoreResistance()));
    }

    public void applyToAll() {
        Bukkit.getOnlinePlayers().forEach(this::apply);
    }

    public void restoreAll() {
        for (Player p : Bukkit.getOnlinePlayers()) {
            AttributeInstance speed = p.getAttribute(Attribute.ATTACK_SPEED);
            if (speed != null) speed.setBaseValue(VANILLA_ATTACK_SPEED);
            p.setMaximumNoDamageTicks(VANILLA_NO_DAMAGE_TICKS);
        }
        pending.clear();
    }

    private void apply(Player p) {
        AttributeInstance speed = p.getAttribute(Attribute.ATTACK_SPEED);
        if (speed != null) speed.setBaseValue(disableCooldown ? attackSpeed : VANILLA_ATTACK_SPEED);
        p.setMaximumNoDamageTicks(maxNoDamageTicks);
    }

    @EventHandler
    public void onJoin(PlayerJoinEvent e) {
        apply(e.getPlayer());
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent e) {
        pending.remove(e.getPlayer().getUniqueId());
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onSweep(EntityDamageEvent e) {
        if (disableSweep && e.getCause() == EntityDamageEvent.DamageCause.ENTITY_SWEEP_ATTACK) e.setCancelled(true);
    }

    /** Calcule le recul au moment du coup ; il sera posé sur le paquet de vélocité du même tick. */
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onHit(EntityDamageByEntityEvent e) {
        if (!knockbackEnabled || e.getCause() != EntityDamageEvent.DamageCause.ENTITY_ATTACK) return;
        if (!(e.getEntity() instanceof Player victim) || !(e.getDamager() instanceof Player attacker)) return;

        int bonus = (attacker.isSprinting() ? 1 : 0)
                + attacker.getInventory().getItemInMainHand().getEnchantmentLevel(Enchantment.KNOCKBACK);
        AttributeInstance res = victim.getAttribute(Attribute.KNOCKBACK_RESISTANCE);
        Vector v = victim.getVelocity();
        Knockback.Vec out = Knockback.compute(kb,
                new Knockback.Vec(v.getX(), v.getY(), v.getZ()),
                victim.getLocation().getX() - attacker.getLocation().getX(),
                victim.getLocation().getZ() - attacker.getLocation().getZ(),
                attacker.getLocation().getYaw(), bonus, res == null ? 0 : res.getValue());
        pending.put(victim.getUniqueId(), new Pending(Bukkit.getCurrentTick(), new Vector(out.x(), out.y(), out.z())));
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onVelocity(PlayerVelocityEvent e) {
        Pending p = pending.remove(e.getPlayer().getUniqueId());
        // Uniquement le recul du coup de ce tick : jamais une explosion, un piston ou un coup ancien.
        if (p != null && p.tick() == Bukkit.getCurrentTick()) e.setVelocity(p.velocity());
    }
}
