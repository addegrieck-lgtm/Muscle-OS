package fr.vaeloria.staff.broadcast;

import org.bukkit.Material;

public enum BroadcastType {
    CHAT(Material.PAPER, "Chat", "Toutes les lignes, dans le chat."),
    TITLE(Material.NAME_TAG, "Titre", "Ligne 1 = titre, ligne 2 = sous-titre."),
    ACTIONBAR(Material.OAK_SIGN, "Barre d'action", "Ligne 1, au-dessus de la barre d'objets."),
    BOSSBAR(Material.DRAGON_HEAD, "Barre de boss", "Ligne 1, en haut de l'écran, avec compte à rebours.");

    public final Material icon;
    public final String label;
    public final String help;

    BroadcastType(Material icon, String label, String help) {
        this.icon = icon;
        this.label = label;
        this.help = help;
    }

    public BroadcastType next() {
        return values()[(ordinal() + 1) % values().length];
    }
}
