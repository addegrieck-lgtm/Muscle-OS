package fr.vaeloria.arena;

/** Les deux camps d'un combat d'arène. */
public enum Team {
    ROUGE("Rouge", "R"),
    BLEU("Bleu", "B");

    public final String label;
    public final String tag;

    Team(String label, String tag) {
        this.label = label;
        this.tag = tag;
    }

    public Team opponent() {
        return this == ROUGE ? BLEU : ROUGE;
    }
}
