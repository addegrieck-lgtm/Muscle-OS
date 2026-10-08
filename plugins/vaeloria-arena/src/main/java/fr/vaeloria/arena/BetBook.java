package fr.vaeloria.arena;

import java.util.Collections;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Pari mutuel d'un combat (sans Bukkit, testé unitairement) : les joueurs misent sur Rouge ou Bleu,
 * puis les gagnants se partagent la mise des perdants au prorata de leur mise.
 *
 * <p>Un joueur ne mise que sur une équipe (il peut relancer sur la même). S'il n'y a de mises que d'un
 * côté, ou en cas d'égalité, tout le monde est remboursé : on parie toujours contre d'autres joueurs.
 */
public final class BetBook {
    public enum Refusal { CLOSED, OTHER_TEAM, BELOW_MIN, ABOVE_MAX }

    public record Bet(UUID player, String name, Team team, double amount) {}

    private final Map<UUID, Bet> bets = new LinkedHashMap<>();
    private final double min;
    private final double max;
    private final double cut;
    private boolean open = true;

    /** @param cutPercent part prélevée par le serveur sur la mise des perdants (0 = tout va aux gagnants) */
    public BetBook(double min, double max, double cutPercent) {
        this.min = min;
        this.max = max;
        this.cut = Math.max(0, Math.min(100, cutPercent)) / 100.0;
    }

    /** Vérifie une mise avant de débiter le joueur. Vide si elle est acceptable. */
    public Optional<Refusal> check(UUID player, Team team, double amount) {
        if (!open) return Optional.of(Refusal.CLOSED);
        Bet current = bets.get(player);
        if (current != null && current.team() != team) return Optional.of(Refusal.OTHER_TEAM);
        if (!(amount >= min)) return Optional.of(Refusal.BELOW_MIN);
        if ((current == null ? 0 : current.amount()) + amount > max) return Optional.of(Refusal.ABOVE_MAX);
        return Optional.empty();
    }

    /** Enregistre une mise déjà débitée (après {@link #check}). Retourne la mise totale du joueur. */
    public double add(UUID player, String name, Team team, double amount) {
        Bet b = bets.merge(player, new Bet(player, name, team, amount),
                (old, add) -> new Bet(player, name, team, old.amount() + add.amount()));
        return b.amount();
    }

    public void close() {
        open = false;
    }

    public boolean isOpen() {
        return open;
    }

    public Optional<Bet> bet(UUID player) {
        return Optional.ofNullable(bets.get(player));
    }

    public Map<UUID, Bet> bets() {
        return Collections.unmodifiableMap(bets);
    }

    public double pool(Team t) {
        return bets.values().stream().filter(b -> b.team() == t).mapToDouble(Bet::amount).sum();
    }

    public int bettors(Team t) {
        return (int) bets.values().stream().filter(b -> b.team() == t).count();
    }

    /** Des mises des deux côtés : le pari peut avoir lieu. */
    public boolean contested() {
        return pool(Team.ROUGE) > 0 && pool(Team.BLEU) > 0;
    }

    /** Somme reçue pour 1 misé si {@code t} gagne (mise comprise), selon les mises actuelles. 0 si personne sur t. */
    public double odds(Team t) {
        double mine = pool(t);
        if (mine <= 0) return 0;
        return 1 + pool(t.opponent()) * (1 - cut) / mine;
    }

    /** Remboursement intégral de chacun (combat annulé, égalité, pari sans adversaire). Vide le carnet. */
    public Map<UUID, Double> refundAll() {
        Map<UUID, Double> out = new LinkedHashMap<>();
        bets.values().forEach(b -> out.put(b.player(), b.amount()));
        bets.clear();
        open = false;
        return out;
    }

    /**
     * Paiements de fin de combat : chaque gagnant récupère sa mise plus sa part de la mise des perdants,
     * arrondie au centime inférieur. Remboursement de tous si égalité ou pari sans adversaire. Vide le carnet.
     */
    public Map<UUID, Double> settle(Optional<Team> winner) {
        if (winner.isEmpty() || !contested()) return refundAll();
        Team w = winner.get();
        Map<Team, Double> pools = new EnumMap<>(Team.class);
        for (Team t : Team.values()) pools.put(t, pool(t));
        double prize = pools.get(w.opponent()) * (1 - cut);
        Map<UUID, Double> out = new LinkedHashMap<>();
        for (Bet b : bets.values()) {
            if (b.team() != w) continue;
            out.put(b.player(), floorCents(b.amount() + prize * b.amount() / pools.get(w)));
        }
        bets.clear();
        open = false;
        return out;
    }

    static double floorCents(double v) {
        return Math.floor(v * 100 + 1e-6) / 100.0;
    }
}
