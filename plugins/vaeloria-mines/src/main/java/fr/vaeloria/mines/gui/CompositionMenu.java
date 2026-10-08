package fr.vaeloria.mines.gui;

import fr.vaeloria.mines.MineManager;
import fr.vaeloria.mines.VaeloriaMinesPlugin;
import fr.vaeloria.mines.model.Composition;
import fr.vaeloria.mines.model.Mine;
import fr.vaeloria.mines.util.Items;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.ClickType;
import org.bukkit.inventory.ItemStack;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Blocs régénérés : l'admin dépose un bloc de son inventaire sur une case vide (ou shift-clic) pour l'ajouter,
 * puis règle son poids. Ex. obsidienne seule = 100 % ; pierre 70 + fer 20 + diamant 10.
 */
public final class CompositionMenu extends Menu {
    private static final int DEFAULT_WEIGHT = 10;

    private final VaeloriaMinesPlugin plugin;
    private final Mine mine;

    public CompositionMenu(VaeloriaMinesPlugin plugin, Player viewer, Mine mine) {
        super(viewer, 6, "&8Blocs — " + mine.id());
        this.plugin = plugin;
        this.mine = mine;
    }

    @Override
    protected void render() {
        Composition comp = mine.composition();
        List<Map.Entry<String, Integer>> entries = new ArrayList<>(comp.weights().entrySet());
        for (int i = 0; i < 45; i++) {
            if (i < entries.size()) {
                String block = entries.get(i).getKey();
                int weight = entries.get(i).getValue();
                Material m = MineManager.block(block);
                set(i, Items.icon(m != null && m.isItem() ? m : Material.BARRIER,
                        "&f" + block.toLowerCase(Locale.ROOT).replace('_', ' '),
                        "&7Proportion : &e" + String.format(Locale.ROOT, "%.1f", comp.percent(block)) + "%",
                        "&7Poids : &f" + weight + " &8/ " + comp.total(),
                        "",
                        "&eClic gauche / droit &7: +1 / -1",
                        "&eShift + clic &7: +10 / -10",
                        "&eQ &7(jeter) : retirer ce bloc"), e -> {
                    if (e.getClick() == ClickType.DROP || e.getClick() == ClickType.CONTROL_DROP) comp.remove(block);
                    else {
                        int step = e.isShiftClick() ? 10 : 1;
                        comp.set(block, Math.max(1, weight + (e.isRightClick() ? -step : step)));
                    }
                    plugin.mines().save();
                    redraw();
                });
            } else {
                set(i, null, e -> add(e.getCursor()));
            }
        }
        for (int i = 45; i < 54; i++) set(i, Items.filler());
        set(45, Items.icon(Material.ARROW, "&fRetour"), e -> new MineEditMenu(plugin, viewer, mine).open());
        set(49, Items.icon(Material.BOOK, "&eAjouter un bloc",
                "&7Prends un bloc de ton inventaire et",
                "&7dépose-le sur une case vide,",
                "&7ou &fshift-clic &7dessus dans ton inventaire.",
                "",
                "&eClic &7: taper son nom (ex. &fobsidian&7)"), e -> askName());
        set(53, Items.icon(Material.LAVA_BUCKET, "&cTout retirer"), e -> new ConfirmMenu(viewer,
                "Retirer tous les blocs de " + mine.name() + " &f?", () -> {
            comp.clear();
            plugin.mines().save();
            open();
        }, this::open).open());
    }

    @Override
    public void onShiftFromInventory(ItemStack item) {
        add(item);
    }

    private void add(ItemStack item) {
        if (Items.isEmpty(item)) return;
        addMaterial(item.getType());
    }

    private void addMaterial(Material material) {
        Material block = material == null ? null : MineManager.block(material.name());
        if (block == null) {
            plugin.msg(viewer, "&cCe n'est pas un bloc posable.");
            return;
        }
        if (mine.composition().weight(block.name()) > 0) {
            plugin.msg(viewer, "&7Ce bloc est déjà dans la mine : règle son poids par clic.");
            return;
        }
        if (mine.composition().weights().size() >= 45) {
            plugin.msg(viewer, "&cMaximum 45 types de blocs.");
            return;
        }
        mine.composition().set(block.name(), DEFAULT_WEIGHT);
        plugin.mines().save();
        redraw();
    }

    private void askName() {
        plugin.prompts().ask(viewer, "Nom du bloc à ajouter ? &8(nom Minecraft, ex. &7obsidian&8, &7deepslate_diamond_ore&8)", input -> {
            Material m = MineManager.block(input.trim().replace(' ', '_'));
            open();
            if (m == null) plugin.msg(viewer, "&cBloc inconnu : " + input);
            else addMaterial(m);
        }, this::open);
    }
}
