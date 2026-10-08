package fr.vaeloria.factions.rules;

/**
 * Décision de claim / surclaim, indépendante de Bukkit pour être testée.
 * Le surclaim (overclaim) est le pillage « à l'ancienne » : une faction dont le power ne couvre plus ses terres
 * peut perdre ses chunks de bordure au profit d'un ennemi, qui devient alors propriétaire de tout ce qui s'y trouve,
 * obsidienne comprise.
 */
public final class ClaimRules {
    private ClaimRules() {}

    public enum Result {
        CLAIM_WILDERNESS(true),
        OVERCLAIM(true),
        ALREADY_OWNED(false),
        WORLD_DISABLED(false),
        SYSTEM_ZONE(false),
        NOT_ENOUGH_POWER(false),
        MAX_CLAIMS(false),
        NOT_CONNECTED(false),
        TARGET_TOO_STRONG(false),
        OVERCLAIM_DISABLED(false),
        NOT_ENEMY(false),
        NOT_EDGE(false),
        TARGET_SHIELDED(false),
        TARGET_IN_GRACE(false);

        private final boolean success;

        Result(boolean success) { this.success = success; }

        public boolean success() { return success; }
    }

    /** Situation du chunk visé et des deux factions concernées. */
    public record Context(
            boolean worldDisabled,
            int claimerClaims,
            int claimerLimit,
            int hardMax,
            boolean connectedToClaimer,
            boolean mustBeConnected,
            /* Propriétaire actuel : NONE, SELF, SYSTEM ou OTHER. */
            Owner owner,
            int ownerClaims,
            int ownerLimit,
            boolean overclaimEnabled,
            boolean enemies,
            boolean requireEnemy,
            boolean onOwnerEdge,
            boolean edgeOnly,
            boolean ownerShielded,
            boolean grace
    ) {}

    public enum Owner { NONE, SELF, SYSTEM, OTHER }

    public static Result evaluate(Context c) {
        if (c.worldDisabled()) return Result.WORLD_DISABLED;
        switch (c.owner()) {
            case SELF -> { return Result.ALREADY_OWNED; }
            case SYSTEM -> { return Result.SYSTEM_ZONE; }
            default -> { }
        }
        if (c.hardMax() > 0 && c.claimerClaims() >= c.hardMax()) return Result.MAX_CLAIMS;
        if (c.claimerClaims() >= c.claimerLimit()) return Result.NOT_ENOUGH_POWER;

        if (c.owner() == Owner.NONE) {
            if (c.mustBeConnected() && c.claimerClaims() > 0 && !c.connectedToClaimer()) return Result.NOT_CONNECTED;
            return Result.CLAIM_WILDERNESS;
        }

        // Chunk tenu par une autre faction : surclaim.
        if (!c.overclaimEnabled()) return Result.OVERCLAIM_DISABLED;
        if (c.ownerClaims() <= c.ownerLimit()) return Result.TARGET_TOO_STRONG;
        if (c.requireEnemy() && !c.enemies()) return Result.NOT_ENEMY;
        if (c.grace()) return Result.TARGET_IN_GRACE;
        if (c.ownerShielded()) return Result.TARGET_SHIELDED;
        // Le surclaim grignote par l'extérieur : on ne peut pas viser le cœur d'une base.
        if (c.edgeOnly() && !c.onOwnerEdge() && !c.connectedToClaimer()) return Result.NOT_EDGE;
        return Result.OVERCLAIM;
    }
}
