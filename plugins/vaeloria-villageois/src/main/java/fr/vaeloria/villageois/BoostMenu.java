package fr.vaeloria.villageois;

import fr.vaeloria.villageois.model.BookOffer;
import org.bukkit.Material;
import org.bukkit.Sound;
import org.bukkit.entity.Player;
import org.bukkit.entity.Villager;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.Merchant;
import org.bukkit.inventory.MerchantRecipe;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;

/** Les livres du bibliothécaire, le bouton de boost et ses chances. */
final class BoostMenu extends Menu {
    private static final int[] BOOK_SLOTS = {10, 11, 12, 13, 14, 15, 16};
    private final Villager villager;
    private final Boosts boosts;
    private final Supplier<Settings> settings;

    BoostMenu(Player viewer, Villager villager, Boosts boosts, Supplier<Settings> settings) {
        super(viewer, 3, "<ruby>Bibliothécaire <graphite>·</graphite> Boost");
        this.villager = villager;
        this.boosts = boosts;
        this.settings = settings;
    }

    @Override
    protected void render() {
        Settings s = settings.get();
        int paid = boosts.paid(villager), luck = boosts.luck(villager);
        set(4, icon(Material.LECTERN, "<gold>Chance de ce villageois : " + luck + " / " + s.table().maxLuck(),
                "<silver>Boosts payés : <snow>" + paid,
                "<ash>Chaque boost relance les livres jamais achetés",
                "<ash>et rend les livres rares plus fréquents.",
                "<ash>Perdue s'il change de métier ou est capturé."), null);

        List<MerchantRecipe> recipes = villager.getRecipes();
        List<Integer> rerollable = Boosts.rerollable(recipes);
        int slot = 0;
        for (int i = 0; i < recipes.size() && slot < BOOK_SLOTS.length; i++) {
            MerchantRecipe r = recipes.get(i);
            if (!Books.isBookTrade(r)) continue;
            List<String> lore = new ArrayList<>();
            lore.add("<silver>Prix : " + price(r));
            lore.add("<silver>Ventes : <snow>" + r.getUses() + " / " + r.getMaxUses());
            lore.add(rerollable.contains(i) ? "<steel>Relancé au prochain boost." : "<gold>Verrouillé : déjà acheté, jamais relancé.");
            set(BOOK_SLOTS[slot++], icon(r.getResult(), "<snow>" + Books.name(r.getResult()), lore), null);
        }
        if (slot == 0) {
            set(13, icon(Material.BOOK, "<ash>Aucun livre en vente",
                    s.addBookIfNone() && !villager.getPersistentDataContainer().has(boosts.keys().bookAdded)
                            ? "<silver>Un boost lui fera proposer un livre." : "<silver>Il en proposera en montant de niveau."), null);
        }

        int cost = boosts.nextCost(villager);
        int nextLuck = s.table().luck(paid + 1);
        int have = Books.emeralds(viewer);
        List<String> lore = new ArrayList<>();
        lore.add("<silver>Coût : " + Text.emeralds(cost) + " <ash>(tu en as " + have + ")");
        lore.add("<silver>Chance après ce boost : <gold>" + nextLuck + " / " + s.table().maxLuck());
        lore.add("");
        lore.add("<steel>Livres rares, chance par livre relancé :");
        for (BookOffer o : s.table().rarest(paid + 1, 5)) {
            lore.add("<ash>· <snow>" + Books.name(o) + "</snow> <gain>" + Text.percent(s.table().chance(o, paid + 1)) + "</gain> <ash>— " + o.price() + " ém.");
        }
        set(22, icon(have >= cost ? Material.EMERALD_BLOCK : Material.COAL_BLOCK,
                (have >= cost ? "<emerald>" : "<loss>") + "Booster pour " + cost + " émeraude" + (cost > 1 ? "s" : ""), lore.toArray(String[]::new)), e -> boost());

        set(20, icon(Material.EMERALD, "<emerald>Acheter un livre", "<silver>Ouvre les échanges du villageois."), e -> trade());
        set(24, icon(Material.KNOWLEDGE_BOOK, "<gold>Toutes les chances", "<silver>Table complète dans le chat."), e -> {
            viewer.closeInventory();
            viewer.performCommand("villageois chances " + paid);
        });
    }

    private boolean stillThere() {
        if (villager.isValid() && villager.getWorld().equals(viewer.getWorld())
                && villager.getLocation().distanceSquared(viewer.getLocation()) <= 64
                && villager.getProfession() == Villager.Profession.LIBRARIAN) return true;
        viewer.closeInventory();
        viewer.sendMessage(Text.prefixed("<loss>Le bibliothécaire n'est plus là.</loss>"));
        return false;
    }

    private void boost() {
        if (!stillThere()) return;
        Boosts.Result r = boosts.boost(viewer, villager);
        switch (r.outcome()) {
            case DONE -> {
                List<String> names = r.drawn().stream().map(o -> "<gold>" + Books.name(o) + "</gold>").toList();
                viewer.sendMessage(Text.prefixed("<silver>Boost payé " + Text.emeralds(r.cost()) + " : " + String.join("<ash>, </ash>", names) + "</silver>"));
            }
            case NOT_ENOUGH -> {
                viewer.playSound(viewer.getLocation(), Sound.ENTITY_VILLAGER_NO, 1f, 1f);
                viewer.sendMessage(Text.prefixed("<loss>Il te faut " + r.cost() + " émeraudes.</loss> <ash>/emeraudes pour en acheter.</ash>"));
            }
            case NOTHING_TO_REROLL -> viewer.sendMessage(Text.prefixed("<loss>Tous ses livres ont déjà été achetés : plus rien à relancer.</loss> <ash>Monte-le de niveau ou capture-le pour repartir de zéro.</ash>"));
            case BUSY -> viewer.sendMessage(Text.prefixed("<loss>Quelqu'un commerce déjà avec ce villageois.</loss>"));
            case NOT_LIBRARIAN -> viewer.sendMessage(Text.prefixed("<loss>Ce villageois n'est plus bibliothécaire.</loss>"));
        }
        redraw();
    }

    private void trade() {
        if (!stillThere()) return;
        if (villager.isTrading()) {
            viewer.sendMessage(Text.prefixed("<loss>Quelqu'un commerce déjà avec ce villageois.</loss>"));
            return;
        }
        viewer.closeInventory();
        viewer.openMerchant((Merchant) villager, false);
    }

    /** « 56 émeraudes + livre » à partir des ingrédients réels (échange vanilla compris). */
    private static String price(MerchantRecipe r) {
        List<String> parts = new ArrayList<>();
        for (ItemStack it : r.getIngredients()) {
            if (it == null || it.getType().isAir()) continue;
            parts.add(switch (it.getType()) {
                case EMERALD -> Text.emeralds(it.getAmount());
                case EMERALD_BLOCK -> "<emerald>" + it.getAmount() + " bloc" + (it.getAmount() > 1 ? "s" : "") + " d'émeraude</emerald>";
                default -> "<snow>" + (it.getAmount() > 1 ? it.getAmount() + " × " : "") + "<lang:" + it.getType().translationKey() + "></snow>";
            });
        }
        return String.join(" <ash>+</ash> ", parts);
    }
}
