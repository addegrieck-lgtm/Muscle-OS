package fr.vaeloria.factions.model;

/** Rangs d'une faction, du plus bas au plus haut. L'ordre des constantes sert de hiérarchie. */
public enum Role {
    RECRUE("Recrue", "-", "RECRUIT"),
    MEMBRE("Membre", "+", "MEMBER"),
    OFFICIER("Officier", "*", "OFFICER"),
    CHEF("Chef", "**", "LEADER");

    private final String label;
    private final String prefix;
    private final String bridgeName;

    Role(String label, String prefix, String bridgeName) {
        this.label = label;
        this.prefix = prefix;
        this.bridgeName = bridgeName;
    }

    public String label() { return label; }
    public String prefix() { return prefix; }
    /** Nom attendu par le contrat VæloriaBridge (packages/types/src/bridge.ts). */
    public String bridgeName() { return bridgeName; }

    public boolean atLeast(Role other) { return ordinal() >= other.ordinal(); }

    public Role next() { return this == CHEF ? CHEF : values()[ordinal() + 1]; }
    public Role previous() { return this == RECRUE ? RECRUE : values()[ordinal() - 1]; }

    public static Role parse(String s) {
        if (s == null) return null;
        String n = s.trim().toUpperCase(java.util.Locale.ROOT);
        for (Role r : values()) {
            if (r.name().equals(n) || r.label.equalsIgnoreCase(s.trim()) || r.bridgeName.equals(n)) return r;
        }
        return null;
    }
}
