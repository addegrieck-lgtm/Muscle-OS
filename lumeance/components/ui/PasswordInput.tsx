"use client";

import { useState } from "react";

/**
 * Champ mot de passe avec bouton « œil » pour afficher ou masquer la saisie (règle du
 * propriétaire : présent sur TOUS les champs mot de passe du site et de l'administration).
 * Champ contrôlé : la saisie survit à la remise à zéro du formulaire après une erreur serveur,
 * sans jamais transiter par la réponse du serveur.
 */
export function PasswordInput({
  className = "",
  // Ignoré : le champ est contrôlé (pas de valeur pré-remplie pour un mot de passe).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultValue: _ignored,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  return (
    <span className="relative block">
      <input
        {...props}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onChange?.(e);
        }}
        type={visible ? "text" : "password"}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        className="absolute bottom-0 right-0 top-0 flex w-10 items-center justify-center text-brun/50 transition-colors hover:text-brun focus-visible:text-brun"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
          aria-hidden
        >
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </span>
  );
}
