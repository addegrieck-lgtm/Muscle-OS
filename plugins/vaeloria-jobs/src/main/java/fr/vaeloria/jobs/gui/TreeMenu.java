package fr.vaeloria.jobs.gui;

import fr.vaeloria.jobs.Jobs;
import fr.vaeloria.jobs.Settings;
import fr.vaeloria.jobs.Text;
import fr.vaeloria.jobs.model.Effect;
import fr.vaeloria.jobs.model.JobProgress;
import fr.vaeloria.jobs.model.LevelCurve;
import fr.vaeloria.jobs.model.SkillNode;
import fr.vaeloria.jobs.model.SkillTree;
import org.bukkit.Material;
import org.bukkit.Sound;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;

/**
 * Arbre de protection d'un métier : les 5 premières lignes portent les nœuds (positions de config.yml)
 * et les branches qui les relient ; la dernière ligne, le retour, l'état du métier et la réinitialisation.
 */
public final class TreeMenu extends Menu {
    private final Jobs jobs;
    private final Settings.Job job;
    private boolean confirmReset;

    public TreeMenu(Jobs jobs, Player viewer, Settings.Job job) {
        super(viewer, 6, "<ruby>◆</ruby> <graphite>" + Text.esc(job.name()) + " — " + Text.esc(job.treeName()) + "</graphite>");
        this.jobs = jobs;
        this.job = job;
    }

    @Override
    protected void render() {
        LevelCurve curve = jobs.settings().curve();
        JobProgress p = jobs.data(viewer).get(job.id());
        int level = p.level(curve);
        int points = curve.pointsAt(level);
        int free = p.freePoints(curve, job.tree());
        SkillTree tree = job.tree();

        // Branches d'abord, nœuds ensuite.
        for (SkillNode n : tree.nodes().values()) {
            SkillTree.Status st = tree.status(n, level, points, p.unlocked());
            Material link = switch (st) {
                case UNLOCKED -> Material.LIME_STAINED_GLASS_PANE;
                case AVAILABLE -> Material.YELLOW_STAINED_GLASS_PANE;
                default -> Material.GRAY_STAINED_GLASS_PANE;
            };
            for (int slot : n.links()) set(slot, pane(link));
        }
        for (SkillNode n : tree.nodes().values()) {
            SkillTree.Status st = tree.status(n, level, points, p.unlocked());
            set(n.slot(), node(n, st, level, free), e -> click(n));
        }
        fill(0, 45, pane(Material.BLACK_STAINED_GLASS_PANE));

        set(45, icon(Material.ARROW, "<snow>Retour", "<ash>Tous les métiers"), e -> new JobsMenu(jobs, viewer).open());
        List<String> info = new ArrayList<>();
        info.add("<steel>Niveau <snow>" + level + "</snow><ash>/" + curve.maxLevel());
        if (level < curve.maxLevel()) {
            info.add(Text.bar(curve.progress(p.xp()), 20) + " <ash>" + Math.round(curve.progress(p.xp()) * 100) + " %");
            info.add("<ash>Encore " + Text.number(Math.ceil(curve.xpToNext(p.xp()))) + " XP");
        }
        info.add("");
        info.add("<steel>Points libres : " + (free > 0 ? "<gain>" : "<snow>") + free);
        info.add("<steel>Dépensés : <snow>" + tree.spent(p.unlocked()) + "</snow><ash>/" + tree.totalCost());
        info.add("");
        info.add("<ash>" + curve.pointsPerLevel() + " point(s) par niveau de métier.");
        set(49, icon(job.icon(), "<gold><b>" + Text.esc(job.name()) + "</b>", info, free > 0));
        set(53, resetButton(p), e -> reset());
        fill(45, 54, pane(Material.GRAY_STAINED_GLASS_PANE));
    }

    private org.bukkit.inventory.ItemStack node(SkillNode n, SkillTree.Status st, int level, int free) {
        Material icon = Material.matchMaterial(n.icon());
        if (icon == null) icon = Material.BOOK;
        List<String> lore = new ArrayList<>();
        for (String d : n.description()) lore.add("<steel>" + Text.esc(d));
        if (!n.description().isEmpty()) lore.add("");
        for (Effect e : n.effects()) lore.add("<gain>" + Text.esc(e.describe()));
        lore.add("");
        lore.add((level >= n.level() ? "<gain>✔" : "<loss>✘") + " <steel>Niveau " + n.level());
        lore.add((st == SkillTree.Status.UNLOCKED || free >= n.cost() ? "<gain>✔" : "<loss>✘") + " <steel>Coût : " + n.cost() + " point(s)");
        for (String r : n.requires()) {
            SkillNode parent = job.tree().node(r);
            boolean ok = jobs.data(viewer).get(job.id()).unlocked().contains(r);
            lore.add((ok ? "<gain>✔" : "<loss>✘") + " <steel>Requiert : " + Text.esc(parent == null ? r : parent.name()));
        }
        lore.add("");
        String name;
        switch (st) {
            case UNLOCKED -> {
                name = "<gain><b>" + Text.esc(n.name()) + "</b>";
                lore.add("<gain>Débloqué");
            }
            case AVAILABLE -> {
                name = "<gold><b>" + Text.esc(n.name()) + "</b>";
                lore.add("<gold>Clic</gold> <steel>: débloquer");
            }
            default -> {
                name = "<ash>" + Text.esc(n.name());
                lore.add("<loss>Verrouillé");
            }
        }
        return icon(icon, name, lore, st == SkillTree.Status.UNLOCKED);
    }

    private void click(SkillNode n) {
        SkillTree.Status st = jobs.unlock(viewer, job, n);
        String msg = switch (st) {
            case AVAILABLE, UNLOCKED -> null;
            case LEVEL_TOO_LOW -> "Niveau " + n.level() + " requis en " + Text.esc(job.name()) + ".";
            case MISSING_REQUIREMENT -> "Débloquez d'abord les nœuds précédents.";
            case NOT_ENOUGH_POINTS -> "Pas assez de points (" + n.cost() + " requis).";
        };
        if (msg != null) {
            viewer.playSound(viewer.getLocation(), Sound.ENTITY_VILLAGER_NO, 0.6f, 1f);
            viewer.sendMessage(Text.prefixed("<loss>" + msg));
        }
        confirmReset = false;
        redraw();
    }

    private org.bukkit.inventory.ItemStack resetButton(JobProgress p) {
        long wait = jobs.resetWait(viewer, job);
        if (p.unlocked().isEmpty()) {
            return icon(Material.BARRIER, "<ash>Réinitialiser l'arbre", "<ash>Aucun point dépensé.");
        }
        if (wait > 0) {
            return icon(Material.BARRIER, "<ash>Réinitialiser l'arbre", "<steel>Possible dans <snow>" + Text.hours(wait));
        }
        if (confirmReset) {
            return icon(Material.TNT, "<loss><b>Confirmer la réinitialisation</b>",
                    "<steel>Tous les points de cet arbre", "<steel>vous seront rendus. L'XP est conservée.",
                    "", "<loss>Clic</loss> <steel>: confirmer");
        }
        long hours = jobs.settings().resetCooldownMillis() / 3_600_000L;
        return icon(Material.GRINDSTONE, "<snow>Réinitialiser l'arbre",
                "<steel>Rend tous les points pour", "<steel>les placer autrement.",
                "<ash>Une fois toutes les " + hours + " h.", "", "<gold>Clic</gold> <steel>: réinitialiser");
    }

    private void reset() {
        JobProgress p = jobs.data(viewer).get(job.id());
        if (p.unlocked().isEmpty() || jobs.resetWait(viewer, job) > 0) return;
        if (!confirmReset) {
            confirmReset = true;
            redraw();
            return;
        }
        confirmReset = false;
        if (jobs.resetTree(viewer, job, false)) {
            viewer.playSound(viewer.getLocation(), Sound.BLOCK_GRINDSTONE_USE, 0.7f, 1f);
            viewer.sendMessage(Text.prefixed("<steel>Arbre <snow>" + Text.esc(job.treeName()) + "</snow> réinitialisé : points rendus."));
        }
        redraw();
    }
}
