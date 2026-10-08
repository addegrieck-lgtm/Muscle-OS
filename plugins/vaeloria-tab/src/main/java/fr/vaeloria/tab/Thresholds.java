package fr.vaeloria.tab;

/**
 * Couleur d'une mesure selon deux seuils. {@code higherIsBetter} : vrai pour le TPS, faux pour le ping.
 */
public record Thresholds(double good, double medium, boolean higherIsBetter,
                         String goodColor, String mediumColor, String badColor) {

    public String color(double value) {
        if (higherIsBetter ? value >= good : value < good) return goodColor;
        if (higherIsBetter ? value >= medium : value < medium) return mediumColor;
        return badColor;
    }
}
