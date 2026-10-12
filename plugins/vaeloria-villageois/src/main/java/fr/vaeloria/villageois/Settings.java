package fr.vaeloria.villageois;

import fr.vaeloria.villageois.model.BookOffer;
import fr.vaeloria.villageois.model.BookTable;
import fr.vaeloria.villageois.model.BoostCost;
import fr.vaeloria.villageois.model.EmeraldPrice;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.enchantments.Enchantment;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

/** Lecture de config.yml. Une entrée de livre invalide est ignorée avec un avertissement, sans bloquer le reste. */
record Settings(BookTable table, boolean replaceVanillaBooks, boolean requireBook, double emeraldIncomeMultiplier,
                BoostCost boostCost, boolean addBookIfNone,
                boolean captureEnabled, int eggPrice, boolean refundOnMiss,
                boolean exchangeEnabled, double buyPrice, double sellPrice) {

    static Settings load(FileConfiguration c, Logger log) {
        List<BookOffer> offers = new ArrayList<>();
        ConfigurationSection books = c.getConfigurationSection("books");
        if (books != null) {
            for (String id : books.getKeys(false)) {
                ConfigurationSection b = books.getConfigurationSection(id);
                if (b == null) continue;
                try {
                    String enchant = b.getString("enchant", "");
                    Enchantment e = Books.enchantment(enchant);
                    if (e == null) throw new IllegalArgumentException("enchantement inconnu « " + enchant + " »");
                    int level = b.getInt("level", 1);
                    if (level > e.getMaxLevel()) log.warning("Livre " + id + " : niveau " + level + " au-dessus du maximum vanilla (" + e.getMaxLevel() + ").");
                    int price = b.getInt("price");
                    if (price > EmeraldPrice.MAX) throw new IllegalArgumentException("prix au-dessus de " + EmeraldPrice.MAX);
                    offers.add(new BookOffer(id, enchant, level, price, b.getInt("max-uses", 4),
                            b.getInt("weight"), b.getInt("per-boost"), b.getBoolean("announce")));
                } catch (IllegalArgumentException ex) {
                    log.warning("Livre « " + id + " » ignoré : " + ex.getMessage());
                }
            }
        }
        if (offers.isEmpty()) throw new IllegalStateException("config.yml : aucun livre valide dans « books ».");

        double buy = c.getDouble("exchange.buy-price", 250), sell = c.getDouble("exchange.sell-price", 100);
        if (sell > buy) {
            log.warning("exchange.sell-price (" + sell + ") > buy-price (" + buy + ") : argent infini par aller-retour. Revente ramenée au prix d'achat.");
            sell = buy;
        }
        return new Settings(
                new BookTable(offers, c.getInt("boost.max-luck", 10)),
                c.getBoolean("trades.replace-vanilla-books", true),
                c.getBoolean("trades.require-book", true),
                Math.max(1, c.getDouble("trades.emerald-income-multiplier", 1.5)),
                new BoostCost(c.getInt("boost.cost-base", 6), c.getInt("boost.cost-step", 0), c.getInt("boost.cost-max", 6)),
                c.getBoolean("boost.add-book-if-none", true),
                c.getBoolean("capture.enabled", true),
                Math.max(0, c.getInt("capture.egg-price-emeralds", 24)),
                c.getBoolean("capture.refund-on-miss", true),
                c.getBoolean("exchange.enabled", true), buy, sell);
    }
}
