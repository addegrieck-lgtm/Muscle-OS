package fr.vaeloria.tab;

import org.bukkit.configuration.file.FileConfiguration;

import java.util.List;

/** Section server-list de config.yml : tout ce qu'affiche l'écran Multijoueur. */
record ServerListSettings(boolean enabled, boolean center, String line1, List<String> line2, int rotateSeconds,
                          List<String> hover, boolean hoverPlayers, int hoverPlayersMax,
                          String versionText, int maxPlayers,
                          boolean maintenance, String maintenanceLine2, String maintenanceVersion,
                          String maintenanceKick) {

    static ServerListSettings load(FileConfiguration c) {
        String p = "server-list.";
        List<String> line2 = c.getStringList(p + "motd.line2");
        return new ServerListSettings(
                c.getBoolean(p + "enabled", true),
                c.getBoolean(p + "motd.center", true),
                c.getString(p + "motd.line1", "<logo>"),
                line2.isEmpty() ? List.of("") : List.copyOf(line2),
                Math.max(1, c.getInt(p + "motd.rotate-seconds", 8)),
                List.copyOf(c.getStringList(p + "hover.lines")),
                c.getBoolean(p + "hover.show-players", true),
                Math.max(0, c.getInt(p + "hover.max-players", 8)),
                c.getString(p + "version-text", ""),
                c.getInt(p + "max-players", -1),
                c.getBoolean(p + "maintenance.enabled", false),
                c.getString(p + "maintenance.line2", ""),
                c.getString(p + "maintenance.version-text", "Maintenance"),
                c.getString(p + "maintenance.kick-message", "Maintenance en cours."));
    }

    /** Ligne 2 du moment : les messages défilent toutes les {@code rotateSeconds}. */
    String line2At(long epochMillis) {
        if (maintenance) return maintenanceLine2;
        return line2.get((int) Math.floorMod(epochMillis / 1000 / rotateSeconds, (long) line2.size()));
    }
}
