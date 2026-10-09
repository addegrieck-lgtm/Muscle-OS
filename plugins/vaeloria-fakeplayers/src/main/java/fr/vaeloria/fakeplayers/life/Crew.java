package fr.vaeloria.fakeplayers.life;

import java.util.ArrayList;
import java.util.List;

/** Team d'habitués (dans le chat seulement : ce n'est pas une faction du plugin de factions). */
public final class Crew {
    public static final int MAX_SIZE = 5;

    private final String id;
    private final List<String> members;
    private Project project;
    private double progress;
    private int completed;

    public Crew(String id, List<String> members, Project project, double progress, int completed) {
        this.id = id;
        this.members = new ArrayList<>(members);
        this.project = project;
        this.progress = progress;
        this.completed = completed;
    }

    public String id() { return id; }
    public List<String> members() { return members; }
    public Project project() { return project; }
    public double progress() { return progress; }
    public int completed() { return completed; }

    void progress(double progress) { this.progress = progress; }

    void next(Project project) {
        this.project = project;
        this.progress = 0;
        this.completed++;
    }
}
