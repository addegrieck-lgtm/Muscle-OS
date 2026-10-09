package fr.vaeloria.staff.util;

import org.bukkit.configuration.file.YamlConfiguration;

import java.io.File;
import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.logging.Level;
import java.util.logging.Logger;

public final class YamlFiles {
    private YamlFiles() {}

    /** Écrit dans un fichier temporaire puis renomme : jamais de fichier à moitié écrit en cas de plantage. */
    public static void save(YamlConfiguration yml, File file, Logger log) {
        try {
            File tmp = new File(file.getParentFile(), file.getName() + ".tmp");
            yml.save(tmp);
            try {
                Files.move(tmp.toPath(), file.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException e) {
                Files.move(tmp.toPath(), file.toPath(), StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            log.log(Level.SEVERE, "Impossible d'enregistrer " + file.getName(), e);
        }
    }
}
