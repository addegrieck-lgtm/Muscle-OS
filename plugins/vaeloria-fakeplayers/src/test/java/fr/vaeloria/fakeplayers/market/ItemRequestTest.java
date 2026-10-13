package fr.vaeloria.fakeplayers.market;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.*;

class ItemRequestTest {

    @Test
    void armorWithEnchantDefaultsToDiamond() {
        ItemRequest r = ItemRequest.parse("je cherche casque protection IV");
        assertNotNull(r);
        assertEquals("DIAMOND_HELMET", r.material());
        assertEquals(1, r.amount());
        assertEquals(Map.of("protection", 4), r.enchants());
    }

    @Test
    void shortcutsAndTiers() {
        ItemRequest r = ItemRequest.parse("qqn vend une épée en fer sharp 3 ?");
        assertEquals("IRON_SWORD", r.material());
        assertEquals(Map.of("sharpness", 3), r.enchants());
        r = ItemRequest.parse("wtb plastron diam p4 solidité 3");
        assertEquals("DIAMOND_CHESTPLATE", r.material());
        assertEquals(Map.of("protection", 4, "unbreaking", 3), r.enchants());
        r = ItemRequest.parse("Quelqu'un a des bottes chute amortie ?");
        assertEquals("DIAMOND_BOOTS", r.material());
        assertEquals(Map.of("feather_falling", 4), r.enchants());
    }

    @Test
    void quantities() {
        assertEquals(16, ItemRequest.parse("qui vend 16 perles").amount());
        assertEquals(64, ItemRequest.parse("je cherche un stack d'obsi").amount());
        assertEquals(32, ItemRequest.parse("j'achète x32 pommes d'or").amount());
        ItemRequest def = ItemRequest.parse("qqn a des perles ?");
        assertEquals("ENDER_PEARL", def.material());
        assertEquals(16, def.amount());
    }

    @Test
    void books() {
        ItemRequest r = ItemRequest.parse("je cherche un livre raccommodage");
        assertEquals("ENCHANTED_BOOK", r.material());
        assertEquals(Map.of("mending", 1), r.enchants());
        assertNull(ItemRequest.parse("je cherche un livre"));
    }

    @Test
    void ignoresSellersAndIncoherentRequests() {
        assertNull(ItemRequest.parse("je vends casque p4"));
        assertNull(ItemRequest.parse("casque p4 dispo"));          // pas une demande
        assertNull(ItemRequest.parse("je cherche un arc tranchant 5")); // enchantement impossible
        assertNull(ItemRequest.parse("je cherche une faction"));
        assertNull(ItemRequest.parse("qui a tué le dragon"));
    }

    @Test
    void labelsAreReadable() {
        assertEquals("casque diam prot 4", ItemRequest.parse("je cherche casque protection IV").label());
        assertEquals("16 perles", ItemRequest.parse("qui vend 16 perles").label());
    }

    @Test
    void humanPrices() {
        assertEquals(4850, Prices.human(4870));
        assertEquals(23000, Prices.human(23140));
        assertEquals(870, Prices.human(868));
        Random r = new Random(1);
        for (int i = 0; i < 200; i++) {
            String s = Prices.say(5800, r);
            assertTrue(s.matches("5,8k|5\\.8k|5k8|5800"), s);
        }
        assertTrue(Prices.say(12000, r).matches("12k|12000"));
    }
}
