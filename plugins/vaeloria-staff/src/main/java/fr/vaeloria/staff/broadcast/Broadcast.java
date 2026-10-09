package fr.vaeloria.staff.broadcast;

import net.kyori.adventure.bossbar.BossBar;

import java.util.ArrayList;
import java.util.List;

/** Une annonce configurée en jeu : type, lignes, son, durée, public visé, diffusion automatique. */
public final class Broadcast {
    private final String id;
    private String name;
    private BroadcastType type = BroadcastType.CHAT;
    private final List<String> lines = new ArrayList<>();
    private boolean auto;
    private String sound;
    private int seconds = 5;
    private String permission;
    private BossBar.Color color = BossBar.Color.YELLOW;

    public Broadcast(String id, String name) {
        this.id = id;
        this.name = name;
    }

    public String id() { return id; }
    public String name() { return name; }
    public void name(String name) { this.name = name; }
    public BroadcastType type() { return type; }
    public void type(BroadcastType type) { this.type = type; }
    public List<String> lines() { return lines; }
    /** Fait partie de la rotation automatique. */
    public boolean auto() { return auto; }
    public void auto(boolean auto) { this.auto = auto; }
    /** Clé de son Minecraft (ex. « entity.player.levelup ») ou {@code null}. */
    public String sound() { return sound; }
    public void sound(String sound) { this.sound = sound; }
    /** Durée d'affichage (titre, barre d'action, barre de boss). */
    public int seconds() { return seconds; }
    public void seconds(int seconds) { this.seconds = Math.max(1, Math.min(120, seconds)); }
    /** Seuls les joueurs ayant cette permission reçoivent l'annonce ({@code null} = tout le monde). */
    public String permission() { return permission; }
    public void permission(String permission) { this.permission = permission; }
    public BossBar.Color color() { return color; }
    public void color(BossBar.Color color) { this.color = color; }
}
