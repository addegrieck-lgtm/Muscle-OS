package fr.vaeloria.vote;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

/**
 * Votes d'un joueur. Logique pure, sans Bukkit.
 *
 * Journée type : chaque vote remplit la cagnotte du jour. Quand les sites requis sont faits,
 * la roue s'ouvre : elle multiplie la cagnotte et la verse. Après la roue, les votes suivants
 * de la journée sont versés directement (×1). Une cagnotte jamais lancée est versée ×1
 * au changement de jour : un joueur ne perd jamais un vote, sauf s'il choisit le quitte ou double.
 * Tout ce qui doit être donné passe par « pending », livré dès que le joueur est en ligne.
 */
public final class PlayerVotes {
    public record Credit(boolean accepted, boolean completedAll, int sitesToday, Reward reward, boolean toPot) {
        static final Credit REFUSED = new Credit(false, false, 0, Reward.NONE, false);
    }

    final Map<String, Long> lastVote = new HashMap<>();
    LocalDate day;
    final Set<String> sitesToday = new LinkedHashSet<>();
    Reward pot = Reward.NONE;
    Reward pending = Reward.NONE;
    boolean spun;
    boolean bonusGiven;
    int multiplier = -1;
    double moneyToday;
    long total;
    int streak;
    LocalDate lastComplete;

    /** @return true si la journée a changé. */
    public boolean rollover(LocalDate today) {
        if (today.equals(day)) return false;
        if (day != null && !pot.isEmpty()) pending = pending.plus(pot);
        pot = Reward.NONE;
        sitesToday.clear();
        spun = false;
        bonusGiven = false;
        multiplier = -1;
        moneyToday = 0;
        day = today;
        return true;
    }

    public boolean available(VoteSite site, long now) {
        Long last = lastVote.get(site.id());
        return last == null || now >= last + site.cooldownMillis();
    }

    public long nextVoteAt(VoteSite site) {
        Long last = lastVote.get(site.id());
        return last == null ? 0 : last + site.cooldownMillis();
    }

    /**
     * @param siteCount nombre de sites configurés (bonus quand tous sont faits dans la journée)
     * @param moneyCap  plafond d'argent versé par jour, ≤ 0 = sans plafond
     */
    public Credit vote(VoteSite site, long now, LocalDate today, Reward reward, Reward completionBonus,
                       int siteCount, double moneyCap) {
        rollover(today);
        if (!available(site, now)) return Credit.REFUSED;
        lastVote.put(site.id(), now);
        sitesToday.add(site.id());
        total++;

        Reward r = reward;
        boolean completed = false;
        if (!bonusGiven && sitesToday.size() >= siteCount) {
            bonusGiven = true;
            completed = true;
            r = r.plus(completionBonus);
            streak = lastComplete != null && lastComplete.equals(today.minusDays(1)) ? streak + 1 : 1;
            lastComplete = today;
        }
        if (spun) {
            r = capped(r, moneyCap);
            pending = pending.plus(r);
            return new Credit(true, completed, sitesToday.size(), r, false);
        }
        pot = pot.plus(r);
        return new Credit(true, completed, sitesToday.size(), r, true);
    }

    public boolean wheelReady(int requiredSites) {
        return !spun && sitesToday.size() >= requiredSites && !pot.isEmpty();
    }

    /** Lance la roue : la cagnotte multipliée part dans « pending ». */
    public Reward spin(int result, double moneyCap) {
        if (spun) throw new IllegalStateException("Roue déjà lancée aujourd'hui");
        spun = true;
        multiplier = result;
        Reward out = capped(pot.times(result), moneyCap);
        pot = Reward.NONE;
        pending = pending.plus(out);
        return out;
    }

    public Reward takePending() {
        Reward r = pending;
        pending = Reward.NONE;
        return r;
    }

    /** Série de journées consécutives avec tous les sites faits (0 si elle est cassée). */
    public int streak(LocalDate today) {
        return lastComplete != null && !lastComplete.isBefore(today.minusDays(1)) ? streak : 0;
    }

    private Reward capped(Reward r, double cap) {
        if (cap <= 0) {
            moneyToday += r.money();
            return r;
        }
        double allowed = Math.max(0, Math.min(r.money(), cap - moneyToday));
        moneyToday += allowed;
        return r.withMoney(allowed);
    }

    public int sitesToday() { return sitesToday.size(); }
    public boolean votedToday(String siteId) { return sitesToday.contains(siteId); }
    public boolean spun() { return spun; }
    public int multiplier() { return multiplier; }
    public Reward pot() { return pot; }
    public Reward pending() { return pending; }
    public long total() { return total; }
}
