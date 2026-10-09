package fr.vaeloria.fakeplayers;

import org.bukkit.Bukkit;
import org.bukkit.plugin.Plugin;

import java.lang.reflect.Method;

/**
 * Pont optionnel vers VaeloriaTab : nombre de places libres dans le TAB pour les faux joueurs
 * (VaeloriaTab affiche au plus max-shown vrais joueurs ; les faux joueurs prennent les places restantes).
 * Par réflexion, sans dépendance de compilation. Integer.MAX_VALUE sans VaeloriaTab (pas de limite).
 */
final class VaeloriaTabHook {
    private static Class<?> cachedClass;
    private static Method cachedMethod;

    private VaeloriaTabHook() {}

    private static Class<?> compactClass;
    private static Method compactMethod;

    /** Le TAB de VaeloriaTab est-il en mode compact (grades courts, au-delà de 40 joueurs) ? */
    static boolean compact() {
        Plugin plugin = Bukkit.getPluginManager().getPlugin("VaeloriaTab");
        if (plugin == null || !plugin.isEnabled()) return false;
        try {
            if (compactMethod == null || compactClass != plugin.getClass()) {
                compactMethod = plugin.getClass().getMethod("compactMode");
                compactClass = plugin.getClass();
            }
            return (boolean) compactMethod.invoke(null);
        } catch (ReflectiveOperationException | ClassCastException e) {
            return false;
        }
    }

    static int fakeSlots() {
        Plugin plugin = Bukkit.getPluginManager().getPlugin("VaeloriaTab");
        if (plugin == null || !plugin.isEnabled()) return Integer.MAX_VALUE;
        try {
            if (cachedMethod == null || cachedClass != plugin.getClass()) {
                cachedMethod = plugin.getClass().getMethod("fakeSlots");
                cachedClass = plugin.getClass();
            }
            return (int) cachedMethod.invoke(null);
        } catch (ReflectiveOperationException | ClassCastException e) {
            return Integer.MAX_VALUE; // ancienne version de VaeloriaTab
        }
    }
}
