package fr.vaeloria.vote;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/** Argent + objets (nom de matériau → quantité). Immuable ; l'argent est arrondi au centime. */
public record Reward(double money, Map<String, Integer> items) {
    public static final Reward NONE = new Reward(0, Map.of());

    public Reward {
        if (money < 0 || Double.isNaN(money)) throw new IllegalArgumentException("Montant invalide : " + money);
        money = Math.round(money * 100) / 100.0;
        Map<String, Integer> copy = new LinkedHashMap<>();
        items.forEach((name, amount) -> {
            if (amount < 0) throw new IllegalArgumentException("Quantité négative pour " + name);
            if (amount > 0) copy.merge(name.toUpperCase(Locale.ROOT), amount, Integer::sum);
        });
        items = Collections.unmodifiableMap(copy);
    }

    public boolean isEmpty() {
        return money <= 0 && items.isEmpty();
    }

    public Reward plus(Reward other) {
        Map<String, Integer> sum = new LinkedHashMap<>(items);
        other.items.forEach((k, v) -> sum.merge(k, v, Integer::sum));
        return new Reward(money + other.money, sum);
    }

    /** Multiplie tout ; ×0 = rien. */
    public Reward times(int multiplier) {
        if (multiplier < 0) throw new IllegalArgumentException("Multiplicateur négatif");
        if (multiplier == 0) return NONE;
        Map<String, Integer> scaled = new LinkedHashMap<>();
        items.forEach((k, v) -> scaled.put(k, v * multiplier));
        return new Reward(money * multiplier, scaled);
    }

    public Reward withMoney(double amount) {
        return new Reward(amount, items);
    }
}
