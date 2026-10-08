package fr.vaeloria.factions.model;

/** Une ligne du journal de faction (/f logs). */
public final class LogEntry {
    public long time;
    public String type;
    public String actor;
    public String detail;

    public LogEntry() {}

    public LogEntry(long time, String type, String actor, String detail) {
        this.time = time;
        this.type = type;
        this.actor = actor;
        this.detail = detail;
    }
}
