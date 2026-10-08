package fr.vaeloria.crates.gui;

import fr.vaeloria.crates.VaeloriaCratesPlugin;
import fr.vaeloria.crates.model.Crate;
import fr.vaeloria.crates.model.Reward;
import fr.vaeloria.crates.model.Weighted;
import fr.vaeloria.crates.util.Items;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;

import java.util.ArrayList;
import java.util.List;

/** Réglages d'un lot : chance, objet, commandes, annonce. */
public final class RewardEditMenu extends Menu {
    private final VaeloriaCratesPlugin plugin;
    private final Crate crate;
    private final Reward reward;
    private final int returnPage;

    public RewardEditMenu(VaeloriaCratesPlugin plugin, Player viewer, Crate crate, Reward reward, int returnPage) {
        super(viewer, 4, "&8Lot de " + crate.id());
        this.plugin = plugin;
        this.crate = crate;
        this.reward = reward;
        this.returnPage = returnPage;
    }

    @Override
    protected void render() {
        long total = crate.totalWeight();
        set(4, Items.withLore(reward.item(), List.of("", "&8―――――――――――――",
                "&eDépose un objet ici &7pour remplacer", "&7l'objet du lot (chance conservée).")), e -> {
            ItemStack cursor = viewer.getItemOnCursor();
            if (Items.isEmpty(cursor)) return;
            reward.item(cursor);
            save();
        });

        set(10, Items.icon(Material.RED_STAINED_GLASS_PANE, "&c-10"), e -> weight(-10));
        set(11, Items.icon(Material.RED_STAINED_GLASS_PANE, "&c-1"), e -> weight(-1));
        set(13, Items.icon(Material.GOLD_NUGGET, "&6Chance : &a" + Weighted.percent(reward.weight(), total),
                "&7Poids : &f" + reward.weight() + " &8/ " + total + " au total",
                "",
                "&7La chance d'un lot = son poids divisé",
                "&7par la somme des poids du coffre.",
                "&7Poids 0 = lot désactivé.",
                "",
                "&eClic &7pour saisir un poids"), e -> askWeight());
        set(15, Items.icon(Material.LIME_STAINED_GLASS_PANE, "&a+1"), e -> weight(1));
        set(16, Items.icon(Material.LIME_STAINED_GLASS_PANE, "&a+10"), e -> weight(10));

        set(19, Items.icon(reward.giveItem() ? Material.CHEST : Material.ITEM_FRAME,
                "&fDonner l'objet : " + (reward.giveItem() ? "&aoui" : "&cnon"),
                "&7Non : l'objet ne sert que d'icône,", "&7seules les commandes s'exécutent", "&7(grade, argent, permissions…)."),
                e -> { reward.giveItem(!reward.giveItem()); save(); });
        set(20, Items.icon(reward.broadcast() ? Material.BELL : Material.STRUCTURE_VOID,
                "&fAnnonce à tout le serveur : " + (reward.broadcast() ? "&aoui" : "&cnon"), "&7Pour les lots rares."),
                e -> { reward.broadcast(!reward.broadcast()); save(); });

        List<String> cmdLore = new ArrayList<>(List.of("&7Exécutées par la console.", "&7Variables : &f{player} {uuid}", ""));
        if (reward.commands().isEmpty()) cmdLore.add("&8Aucune commande");
        for (String c : reward.commands()) cmdLore.add("&8• &f/" + c);
        cmdLore.add("");
        cmdLore.add("&eClic &7ajouter · &eClic droit &7retirer la dernière");
        set(22, Items.icon(Material.COMMAND_BLOCK, "&dCommandes (" + reward.commands().size() + ")", cmdLore.toArray(String[]::new)),
                e -> {
                    if (e.isRightClick()) {
                        if (!reward.commands().isEmpty()) reward.commands().remove(reward.commands().size() - 1);
                        save();
                    } else askCommand();
                });
        set(24, Items.icon(Material.HOPPER, "&fMe donner ce lot", "&7Pour le tester."), e -> plugin.grant(viewer, crate, reward));
        set(25, Items.icon(Material.LAVA_BUCKET, "&cSupprimer ce lot"),
                e -> new ConfirmMenu(viewer, "Supprimer ce lot ?", () -> {
                    crate.rewards().remove(reward);
                    plugin.crates().save();
                    back();
                }, this::open).open());
        set(27, Items.icon(Material.ARROW, "&fRetour aux lots"), e -> back());
        fillEmpty();
    }

    private void weight(int delta) {
        reward.weight(reward.weight() + delta);
        save();
    }

    private void askWeight() {
        plugin.prompts().ask(viewer, "Poids du lot ? &8(nombre entier ≥ 0, actuel " + reward.weight() + ")", input -> {
            try {
                reward.weight(Integer.parseInt(input.trim()));
                plugin.crates().save();
            } catch (NumberFormatException e) {
                plugin.msg(viewer, "&cCe n'est pas un nombre entier.");
            }
            open();
        }, this::open);
    }

    private void askCommand() {
        plugin.prompts().ask(viewer, "Commande à exécuter ? &8(sans /, ex. &7eco give {player} 5000&8)", input -> {
            reward.commands().add(input.startsWith("/") ? input.substring(1) : input);
            plugin.crates().save();
            open();
        }, this::open);
    }

    private void save() {
        plugin.crates().save();
        redraw();
    }

    private void back() {
        new LootEditMenu(plugin, viewer, crate, returnPage).open();
    }
}
