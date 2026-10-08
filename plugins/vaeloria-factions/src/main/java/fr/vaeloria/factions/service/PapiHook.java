package fr.vaeloria.factions.service;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.FPlayer;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.util.Msg;
import me.clip.placeholderapi.expansion.PlaceholderExpansion;
import org.bukkit.OfflinePlayer;
import org.jetbrains.annotations.NotNull;

/**
 * Placeholders %vfactions_…% pour TAB, hologrammes, scoreboards d'autres plugins.
 * Classe chargée uniquement si PlaceholderAPI est installé.
 */
final class PapiHook extends PlaceholderExpansion {
    private final VaeloriaFactionsPlugin plugin;

    PapiHook(VaeloriaFactionsPlugin plugin) { this.plugin = plugin; }

    static void register(VaeloriaFactionsPlugin plugin) { new PapiHook(plugin).register(); }

    @Override public @NotNull String getIdentifier() { return "vfactions"; }
    @Override public @NotNull String getAuthor() { return "VÆLORIA"; }
    @Override public @NotNull String getVersion() { return plugin.getPluginMeta().getVersion(); }
    @Override public boolean persist() { return true; }

    @Override
    public String onRequest(OfflinePlayer player, @NotNull String params) {
        if (player == null) return "";
        var m = plugin.manager();
        Faction f = m.factionOf(player.getUniqueId());
        FPlayer fp = m.fplayer(player.getUniqueId());
        return switch (params.toLowerCase(java.util.Locale.ROOT)) {
            case "name", "faction" -> f == null ? "" : f.name;
            case "name_or_none" -> f == null ? "Sans faction" : f.name;
            case "tag" -> f == null ? "" : "[" + f.name + "] ";
            case "role" -> f == null ? "" : f.role(player.getUniqueId()).label();
            case "role_prefix" -> f == null ? "" : f.role(player.getUniqueId()).prefix();
            case "power" -> fp == null ? "0" : Msg.fmt(fp.power);
            case "maxpower" -> Msg.fmt(plugin.settings().powerMax);
            case "faction_power" -> f == null ? "0" : Msg.fmt(m.power(f));
            case "faction_maxpower" -> f == null ? "0" : Msg.fmt(m.maxPower(f));
            case "claims" -> f == null ? "0" : String.valueOf(f.claims.size());
            case "online" -> f == null ? "0" : String.valueOf(m.online(f).size());
            case "members" -> f == null ? "0" : String.valueOf(f.members.size());
            case "level" -> f == null ? "0" : String.valueOf(f.level());
            case "bank" -> f == null ? "0" : plugin.bank().format(f.bank);
            case "kills" -> fp == null ? "0" : String.valueOf(fp.kills);
            case "deaths" -> fp == null ? "0" : String.valueOf(fp.deaths);
            case "war" -> f == null ? "" : plugin.wars().scoreboardLine(f);
            case "totems" -> f == null ? "0" : String.valueOf(f.totemsWon);
            case "raid" -> f != null && f.inRaid() ? "oui" : "non";
            default -> null;
        };
    }
}
