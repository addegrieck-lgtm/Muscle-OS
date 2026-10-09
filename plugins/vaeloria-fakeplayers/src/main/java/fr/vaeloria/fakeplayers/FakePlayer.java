package fr.vaeloria.fakeplayers;

import org.bukkit.Location;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/** Un faux joueur : entrée TAB, compteur, messages et (optionnellement) un corps « mannequin » dans le monde. */
public final class FakePlayer {
    private final String name;
    private final UUID uuid;
    private final boolean auto;
    private final long joinedAt = System.currentTimeMillis();
    private volatile Skin skin;
    private int ping;
    /** Ping habituel (sa connexion) et mesures restantes d'un pic de lag en cours. */
    private final int basePing;
    private int spikeLeft;
    private UUID bodyId;
    /** Mode ambiance : fin de session prévue (System.currentTimeMillis), 0 = jamais. */
    private long leaveAt;
    /** Départ annoncé (message d'au revoir envoyé), déconnexion imminente. */
    private boolean leaving;
    /** AFK au spawn : ne parle pas, ne répond pas (les messages reçus sont rattrapés à son retour). */
    private volatile boolean afk;
    /** Visible dans la liste TAB (sinon seulement compté), selon les places laissées par VaeloriaTab. */
    private volatile boolean listed = true;
    private Location bodyLocation;

    /** Texture signée Mojang (propriété « textures »). */
    public record Skin(String value, String signature) {}

    public FakePlayer(String name, boolean auto, int ping) {
        this.name = name;
        this.uuid = offlineUuid(name);
        this.auto = auto;
        this.ping = ping;
        this.basePing = ping;
    }

    /** Même calcul que les serveurs hors-ligne : ne peut pas entrer en collision avec un UUID Mojang (v4). */
    public static UUID offlineUuid(String name) {
        return UUID.nameUUIDFromBytes(("OfflinePlayer:" + name).getBytes(StandardCharsets.UTF_8));
    }

    public String name() { return name; }
    public UUID uuid() { return uuid; }
    /** Créé par le mode ambiance (et donc retirable par lui), pas par un admin. */
    public boolean auto() { return auto; }
    public long joinedAt() { return joinedAt; }
    public Skin skin() { return skin; }
    public void skin(Skin skin) { this.skin = skin; }
    public int ping() { return ping; }
    public void ping(int ping) { this.ping = ping; }
    public int basePing() { return basePing; }
    int spikeLeft() { return spikeLeft; }
    void spikeLeft(int spikeLeft) { this.spikeLeft = spikeLeft; }
    public UUID bodyId() { return bodyId; }
    public void bodyId(UUID bodyId) { this.bodyId = bodyId; }
    public Location bodyLocation() { return bodyLocation == null ? null : bodyLocation.clone(); }
    public void bodyLocation(Location location) { this.bodyLocation = location == null ? null : location.clone(); }
    public boolean hasBody() { return bodyLocation != null; }
    public long leaveAt() { return leaveAt; }
    public void leaveAt(long leaveAt) { this.leaveAt = leaveAt; }
    public boolean leaving() { return leaving; }
    public boolean afk() { return afk; }
    public void afk(boolean afk) { this.afk = afk; }
    public boolean listed() { return listed; }
    public void listed(boolean listed) { this.listed = listed; }
    public void leaving(boolean leaving) { this.leaving = leaving; }
}
