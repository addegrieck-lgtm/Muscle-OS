package fr.vaeloria.villageois;

import fr.vaeloria.villageois.model.BookOffer;
import fr.vaeloria.villageois.model.BookTable;
import fr.vaeloria.villageois.model.BoostCost;
import fr.vaeloria.villageois.model.EmeraldPrice;
import fr.vaeloria.villageois.model.Tier;
import fr.vaeloria.villageois.model.Wear;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.enchantments.Enchantment;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

/** Lecture de config.yml. Un livre invalide est ignoré avec un avertissement, sans bloquer le reste. */
record Settings(BookTable table, boolean replaceVanillaBooks, boolean requireBook, double emeraldIncomeMultiplier,
                BoostCost boostCost, boolean addBookIfNone, Wear wear,
                boolean captureEnabled, int eggPrice, boolean refundOnMiss,
                boolean exchangeEnabled, double buyPrice, double sellPrice) {

    static Settings load(FileConfiguration c, Logger log) {
        List<Tier> tiers = new ArrayList<>();
        ConfigurationSection section = c.getConfigurationSection("tiers");
        if (section != null) {
            for (String name : section.getKeys(false)) {
                ConfigurationSection t = section.getConfigurationSection(name);
                if (t == null) continue;
                List<BookOffer> books = books(name, t, log);
                if (books.isEmpty()) {
                    log.warning("Palier « " + name + " » ignoré : aucun livre valide.");
                    continue;
                }
                tiers.add(new Tier(name, t.getInt("weight"), t.getInt("per-boost"), books));
            }
        }
        if (tiers.isEmpty()) throw new IllegalStateException("config.yml : aucun livre valide dans « tiers ».");

        double buy = c.getDouble("exchange.buy-price", 250), sell = c.getDouble("exchange.sell-price", 100);
        if (sell > buy) {
            log.warning("exchange.sell-price (" + sell + ") > buy-price (" + buy + ") : argent infini par aller-retour. Revente ramenée au prix d'achat.");
            sell = buy;
        }
        return new Settings(
                new BookTable(tiers, c.getInt("boost.max-luck", 10)),
                c.getBoolean("trades.replace-vanilla-books", true),
                c.getBoolean("trades.require-book", true),
                Math.max(1, c.getDouble("trades.emerald-income-multiplier", 1.5)),
                new BoostCost(c.getInt("boost.cost-base", 6), c.getInt("boost.cost-step", 0), c.getInt("boost.cost-max", 6)),
                c.getBoolean("boost.add-book-if-none", true),
                new Wear(c.getBoolean("wear.enabled", true), c.getInt("wear.books-min", 12), c.getInt("wear.books-max", 18)),
                c.getBoolean("capture.enabled", true),
                Math.max(0, c.getInt("capture.egg-price-emeralds", 24)),
                c.getBoolean("capture.refund-on-miss", true),
                c.getBoolean("exchange.enabled", true), buy, sell);
    }

    /** « protection-4: 56 » ou « protection-4: { price: 56, weight: 3 } ». */
    private static List<BookOffer> books(String tier, ConfigurationSection t, Logger log) {
        List<BookOffer> books = new ArrayList<>();
        ConfigurationSection section = t.getConfigurationSection("books");
        if (section == null) return books;
        int maxUses = t.getInt("max-uses", 4);
        boolean announce = t.getBoolean("announce");
        for (String id : section.getKeys(false)) {
            try {
                BookOffer.Key key = BookOffer.Key.parse(id);
                Enchantment e = Books.enchantment(key.enchant());
                if (e == null) throw new IllegalArgumentException("enchantement inconnu « " + key.enchant() + " »");
                if (key.level() > e.getMaxLevel()) log.warning("Livre " + id + " : niveau " + key.level() + " au-dessus du maximum vanilla (" + e.getMaxLevel() + ").");
                ConfigurationSection detail = section.getConfigurationSection(id);
                int price = detail != null ? detail.getInt("price") : section.getInt(id);
                int weight = detail != null ? detail.getInt("weight", 1) : 1;
                if (price > EmeraldPrice.MAX) throw new IllegalArgumentException("prix au-dessus de " + EmeraldPrice.MAX);
                books.add(new BookOffer(id, key.enchant(), key.level(), price, maxUses, weight, tier, announce));
            } catch (IllegalArgumentException ex) {
                log.warning("Livre « " + tier + "." + id + " » ignoré : " + ex.getMessage());
            }
        }
        return books;
    }
}
