"""Génère vaeloria.json.gz (format `lp import`) à partir de setup.txt.

Usage : python3 build-import.py setup.txt vaeloria.json.gz
"""
import json, shlex, gzip, sys
src, out = sys.argv[1], sys.argv[2]
groups, tracks = {}, {}
def node(g, key, value=True): groups.setdefault(g, []).append({"type": "", "key": key, "value": value})
for line in open(src, encoding="utf-8"):
    a = shlex.split(line)
    if not a: continue
    assert a[0] == "lp", line
    if a[1] == "creategroup": groups.setdefault(a[2], [])
    elif a[1] == "createtrack": tracks.setdefault(a[2], [])
    elif a[1] == "track" and a[3] == "append": tracks[a[2]].append(a[4])
    elif a[1] == "group":
        g, op = a[2], a[3:]
        if op[0] == "setweight": node(g, f"weight.{op[1]}")
        elif op[0] == "setdisplayname": node(g, f"displayname.{op[1]}")
        elif op[:2] == ["meta", "setprefix"]: node(g, f"prefix.{op[2]}.{op[3]}")
        elif op[:2] == ["parent", "add"]: node(g, f"group.{op[2]}")
        elif op[:2] == ["permission", "set"]: node(g, op[2], op[3:4] != ["false"])
        else: raise SystemExit("inconnu: " + line)
    else: raise SystemExit("inconnu: " + line)
TYPES = {"weight": "weight", "displayname": "display_name", "prefix": "prefix", "group": "inheritance"}
for ns in groups.values():
    for n in ns: n["type"] = TYPES.get(n["key"].split(".")[0], "permission")
data = {"metadata": {"generatedBy": "minecraft/luckperms/setup.txt"},
        "groups": {g: {"nodes": ns} for g, ns in groups.items()},
        "tracks": {t: {"groups": gs} for t, gs in tracks.items()}}
with gzip.open(out, "wt", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=2)
print(len(groups), "groupes,", sum(map(len, groups.values())), "noeuds,", len(tracks), "tracks")
