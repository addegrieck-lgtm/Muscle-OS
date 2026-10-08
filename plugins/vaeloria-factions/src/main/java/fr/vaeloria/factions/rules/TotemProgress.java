package fr.vaeloria.factions.rules;

/**
 * Règle du Totem : une faction doit casser tous les blocs à la suite. Si une autre faction casse un bloc,
 * le totem se reconstruit et c'est elle qui prend la main (avec ce premier bloc déjà compté).
 */
public final class TotemProgress {
    public enum Outcome { PROGRESS, TAKEOVER, WIN }

    private final int height;
    private String faction;
    private int broken;

    public TotemProgress(int height) {
        this.height = Math.max(1, height);
    }

    public Outcome hit(String factionId) {
        boolean takeover = faction != null && !faction.equals(factionId);
        if (faction == null || takeover) {
            faction = factionId;
            broken = 0;
        }
        broken++;
        if (broken >= height) return Outcome.WIN;
        return takeover ? Outcome.TAKEOVER : Outcome.PROGRESS;
    }

    public String faction() { return faction; }
    public int broken() { return broken; }
    public int height() { return height; }
    public int remaining() { return height - broken; }
}
