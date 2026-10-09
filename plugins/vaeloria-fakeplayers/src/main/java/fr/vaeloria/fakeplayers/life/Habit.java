package fr.vaeloria.fakeplayers.life;

import java.time.DayOfWeek;
import java.time.LocalDateTime;

/** Habitudes de connexion d'un habitué : à quelles heures il a l'habitude de jouer. */
public enum Habit {
    /** Collégien / lycéen : après les cours en semaine, l'après-midi et le soir le week-end. */
    SCHOOL(new double[]{0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.2, 0.4, 0.4, 0.3, 0.5, 1, 2, 2.5, 2, 2.5, 2.5, 1.5, 0.5}, 1.6),
    /** Joue tard le soir et la nuit. */
    NIGHT(new double[]{2.5, 2, 1.5, 0.8, 0.3, 0.1, 0, 0, 0, 0, 0, 0, 0.1, 0.2, 0.3, 0.3, 0.4, 0.5, 0.6, 0.8, 1.2, 1.8, 2.5, 2.5}, 1.2),
    /** Adulte : surtout le soir après le travail. */
    EVENING(new double[]{0.4, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.4, 0.3, 0, 0, 0, 0.2, 0.8, 1.5, 2.5, 2.5, 2, 1}, 1.4),
    /** Joue surtout le week-end, peu en semaine. */
    WEEKEND(new double[]{0.5, 0.2, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.3, 0.5, 0.6, 0.8, 1, 1, 1, 1, 1, 1, 1.2, 1.2, 1, 0.8}, 4.0),
    /** Joue un peu à toute heure. */
    ANYTIME(new double[]{0.6, 0.4, 0.2, 0.1, 0.1, 0.1, 0.2, 0.3, 0.5, 0.7, 0.8, 0.9, 1, 1, 1, 1, 1, 1, 1.1, 1.2, 1.3, 1.3, 1.1, 0.8}, 1.2);

    private final double[] hourly;
    private final double weekendBoost;

    Habit(double[] hourly, double weekendBoost) {
        this.hourly = hourly;
        this.weekendBoost = weekendBoost;
    }

    /** Envie de se connecter maintenant (0 = jamais à cette heure). Le week-end compte de 6 h à 6 h. */
    public double weight(LocalDateTime time) {
        DayOfWeek day = time.minusHours(6).getDayOfWeek();
        boolean weekend = day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
        double w = hourly[time.getHour()];
        if (this == WEEKEND && !weekend) return w * 0.25;
        return weekend ? w * weekendBoost : w;
    }
}
