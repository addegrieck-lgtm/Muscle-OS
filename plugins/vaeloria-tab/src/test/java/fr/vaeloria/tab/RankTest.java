package fr.vaeloria.tab;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class RankTest {
    private final Rank admin = new Rank("admin", "vaeloria.rank.admin", 90, "ADMIN", "<player>");
    private final Rank vaelorian = new Rank("vaelorian", "vaeloria.rank.vaelorian", 50, "VÆLORIAN", "<player>");
    private final Rank joueur = new Rank("default", "", 0, "Joueur", "<player>");
    private final List<Rank> ranks = List.of(vaelorian, joueur, admin);

    @Test
    void gradeLePlusHautParmiLesPermissions() {
        Set<String> perms = Set.of("vaeloria.rank.vaelorian", "vaeloria.rank.admin");
        assertEquals(admin, Rank.resolve(ranks, perms::contains));
        assertEquals(vaelorian, Rank.resolve(ranks, Set.of("vaeloria.rank.vaelorian")::contains));
    }

    @Test
    void gradeParDefautSansPermission() {
        assertEquals(joueur, Rank.resolve(ranks, p -> false));
        assertNull(Rank.resolve(List.of(admin), p -> false));
    }
}
