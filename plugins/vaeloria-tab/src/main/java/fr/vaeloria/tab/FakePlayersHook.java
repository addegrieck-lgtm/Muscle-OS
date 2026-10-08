package fr.vaeloria.tab;

import org.bukkit.Bukkit;
import org.bukkit.plugin.Plugin;

import java.lang.reflect.Method;

/**
 * Pont optionnel vers VaeloriaFakePlayers : nombre de faux joueurs à ajouter au compteur du TAB.
 * Par réflexion, pour que VaeloriaTab fonctionne et compile sans ce plugin. Thread-safe.
 */
final class FakePlayersHook {
    private static volatile Class<?> cachedClass;
    private static volatile Method cachedMethod;

    private FakePlayersHook() {}

    /** Faux joueurs connectés, 0 si VaeloriaFakePlayers est absent ou désactivé. */
    static int count() {
        Plugin plugin = Bukkit.getPluginManager().getPlugin("VaeloriaFakePlayers");
        if (plugin == null || !plugin.isEnabled()) return 0;
        try {
            Method method = cachedMethod;
            if (method == null || cachedClass != plugin.getClass()) { // nouvelle instance après un rechargement
                method = plugin.getClass().getMethod("fakeCount");
                cachedClass = plugin.getClass();
                cachedMethod = method;
            }
            return (int) method.invoke(null);
        } catch (ReflectiveOperationException | ClassCastException e) {
            return 0; // version de VaeloriaFakePlayers sans cette API
        }
    }
}
