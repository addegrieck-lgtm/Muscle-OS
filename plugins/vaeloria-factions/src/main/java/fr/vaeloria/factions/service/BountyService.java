package fr.vaeloria.factions.service;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.FPlayer;
import fr.vaeloria.factions.rules.Bounty;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import org.bukkit.Bukkit;
import org.bukkit.Sound;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Primes : un joueur en série de kills a la tête mise à prix, un pourcentage de sa fortune (5 % dès 5 kills,
 * 10 % dès 15 par défaut). Celui qui l'abat empoche la prime, prélevée sur l'argent réel de la victime.
 * Les kills farmés (même tueur trop souvent, même IP) ne comptent pas.
 */
public final class BountyService {
    private final VaeloriaFactionsPlugin plugin;

    public BountyService(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
    }

    private Settings s() { return plugin.settings(); }

    public int percent(FPlayer fp) {
        return fp == null ? 0 : Bounty.percent(s().bountyTiers, fp.streak);
    }

    /** Valeur actuelle de la prime sur la tête d'un joueur. */
    public double value(Player p) {
        FPlayer fp = plugin.manager().fplayer(p);
        if (!plugin.bank().available()) return 0;
        return Bounty.amount(plugin.bank().balance(p), percent(fp), s().bountyMaxAmount);
    }

    /** Une mort : la série de la victime s'arrête ; un kill valide fait payer la prime et prolonge la série du tueur. */
    public void onDeath(Player victim, Player killer, boolean validKill) {
        FPlayer fv = plugin.manager().fplayer(victim);
        int victimStreak = fv.streak;
        int pct = percent(fv);
        fv.streak = 0;
        plugin.manager().markDirty();
        if (!s().bountyEnabled || killer == null || !validKill) return;

        if (pct > 0 && plugin.bank().available()) {
            double amount = Bounty.amount(plugin.bank().balance(victim), pct, s().bountyMaxAmount);
            if (amount > 0 && plugin.bank().withdraw(victim, amount)) {
                if (plugin.bank().deposit(killer, amount)) {
                    Bukkit.broadcast(Msg.prefixed("bounty.claimed", "killer", killer.getName(), "victim", victim.getName(),
                            "amount", plugin.bank().format(amount), "streak", victimStreak, "percent", pct));
                    killer.playSound(killer.getLocation(), Sound.ENTITY_PLAYER_LEVELUP, 1f, 0.7f);
                } else {
                    plugin.bank().deposit(victim, amount); // remboursement si le versement échoue
                }
            }
        } else if (victimStreak >= s().bountyAnnounceEvery) {
            Bukkit.broadcast(Msg.prefixed("bounty.streak-ended", "killer", killer.getName(), "victim", victim.getName(), "streak", victimStreak));
        }

        FPlayer fk = plugin.manager().fplayer(killer);
        fk.streak++;
        if (Bounty.announce(s().bountyTiers, fk.streak, s().bountyAnnounceEvery)) {
            int kp = percent(fk);
            Bukkit.broadcast(Msg.prefixed("bounty.streak", "player", killer.getName(), "streak", fk.streak, "percent", kp,
                    "amount", plugin.bank().format(value(killer))));
        }
    }

    /** Mort sans tueur (chute, lave…) : la série s'arrête quand même. */
    public void resetStreak(Player p) {
        FPlayer fp = plugin.manager().fplayer(p);
        if (fp.streak != 0) {
            fp.streak = 0;
            plugin.manager().markDirty();
        }
    }

    public void show(CommandSender to, Player target) {
        FPlayer fp = plugin.manager().fplayer(target);
        int pct = percent(fp);
        if (pct <= 0) {
            int next = s().bountyTiers.isEmpty() ? 0 : s().bountyTiers.get(0)[0];
            Msg.send(to, "bounty.none", "player", target.getName(), "streak", fp.streak, "next", next);
            return;
        }
        Msg.send(to, "bounty.show", "player", target.getName(), "streak", fp.streak, "percent", pct, "amount", plugin.bank().format(value(target)));
    }

    public void top(CommandSender to) {
        List<Player> hunted = new ArrayList<>();
        for (Player p : Bukkit.getOnlinePlayers()) if (percent(plugin.manager().fplayer(p)) > 0) hunted.add(p);
        hunted.sort(Comparator.comparingDouble(this::value).reversed());
        to.sendMessage(Msg.get("bounty.top-header"));
        if (hunted.isEmpty()) {
            Msg.send(to, "bounty.top-empty");
            return;
        }
        for (int i = 0; i < Math.min(10, hunted.size()); i++) {
            Player p = hunted.get(i);
            FPlayer fp = plugin.manager().fplayer(p);
            to.sendMessage(Msg.get("bounty.top-line", "rank", i + 1, "player", p.getName(), "streak", fp.streak,
                    "percent", percent(fp), "amount", plugin.bank().format(value(p))));
        }
    }
}
