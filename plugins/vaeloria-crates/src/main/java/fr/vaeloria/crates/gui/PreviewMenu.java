package fr.vaeloria.crates.gui;

import fr.vaeloria.crates.VaeloriaCratesPlugin;
import fr.vaeloria.crates.model.Crate;
import fr.vaeloria.crates.model.Reward;
import fr.vaeloria.crates.model.Weighted;
import fr.vaeloria.crates.util.Items;
import org.bukkit.Material;
import org.bukkit.entity.Player;

import java.util.List;

/** Aperçu joueur : les lots actifs et leurs chances. Lecture seule. */
public final class PreviewMenu extends Menu {
    private final Crate crate;
    private final Runnable back;
    private int page;

    public PreviewMenu(VaeloriaCratesPlugin plugin, Player viewer, Crate crate, Runnable back) {
        super(viewer, 6, crate.name());
        this.crate = crate;
        this.back = back;
    }

    @Override
    protected void render() {
        List<Reward> active = crate.rewards().stream().filter(r -> r.weight() > 0).toList();
        long total = crate.totalWeight();
        int pages = Math.max(1, (active.size() + 44) / 45);
        page = Math.min(page, pages - 1);
        for (int i = 0; i < 45 && page * 45 + i < active.size(); i++) {
            Reward r = active.get(page * 45 + i);
            set(i, Items.withLore(r.item(), List.of("", "&7Chance : &a" + Weighted.percent(r.weight(), total))));
        }
        for (int i = 45; i < 54; i++) set(i, Items.filler());
        if (page > 0) set(48, Items.icon(Material.ARROW, "&fPage précédente"), e -> { page--; redraw(); });
        if (page < pages - 1) set(50, Items.icon(Material.ARROW, "&fPage suivante"), e -> { page++; redraw(); });
        set(49, Items.withLore(crate.key(), List.of("", "&7Clic droit sur le coffre", "&7avec cette clé pour l'ouvrir.")));
        if (back != null) set(45, Items.icon(Material.ARROW, "&fRetour"), e -> back.run());
    }
}
