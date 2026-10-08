package fr.vaeloria.vote;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/** Sérialisation JSON des données (Gson est fourni par Paper). */
final class Codec {
    private Codec() {}

    static JsonObject write(PlayerVotes v) {
        JsonObject o = new JsonObject();
        JsonObject last = new JsonObject();
        v.lastVote.forEach(last::addProperty);
        o.add("lastVote", last);
        if (v.day != null) o.addProperty("day", v.day.toString());
        JsonArray today = new JsonArray();
        v.sitesToday.forEach(today::add);
        o.add("sitesToday", today);
        o.add("pot", write(v.pot));
        o.add("pending", write(v.pending));
        o.addProperty("spun", v.spun);
        o.addProperty("bonusGiven", v.bonusGiven);
        o.addProperty("multiplier", v.multiplier);
        o.addProperty("moneyToday", v.moneyToday);
        o.addProperty("total", v.total);
        o.addProperty("streak", v.streak);
        if (v.lastComplete != null) o.addProperty("lastComplete", v.lastComplete.toString());
        return o;
    }

    static PlayerVotes readVotes(JsonObject o) {
        PlayerVotes v = new PlayerVotes();
        if (o.has("lastVote")) o.getAsJsonObject("lastVote").entrySet().forEach(e -> v.lastVote.put(e.getKey(), e.getValue().getAsLong()));
        if (o.has("day")) v.day = LocalDate.parse(o.get("day").getAsString());
        if (o.has("sitesToday")) o.getAsJsonArray("sitesToday").forEach(e -> v.sitesToday.add(e.getAsString()));
        if (o.has("pot")) v.pot = readReward(o.getAsJsonObject("pot"));
        if (o.has("pending")) v.pending = readReward(o.getAsJsonObject("pending"));
        v.spun = o.has("spun") && o.get("spun").getAsBoolean();
        v.bonusGiven = o.has("bonusGiven") && o.get("bonusGiven").getAsBoolean();
        v.multiplier = o.has("multiplier") ? o.get("multiplier").getAsInt() : -1;
        v.moneyToday = o.has("moneyToday") ? o.get("moneyToday").getAsDouble() : 0;
        v.total = o.has("total") ? o.get("total").getAsLong() : 0;
        v.streak = o.has("streak") ? o.get("streak").getAsInt() : 0;
        if (o.has("lastComplete")) v.lastComplete = LocalDate.parse(o.get("lastComplete").getAsString());
        return v;
    }

    static JsonObject write(Reward r) {
        JsonObject o = new JsonObject();
        o.addProperty("money", r.money());
        JsonObject items = new JsonObject();
        r.items().forEach(items::addProperty);
        o.add("items", items);
        return o;
    }

    static Reward readReward(JsonObject o) {
        Map<String, Integer> items = new LinkedHashMap<>();
        if (o.has("items")) o.getAsJsonObject("items").entrySet().forEach(e -> items.put(e.getKey(), e.getValue().getAsInt()));
        return new Reward(o.has("money") ? o.get("money").getAsDouble() : 0, items);
    }

    static JsonObject write(IpLocks locks) {
        JsonObject o = new JsonObject();
        locks.locks.forEach((k, l) -> {
            JsonObject e = new JsonObject();
            e.addProperty("owner", l.owner().toString());
            e.addProperty("until", l.until());
            o.add(k, e);
        });
        return o;
    }

    static IpLocks readLocks(JsonObject o) {
        IpLocks locks = new IpLocks();
        for (Map.Entry<String, JsonElement> e : o.entrySet()) {
            JsonObject l = e.getValue().getAsJsonObject();
            locks.locks.put(e.getKey(), new IpLocks.Lock(UUID.fromString(l.get("owner").getAsString()), l.get("until").getAsLong()));
        }
        return locks;
    }
}
