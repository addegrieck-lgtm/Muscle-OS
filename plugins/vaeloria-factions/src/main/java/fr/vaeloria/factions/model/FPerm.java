package fr.vaeloria.factions.model;

/** Actions soumises à un rang minimum, réglables par chaque faction (/f perm). */
public enum FPerm {
    BUILD("Construire / casser", Role.RECRUE),
    CONTAINER("Ouvrir les coffres", Role.MEMBRE),
    DOOR("Portes, boutons, leviers", Role.RECRUE),
    INVITE("Inviter", Role.OFFICIER),
    KICK("Expulser", Role.OFFICIER),
    CLAIM("Claim / surclaim", Role.OFFICIER),
    UNCLAIM("Unclaim", Role.OFFICIER),
    HOME("Aller au home", Role.RECRUE),
    SETHOME("Définir le home", Role.OFFICIER),
    WARP("Utiliser les warps", Role.MEMBRE),
    SETWARP("Gérer les warps", Role.OFFICIER),
    CHEST("Coffre de faction", Role.MEMBRE),
    BANK_WITHDRAW("Retirer de la banque", Role.OFFICIER),
    RELATION("Gérer les relations", Role.OFFICIER),
    FLY("Voler dans le territoire", Role.MEMBRE),
    SHIELD("Régler le bouclier", Role.CHEF),
    LOGS("Lire le journal", Role.OFFICIER);

    private final String label;
    private final Role defaultRole;

    FPerm(String label, Role defaultRole) {
        this.label = label;
        this.defaultRole = defaultRole;
    }

    public String label() { return label; }
    public Role defaultRole() { return defaultRole; }

    public static FPerm parse(String s) {
        if (s == null) return null;
        try {
            return valueOf(s.trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
