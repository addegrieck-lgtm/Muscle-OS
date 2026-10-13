package fr.vaeloria.fakeplayers;

import fr.vaeloria.fakeplayers.market.ItemRequest;
import fr.vaeloria.fakeplayers.market.Prices;
import fr.vaeloria.fakeplayers.market.ShopHook;
import org.bukkit.Bukkit;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;

import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.UUID;

/**
 * Les faux joueurs à l'hôtel des ventes de VæloriaShop, toujours au prix du marché :
 * <ul>
 *   <li>un vrai joueur écrit « je cherche casque protection IV » : parfois, un faux joueur répond qu'il en a un et
 *       le met à l'HDV peu après, au prix conseillé par l'HDV (±quelques %) ;</li>
 *   <li>de temps en temps, un faux joueur achète l'annonce d'un vrai joueur, seulement si son prix est cohérent
 *       (ni trop cher, ni bradé), avec un budget plafonné par jour et par vendeur.</li>
 * </ul>
 * Jamais d'objet unique (réservé aux boutiques de joueurs), jamais de points boutique. Les annonces des faux joueurs
 * non vendues disparaissent sans passer par l'entrepôt.
 */
final class MarketBots {
    private record Tracked(UUID seller, String sellerName, String buyerHint, long until) {}

    private final FakePlayersPlugin plugin;
    private final ShopHook hook;
    private final Random random = new Random();
    /** Annonces des faux joueurs encore en ligne (id → vendeur, fin). */
    private final Map<Integer, Tracked> listings = new LinkedHashMap<>();
    /** Faux joueurs qui ont eu une annonce (nettoyage de l'entrepôt et des ventes mises de côté). */
    private final Set<UUID> sellers = new HashSet<>();
    private final Map<String, Long> lastDemand = new HashMap<>();
    private final Map<String, Integer> boughtFrom = new HashMap<>();
    private LocalDate day = LocalDate.now();
    private double spent;
    private int listedToday, boughtToday;
    private long lastOffer, nextScan;
    private boolean connected;

    MarketBots(FakePlayersPlugin plugin) {
        this.plugin = plugin;
        this.hook = new ShopHook(plugin.getLogger());
        load();
    }

    private ConfigurationSection cfg() {
        ConfigurationSection c = plugin.getConfig().getConfigurationSection("market");
        return c != null && c.getBoolean("enabled", true) ? c : null;
    }

    private boolean ready() {
        if (cfg() == null) return false;
        if (!connected) connected = hook.connect();
        return connected && hook.available();
    }

    /** VæloriaShop rechargé ou réactivé : on se rebranche au prochain usage. */
    void reconnect() { connected = false; }

    // --- Demandes du chat ---

    /** Message d'un vrai joueur (thread principal). @return true si un faux joueur va lui proposer l'objet. */
    boolean onChat(String playerName, String text) {
        ConfigurationSection c = cfg();
        ItemRequest request = c == null ? null : ItemRequest.parse(text);
        if (request == null || !ready()) return false;
        Player player = Bukkit.getPlayerExact(playerName);
        ItemStack item = ShopHook.build(request);
        if (player == null || item == null) return false;
        rollDay();
        long now = System.currentTimeMillis();
        ConfigurationSection d = section(c, "demand");

        if (hook.reservedToPlayerShops(item)) { // netherite, élytres, totems… : un joueur le lui rappelle parfois
            if (random.nextDouble() >= d.getDouble("unique-reply-chance", 0.35)) return false;
            FakePlayer fake = seller(null);
            return fake != null && plugin.chat().sayEvent(fake, "hdv-unique",
                    Map.of("player", playerName, "item", request.label()), playerName) >= 0;
        }
        Long last = lastDemand.get(playerName.toLowerCase());
        if (last != null && now - last < d.getLong("player-cooldown-minutes", 10) * 60_000) return false;
        if (now - lastOffer < d.getLong("global-cooldown-seconds", 90) * 1000) return false;
        if (listings.size() >= d.getInt("max-open-listings", 8)) return false;
        if (listedToday >= d.getInt("max-listings-per-day", 20)) return false;
        double value = hook.estimate(item, c.getDouble("enchant-factor", 0.85));
        if (value <= 0 || value > d.getDouble("max-price", 60_000)) return false; // pas de prix sûr : rien
        lastDemand.put(playerName.toLowerCase(), now);
        if (random.nextDouble() >= d.getDouble("chance", 0.55)) return false;
        FakePlayer fake = seller(playerName);
        if (fake == null) return false;

        double margin = between(d, "price-margin", 0.97, 1.08);
        double price = Prices.human(value * margin);
        String said = Prices.say(price, random);
        long replyTicks = 20L * seconds(d, "reply-delay-seconds", 6, 25);
        long listTicks = 20L * seconds(d, "list-delay-seconds", 40, 150);
        lastOffer = now;
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            long typing = plugin.chat().sayEvent(fake, "hdv-offer",
                    Map.of("player", playerName, "item", request.label(), "price", said), playerName);
            if (typing < 0) return; // rien de neuf à dire : pas d'annonce surprise
            Bukkit.getScheduler().runTaskLater(plugin, () -> list(fake, playerName, item, price, d), typing + listTicks);
        }, replyTicks);
        return true;
    }

    private void list(FakePlayer fake, String forPlayer, ItemStack item, double price, ConfigurationSection d) {
        if (plugin.manager().get(fake.name()) != fake || fake.leaving() || !ready()) return;
        long lifetime = (long) (between(d, "listing-hours", 4, 12) * 3_600_000L);
        int id = hook.list(fake.uuid(), fake.name(), item, price, lifetime);
        if (id < 0) return;
        listings.put(id, new Tracked(fake.uuid(), fake.name(), forPlayer, System.currentTimeMillis() + lifetime));
        sellers.add(fake.uuid());
        listedToday++;
        save();
        Player player = Bukkit.getPlayerExact(forPlayer);
        if (player != null && random.nextDouble() < d.getDouble("listed-whisper-chance", 0.6)) {
            String text = plugin.chat().eventText(fake, "hdv-listed", Map.of("player", forPlayer,
                    "price", Prices.say(price, random)));
            if (text != null) plugin.interactions().whisperFrom(fake, player, text);
        }
    }

    // --- Suivi et achats (toutes les 20 s) ---

    void tick() {
        if (listings.isEmpty() && cfg() == null) return;
        if (!ready()) return;
        rollDay();
        long now = System.currentTimeMillis();
        boolean changed = false;
        for (var it = listings.entrySet().iterator(); it.hasNext(); ) {
            Map.Entry<Integer, Tracked> e = it.next();
            Tracked t = e.getValue();
            ShopHook.Offer offer = hook.offer(e.getKey());
            if (offer == null) { // vendue (ou retirée par le staff)
                it.remove();
                changed = true;
                thank(t, now);
            } else if (now >= t.until() || now >= offer.expires() - 60_000) { // jamais à l'entrepôt
                hook.withdraw(e.getKey());
                it.remove();
                changed = true;
            }
        }
        if (!sellers.isEmpty()) hook.forget(sellers);
        if (now >= nextScan) {
            ConfigurationSection b = section(cfg(), "buy");
            nextScan = now + Math.max(1, b.getLong("scan-minutes", 4)) * 60_000;
            if (b.getBoolean("enabled", true) && buyOne(b, now)) changed = true;
        }
        if (changed) save();
    }

    /** Un vrai joueur vient d'acheter l'annonce d'un faux joueur : petit merci en privé, parfois. */
    private void thank(Tracked t, long now) {
        FakePlayer fake = plugin.manager().get(t.sellerName());
        if (fake == null || fake.leaving() || fake.afk()) return;
        if (random.nextDouble() >= section(cfg(), "demand").getDouble("thanks-chance", 0.4)) return;
        String buyer = hook.lastBuyer(t.sellerName(), now - 25_000);
        Player player = buyer == null ? null : Bukkit.getPlayerExact(buyer);
        if (player == null) return;
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            String text = plugin.chat().eventText(fake, "hdv-thanks", Map.of("player", player.getName()));
            if (text != null && plugin.manager().get(fake.name()) == fake) plugin.interactions().whisperFrom(fake, player, text);
        }, 20L * (5 + random.nextInt(20)));
    }

    /** Achète au plus une annonce de vrai joueur, au prix du marché, dans le budget du jour. */
    private boolean buyOne(ConfigurationSection b, long now) {
        List<FakePlayer> buyers = new ArrayList<>();
        for (FakePlayer f : plugin.manager().all()) if (!f.leaving() && !f.afk()) buyers.add(f);
        if (buyers.isEmpty()) return false;
        double budget = b.getDouble("daily-budget", 100_000);
        double maxPrice = b.getDouble("max-price", 25_000);
        double low = b.getDouble("price-band.min", 0.7), high = b.getDouble("price-band.max", 1.05);
        long minAge = b.getLong("min-age-minutes", 8) * 60_000;
        int perSeller = b.getInt("per-seller-per-day", 2);
        double chance = b.getDouble("chance", 0.05) * Math.min(1, buyers.size() / 30.0);
        Set<String> fakeNames = new HashSet<>();
        for (FakePlayer f : plugin.manager().all()) fakeNames.add(f.name().toLowerCase());

        List<ShopHook.Offer> offers = new ArrayList<>(hook.offers());
        java.util.Collections.shuffle(offers, random);
        for (ShopHook.Offer o : offers) {
            if (listings.containsKey(o.id()) || sellers.contains(o.seller())
                    || fakeNames.contains(o.sellerName().toLowerCase())) continue;     // jamais entre faux joueurs
            if (now - o.created() < minAge || o.expires() <= now) continue;
            if (o.price() > maxPrice || spent + o.price() > budget) continue;
            if (boughtFrom.getOrDefault(o.seller().toString(), 0) >= perSeller) continue;
            if (hook.reservedToPlayerShops(o.item())) continue;
            double value = hook.estimate(o.item(), cfg().getDouble("enchant-factor", 0.85));
            if (value <= 0) continue;
            double ratio = o.price() / value;
            if (ratio < low || ratio > high) continue;                                  // seulement un prix cohérent
            if (random.nextDouble() >= chance) continue;
            FakePlayer buyer = buyers.get(random.nextInt(buyers.size()));
            if (!hook.buy(o.id(), buyer.name())) continue;
            spent += o.price();
            boughtToday++;
            boughtFrom.merge(o.seller().toString(), 1, Integer::sum);
            return true;
        }
        return false;
    }

    // --- Outils ---

    /** Faux joueur qui répond : présent, pas AFK, pas sur le départ, si possible pas celui qui vient de parler. */
    private FakePlayer seller(String exclude) {
        List<FakePlayer> out = new ArrayList<>();
        for (FakePlayer f : plugin.manager().all()) {
            if (!f.leaving() && !f.afk() && !f.name().equalsIgnoreCase(exclude)) out.add(f);
        }
        return out.isEmpty() ? null : out.get(random.nextInt(out.size()));
    }

    private void rollDay() {
        LocalDate today = LocalDate.now();
        if (today.equals(day)) return;
        day = today;
        spent = 0;
        listedToday = 0;
        boughtToday = 0;
        boughtFrom.clear();
        save();
    }

    private double between(ConfigurationSection s, String path, double defMin, double defMax) {
        double min = s.getDouble(path + ".min", defMin);
        double max = Math.max(min, s.getDouble(path + ".max", defMax));
        return min + random.nextDouble() * (max - min);
    }

    private int seconds(ConfigurationSection s, String path, int defMin, int defMax) {
        int min = Math.max(0, s.getInt(path + ".min", defMin));
        int max = Math.max(min, s.getInt(path + ".max", defMax));
        return min + random.nextInt(max - min + 1);
    }

    private static ConfigurationSection section(ConfigurationSection parent, String path) {
        ConfigurationSection s = parent == null ? null : parent.getConfigurationSection(path);
        return s != null ? s : new YamlConfiguration();
    }

    /** /fp market prix <message> : ce qu'un faux joueur comprendrait de ce message, et à quel prix il vendrait. */
    List<String> explain(String text) {
        List<String> out = new ArrayList<>();
        ItemRequest request = ItemRequest.parse(text);
        if (request == null) { out.add("Pas une demande d'objet reconnue."); return out; }
        out.add("Demande : " + request.label() + " → " + request.material() + " × " + request.amount() + " " + request.enchants());
        ItemStack item = ShopHook.build(request);
        if (item == null) { out.add("Objet impossible sur cette version."); return out; }
        if (!ready()) { out.add("VæloriaShop indisponible."); return out; }
        if (hook.reservedToPlayerShops(item)) { out.add("Objet unique ou interdit à l'HDV : réponse « pshop » seulement."); return out; }
        double value = hook.estimate(item, cfg().getDouble("enchant-factor", 0.85));
        if (value <= 0) { out.add("Aucun prix de référence à l'HDV : pas de réponse."); return out; }
        ConfigurationSection d = section(cfg(), "demand");
        out.add("Valeur HDV : " + hook.format(value) + " → annonce entre "
                + hook.format(Prices.human(value * d.getDouble("price-margin.min", 0.97))) + " et "
                + hook.format(Prices.human(value * d.getDouble("price-margin.max", 1.08)))
                + (value > d.getDouble("max-price", 60_000) ? " (au-dessus de max-price : pas de réponse)" : ""));
        return out;
    }

    /** Résumé pour /fp market. */
    List<String> describe() {
        rollDay();
        ConfigurationSection c = cfg();
        List<String> out = new ArrayList<>();
        if (c == null) { out.add("Hôtel des ventes : désactivé (market.enabled)."); return out; }
        if (!ready()) { out.add("Hôtel des ventes : VæloriaShop absent, fermé ou non reconnu."); return out; }
        ConfigurationSection b = section(c, "buy");
        out.add("Annonces des faux joueurs en ligne : " + listings.size() + " (aujourd'hui : " + listedToday + ")");
        out.add("Achats aux vrais joueurs aujourd'hui : " + boughtToday + ", " + hook.format(spent) + " / "
                + hook.format(b.getDouble("daily-budget", 100_000)) + " de budget");
        for (Map.Entry<Integer, Tracked> e : listings.entrySet()) {
            ShopHook.Offer o = hook.offer(e.getKey());
            if (o == null) continue;
            out.add(" #" + o.id() + " " + o.sellerName() + " : " + o.item().getAmount() + " × "
                    + o.item().getType().name().toLowerCase() + " " + hook.format(o.price())
                    + " (pour " + e.getValue().buyerHint() + ")");
        }
        return out;
    }

    private File file() { return new File(plugin.getDataFolder(), "market.yml"); }

    private void load() {
        if (!file().exists()) return;
        YamlConfiguration y = YamlConfiguration.loadConfiguration(file());
        try {
            day = LocalDate.parse(y.getString("day", LocalDate.now().toString()));
        } catch (RuntimeException e) {
            day = LocalDate.now();
        }
        spent = y.getDouble("spent");
        listedToday = y.getInt("listed-today");
        boughtToday = y.getInt("bought-today");
        ConfigurationSection from = y.getConfigurationSection("bought-from");
        if (from != null) for (String k : from.getKeys(false)) boughtFrom.put(k, from.getInt(k));
        for (String s : y.getStringList("sellers")) {
            try { sellers.add(UUID.fromString(s)); } catch (IllegalArgumentException ignored) { }
        }
        ConfigurationSection l = y.getConfigurationSection("listings");
        if (l != null) for (String k : l.getKeys(false)) {
            try {
                listings.put(Integer.parseInt(k), new Tracked(UUID.fromString(l.getString(k + ".seller")),
                        l.getString(k + ".name"), l.getString(k + ".for", "?"), l.getLong(k + ".until")));
            } catch (RuntimeException ignored) { }
        }
    }

    void save() {
        YamlConfiguration y = new YamlConfiguration();
        y.set("day", day.toString());
        y.set("spent", spent);
        y.set("listed-today", listedToday);
        y.set("bought-today", boughtToday);
        boughtFrom.forEach((k, v) -> y.set("bought-from." + k, v));
        List<String> s = new ArrayList<>();
        for (UUID u : sellers) s.add(u.toString());
        y.set("sellers", s);
        listings.forEach((id, t) -> {
            y.set("listings." + id + ".seller", t.seller().toString());
            y.set("listings." + id + ".name", t.sellerName());
            y.set("listings." + id + ".for", t.buyerHint());
            y.set("listings." + id + ".until", t.until());
        });
        try {
            y.save(file());
        } catch (IOException e) {
            plugin.getLogger().warning("Impossible d'enregistrer market.yml : " + e.getMessage());
        }
    }
}
