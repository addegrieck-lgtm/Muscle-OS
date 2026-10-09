package fr.vaeloria.echanges;

import fr.vaeloria.echanges.model.BookOffer;
import fr.vaeloria.echanges.model.BookTable;
import fr.vaeloria.echanges.model.BoostCost;
import fr.vaeloria.echanges.model.Tier;
import org.bukkit.NamespacedKey;
import org.bukkit.Registry;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.logging.Logger;

/** Lecture de config.yml. Une ligne de livre invalide est ignorée avec un avertissement, sans bloquer le plugin. */
public record Settings(
        String prefix,
        boolean replaceVanillaBooks,
        boolean requireBook,
        boolean lockLibrarians,
        BoostCost boostCost,
        int maxLuck,
        Set<Tier> resetOn,
        Map<Tier, Integer> villagerXp,
        BookTable table,
        int eggPrice,
        boolean plainEggs,
        boolean respectProtections,
        int maxForbidden) {

    public static Settings load(FileConfiguration c, Logger log) {
        Map<Tier, Double> factors = new EnumMap<>(Tier.class);
        Map<Tier, Integer> xp = new EnumMap<>(Tier.class);
        for (Tier t : Tier.values()) {
            factors.put(t, c.getDouble("luck-factor." + t.name(), 0));
            xp.put(t, c.getInt("villager-xp." + t.name(), 5));
        }

        Set<Tier> resetOn = EnumSet.noneOf(Tier.class);
        for (String s : c.getStringList("boost.reset-on")) {
            try {
                resetOn.add(Tier.valueOf(s.toUpperCase(Locale.ROOT)));
            } catch (IllegalArgumentException e) {
                log.warning("boost.reset-on : rareté inconnue « " + s + " »");
            }
        }

        List<BookOffer> offers = new ArrayList<>();
        int i = 0;
        for (Map<?, ?> m : c.getMapList("books")) {
            i++;
            try {
                String enchant = String.valueOf(m.get("enchant")).toLowerCase(Locale.ROOT);
                if (Registry.ENCHANTMENT.get(NamespacedKey.minecraft(enchant)) == null) {
                    throw new IllegalArgumentException("enchantement inconnu « " + enchant + " »");
                }
                List<?> price = (List<?>) m.get("price");
                Object uses = m.get("uses");
                offers.add(new BookOffer(
                        enchant,
                        ((Number) m.get("level")).intValue(),
                        Tier.valueOf(String.valueOf(m.get("tier")).toUpperCase(Locale.ROOT)),
                        ((Number) m.get("weight")).intValue(),
                        ((Number) price.get(0)).intValue(),
                        ((Number) price.get(1)).intValue(),
                        uses == null ? 1 : ((Number) uses).intValue()));
            } catch (RuntimeException e) {
                log.warning("books, ligne " + i + " ignorée : " + e.getMessage());
            }
        }
        if (offers.isEmpty()) log.warning("Aucun livre valide dans config.yml : les bibliothécaires ne proposeront plus de livre.");

        ConfigurationSection boost = c.getConfigurationSection("boost");
        BoostCost cost;
        try {
            cost = new BoostCost(c.getInt("boost.cost-base", 2), c.getInt("boost.cost-step", 1), c.getInt("boost.cost-max", 6));
        } catch (IllegalArgumentException e) {
            log.warning("boost : coût invalide, valeurs par défaut utilisées (2, +1, max 6)");
            cost = new BoostCost(2, 1, 6);
        }

        return new Settings(
                c.getString("prefix", "&6[VÆLORIA] &7"),
                c.getBoolean("replace-vanilla-books", true),
                c.getBoolean("require-book", true),
                c.getBoolean("lock-librarians", true),
                cost,
                Math.max(0, boost == null ? 15 : boost.getInt("max-luck", 15)),
                resetOn,
                xp,
                new BookTable(offers, factors),
                Math.max(0, c.getInt("capture.egg-price", 24)),
                c.getBoolean("capture.plain-eggs", false),
                c.getBoolean("capture.respect-protections", true),
                Math.max(1, c.getInt("capture.max-forbidden", 12)));
    }
}
