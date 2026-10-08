package fr.vaeloria.factions.model;

import java.util.UUID;

/** Données persistantes d'un joueur (power, statistiques). L'appartenance est portée par la faction. */
public final class FPlayer {
    public UUID uuid;
    public String name;
    public double power;
    public int kills;
    public int deaths;
    public long lastSeen;
    /** Série de kills en cours (remise à zéro à la mort) : sert aux primes. */
    public int streak;

    public transient ChatMode chatMode = ChatMode.PUBLIC;
    public transient boolean autoClaim;
    public transient boolean autoMap;
    public transient boolean adminBypass;
    public transient boolean flying;
    public transient boolean scoreboard = true;

    public FPlayer() {}

    public FPlayer(UUID uuid, String name, double power) {
        this.uuid = uuid;
        this.name = name;
        this.power = power;
        this.lastSeen = System.currentTimeMillis();
    }

    public enum ChatMode { PUBLIC, FACTION, ALLY }
}
