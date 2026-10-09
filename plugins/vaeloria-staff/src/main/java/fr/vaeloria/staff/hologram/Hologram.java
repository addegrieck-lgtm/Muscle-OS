package fr.vaeloria.staff.hologram;

import fr.vaeloria.staff.util.Pos;
import org.bukkit.entity.Display;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Pancarte flottante : texte multiligne affiché par une entité TextDisplay. */
public final class Hologram {
    public enum Background { DEFAULT, NONE, DARK }

    private final String id;
    private Pos pos;
    private final List<String> lines = new ArrayList<>();
    private float scale = 1f;
    private Background background = Background.DARK;
    private Display.Billboard billboard = Display.Billboard.CENTER;
    private boolean shadow = true;
    /** Entité affichée en ce moment (non enregistrée : l'entité est recréée au chargement du chunk). */
    UUID entity;

    public Hologram(String id, Pos pos) {
        this.id = id;
        this.pos = pos;
    }

    public String id() { return id; }
    public Pos pos() { return pos; }
    public void pos(Pos pos) { this.pos = pos; }
    public List<String> lines() { return lines; }
    public float scale() { return scale; }
    public void scale(float scale) { this.scale = Math.max(0.25f, Math.min(10f, Math.round(scale * 4) / 4f)); }
    public Background background() { return background; }
    public void background(Background background) { this.background = background; }
    public Display.Billboard billboard() { return billboard; }
    public void billboard(Display.Billboard billboard) { this.billboard = billboard; }
    public boolean shadow() { return shadow; }
    public void shadow(boolean shadow) { this.shadow = shadow; }
}
