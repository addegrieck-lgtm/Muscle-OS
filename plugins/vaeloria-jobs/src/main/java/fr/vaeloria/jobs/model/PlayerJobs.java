package fr.vaeloria.jobs.model;

import java.util.LinkedHashMap;
import java.util.Map;

/** Toutes les progressions d'un joueur, par identifiant de métier. */
public final class PlayerJobs {
    private final Map<String, JobProgress> jobs = new LinkedHashMap<>();
    private boolean dirty;

    public JobProgress get(String jobId) {
        return jobs.computeIfAbsent(jobId, k -> new JobProgress());
    }

    public Map<String, JobProgress> all() { return jobs; }

    public boolean dirty() { return dirty; }

    public void markDirty() { dirty = true; }

    public void markClean() { dirty = false; }
}
