-- Comptes par e-mail + mot de passe (en plus de Discord) et accès au back-office par rôle.

ALTER TABLE users ADD COLUMN password_hash text;
-- Unicité insensible à la casse (la contrainte d'origine est sensible à la casse).
CREATE UNIQUE INDEX users_email_lower ON users (lower(email)) WHERE email IS NOT NULL;

-- Échecs de connexion récents, pour verrouiller temporairement un e-mail attaqué.
CREATE TABLE login_failures (
  email_lower  text NOT NULL,
  at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_failures_email_at ON login_failures (email_lower, at DESC);
