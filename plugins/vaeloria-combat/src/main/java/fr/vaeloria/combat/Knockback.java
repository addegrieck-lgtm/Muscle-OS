package fr.vaeloria.combat;

/**
 * Knockback 1.8, sans dépendance à Bukkit (testable).
 * Reproduit EntityLivingBase.knockBack + le bonus de sprint / enchantement de EntityPlayer.attack (1.8.9),
 * de façon déterministe : même coup, même recul, pour tous les joueurs.
 */
public final class Knockback {
    public record Vec(double x, double y, double z) {}

    /** Réglages (valeurs par défaut = 1.8 vanilla). */
    public record Settings(double friction, double horizontal, double vertical, double verticalLimit,
                           double extraHorizontal, double extraVertical, boolean ignoreResistance) {
        public static final Settings VANILLA_1_8 = new Settings(2.0, 0.4, 0.4, 0.4, 0.5, 0.1, true);
    }

    private Knockback() {}

    /**
     * @param victimVelocity vitesse actuelle de la victime (côté serveur)
     * @param dx             position victime − position attaquant (axe X)
     * @param dz             position victime − position attaquant (axe Z)
     * @param attackerYaw    orientation de l'attaquant en degrés (sert au bonus et si les deux joueurs sont superposés)
     * @param bonusLevel     1 si l'attaquant sprinte, + niveau d'enchantement Recul de l'arme
     * @param resistance     résistance au recul de la victime (0..1), ignorée si {@code ignoreResistance}
     */
    public static Vec compute(Settings s, Vec victimVelocity, double dx, double dz, float attackerYaw, int bonusLevel, double resistance) {
        double yaw = Math.toRadians(attackerYaw);
        double dist = Math.sqrt(dx * dx + dz * dz);
        double nx, nz;
        if (dist < 1.0E-4) { // joueurs superposés : on pousse dans la direction du regard de l'attaquant
            nx = -Math.sin(yaw);
            nz = Math.cos(yaw);
        } else {
            nx = dx / dist;
            nz = dz / dist;
        }
        double factor = s.ignoreResistance() ? 1.0 : 1.0 - clamp(resistance, 0.0, 1.0);

        double x = victimVelocity.x() / s.friction() + nx * s.horizontal() * factor;
        double y = victimVelocity.y() / s.friction() + s.vertical() * factor;
        double z = victimVelocity.z() / s.friction() + nz * s.horizontal() * factor;
        if (y > s.verticalLimit()) y = s.verticalLimit();

        if (bonusLevel > 0) {
            x += -Math.sin(yaw) * bonusLevel * s.extraHorizontal() * factor;
            y += s.extraVertical() * factor;
            z += Math.cos(yaw) * bonusLevel * s.extraHorizontal() * factor;
        }
        return new Vec(x, y, z);
    }

    private static double clamp(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
    }
}
