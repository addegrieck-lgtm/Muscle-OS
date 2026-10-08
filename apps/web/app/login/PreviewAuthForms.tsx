"use client";

import { useEffect, useState } from "react";
import { AuthFormsView, type AuthViewState } from "@/components/auth/AuthFormsView";

const NOTICE = "Cet aperçu n'est relié à aucun serveur : aucun compte n'est créé et rien n'est enregistré. Les inscriptions ouvriront avec le site officiel.";

/** Aperçu statique (GitHub Pages) : même formulaire que le vrai site, sans rien envoyer. */
export function PreviewAuthForms() {
  const [mode, setMode] = useState<"connexion" | "inscription">("connexion");
  const [loginState, setLogin] = useState<AuthViewState>(null);
  const [registerState, setRegister] = useState<AuthViewState>(null);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "inscription") setMode("inscription");
  }, []);
  const keep = (f: FormData) => ({ email: String(f.get("email") ?? ""), displayName: String(f.get("displayName") ?? ""), terms: f.get("terms") === "on" });
  return (
    <AuthFormsView
      next="/compte"
      initialMode={mode}
      login={(f) => setLogin({ info: NOTICE, values: keep(f) })}
      register={(f) => setRegister({ info: NOTICE, values: keep(f) })}
      loginState={loginState}
      registerState={registerState}
    />
  );
}
