package fr.vaeloria.fakeplayers.life;

/**
 * Aventure en cours d'une team. Chaque type a ses phrases dans phrases.yml (events.life-&lt;clé&gt;-start, -progress,
 * -done) ; « stuff » fait monter l'équipement de toute la team d'un niveau quand il se termine.
 */
public enum Project {
    BASE("base", 1.0), NETHER("nether", 0.8), XP_FARM("xp", 0.7), STUFF("stuff", 1.0), MINE("mine", 0.9),
    KOTH("koth", 0.6), EXPLORE("explore", 0.7);

    private final String key;
    private final double weight;

    Project(String key, double weight) {
        this.key = key;
        this.weight = weight;
    }

    public String key() { return key; }
    public double weight() { return weight; }

    public static Project byKey(String key) {
        for (Project p : values()) if (p.key.equals(key)) return p;
        return BASE;
    }
}
