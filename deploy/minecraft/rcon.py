#!/usr/bin/env python3
"""Envoie la partie CONSOLE de commands.txt au serveur par RCON (protocole Source RCON, sans dépendance).

Usage : python3 rcon.py [commands.txt] [--host H] [--port P] [--dry-run]

- Hôte et port : options, sinon variables RCON_HOST / RCON_PORT, sinon demandés (port par défaut : 26688).
- Mot de passe : variable RCON_PASSWORD, sinon demandé à la saisie (masquée). Jamais écrit sur disque.
- Seules les lignes des sections « ## CONSOLE » sont envoyées ; commentaires (#), lignes vides et lignes
  commençant par « / » (commandes à taper en jeu) sont ignorés.
"""
import argparse
import getpass
import os
import socket
import struct
import sys

LOGIN, COMMAND = 3, 2


def console_lines(path):
    section = None
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if line.startswith("## "):
                section = line[3:].split()[0].upper()
                continue
            if section != "CONSOLE" or not line or line.startswith("#") or line.startswith("/"):
                continue
            yield line


class Rcon:
    def __init__(self, host, port, password, timeout=10):
        self.sock = socket.create_connection((host, port), timeout=timeout)
        self.next_id = 1
        rid = self._send(LOGIN, password)
        got, _ = self._recv()
        if got == -1 or got != rid:
            raise SystemExit("RCON : mot de passe refusé")

    def _send(self, kind, body):
        rid = self.next_id
        self.next_id += 1
        data = struct.pack("<ii", rid, kind) + body.encode("utf-8") + b"\x00\x00"
        self.sock.sendall(struct.pack("<i", len(data)) + data)
        return rid

    def _read(self, n):
        buf = b""
        while len(buf) < n:
            chunk = self.sock.recv(n - len(buf))
            if not chunk:
                raise ConnectionError("connexion RCON fermée")
            buf += chunk
        return buf

    def _recv(self):
        (length,) = struct.unpack("<i", self._read(4))
        payload = self._read(length)
        rid, _kind = struct.unpack("<ii", payload[:8])
        return rid, payload[8:-2].decode("utf-8", "replace")

    def command(self, cmd):
        self._send(COMMAND, cmd)
        _, body = self._recv()
        return body

    def close(self):
        self.sock.close()


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file", nargs="?", default=os.path.join(here, "commands.txt"))
    ap.add_argument("--host", default=os.environ.get("RCON_HOST"))
    ap.add_argument("--port", type=int, default=int(os.environ.get("RCON_PORT", "0")) or None)
    ap.add_argument("--dry-run", action="store_true", help="affiche les commandes sans rien envoyer")
    a = ap.parse_args()

    cmds = list(console_lines(a.file))
    if a.dry_run:
        print("\n".join(cmds))
        print(f"-- {len(cmds)} commande(s) console", file=sys.stderr)
        return
    host = a.host or input("Hôte RCON (adresse du serveur, sans le port) : ").strip()
    port = a.port or int(input("Port RCON [26688] : ").strip() or "26688")
    password = os.environ.get("RCON_PASSWORD") or getpass.getpass("Mot de passe RCON (saisie masquée) : ")
    r = Rcon(host, port, password)
    failed = 0
    for c in cmds:
        out = r.command(c)
        bad = any(w in out.lower() for w in ("unknown command", "commande inconnue", "erreur", "error"))
        failed += bad
        print(("ÉCHEC " if bad else "ok    ") + c + (f"\n      → {out.strip()}" if out.strip() else ""))
    r.close()
    print(f"-- {len(cmds)} commande(s) envoyée(s), {failed} à vérifier")


if __name__ == "__main__":
    main()
