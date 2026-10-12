package fr.vaeloria.villageois;

import org.bukkit.NamespacedKey;
import org.bukkit.plugin.Plugin;

/** Clés des données enregistrées sur les villageois et les objets. */
final class Keys {
    /** Villageois : nombre de boosts payés depuis son dernier changement de métier. */
    final NamespacedKey boosts;
    /** Villageois : un livre lui a déjà été ajouté par un boost (add-book-if-none). */
    final NamespacedKey bookAdded;
    /** Villageois : livres vendus, nombre de livres avant épuisement (tiré une fois), épuisé. */
    final NamespacedKey booksSold, bookLimit, exhausted;
    /** Objet : œuf de capture. */
    final NamespacedKey captureEgg;
    /** Objet : villageois capturé (type de biome, ancien métier, nom, identifiant unique). */
    final NamespacedKey capturedType, capturedProfession, capturedName, capturedId;

    Keys(Plugin plugin) {
        boosts = new NamespacedKey(plugin, "boosts");
        bookAdded = new NamespacedKey(plugin, "book_added");
        booksSold = new NamespacedKey(plugin, "books_sold");
        bookLimit = new NamespacedKey(plugin, "book_limit");
        exhausted = new NamespacedKey(plugin, "exhausted");
        captureEgg = new NamespacedKey(plugin, "capture_egg");
        capturedType = new NamespacedKey(plugin, "captured_type");
        capturedProfession = new NamespacedKey(plugin, "captured_profession");
        capturedName = new NamespacedKey(plugin, "captured_name");
        capturedId = new NamespacedKey(plugin, "captured_id");
    }
}
