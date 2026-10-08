package fr.vaeloria.factions.service;

import org.bukkit.Bukkit;
import org.bukkit.plugin.Plugin;

import java.lang.reflect.Method;
import java.util.logging.Logger;

/**
 * Lien avec VæloriaShop (le marché du serveur). Les deux plugins partagent la même monnaie (l'économie Vault) ;
 * ce lien sert à afficher l'argent exactement comme le shop, et à lui laisser la main sur les générateurs.
 * Appels par réflexion : VæloriaFactions fonctionne aussi sans le shop.
 */
public final class ShopHook {
    private static Method format;
    private static boolean present;
    private static String fallbackSymbol = "$";

    private ShopHook() {}

    public static void detect(Logger log, String symbol) {
        fallbackSymbol = symbol == null ? "$" : symbol;
        format = null;
        present = false;
        Plugin shop = Bukkit.getPluginManager().getPlugin("VaeloriaShop");
        if (shop == null || !shop.isEnabled()) return;
        present = true;
        try {
            Class<?> money = Class.forName("fr.vaeloria.shop.util.Money", true, shop.getClass().getClassLoader());
            format = money.getMethod("format", double.class);
            log.info("VæloriaShop détecté : banque, récompenses et améliorations utilisent la monnaie du marché.");
        } catch (ReflectiveOperationException | LinkageError e) {
            log.warning("VæloriaShop présent mais son format monétaire est introuvable : format par défaut utilisé.");
        }
    }

    /** Le shop gère-t-il les générateurs (casse au Toucher de soie, objet rendu au joueur) ? */
    public static boolean present() { return present; }

    /** Montant affiché comme dans le shop (« 12 500 $ »), sinon format VæloriaFactions. */
    public static String format(double amount) {
        if (format != null) {
            try {
                return (String) format.invoke(null, amount);
            } catch (ReflectiveOperationException | RuntimeException ignored) {
            }
        }
        long whole = Math.round(Math.floor(Math.abs(amount)));
        String grouped = String.format(java.util.Locale.FRANCE, "%,d", whole).replace(' ', ' ').replace(' ', ' ');
        double cents = Math.round((Math.abs(amount) - whole) * 100);
        return (amount < 0 ? "-" : "") + grouped + (cents > 0 ? "," + String.format("%02d", (int) cents) : "") + " " + fallbackSymbol;
    }
}
