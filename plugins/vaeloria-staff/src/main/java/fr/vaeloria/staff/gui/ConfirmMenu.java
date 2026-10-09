package fr.vaeloria.staff.gui;

import fr.vaeloria.staff.util.Items;
import org.bukkit.Material;
import org.bukkit.entity.Player;

public final class ConfirmMenu extends Menu {
    private final String question;
    private final Runnable yes;
    private final Runnable no;

    public ConfirmMenu(Player viewer, String question, Runnable yes, Runnable no) {
        super(viewer, 3, "&8Confirmer");
        this.question = question;
        this.yes = yes;
        this.no = no;
    }

    @Override
    protected void render() {
        set(4, Items.icon(Material.PAPER, "&f" + question));
        set(11, Items.icon(Material.LIME_CONCRETE, "&aConfirmer"), e -> yes.run());
        set(15, Items.icon(Material.RED_CONCRETE, "&cAnnuler"), e -> no.run());
        fillEmpty();
    }
}
