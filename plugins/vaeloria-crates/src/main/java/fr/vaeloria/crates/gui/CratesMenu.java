package fr.vaeloria.crates.gui;

import fr.vaeloria.crates.VaeloriaCratesPlugin;
import fr.vaeloria.crates.model.Crate;
import fr.vaeloria.crates.model.CrateIds;
import fr.vaeloria.crates.util.Items;
import org.bukkit.Material;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;

/** Accueil admin : liste des coffres + création. */
public final class CratesMenu extends Menu {
    private final VaeloriaCratesPlugin plugin;
    private int page;

    public CratesMenu(VaeloriaCratesPlugin plugin, Player viewer) {
        this(plugin, viewer, 0);
    }

    public CratesMenu(VaeloriaCratesPlugin plugin, Player viewer, int page) {
        super(viewer, 6, "&8Coffres — administration");
        this.plugin = plugin;
        this.page = page;
    }

    @Override
    protected void render() {
        List<Crate> all = new ArrayList<>(plugin.crates().all());
        int pages = Math.max(1, (all.size() + 44) / 45);
        page = Math.min(page, pages - 1);
        for (int i = 0; i < 45 && page * 45 + i < all.size(); i++) {
            Crate crate = all.get(page * 45 + i);
            set(i, Items.withLore(crate.key(), List.of(
                    "",
                    "&8Coffre : " + crate.name(),
                    "&7Identifiant : &f" + crate.id(),
                    "&7Lots : &f" + crate.rewards().size() + " &8· &7Emplacements : &f" + crate.locations().size(),
                    "",
                    "&eClic &7pour modifier")), e -> new CrateEditMenu(plugin, viewer, crate).open());
        }
        for (int i = 45; i < 54; i++) set(i, Items.filler());
        if (page > 0) set(45, Items.icon(Material.ARROW, "&fPage précédente"), e -> { page--; redraw(); });
        if (page < pages - 1) set(53, Items.icon(Material.ARROW, "&fPage suivante"), e -> { page++; redraw(); });
        set(49, Items.icon(Material.EMERALD, "&aCréer un coffre",
                "&7Tu choisiras ensuite sa clé,", "&7ses lots et le bloc du monde", "&7qui l'ouvre."), e -> askName());
        set(48, Items.icon(Material.BOOK, "&eAide",
                "&71. Crée un coffre",
                "&72. Clé : dépose l'objet de ton choix",
                "&73. Lots : dépose tes objets, règle les chances",
                "&74. Placer : clique le bloc du monde",
                "&75. &f/crate give <joueur> <coffre> [n]"));
    }

    private void askName() {
        plugin.prompts().ask(viewer, "Nom du nouveau coffre ? &8(couleurs avec &7&&8, ex. &7&6Coffre Légendaire&8)",
                name -> {
                    String id = CrateIds.slug(name);
                    if (id.isEmpty()) {
                        plugin.msg(viewer, "&cNom invalide : utilise au moins une lettre ou un chiffre.");
                        open();
                        return;
                    }
                    if (plugin.crates().get(id) != null) {
                        plugin.msg(viewer, "&cUn coffre « " + id + " » existe déjà.");
                        open();
                        return;
                    }
                    Crate crate = plugin.crates().create(id, name);
                    plugin.msg(viewer, "Coffre créé : " + crate.name() + " &7(id &f" + id + "&7).");
                    new CrateEditMenu(plugin, viewer, crate).open();
                }, this::open);
    }
}
