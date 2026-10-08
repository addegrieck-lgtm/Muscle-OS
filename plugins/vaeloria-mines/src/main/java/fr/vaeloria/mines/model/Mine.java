package fr.vaeloria.mines.model;

/** Une mine : zone, blocs régénérés, délai de réinitialisation et options d'affichage. */
public final class Mine {
    private final String id;
    private String name;
    private Cuboid region;
    private final Composition composition = new Composition();
    private long intervalSeconds = 900;
    /** Instant (ms) de la prochaine réinitialisation. */
    private long nextResetAt;
    /** Secondes restantes figées pendant une pause, -1 si la mine tourne. */
    private long pausedRemaining = -1;
    private Spot spawn;
    private Spot hologram;
    private boolean announce = true;
    /** Réinitialisation anticipée quand ce pourcentage de la zone a été miné (0 = désactivé). */
    private int resetPercent;

    // État d'exécution, non sauvegardé.
    private long lastRemaining = Long.MAX_VALUE;
    private long mined;
    private boolean resetting;

    public Mine(String id, String name) {
        this.id = id;
        this.name = name;
    }

    public String id() { return id; }
    public String name() { return name; }
    public void name(String name) { this.name = name; }
    public Cuboid region() { return region; }
    public void region(Cuboid region) { this.region = region; }
    public Composition composition() { return composition; }
    public long intervalSeconds() { return intervalSeconds; }
    public long nextResetAt() { return nextResetAt; }
    public void nextResetAt(long at) { this.nextResetAt = at; }
    public Spot spawn() { return spawn; }
    public void spawn(Spot spawn) { this.spawn = spawn; }
    public Spot hologram() { return hologram; }
    public void hologram(Spot hologram) { this.hologram = hologram; }
    public boolean announce() { return announce; }
    public void announce(boolean announce) { this.announce = announce; }
    public int resetPercent() { return resetPercent; }
    public void resetPercent(int percent) { this.resetPercent = Math.max(0, Math.min(100, percent)); }
    public long lastRemaining() { return lastRemaining; }
    public void lastRemaining(long s) { this.lastRemaining = s; }
    public long mined() { return mined; }
    public void mined(long mined) { this.mined = mined; }
    public boolean resetting() { return resetting; }
    public void resetting(boolean resetting) { this.resetting = resetting; }

    public boolean paused() { return pausedRemaining >= 0; }
    public long pausedRemaining() { return pausedRemaining; }

    /** Une mine ne peut tourner qu'avec une zone et au moins un bloc. */
    public boolean ready() {
        return region != null && !composition.isEmpty();
    }

    public long remainingSeconds(long now) {
        if (paused()) return pausedRemaining;
        return Math.max(0, (nextResetAt - now + 999) / 1000);
    }

    /** Change le délai ; le compte à rebours en cours est raccourci s'il dépasse le nouveau délai. */
    public void intervalSeconds(long seconds, long now) {
        intervalSeconds = Math.max(Durations.MIN_SECONDS, Math.min(Durations.MAX_SECONDS, seconds));
        if (paused()) pausedRemaining = Math.min(pausedRemaining, intervalSeconds);
        else if (remainingSeconds(now) > intervalSeconds) restartTimer(now);
    }

    /** Repart pour un délai complet (après une réinitialisation). */
    public void restartTimer(long now) {
        if (paused()) pausedRemaining = intervalSeconds;
        else nextResetAt = now + intervalSeconds * 1000;
        lastRemaining = intervalSeconds;
    }

    public void pause(long now) {
        if (!paused()) pausedRemaining = remainingSeconds(now);
    }

    public void resume(long now) {
        if (!paused()) return;
        nextResetAt = now + pausedRemaining * 1000;
        lastRemaining = pausedRemaining;
        pausedRemaining = -1;
    }

    /** Chargement depuis mines.yml. */
    public void restore(long intervalSeconds, long nextResetAt, long pausedRemaining) {
        this.intervalSeconds = Math.max(Durations.MIN_SECONDS, Math.min(Durations.MAX_SECONDS, intervalSeconds));
        this.nextResetAt = nextResetAt;
        this.pausedRemaining = pausedRemaining < 0 ? -1 : Math.min(pausedRemaining, this.intervalSeconds);
    }

    /** Part de la zone minée depuis la dernière réinitialisation, en %. */
    public double minedPercent() {
        return region == null ? 0 : 100.0 * mined / region.volume();
    }
}
