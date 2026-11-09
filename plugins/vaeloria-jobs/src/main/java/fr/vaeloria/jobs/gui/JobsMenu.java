package fr.vaeloria.jobs.gui;

import fr.vaeloria.jobs.Jobs;
import fr.vaeloria.jobs.Settings;
import fr.vaeloria.jobs.Text;
import fr.vaeloria.jobs.model.Effect;
import fr.vaeloria.jobs.model.JobProgress;
import fr.vaeloria.jobs.model.LevelCurve;
import fr.vaeloria.jobs.model.PlayerJobs;
import fr.vaeloria.jobs.model.SkillNode;
import org.bukkit.Material;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** /metiers : les métiers, leur niveau, et le total des protections actives. */
public final class JobsMenu extends Menu {
    private static final int[] FOUR = {10, 12, 14, 16};
    private final Jobs jobs;

    public JobsMenu(Jobs jobs, Player viewer) {
        super(viewer, 3, "<ruby>◆</ruby> <graphite>Métiers</graphite>");
        this.jobs = jobs;
    }

    @Override
    protected void render() {
        Settings s = jobs.settings();
        LevelCurve curve = s.curve();
        PlayerJobs data = jobs.data(viewer);
        List<Settings.Job> list = new ArrayList<>(s.jobs().values());
        for (int i = 0; i < list.size() && i < 9; i++) {
            Settings.Job job = list.get(i);
            int slot = list.size() <= 4 ? FOUR[i] + (4 - list.size()) : 9 + i;
            JobProgress p = data.get(job.id());
            int level = p.level(curve);
            int free = p.freePoints(curve, job.tree());
            List<String> lore = new ArrayList<>();
            for (String d : job.description()) lore.add("<steel>" + Text.esc(d));
            lore.add("");
            lore.add("<steel>Niveau <snow>" + level + "</snow><ash>/" + curve.maxLevel());
            if (level < curve.maxLevel()) {
                lore.add(Text.bar(curve.progress(p.xp()), 20) + " <ash>" + Math.round(curve.progress(p.xp()) * 100) + " %");
                lore.add("<ash>Encore " + Text.number(Math.ceil(curve.xpToNext(p.xp()))) + " XP");
            } else {
                lore.add("<gold>Niveau maximum atteint");
            }
            lore.add("");
            lore.add("<steel>Arbre : <snow>" + Text.esc(job.treeName()) + "</snow> <ash>(" + p.unlocked().size() + "/" + job.tree().nodes().size() + ")");
            lore.add(free > 0 ? "<gain>" + free + " point(s) à dépenser !" : "<ash>Aucun point libre");
            lore.add("");
            lore.add("<gold>Clic</gold> <steel>: ouvrir l'arbre");
            set(slot, icon(job.icon(), "<gold><b>" + Text.esc(job.name()) + "</b></gold> <ash>niv. " + level, lore, free > 0),
                    e -> new TreeMenu(jobs, viewer, job).open());
        }
        set(22, summary(s, data));
        fill(0, 27, pane(Material.BLACK_STAINED_GLASS_PANE));
    }

    /** Somme de tous les bonus débloqués, tous métiers confondus. */
    private org.bukkit.inventory.ItemStack summary(Settings s, PlayerJobs data) {
        Map<String, Effect> total = new LinkedHashMap<>();
        for (Settings.Job job : s.jobs().values()) {
            JobProgress p = data.all().get(job.id());
            if (p == null) continue;
            for (String id : p.unlocked()) {
                SkillNode n = job.tree().node(id);
                if (n == null) continue;
                for (Effect e : n.effects()) {
                    String k = e.kind() + ":" + e.key() + ":" + e.operation();
                    total.merge(k, e, (a, b) -> a.kind() == Effect.Kind.POTION
                            ? (a.amount() >= b.amount() ? a : b)
                            : new Effect(a.kind(), a.key(), a.amount() + b.amount(), a.operation()));
                }
            }
        }
        List<String> lore = new ArrayList<>();
        if (total.isEmpty()) {
            lore.add("<ash>Aucune protection débloquée.");
            lore.add("<ash>Montez un métier puis dépensez");
            lore.add("<ash>vos points dans son arbre.");
        } else {
            for (Effect e : total.values()) lore.add("<gain>" + Text.esc(e.describe()));
        }
        if (!s.effectWorlds().isEmpty() && !s.effectsApplyIn(viewer.getWorld().getName())) {
            lore.add("");
            lore.add("<loss>Inactives dans ce monde.");
        }
        lore.add("");
        lore.add("<ash>Bonus 100 % vanilla : attributs et effets");
        lore.add("<ash>de Minecraft, rien d'inventé.");
        return icon(Material.NETHERITE_CHESTPLATE, "<ruby_hi><b>Vos protections</b>", lore, !total.isEmpty());
    }
}
