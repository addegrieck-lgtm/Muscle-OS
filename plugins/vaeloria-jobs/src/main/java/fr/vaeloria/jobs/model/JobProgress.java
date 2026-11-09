package fr.vaeloria.jobs.model;

import java.util.LinkedHashSet;
import java.util.Set;

/** Progression d'un joueur dans un métier : XP, nœuds débloqués, dernière réinitialisation. */
public final class JobProgress {
    private double xp;
    private final Set<String> unlocked = new LinkedHashSet<>();
    private long lastReset;

    public double xp() { return xp; }

    public void setXp(double xp) { this.xp = Math.max(0, xp); }

    public Set<String> unlocked() { return unlocked; }

    public long lastReset() { return lastReset; }

    public void setLastReset(long millis) { this.lastReset = millis; }

    /** Ajoute de l'XP ; renvoie le nombre de niveaux gagnés. */
    public int addXp(double amount, LevelCurve curve) {
        if (!(amount > 0)) return 0;
        int before = curve.levelFor(xp);
        xp = curve.clamp(xp + amount);
        return curve.levelFor(xp) - before;
    }

    public int level(LevelCurve curve) { return curve.levelFor(xp); }

    public int freePoints(LevelCurve curve, SkillTree tree) {
        return curve.pointsAt(level(curve)) - tree.spent(unlocked);
    }

    /** Débloque le nœud si les règles le permettent ; renvoie le statut évalué avant. */
    public SkillTree.Status unlock(SkillNode node, LevelCurve curve, SkillTree tree) {
        SkillTree.Status s = tree.status(node, level(curve), curve.pointsAt(level(curve)), unlocked);
        if (s == SkillTree.Status.AVAILABLE) unlocked.add(node.id());
        return s;
    }

    /** Rend tous les points (les nœuds sont oubliés, l'XP est conservée). */
    public void resetTree(long now) {
        unlocked.clear();
        lastReset = now;
    }
}
