package fr.vaeloria.factions.util;

import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.resolver.TagResolver;
import net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer;
import org.bukkit.configuration.file.YamlConfiguration;
import org.junit.jupiter.api.Test;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.assertTrue;

/** Chaque message de messages.yml doit se rendre sans balise orpheline une fois ses placeholders remplis. */
class MessagesTest {

    @Test
    void everyMessageRendersCleanly() {
        YamlConfiguration y = YamlConfiguration.loadConfiguration(new InputStreamReader(
                Objects.requireNonNull(getClass().getResourceAsStream("/messages.yml")), StandardCharsets.UTF_8));
        MiniMessage mm = MiniMessage.miniMessage();
        // Placeholders fournis par le plugin (Msg.send(…, "nom", valeur…)).
        String[] names = {"prefix", "label", "perm", "role", "faction", "player", "usage", "min", "max", "old", "desc",
                "relation", "access", "created", "power", "claims", "limit", "state", "shield", "time", "bank", "leader",
                "count", "kills", "deaths", "raids", "raided", "oc", "ocs", "page", "pages", "online", "members", "next",
                "criterion", "value", "full", "loss", "target", "minutes", "by", "x", "z", "bx", "bz", "defender",
                "attacker", "seconds", "radius", "warp", "first", "second", "message", "balance", "amount", "window",
                "hours", "command", "description", "left", "n", "zone", "boost", "maxpower", "fpower", "fmaxpower",
                "territory", "grace", "date", "type", "actor", "detail", "url", "ping", "phase", "participants",
                "ascore", "dscore", "winner", "reason", "war", "combat"};
        TagResolver.Builder b = TagResolver.builder();
        for (String n : names) b.resolver(net.kyori.adventure.text.minimessage.tag.resolver.Placeholder.unparsed(n, "X"));
        TagResolver anyPlaceholder = b.build();
        List<String> problems = new ArrayList<>();
        for (String key : y.getKeys(true)) {
            List<String> values = new ArrayList<>();
            if (y.isString(key)) values.add(y.getString(key));
            else if (y.isList(key)) values.addAll(y.getStringList(key));
            else continue;
            for (String v : values) {
                String src = v.replace("<color>", "<red>").replace("</color>", "</red>");
                String plain = PlainTextComponentSerializer.plainText().serialize(mm.deserialize(src, anyPlaceholder));
                if (plain.contains("<") || plain.contains(">")) problems.add(key + " → " + plain);
            }
        }
        assertTrue(problems.isEmpty(), "Balises mal formées :\n" + String.join("\n", problems));
    }
}
