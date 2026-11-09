package fr.vaeloria.jobs.model;

import java.util.List;

/**
 * Un nœud de l'arbre de protection d'un métier.
 *
 * @param slot     case du menu (0 à 44, les 5 premières lignes)
 * @param level    niveau de métier requis
 * @param cost     points de compétence dépensés
 * @param requires nœuds à débloquer avant (tous)
 * @param links    cases de « branches » dessinées entre ce nœud et ses parents
 */
public record SkillNode(String id, String name, String icon, int slot, int level, int cost,
                        List<String> requires, List<Effect> effects, List<String> description, List<Integer> links) {
    public SkillNode {
        requires = List.copyOf(requires);
        effects = List.copyOf(effects);
        description = List.copyOf(description);
        links = List.copyOf(links);
    }
}
