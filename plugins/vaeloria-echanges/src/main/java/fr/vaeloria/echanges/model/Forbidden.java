package fr.vaeloria.echanges.model;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** Livres qu'un villageois ne proposera plus jamais, stockés dans une seule chaîne : « protection:4,mending:1 ». */
public final class Forbidden {
    private Forbidden() {}

    public static Set<String> parse(String raw) {
        Set<String> out = new LinkedHashSet<>();
        if (raw == null || raw.isBlank()) return out;
        for (String s : raw.split(",")) if (!s.isBlank()) out.add(s.trim());
        return out;
    }

    /** Ajoute les nouveaux livres en gardant au plus {@code max} entrées (les plus anciennes sont oubliées). */
    public static String merge(String raw, Iterable<String> added, int max) {
        Set<String> all = parse(raw);
        for (String a : added) {
            all.remove(a);
            all.add(a);
        }
        List<String> list = new ArrayList<>(all);
        if (max > 0 && list.size() > max) list = list.subList(list.size() - max, list.size());
        return String.join(",", list);
    }
}
