package fr.vaeloria.villageois.model;

import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.SplittableRandom;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Le config.yml livré tient les chiffres annoncés dans ses commentaires et dans docs/VILLAGEOIS.md. */
class ShippedConfigTest {
    private final Map<String, Object> config = load();
    private final BookTable table = table(config);

    @SuppressWarnings("unchecked")
    private static Map<String, Object> load() {
        try (InputStream in = ShippedConfigTest.class.getResourceAsStream("/config.yml")) {
            assertNotNull(in);
            return new Yaml().load(in);
        } catch (java.io.IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @SuppressWarnings("unchecked")
    private static BookTable table(Map<String, Object> config) {
        List<BookOffer> offers = new ArrayList<>();
        ((Map<String, Map<String, Object>>) config.get("books")).forEach((id, b) -> offers.add(new BookOffer(id,
                (String) b.get("enchant"), (int) b.get("level"), (int) b.get("price"), (int) b.get("max-uses"),
                (int) b.get("weight"), (int) b.get("per-boost"), Boolean.TRUE.equals(b.get("announce")))));
        int maxLuck = (int) ((Map<String, Object>) config.get("boost")).get("max-luck");
        return new BookTable(offers, maxLuck);
    }

    private BookOffer offer(String id) {
        return table.offers().stream().filter(o -> o.id().equals(id)).findFirst().orElseThrow();
    }

    @Test
    void protectionIVRareSansBoostAccessibleAvec() {
        BookOffer p4 = offer("protection-4");
        assertTrue(table.chance(p4, 0) < 0.01, "sans boost : moins de 1 %");
        assertTrue(table.chance(p4, table.maxLuck()) > 0.10, "chance maximale : plus de 10 %");
        assertEquals(56, p4.price());
    }

    @Test
    void tousLesPrixTiennentDansUneCase() {
        for (BookOffer o : table.offers()) assertTrue(o.price() <= 64, o.id() + " : plus de 64 émeraudes");
    }

    /** Boosts à 6 émeraudes, un livre relancé par boost : ~12 boosts (~70 émeraudes) pour viser un Protection IV. */
    @Test
    @SuppressWarnings("unchecked")
    void coutMoyenDUnProtectionIV() {
        Map<String, Object> boost = (Map<String, Object>) config.get("boost");
        BoostCost cost = new BoostCost((int) boost.get("cost-base"), (int) boost.get("cost-step"), (int) boost.get("cost-max"));
        BookOffer p4 = offer("protection-4");
        SplittableRandom rnd = new SplittableRandom(7);
        int runs = 20_000;
        long totalBoosts = 0, totalCost = 0;
        for (int run = 0; run < runs; run++) {
            int boosts = 0;
            BookOffer drawn;
            do {
                totalCost += cost.forBoost(boosts);
                boosts++;
                drawn = table.pick(boosts, rnd);
            } while (drawn != p4);
            totalBoosts += boosts;
        }
        double avgBoosts = totalBoosts / (double) runs, avgCost = totalCost / (double) runs;
        assertTrue(avgBoosts > 10 && avgBoosts < 14, "boosts moyens : " + avgBoosts);
        assertTrue(avgCost > 60 && avgCost < 80, "émeraudes moyennes : " + avgCost);
    }

    @Test
    @SuppressWarnings("unchecked")
    void changeSansAllerRetourRentable() {
        Map<String, Object> ex = (Map<String, Object>) config.get("exchange");
        assertTrue(((Number) ex.get("sell-price")).doubleValue() < ((Number) ex.get("buy-price")).doubleValue());
    }
}
