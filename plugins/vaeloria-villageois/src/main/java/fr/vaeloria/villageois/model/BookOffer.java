package fr.vaeloria.villageois.model;

/**
 * Un livre que les bibliothécaires peuvent proposer.
 *
 * @param id       clé dans la config (ex. « protection-4 »)
 * @param enchant  enchantement Minecraft (ex. « protection »)
 * @param price    prix en émeraudes, réductions ignorées (soin de zombie, Héros du village)
 * @param maxUses  achats possibles avant le réapprovisionnement du villageois
 * @param weight   poids de tirage sans boost
 * @param perBoost poids ajouté (ou retiré, si négatif) par niveau de chance du villageois
 * @param announce annonce à tout le serveur quand un boost fait apparaître ce livre
 */
public record BookOffer(String id, String enchant, int level, int price, int maxUses,
                        int weight, int perBoost, boolean announce) {
    public BookOffer {
        if (level < 1) throw new IllegalArgumentException(id + " : niveau < 1");
        if (price < 1) throw new IllegalArgumentException(id + " : prix < 1");
        if (maxUses < 1) throw new IllegalArgumentException(id + " : max-uses < 1");
        if (weight < 0) throw new IllegalArgumentException(id + " : poids négatif");
    }

    /** Poids pour un niveau de chance donné (jamais négatif). */
    public int weightAt(int luck) {
        return Math.max(0, weight + perBoost * luck);
    }
}
