package fr.vaeloria.echanges;

import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.PlayerInventory;

/**
 * Paiement en émeraudes. Seules les émeraudes ordinaires comptent : une émeraude renommée ou marquée
 * par un autre plugin (clé de coffre, jeton…) n'est jamais prise.
 */
public final class Emeralds {
    private Emeralds() {}

    private static final ItemStack PLAIN = new ItemStack(Material.EMERALD);

    private static boolean plain(ItemStack it) {
        return it != null && it.isSimilar(PLAIN);
    }

    public static int count(Player p) {
        int n = 0;
        for (ItemStack it : p.getInventory().getStorageContents()) if (plain(it)) n += it.getAmount();
        return n;
    }

    /** Retire {@code amount} émeraudes ; ne retire rien et renvoie false s'il n'y en a pas assez. */
    public static boolean take(Player p, int amount) {
        if (amount <= 0) return true;
        if (count(p) < amount) return false;
        PlayerInventory inv = p.getInventory();
        ItemStack[] contents = inv.getStorageContents();
        int left = amount;
        for (int i = 0; i < contents.length && left > 0; i++) {
            ItemStack it = contents[i];
            if (!plain(it)) continue;
            int take = Math.min(left, it.getAmount());
            it.setAmount(it.getAmount() - take);
            left -= take;
            if (it.getAmount() <= 0) contents[i] = null;
        }
        inv.setStorageContents(contents);
        return true;
    }

    public static String format(int n) {
        return n + (n > 1 ? " émeraudes" : " émeraude");
    }
}
