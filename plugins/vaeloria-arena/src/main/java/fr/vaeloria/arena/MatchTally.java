package fr.vaeloria.arena;

import java.util.EnumMap;
import java.util.Map;
import java.util.Optional;

/** Comptage d'un combat (vivants, kills) et désignation du vainqueur. Sans Bukkit, testé unitairement. */
public final class MatchTally {
    private final Map<Team, Integer> alive = new EnumMap<>(Team.class);
    private final Map<Team, Integer> kills = new EnumMap<>(Team.class);

    public MatchTally(int perTeam) {
        for (Team t : Team.values()) {
            alive.put(t, perTeam);
            kills.put(t, 0);
        }
    }

    /** Un bot de {@code victim} est mort ; {@code killer} vaut null si la mort n'est pas due à l'autre équipe. */
    public void death(Team victim, Team killer) {
        alive.merge(victim, -1, (a, b) -> Math.max(0, a + b));
        if (killer != null && killer != victim) kills.merge(killer, 1, Integer::sum);
    }

    public int alive(Team t) {
        return alive.get(t);
    }

    public int kills(Team t) {
        return kills.get(t);
    }

    /** Le combat est terminé dès qu'une équipe n'a plus de bot en vie. */
    public boolean finished() {
        return alive(Team.ROUGE) == 0 || alive(Team.BLEU) == 0;
    }

    /**
     * Vainqueur : l'équipe avec le plus de survivants, puis le plus de kills (fin au temps limite).
     * Vide en cas d'égalité parfaite.
     */
    public Optional<Team> winner() {
        int byAlive = Integer.compare(alive(Team.ROUGE), alive(Team.BLEU));
        if (byAlive != 0) return Optional.of(byAlive > 0 ? Team.ROUGE : Team.BLEU);
        int byKills = Integer.compare(kills(Team.ROUGE), kills(Team.BLEU));
        if (byKills != 0) return Optional.of(byKills > 0 ? Team.ROUGE : Team.BLEU);
        return Optional.empty();
    }
}
