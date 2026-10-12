package fr.vaeloria.villageois.model;

import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.SplittableRandom;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Le config.yml livré tient les chiffres annoncés dans ses commentaires et dans docs/VILLAGEOIS.md. */
@SuppressWarnings("unchecked")
class ShippedConfigTest {
    private final Map<String, Object> config = load();
    private final BookTable table = table(config);

    private static Map<String, Object> load() {
        try (InputStream in = ShippedConfigTest.class.getResourceAsStream("/config.yml")) {
            assertNotNull(in);
            return new Yaml().load(in);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Même lecture que Settings, sans Bukkit. */
    private static BookTable table(Map<String, Object> config) {
        List<Tier> tiers = new ArrayList<>();
        ((Map<String, Map<String, Object>>) config.get("tiers")).forEach((name, t) -> {
            List<BookOffer> books = new ArrayList<>();
            ((Map<String, Object>) t.get("books")).forEach((id, v) -> {
                BookOffer.Key key = BookOffer.Key.parse(id);
                int price = v instanceof Map<?, ?> m ? (int) m.get("price") : (int) v;
                int weight = v instanceof Map<?, ?> m && m.get("weight") != null ? (int) m.get("weight") : 1;
                books.add(new BookOffer(id, key.enchant(), key.level(), price, (int) t.get("max-uses"), weight, name,
                        Boolean.TRUE.equals(t.get("announce"))));
            });
            tiers.add(new Tier(name, (int) t.get("weight"), (int) t.get("per-boost"), books));
        });
        return new BookTable(tiers, (int) ((Map<String, Object>) config.get("boost")).get("max-luck"));
    }

    private BookOffer offer(String id) {
        return table.offers().stream().filter(o -> o.id().equals(id)).findFirst().orElseThrow();
    }

    private Tier tier(String name) {
        return table.tiers().stream().filter(t -> t.name().equals(name)).findFirst().orElseThrow();
    }

    @Test
    void beaucoupDeLivresDifferents() {
        assertTrue(table.offers().size() >= 70, "livres : " + table.offers().size());
        assertTrue(tier("courant").books().size() >= 40);
    }

    @Test
    void grandsLivresDifficiles() {
        for (String id : List.of("protection-4", "unbreaking-3", "fortune-3")) {
            BookOffer o = offer(id);
            assertEquals("rare", o.tier(), id);
            assertTrue(table.chance(o, 0) < 0.003, id + " sans boost : " + table.chance(o, 0));
            double max = table.chance(o, table.maxLuck());
            assertTrue(max > 0.015 && max < 0.03, id + " à chance maximale : " + max);
        }
        assertEquals(0.015, table.chance(tier("rare"), 0), 1e-9);
        assertEquals(0.175, table.chance(tier("rare"), table.maxLuck()), 0.001);
    }

    @Test
    void tousLesPrixTiennentDansUneCase() {
        for (BookOffer o : table.offers()) assertTrue(o.price() <= 64, o.id() + " : plus de 64 émeraudes");
    }

    /** Livres tirés gratuitement au lutrin (chance 0) avant un Protection IV : ~530 en moyenne ; un rare : ~68. */
    @Test
    void relancesAuLutrin() {
        SplittableRandom rnd = new SplittableRandom(3);
        BookOffer p4 = offer("protection-4");
        Tier rare = tier("rare");
        int runs = 20_000;
        long toP4 = 0, toRare = 0;
        for (int run = 0; run < runs; run++) {
            int n = 0;
            while (table.pick(0, rnd) != p4) n++;
            toP4 += n + 1;
            n = 0;
            while (!rare.books().contains(table.pick(0, rnd))) n++;
            toRare += n + 1;
        }
        assertEquals(530, toP4 / (double) runs, 25);
        assertEquals(67, toRare / (double) runs, 4);
    }

    /** Boosts pour viser un Protection IV : ~15 avec 4 livres relancés par boost, ~27 avec 2, ~49 avec 1. */
    @Test
    void boostsPourUnProtectionIV() {
        assertEquals(15.5, boostsToGet(offer("protection-4"), 4), 1.5);
        assertEquals(27, boostsToGet(offer("protection-4"), 2), 2);
        assertEquals(49, boostsToGet(offer("protection-4"), 1), 3);
    }

    private double boostsToGet(BookOffer target, int booksPerBoost) {
        SplittableRandom rnd = new SplittableRandom(7);
        int runs = 10_000;
        long total = 0;
        for (int run = 0; run < runs; run++) {
            int boosts = 0;
            boolean got = false;
            while (!got) {
                boosts++;
                for (int i = 0; i < booksPerBoost; i++) got |= table.pick(boosts, rnd) == target;
            }
            total += boosts;
        }
        return total / (double) runs;
    }

    @Test
    void usureUneQuinzaine() {
        Map<String, Object> w = (Map<String, Object>) config.get("wear");
        assertEquals(15.0, new Wear(true, (int) w.get("books-min"), (int) w.get("books-max")).average(), 1e-9);
    }

    @Test
    void changeSansAllerRetourRentable() {
        Map<String, Object> ex = (Map<String, Object>) config.get("exchange");
        assertTrue(((Number) ex.get("sell-price")).doubleValue() < ((Number) ex.get("buy-price")).doubleValue());
    }
}
