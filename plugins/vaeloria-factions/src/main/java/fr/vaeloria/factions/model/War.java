package fr.vaeloria.factions.model;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/** Guerre officielle entre deux factions : préparation, combat chronométré, score, vainqueur. */
public final class War {
    public String id;
    public String attackerId;
    public String defenderId;
    /** Noms au moment de la déclaration : le site identifie les factions par leur nom. */
    public String attackerName;
    public String defenderName;
    public long declaredAt;
    public long startAt;
    public long endAt;
    public int attackerScore;
    public int defenderScore;
    public int attackerOverclaims;
    public int defenderOverclaims;
    public Set<UUID> participants = new HashSet<>();
    public boolean started;

    public War() {}

    public boolean involves(String factionId) {
        return attackerId.equals(factionId) || defenderId.equals(factionId);
    }

    public boolean isAttacker(String factionId) {
        return attackerId.equals(factionId);
    }

    public String opponentOf(String factionId) {
        return isAttacker(factionId) ? defenderId : attackerId;
    }
}
