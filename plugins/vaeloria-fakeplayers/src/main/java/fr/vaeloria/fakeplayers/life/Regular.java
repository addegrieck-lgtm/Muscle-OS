package fr.vaeloria.fakeplayers.life;

/** Habitué : pseudo fixe, habitudes, team, niveau d'équipement (0 = rien … 5 = netherite) et ancienneté. */
public final class Regular {
    public static final int MAX_TIER = 5;

    private final String name;
    private final Habit habit;
    private String crew;
    private int tier;
    private int days;
    private long lastSeenDay;

    public Regular(String name, Habit habit, String crew, int tier, int days, long lastSeenDay) {
        this.name = name;
        this.habit = habit;
        this.crew = crew;
        this.tier = Math.max(0, Math.min(MAX_TIER, tier));
        this.days = days;
        this.lastSeenDay = lastSeenDay;
    }

    public String name() { return name; }
    public Habit habit() { return habit; }
    public String crew() { return crew; }
    public void crew(String crew) { this.crew = crew; }
    public int tier() { return tier; }
    public void tier(int tier) { this.tier = Math.max(0, Math.min(MAX_TIER, tier)); }
    public int days() { return days; }
    public long lastSeenDay() { return lastSeenDay; }

    /** Connexion ce jour-là : compte un jour joué de plus au premier passage de la journée. */
    public void seen(long epochDay) {
        if (epochDay != lastSeenDay) {
            days++;
            lastSeenDay = epochDay;
        }
    }
}
