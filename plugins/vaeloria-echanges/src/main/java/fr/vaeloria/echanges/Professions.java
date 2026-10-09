package fr.vaeloria.echanges;

import java.util.Map;

public final class Professions {
    private Professions() {}

    private static final Map<String, String> NAMES = Map.ofEntries(
            Map.entry("none", "Sans métier"), Map.entry("armorer", "Armurier"), Map.entry("butcher", "Boucher"),
            Map.entry("cartographer", "Cartographe"), Map.entry("cleric", "Prêtre"), Map.entry("farmer", "Fermier"),
            Map.entry("fisherman", "Pêcheur"), Map.entry("fletcher", "Archer"), Map.entry("leatherworker", "Tanneur"),
            Map.entry("librarian", "Bibliothécaire"), Map.entry("mason", "Maçon"), Map.entry("nitwit", "Niais"),
            Map.entry("shepherd", "Berger"), Map.entry("toolsmith", "Forgeron d'outils"), Map.entry("weaponsmith", "Forgeron d'armes"));

    public static String name(String key) { return NAMES.getOrDefault(key, key); }
}
