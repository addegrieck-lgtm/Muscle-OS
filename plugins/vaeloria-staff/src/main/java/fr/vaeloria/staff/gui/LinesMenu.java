package fr.vaeloria.staff.gui;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.util.Items;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.ClickType;

import java.util.List;

/**
 * Éditeur générique d'une liste de lignes (texte d'annonce, de pancarte, dialogues de PNJ, commandes).
 * Clic gauche : modifier · clic droit : supprimer · shift-clic : monter d'un cran.
 */
public final class LinesMenu extends Menu {
    private final VaeloriaStaffPlugin plugin;
    private final List<String> lines;
    private final int max;
    private final String hint;
    private final Runnable onChange;
    private final Runnable back;

    public LinesMenu(VaeloriaStaffPlugin plugin, Player viewer, String title, List<String> lines, int max,
                     String hint, Runnable onChange, Runnable back) {
        super(viewer, 6, title);
        this.plugin = plugin;
        this.lines = lines;
        this.max = Math.min(max, 45);
        this.hint = hint;
        this.onChange = onChange;
        this.back = back;
    }

    @Override
    protected void render() {
        for (int i = 0; i < lines.size() && i < 45; i++) {
            int index = i;
            set(i, Items.icon(Material.PAPER, lines.get(i).isEmpty() ? "&8(ligne vide)" : "&f" + lines.get(i),
                    "&8Ligne " + (i + 1),
                    "",
                    "&eClic gauche &7: modifier",
                    "&eClic droit &7: supprimer",
                    "&eShift-clic &7: monter"), e -> {
                if (e.getClick() == ClickType.RIGHT) {
                    lines.remove(index);
                    onChange.run();
                    redraw();
                } else if (e.isShiftClick()) {
                    if (index > 0) {
                        lines.add(index - 1, lines.remove(index));
                        onChange.run();
                    }
                    redraw();
                } else {
                    ask("Nouveau texte de la ligne " + (index + 1) + " ?", text -> lines.set(index, text));
                }
            });
        }
        for (int i = 45; i < 54; i++) set(i, Items.filler());
        set(45, Items.icon(Material.ARROW, "&fRetour"), e -> back.run());
        set(48, Items.icon(Material.BOOK, "&eAide",
                "&7Couleurs : &f&a &7&b &7&l ...",
                "&7Hexadécimal : &f&#ff8800",
                "&7Variables : &f{player} {online} {max}",
                hint == null ? "" : "&7" + hint));
        if (lines.size() < max) {
            set(49, Items.icon(Material.EMERALD, "&aAjouter une ligne", "&7Tape &f.&7 pour une ligne vide."),
                    e -> ask("Texte de la nouvelle ligne ?", lines::add));
        }
    }

    private void ask(String question, java.util.function.Consumer<String> apply) {
        plugin.prompts().ask(viewer, question, text -> {
            apply.accept(text.equals(".") ? "" : text);
            onChange.run();
            open();
        }, this::open);
    }
}
