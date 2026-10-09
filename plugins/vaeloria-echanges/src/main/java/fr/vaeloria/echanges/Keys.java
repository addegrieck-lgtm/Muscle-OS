package fr.vaeloria.echanges;

import org.bukkit.NamespacedKey;
import org.bukkit.plugin.Plugin;

/** Marqueurs invisibles (PersistentDataContainer) posés sur les villageois et les objets du plugin. */
public final class Keys {
    // Sur le villageois
    public final NamespacedKey luck;
    public final NamespacedKey boosts;
    public final NamespacedKey forbidden;
    public final NamespacedKey needsBoost;
    public final NamespacedKey exhausted;
    public final NamespacedKey bookExpires;
    public final NamespacedKey bookSales;
    public final NamespacedKey bookLimit;
    // Sur les objets
    public final NamespacedKey captureEgg;
    public final NamespacedKey capturedProfession;
    public final NamespacedKey capturedType;
    public final NamespacedKey capturedForbidden;
    public final NamespacedKey capturedName;

    public Keys(Plugin plugin) {
        luck = new NamespacedKey(plugin, "luck");
        boosts = new NamespacedKey(plugin, "boosts");
        forbidden = new NamespacedKey(plugin, "forbidden");
        needsBoost = new NamespacedKey(plugin, "needs_boost");
        exhausted = new NamespacedKey(plugin, "exhausted");
        bookExpires = new NamespacedKey(plugin, "book_expires");
        bookSales = new NamespacedKey(plugin, "book_sales");
        bookLimit = new NamespacedKey(plugin, "book_limit");
        captureEgg = new NamespacedKey(plugin, "capture_egg");
        capturedProfession = new NamespacedKey(plugin, "captured_profession");
        capturedType = new NamespacedKey(plugin, "captured_type");
        capturedForbidden = new NamespacedKey(plugin, "captured_forbidden");
        capturedName = new NamespacedKey(plugin, "captured_name");
    }
}
