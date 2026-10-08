package fr.vaeloria.tab;

import org.bukkit.configuration.file.FileConfiguration;

import java.util.List;

/** Sections chat et join-quit de config.yml. */
record MessagesSettings(boolean chatEnabled, String chatFormat, String chatHover, String chatClick,
                        boolean joinQuitEnabled, String join, String quit, String firstJoin,
                        List<String> welcome, String silentPermission) {

    static MessagesSettings load(FileConfiguration c) {
        return new MessagesSettings(
                c.getBoolean("chat.enabled", true),
                c.getString("chat.format", "<name> <graphite>»</graphite> <silver><message>"),
                c.getString("chat.hover", ""),
                c.getString("chat.click", ""),
                c.getBoolean("join-quit.enabled", true),
                c.getString("join-quit.join", ""),
                c.getString("join-quit.quit", ""),
                c.getString("join-quit.first-join", ""),
                List.copyOf(c.getStringList("join-quit.welcome")),
                c.getString("join-quit.silent-permission", "vaeloria.join.silent"));
    }
}
