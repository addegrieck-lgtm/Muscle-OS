package fr.vaeloria.jobs.model;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Arbre de protection d'un métier : nœuds, prérequis et règles de déblocage. */
public final class SkillTree {
    public static final int TREE_SLOTS = 45;

    public enum Status {
        /** Déjà débloqué. */
        UNLOCKED,
        /** Débloquable maintenant. */
        AVAILABLE,
        /** Niveau de métier trop bas. */
        LEVEL_TOO_LOW,
        /** Un nœud parent n'est pas débloqué. */
        MISSING_REQUIREMENT,
        /** Pas assez de points libres. */
        NOT_ENOUGH_POINTS
    }

    private final Map<String, SkillNode> nodes;

    public SkillTree(Collection<SkillNode> nodes) {
        Map<String, SkillNode> map = new LinkedHashMap<>();
        for (SkillNode n : nodes) map.put(n.id(), n);
        this.nodes = java.util.Collections.unmodifiableMap(map);
    }

    public Map<String, SkillNode> nodes() { return nodes; }

    public SkillNode node(String id) { return nodes.get(id); }

    /** Coût total de l'arbre : comparé aux points du niveau maximum. */
    public int totalCost() {
        return nodes.values().stream().mapToInt(SkillNode::cost).sum();
    }

    /** Points dépensés (les identifiants inconnus, retirés de la config, ne comptent pas). */
    public int spent(Set<String> unlocked) {
        int sum = 0;
        for (String id : unlocked) {
            SkillNode n = nodes.get(id);
            if (n != null) sum += n.cost();
        }
        return sum;
    }

    public Status status(SkillNode node, int level, int points, Set<String> unlocked) {
        if (unlocked.contains(node.id())) return Status.UNLOCKED;
        if (level < node.level()) return Status.LEVEL_TOO_LOW;
        for (String r : node.requires()) if (!unlocked.contains(r)) return Status.MISSING_REQUIREMENT;
        if (points - spent(unlocked) < node.cost()) return Status.NOT_ENOUGH_POINTS;
        return Status.AVAILABLE;
    }

    /**
     * Nœuds débloqués encore valides : après un changement de config (nœud supprimé, prérequis ajouté,
     * coût relevé), on retire ce qui n'est plus atteignable plutôt que de laisser un bonus gratuit.
     */
    public Set<String> sanitize(Set<String> unlocked, int level, int points) {
        Set<String> kept = new HashSet<>();
        boolean changed = true;
        while (changed) {
            changed = false;
            for (SkillNode n : nodes.values()) {
                if (kept.contains(n.id()) || !unlocked.contains(n.id())) continue;
                if (status(n, level, points, kept) == Status.AVAILABLE) {
                    kept.add(n.id());
                    changed = true;
                }
            }
        }
        // Ordre d'origine conservé.
        Set<String> ordered = new java.util.LinkedHashSet<>();
        for (String id : unlocked) if (kept.contains(id)) ordered.add(id);
        return ordered;
    }

    /** Erreurs de configuration (vide si l'arbre est valide). */
    public List<String> validate() {
        List<String> errors = new ArrayList<>();
        Map<Integer, String> slots = new HashMap<>();
        for (SkillNode n : nodes.values()) {
            if (n.slot() < 0 || n.slot() >= TREE_SLOTS) errors.add(n.id() + " : case " + n.slot() + " hors des 5 premières lignes (0-44)");
            String other = slots.put(n.slot(), n.id());
            if (other != null) errors.add(n.id() + " : case " + n.slot() + " déjà utilisée par " + other);
            if (n.cost() < 0) errors.add(n.id() + " : coût négatif");
            if (n.effects().isEmpty()) errors.add(n.id() + " : aucun effet");
            for (String r : n.requires()) {
                if (!nodes.containsKey(r)) errors.add(n.id() + " : prérequis inconnu « " + r + " »");
                if (r.equals(n.id())) errors.add(n.id() + " : se requiert lui-même");
            }
        }
        for (SkillNode n : nodes.values()) {
            for (int link : n.links()) {
                if (link < 0 || link >= TREE_SLOTS) errors.add(n.id() + " : branche en case " + link + " hors limites");
                else if (slots.containsKey(link)) errors.add(n.id() + " : branche en case " + link + " sur le nœud " + slots.get(link));
            }
        }
        if (hasCycle()) errors.add("les prérequis forment une boucle");
        return errors;
    }

    private boolean hasCycle() {
        Map<String, Integer> state = new HashMap<>(); // 1 = en cours, 2 = fini
        for (String id : nodes.keySet()) if (visit(id, state)) return true;
        return false;
    }

    private boolean visit(String id, Map<String, Integer> state) {
        Integer s = state.get(id);
        if (s != null) return s == 1;
        state.put(id, 1);
        SkillNode n = nodes.get(id);
        if (n != null) for (String r : n.requires()) if (visit(r, state)) return true;
        state.put(id, 2);
        return false;
    }
}
