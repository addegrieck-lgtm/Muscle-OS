package fr.vaeloria.villageois;

import org.bukkit.Material;
import org.bukkit.Sound;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;

import java.util.function.Supplier;

/** Change émeraudes ↔ argent (Vault). Rachat bien plus bas que la vente : aucun aller-retour rentable. */
final class ExchangeMenu extends Menu {
    private final Bank bank;
    private final Supplier<Settings> settings;

    ExchangeMenu(Player viewer, Bank bank, Supplier<Settings> settings) {
        super(viewer, 3, "<ruby>Change <graphite>·</graphite> Émeraudes");
        this.bank = bank;
        this.settings = settings;
    }

    @Override
    protected void render() {
        Settings s = settings.get();
        int have = Books.emeralds(viewer);
        int[] amounts = {1, 16, 64};
        for (int i = 0; i < amounts.length; i++) {
            int n = amounts[i];
            set(10 + i, icon(new ItemStack(Material.EMERALD, n), "<gain>Acheter " + Text.emeralds(n),
                    java.util.List.of("<silver>Prix : <snow>" + Text.esc(bank.format(n * s.buyPrice())))), e -> buy(n));
        }
        set(13, icon(Material.GOLD_INGOT, "<gold>Cours de l'émeraude",
                "<silver>Achat : <snow>" + Text.esc(bank.format(s.buyPrice())),
                "<silver>Revente : <snow>" + Text.esc(bank.format(s.sellPrice())),
                "<ash>Tu as " + have + " émeraude" + (have > 1 ? "s" : "") + "."), null);
        for (int i = 0; i < 2; i++) {
            int n = i == 0 ? 1 : 16;
            set(14 + i, icon(new ItemStack(Material.EMERALD, n), "<loss>Revendre " + Text.emeralds(n),
                    java.util.List.of("<silver>Gain : <snow>" + Text.esc(bank.format(n * s.sellPrice())))), e -> sell(n));
        }
        set(16, icon(Material.EMERALD_BLOCK, "<loss>Tout revendre <ash>(" + have + ")",
                "<silver>Gain : <snow>" + Text.esc(bank.format(have * s.sellPrice()))), e -> sell(Books.emeralds(viewer)));
    }

    private void buy(int n) {
        double cost = n * settings.get().buyPrice();
        if (!bank.has(viewer, cost) || !bank.withdraw(viewer, cost)) {
            viewer.playSound(viewer.getLocation(), Sound.ENTITY_VILLAGER_NO, 1f, 1f);
            viewer.sendMessage(Text.prefixed("<loss>Il te faut " + Text.esc(bank.format(cost)) + ".</loss>"));
            return;
        }
        Books.give(viewer, new ItemStack(Material.EMERALD, n));
        viewer.playSound(viewer.getLocation(), Sound.ENTITY_EXPERIENCE_ORB_PICKUP, 1f, 1.2f);
        redraw();
    }

    private void sell(int n) {
        if (n <= 0 || !Books.takeEmeralds(viewer, n)) {
            viewer.sendMessage(Text.prefixed("<loss>Pas assez d'émeraudes.</loss>"));
            return;
        }
        if (!bank.deposit(viewer, n * settings.get().sellPrice())) {
            Books.give(viewer, new ItemStack(Material.EMERALD, n));
            viewer.sendMessage(Text.prefixed("<loss>Le versement a échoué : émeraudes rendues.</loss>"));
            return;
        }
        viewer.playSound(viewer.getLocation(), Sound.ENTITY_EXPERIENCE_ORB_PICKUP, 1f, 0.8f);
        redraw();
    }
}
