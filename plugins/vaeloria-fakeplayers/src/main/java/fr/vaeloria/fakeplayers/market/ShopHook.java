package fr.vaeloria.fakeplayers.market;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.minimessage.tag.resolver.Placeholder;
import net.kyori.adventure.text.minimessage.tag.resolver.TagResolver;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.OfflinePlayer;
import org.bukkit.Registry;
import org.bukkit.Sound;
import org.bukkit.command.CommandSender;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.EnchantmentStorageMeta;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.plugin.Plugin;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Logger;

/**
 * Accès à l'hôtel des ventes de VæloriaShop 1.0.x, par réflexion (le plugin n'a pas d'API pour un autre plugin et
 * n'accepte que de vrais joueurs). Reproduit exactement sa propre logique : mêmes frais, même taxe, même historique,
 * mêmes messages. Si la version installée ne correspond pas, tout est désactivé proprement (available() = false).
 * À n'utiliser que depuis le thread principal, comme VæloriaShop lui-même.
 */
public final class ShopHook {
    /** Vue d'une annonce de l'HDV. */
    public record Offer(int id, UUID seller, String sellerName, ItemStack item, double price, long created, long expires) {
        public double unit() { return price / Math.max(1, item.getAmount()); }
    }

    private final Logger logger;
    private Plugin shop;
    private Object house;
    private Method suggestedUnit, reserved, blacklisted, all, enabled, durationMs, taxRate, key, msg, saveSoon,
            record, economy, round, format, itemName, recentSales, sSeller, sBuyer, sAt;
    private Method lId, lSeller, lSellerName, lItem, lPrice, lCreated, lExpires;
    private Constructor<?> listingCtor, saleCtor;
    private Field listings, nextId, pending, storage;
    private Method deposit;
    private boolean ok;

    public ShopHook(Logger logger) {
        this.logger = logger;
    }

    /** (Re)branche VæloriaShop ; retourne false (et prévient une fois) s'il est absent ou d'une autre version. */
    public boolean connect() {
        ok = false;
        shop = Bukkit.getPluginManager().getPlugin("VaeloriaShop");
        if (shop == null || !shop.isEnabled()) return false;
        try {
            ClassLoader cl = shop.getClass().getClassLoader();
            Class<?> ah = Class.forName("fr.vaeloria.shop.auction.AuctionHouse", true, cl);
            Class<?> listing = Class.forName("fr.vaeloria.shop.auction.Listing", true, cl);
            Class<?> sale = Class.forName("fr.vaeloria.shop.auction.AuctionHouse$Sale", true, cl);
            Class<?> money = Class.forName("fr.vaeloria.shop.util.Money", true, cl);
            house = shop.getClass().getMethod("auctions").invoke(shop);
            suggestedUnit = ah.getMethod("suggestedUnit", ItemStack.class);
            reserved = ah.getMethod("reservedToPlayerShops", ItemStack.class);
            blacklisted = ah.getMethod("blacklisted", ItemStack.class);
            all = ah.getMethod("all");
            enabled = ah.getMethod("enabled");
            durationMs = ah.getMethod("durationMs");
            taxRate = ah.getMethod("taxRate", UUID.class);
            key = ah.getMethod("key", ItemStack.class);
            itemName = ah.getMethod("name", ItemStack.class);
            recentSales = ah.getMethod("recentSales", int.class);
            sSeller = sale.getMethod("seller");
            sBuyer = sale.getMethod("buyer");
            sAt = sale.getMethod("at");
            record = ah.getDeclaredMethod("record", sale);
            record.setAccessible(true);
            listings = field(ah, "listings");
            nextId = field(ah, "nextId");
            pending = field(ah, "pending");
            storage = field(ah, "storage");
            msg = shop.getClass().getMethod("msg", CommandSender.class, String.class, TagResolver[].class);
            saveSoon = shop.getClass().getMethod("saveSoon");
            economy = shop.getClass().getMethod("economy");
            round = money.getMethod("round", double.class);
            format = money.getMethod("format", double.class);
            listingCtor = listing.getConstructor(int.class, UUID.class, String.class, ItemStack.class, double.class,
                    long.class, long.class);
            saleCtor = sale.getConstructor(String.class, ItemStack.class, double.class, String.class, String.class,
                    long.class);
            lId = listing.getMethod("id");
            lSeller = listing.getMethod("seller");
            lSellerName = listing.getMethod("sellerName");
            lItem = listing.getMethod("item");
            lPrice = listing.getMethod("price");
            lCreated = listing.getMethod("created");
            lExpires = listing.getMethod("expires");
            Class<?> eco = Class.forName("net.milkbowl.vault.economy.Economy", true, cl);
            deposit = eco.getMethod("depositPlayer", OfflinePlayer.class, double.class);
            ok = true;
        } catch (ReflectiveOperationException | RuntimeException | LinkageError e) {
            logger.warning("VæloriaShop " + shop.getPluginMeta().getVersion() + " non reconnu (" + e
                    + ") : les faux joueurs n'utiliseront pas l'hôtel des ventes.");
        }
        return ok;
    }

    public boolean available() {
        if (!ok || !shop.isEnabled()) return false;
        try {
            return (boolean) enabled.invoke(house);
        } catch (ReflectiveOperationException e) {
            return false;
        }
    }

    // --- Lecture ---

    /** Prix conseillé par l'HDV pour UNE unité (médiane des ventes, sinon boutique −10 %, sinon rachat +50 %), ou -1. */
    public double suggestedUnit(ItemStack item) {
        try {
            return (double) suggestedUnit.invoke(house, item);
        } catch (ReflectiveOperationException e) {
            return -1;
        }
    }

    /**
     * Valeur cohérente d'un objet entier (quantité comprise), ou -1 si l'HDV n'a aucune référence. Pour un objet
     * enchanté sans historique (casque Protection IV…), on additionne l'objet nu et les livres enchantés du shop,
     * avec une décote : c'est ce qu'un joueur compte en le fabriquant lui-même.
     */
    public double estimate(ItemStack item, double enchantFactor) {
        double unit = suggestedUnit(item);
        if (unit > 0) return unit * item.getAmount();
        Map<Enchantment, Integer> enchants = enchantsOf(item);
        if (enchants.isEmpty()) return -1;
        double total = 0;
        if (item.getType() != Material.ENCHANTED_BOOK) {
            double base = suggestedUnit(new ItemStack(item.getType()));
            if (base <= 0) return -1;
            total = base;
        }
        double books = 0;
        for (Map.Entry<Enchantment, Integer> e : enchants.entrySet()) {
            double book = -1;
            int found = 0;
            for (int level = e.getValue(); level <= e.getKey().getMaxLevel() && book <= 0; level++) {
                book = suggestedUnit(book(e.getKey(), level));
                found = level;
            }
            if (book <= 0) return -1; // enchantement sans prix connu : pas de prix inventé
            books += book * e.getValue() / found;
        }
        if (item.getType() == Material.ENCHANTED_BOOK) return books;
        return (total + books * enchantFactor) * item.getAmount();
    }

    public boolean reservedToPlayerShops(ItemStack item) {
        try {
            return (boolean) reserved.invoke(house, item) || (boolean) blacklisted.invoke(house, item);
        } catch (ReflectiveOperationException e) {
            return true;
        }
    }

    public List<Offer> offers() {
        List<Offer> out = new ArrayList<>();
        try {
            for (Object l : (Collection<?>) all.invoke(house)) out.add(offer(l));
        } catch (ReflectiveOperationException e) {
            logger.fine("HDV illisible : " + e);
        }
        return out;
    }

    public Offer offer(int id) {
        try {
            Object l = listingsMap().get(id);
            return l == null ? null : offer(l);
        } catch (ReflectiveOperationException e) {
            return null;
        }
    }

    /** Acheteur de la dernière vente de ce vendeur depuis {@code since}, ou null. */
    public String lastBuyer(String sellerName, long since) {
        try {
            for (Object sale : (List<?>) recentSales.invoke(house, 50)) {
                if ((long) sAt.invoke(sale) < since) continue;
                if (sellerName.equalsIgnoreCase((String) sSeller.invoke(sale))) return (String) sBuyer.invoke(sale);
            }
        } catch (ReflectiveOperationException e) {
            logger.fine("Historique HDV illisible : " + e);
        }
        return null;
    }

    public long durationMs() {
        try {
            return (long) durationMs.invoke(house);
        } catch (ReflectiveOperationException e) {
            return 48 * 3_600_000L;
        }
    }

    public String format(double amount) {
        try {
            return (String) format.invoke(null, amount);
        } catch (ReflectiveOperationException e) {
            return String.valueOf(Math.round(amount));
        }
    }

    // --- Écriture ---

    /** Met un objet en vente au nom d'un faux joueur. Retourne l'identifiant de l'annonce, ou -1. */
    public int list(UUID seller, String sellerName, ItemStack item, double price, long lifetimeMs) {
        try {
            int id = nextId.getInt(house);
            nextId.setInt(house, id + 1);
            long now = System.currentTimeMillis();
            Object listing = listingCtor.newInstance(id, seller, sellerName, item.clone(), price, now,
                    now + Math.min(lifetimeMs, durationMs()));
            listingsMap().put(id, listing);
            saveSoon.invoke(shop);
            return id;
        } catch (ReflectiveOperationException | RuntimeException e) {
            logger.warning("Annonce HDV impossible : " + e);
            return -1;
        }
    }

    /** Retire une annonce d'un faux joueur sans rien mettre à l'entrepôt (l'objet n'a jamais existé). */
    public boolean withdraw(int id) {
        try {
            boolean removed = listingsMap().remove(id) != null;
            if (removed) saveSoon.invoke(shop);
            return removed;
        } catch (ReflectiveOperationException e) {
            return false;
        }
    }

    /**
     * Achat d'une annonce d'un VRAI joueur par un faux joueur, exactement comme le ferait /hdv : taxe selon le rang du
     * vendeur, argent versé au vendeur (ou mis de côté s'il est hors ligne), vente inscrite à l'historique, message
     * « Vendu ! ». L'objet acheté disparaît (le faux joueur « le garde »).
     */
    public boolean buy(int id, String buyerName) {
        try {
            Map<Integer, Object> map = listingsMap();
            Object l = map.get(id);
            if (l == null) return false;
            Offer o = offer(l);
            if (o.expires() <= System.currentTimeMillis()) return false;
            double tax = (double) round.invoke(null, o.price() * (double) taxRate.invoke(house, o.seller()));
            double net = (double) round.invoke(null, o.price() - tax);
            OfflinePlayer seller = Bukkit.getOfflinePlayer(o.seller());
            Object eco = economy.invoke(shop);
            Object response = deposit.invoke(eco, seller, net);
            if (!transactionOk(response)) return false;
            map.remove(id);
            record.invoke(house, saleCtor.newInstance(key.invoke(house, o.item()), o.item().clone(), o.price(),
                    o.sellerName(), buyerName, System.currentTimeMillis()));
            Player online = seller.getPlayer();
            if (online != null) {
                msg.invoke(shop, online, "hdv-sold", new TagResolver[]{
                        Placeholder.component("item", (Component) itemName.invoke(null, o.item())),
                        Placeholder.unparsed("amount", String.valueOf(o.item().getAmount())),
                        Placeholder.unparsed("buyer", buyerName),
                        Placeholder.unparsed("net", format(net)),
                        Placeholder.unparsed("tax", format(tax))});
                online.playSound(online.getLocation(), Sound.BLOCK_NOTE_BLOCK_CHIME, 0.8f, 1.5f);
            } else {
                @SuppressWarnings("unchecked")
                Map<UUID, double[]> p = (Map<UUID, double[]>) pending.get(house);
                double[] acc = p.computeIfAbsent(o.seller(), u -> new double[2]);
                acc[0] += net;
                acc[1] += 1;
            }
            saveSoon.invoke(shop);
            return true;
        } catch (ReflectiveOperationException | RuntimeException e) {
            logger.warning("Achat HDV impossible : " + e);
            return false;
        }
    }

    /** Efface ce que VæloriaShop a pu mettre de côté pour des faux joueurs (ventes, entrepôt). */
    public void forget(Collection<UUID> fakes) {
        try {
            Map<?, ?> p = (Map<?, ?>) pending.get(house);
            Map<?, ?> s = (Map<?, ?>) storage.get(house);
            boolean changed = false;
            for (UUID u : fakes) {
                changed |= p.remove(u) != null;
                changed |= s.remove(u) != null;
            }
            if (changed) saveSoon.invoke(shop);
        } catch (ReflectiveOperationException e) {
            logger.fine("Nettoyage HDV impossible : " + e);
        }
    }

    // --- Outils ---

    /** Objet de la demande, ou null si le matériau ou un enchantement n'existe pas sur cette version. */
    public static ItemStack build(ItemRequest request) {
        Material material = Material.matchMaterial(request.material());
        if (material == null || !material.isItem()) return null;
        ItemStack item = new ItemStack(material, Math.max(1, Math.min(material.getMaxStackSize(), request.amount())));
        ItemMeta meta = item.getItemMeta();
        for (Map.Entry<String, Integer> e : request.enchants().entrySet()) {
            Enchantment enchantment = Registry.ENCHANTMENT.get(NamespacedKey.minecraft(e.getKey()));
            if (enchantment == null) return null;
            if (meta instanceof EnchantmentStorageMeta book) {
                book.addStoredEnchant(enchantment, e.getValue(), true);
            } else {
                if (!enchantment.canEnchantItem(item)) return null;
                meta.addEnchant(enchantment, e.getValue(), true);
            }
        }
        item.setItemMeta(meta);
        return item;
    }

    private static ItemStack book(Enchantment enchantment, int level) {
        ItemStack book = new ItemStack(Material.ENCHANTED_BOOK);
        EnchantmentStorageMeta meta = (EnchantmentStorageMeta) book.getItemMeta();
        meta.addStoredEnchant(enchantment, level, true);
        book.setItemMeta(meta);
        return book;
    }

    static Map<Enchantment, Integer> enchantsOf(ItemStack item) {
        ItemMeta meta = item.getItemMeta();
        if (meta instanceof EnchantmentStorageMeta book) return book.getStoredEnchants();
        return meta == null ? Map.of() : meta.getEnchants();
    }

    private Offer offer(Object l) throws ReflectiveOperationException {
        return new Offer((int) lId.invoke(l), (UUID) lSeller.invoke(l), (String) lSellerName.invoke(l),
                (ItemStack) lItem.invoke(l), (double) lPrice.invoke(l), (long) lCreated.invoke(l),
                (long) lExpires.invoke(l));
    }

    @SuppressWarnings("unchecked")
    private Map<Integer, Object> listingsMap() throws ReflectiveOperationException {
        return (Map<Integer, Object>) listings.get(house);
    }

    private static boolean transactionOk(Object response) {
        try {
            return (boolean) response.getClass().getMethod("transactionSuccess").invoke(response);
        } catch (ReflectiveOperationException e) {
            return false;
        }
    }

    private static Field field(Class<?> type, String name) throws NoSuchFieldException {
        Field f = type.getDeclaredField(name);
        f.setAccessible(true);
        return f;
    }
}
