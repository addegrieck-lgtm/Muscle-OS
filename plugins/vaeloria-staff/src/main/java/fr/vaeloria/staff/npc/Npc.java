package fr.vaeloria.staff.npc;

import fr.vaeloria.staff.util.Pos;
import org.bukkit.entity.EntityType;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** PNJ immobile et invulnérable : au clic, il parle (messages) et/ou lance des commandes. */
public final class Npc {
    private final String id;
    private String name;
    private EntityType type = EntityType.VILLAGER;
    private Pos pos;
    private final List<String> messages = new ArrayList<>();
    private final List<String> commands = new ArrayList<>();
    private boolean glowing;
    private boolean nameVisible = true;
    UUID entity;

    public Npc(String id, String name, Pos pos) {
        this.id = id;
        this.name = name;
        this.pos = pos;
    }

    public String id() { return id; }
    public String name() { return name; }
    public void name(String name) { this.name = name; }
    public EntityType type() { return type; }
    public void type(EntityType type) { this.type = type; }
    public Pos pos() { return pos; }
    public void pos(Pos pos) { this.pos = pos; }
    /** Lignes envoyées au joueur qui clique ({player} remplacé). */
    public List<String> messages() { return messages; }
    /** Commandes lancées par le joueur, ou par la console si préfixées de « [console] ». */
    public List<String> commands() { return commands; }
    public boolean glowing() { return glowing; }
    public void glowing(boolean glowing) { this.glowing = glowing; }
    public boolean nameVisible() { return nameVisible; }
    public void nameVisible(boolean nameVisible) { this.nameVisible = nameVisible; }
}
