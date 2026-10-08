package fr.vaeloria.factions.model;

/** Améliorations de faction achetées avec la banque (/f ameliorations). */
public enum UpgradeType {
    CLAIMS("Territoire", "chunks de plafond"),
    POWER("Puissance", "power de faction"),
    CHEST("Coffre", "rangée(s) de coffre"),
    SHIELD("Bouclier", "heure(s) de bouclier"),
    WARPS("Warps", "warp(s)"),
    MEMBERS("Effectif", "place(s) de membre");

    private final String label;
    private final String unit;

    UpgradeType(String label, String unit) {
        this.label = label;
        this.unit = unit;
    }

    public String label() { return label; }
    public String unit() { return unit; }

    public static UpgradeType parse(String s) {
        if (s == null) return null;
        for (UpgradeType t : values()) if (t.name().equalsIgnoreCase(s) || t.label.equalsIgnoreCase(s)) return t;
        return null;
    }
}
