package fr.vaeloria.vote;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.title.Title;
import org.bukkit.Bukkit;
import org.bukkit.Sound;
import org.bukkit.entity.Player;

import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * La roue du jour. Le résultat est tiré et ENREGISTRÉ avant l'animation : se déconnecter pendant
 * qu'elle tourne ne change rien (le gain est versé à la reconnexion).
 */
final class WheelSpin {
    enum Mode { CLASSIC, RISKY }

    private static final int[] FRAME_DELAYS = {2, 2, 2, 2, 2, 3, 3, 3, 4, 4, 5, 6, 8, 10};
    private final VaeloriaVotePlugin plugin;
    private final Set<UUID> spinning = new HashSet<>();

    WheelSpin(VaeloriaVotePlugin plugin) {
        this.plugin = plugin;
    }

    boolean spinning(Player p) {
        return spinning.contains(p.getUniqueId());
    }

    void spin(Player p, Mode mode) {
        Votes votes = plugin.votes();
        Settings s = votes.settings();
        PlayerVotes v = votes.data(p);
        if (spinning(p)) return;
        if (v.spun()) {
            p.sendMessage(Text.prefixed("<loss>Tu as déjà lancé la roue aujourd'hui</loss> <ash>(résultat : ×" + v.multiplier() + "). Reviens demain !"));
            return;
        }
        if (!v.wheelReady(s.requiredSites())) {
            p.sendMessage(Text.prefixed("<loss>Roue verrouillée :</loss> <steel>fais tes <snow>" + s.requiredSites()
                    + "</snow> votes du jour d'abord <ash>(" + v.sitesToday() + "/" + s.requiredSites() + ")</ash>. "
                    + "<click:run_command:'/vote'><ruby_hi>[/vote]</ruby_hi></click>"));
            return;
        }
        Wheel wheel = mode == Mode.RISKY ? s.risky() : s.classic();
        Reward before = v.pot();
        int result = wheel.pick(ThreadLocalRandom.current().nextDouble());
        Reward won = v.spin(result, s.moneyCapPerDay());
        votes.save(p.getUniqueId(), v);
        plugin.getLogger().info("Roue " + mode + " de " + p.getName() + " : ×" + result);

        spinning.add(p.getUniqueId());
        List<Integer> faces = wheel.slices().stream().map(Wheel.Slice::multiplier).toList();
        animate(p, mode, faces, 0, result, before, won);
    }

    private void animate(Player p, Mode mode, List<Integer> faces, int frame, int result, Reward before, Reward won) {
        if (!p.isOnline()) {
            spinning.remove(p.getUniqueId());
            return;
        }
        if (frame < FRAME_DELAYS.length) {
            int shown = faces.get((frame + ThreadLocalRandom.current().nextInt(faces.size())) % faces.size());
            p.showTitle(Title.title(face(shown), Text.mm(mode == Mode.RISKY ? "<loss>Quitte ou double…" : "<steel>La roue tourne…"),
                    Title.Times.times(Duration.ZERO, Duration.ofSeconds(1), Duration.ZERO)));
            p.playSound(p.getLocation(), Sound.BLOCK_NOTE_BLOCK_HAT, 0.8f, 0.8f + frame * 0.08f);
            Bukkit.getScheduler().runTaskLater(plugin, () -> animate(p, mode, faces, frame + 1, result, before, won), FRAME_DELAYS[frame]);
            return;
        }
        spinning.remove(p.getUniqueId());
        Votes votes = plugin.votes();
        Settings s = votes.settings();
        if (result == 0) {
            p.showTitle(Title.title(Text.mm("<loss><b>PERDU"), Text.mm("<steel>La cagnotte part en fumée…"),
                    Title.Times.times(Duration.ZERO, Duration.ofSeconds(3), Duration.ofMillis(800))));
            p.playSound(p.getLocation(), Sound.ENTITY_VILLAGER_NO, 1f, 0.8f);
            p.sendMessage(Text.prefixed("<loss>Pas de chance : ×0.</loss> <steel>Tu misais " + Text.describe(before, votes.money())
                    + "<steel>. Demain, la roue tourne à nouveau !"));
            if (s.broadcastLoss()) broadcast(p, "<snow>" + Text.esc(p.getName()) + "</snow> <steel>a tenté le quitte ou double… et a <loss>tout perdu</loss>. <ash>/vote");
            return;
        }
        p.showTitle(Title.title(face(result), Text.mm(result >= 3 ? "<gold>Jackpot !" : "<steel>Cagnotte multipliée"),
                Title.Times.times(Duration.ZERO, Duration.ofSeconds(3), Duration.ofMillis(800))));
        p.playSound(p.getLocation(), result >= 3 ? Sound.UI_TOAST_CHALLENGE_COMPLETE : Sound.ENTITY_PLAYER_LEVELUP, 1f, 1f);
        votes.deliver(p, "<gain>Roue ×" + result + " !</gain> <steel>Tu reçois :");
        if (won.money() < before.money() * result - 0.01) {
            p.sendMessage(Text.prefixed("<ash>(argent limité au plafond du jour de " + votes.money().format(s.moneyCapPerDay()) + ")"));
        }
        if (result >= s.broadcastMinMultiplier()) {
            broadcast(p, "<snow>" + Text.esc(p.getName()) + "</snow> <steel>décroche <gold><b>×" + result
                    + "</b></gold> à la roue des votes ! <click:run_command:'/vote'><ruby_hi>[/vote]</ruby_hi></click>");
        }
    }

    private static Component face(int multiplier) {
        return Text.mm(multiplier == 0 ? "<loss><b>×0" : multiplier >= 4 ? "<ruby_hi><b>×" + multiplier : multiplier >= 3 ? "<gold><b>×" + multiplier
                : multiplier == 2 ? "<silver><b>×2" : "<steel><b>×" + multiplier);
    }

    private static void broadcast(Player except, String miniMessage) {
        Component msg = Text.prefixed(miniMessage);
        for (Player p : Bukkit.getOnlinePlayers()) if (!p.equals(except)) p.sendMessage(msg);
    }
}
