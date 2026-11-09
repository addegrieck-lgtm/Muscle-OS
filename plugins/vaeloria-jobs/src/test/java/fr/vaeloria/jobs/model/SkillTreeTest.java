package fr.vaeloria.jobs.model;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SkillTreeTest {
    private static SkillNode node(String id, int slot, int level, int cost, List<String> requires, List<Integer> links) {
        return new SkillNode(id, id, "STONE", slot, level, cost, requires, List.of(Effect.attribute("armor", 1, Effect.Operation.ADD)), List.of(), links);
    }

    private final SkillTree tree = new SkillTree(List.of(
            node("racine", 40, 1, 1, List.of(), List.of()),
            node("gauche", 38, 3, 2, List.of("racine"), List.of(39)),
            node("droite", 42, 3, 2, List.of("racine"), List.of(41)),
            node("sommet", 4, 10, 5, List.of("gauche", "droite"), List.of(13))));

    @Test
    void validTreeHasNoErrors() {
        assertEquals(List.of(), tree.validate());
        assertEquals(10, tree.totalCost());
    }

    @Test
    void statusFollowsLevelRequirementsAndPoints() {
        Set<String> none = Set.of();
        assertEquals(SkillTree.Status.LEVEL_TOO_LOW, tree.status(tree.node("racine"), 0, 0, none));
        assertEquals(SkillTree.Status.AVAILABLE, tree.status(tree.node("racine"), 1, 1, none));
        assertEquals(SkillTree.Status.MISSING_REQUIREMENT, tree.status(tree.node("gauche"), 5, 5, none));
        Set<String> root = Set.of("racine");
        assertEquals(SkillTree.Status.AVAILABLE, tree.status(tree.node("gauche"), 3, 3, root));
        assertEquals(SkillTree.Status.NOT_ENOUGH_POINTS, tree.status(tree.node("gauche"), 3, 2, root));
        assertEquals(SkillTree.Status.UNLOCKED, tree.status(tree.node("racine"), 3, 3, root));
        // Le sommet demande les deux branches.
        assertEquals(SkillTree.Status.MISSING_REQUIREMENT, tree.status(tree.node("sommet"), 30, 30, Set.of("racine", "gauche")));
        assertEquals(SkillTree.Status.AVAILABLE, tree.status(tree.node("sommet"), 30, 30, Set.of("racine", "gauche", "droite")));
    }

    @Test
    void progressUnlocksAndResets() {
        LevelCurve curve = new LevelCurve(10, 1, 30, 1);
        JobProgress p = new JobProgress();
        assertEquals(SkillTree.Status.LEVEL_TOO_LOW, p.unlock(tree.node("racine"), curve, tree));
        assertEquals(3, p.addXp(curve.totalXpFor(3), curve));
        assertEquals(SkillTree.Status.AVAILABLE, p.unlock(tree.node("racine"), curve, tree));
        assertEquals(SkillTree.Status.AVAILABLE, p.unlock(tree.node("gauche"), curve, tree));
        assertEquals(0, p.freePoints(curve, tree));
        assertEquals(SkillTree.Status.NOT_ENOUGH_POINTS, p.unlock(tree.node("droite"), curve, tree));
        p.resetTree(1000);
        assertTrue(p.unlocked().isEmpty());
        assertEquals(3, p.freePoints(curve, tree));
        assertEquals(1000, p.lastReset());
        assertEquals(3, p.level(curve), "l'XP est conservée");
    }

    @Test
    void sanitizeDropsNodesNoLongerReachable() {
        Set<String> unlocked = new LinkedHashSet<>(List.of("racine", "gauche", "droite", "sommet", "supprime"));
        // Niveau 30 : tout reste (le nœud supprimé de la config disparaît).
        assertEquals(Set.of("racine", "gauche", "droite", "sommet"), tree.sanitize(unlocked, 30, 30));
        // Points réduits à 5 : racine + gauche + droite = 5, le sommet (5) n'est plus payable.
        assertEquals(Set.of("racine", "gauche", "droite"), tree.sanitize(unlocked, 30, 5));
        // Sans la racine, rien ne tient.
        assertEquals(Set.of(), tree.sanitize(new LinkedHashSet<>(List.of("gauche", "sommet")), 30, 30));
    }

    @Test
    void validationCatchesConfigMistakes() {
        SkillTree bad = new SkillTree(List.of(
                node("a", 40, 1, 1, List.of("b"), List.of(40)),
                node("b", 40, 1, 1, List.of("a"), List.of()),
                node("c", 50, 1, 1, List.of("inconnu"), List.of())));
        List<String> errors = bad.validate();
        assertTrue(errors.stream().anyMatch(e -> e.contains("déjà utilisée")), errors.toString());
        assertTrue(errors.stream().anyMatch(e -> e.contains("hors des 5 premières lignes")), errors.toString());
        assertTrue(errors.stream().anyMatch(e -> e.contains("prérequis inconnu")), errors.toString());
        assertTrue(errors.stream().anyMatch(e -> e.contains("boucle")), errors.toString());
        assertTrue(errors.stream().anyMatch(e -> e.contains("branche en case 40")), errors.toString());
    }
}
