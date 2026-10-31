// Initialise le PREMIER super administrateur. À exécuter une seule fois, depuis un poste de
// confiance, avec la clé service_role (jamais exposée au navigateur) :
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/init-admin.mjs prenom@domaine.fr
//
// - refuse d'agir si un super administrateur actif existe déjà (les suivants s'invitent depuis
//   /admin/settings) ;
// - crée le compte Auth s'il n'existe pas, avec un mot de passe aléatoire affiché UNE fois
//   (à changer dès la première connexion), ou réutilise le compte existant.
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.argv[2] || "").trim().toLowerCase();

if (!url || !key) {
  console.error("SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY sont requis.");
  process.exit(1);
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Usage : node scripts/init-admin.mjs email@domaine.fr");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { count, error: countErr } = await db
  .from("admin_users")
  .select("id", { count: "exact", head: true })
  .eq("role", "super_admin")
  .eq("active", true);
if (countErr) throw countErr;
if (count) {
  console.error("Un super administrateur existe déjà. Invitez les suivants depuis /admin/settings.");
  process.exit(1);
}

let userId;
let password;
for (let page = 1; page <= 50 && !userId; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
  if (data.users.length < 200) break;
}
if (!userId) {
  password = randomBytes(18).toString("base64url");
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
}

const { error } = await db.from("admin_users").insert({ auth_user_id: userId, email, role: "super_admin", active: true });
if (error) throw error;

console.log(`✔ Super administrateur créé : ${email}`);
if (password) {
  console.log(`  Mot de passe provisoire (affiché une seule fois) : ${password}`);
  console.log("  Changez-le dès la première connexion (Supabase → Authentication, ou lien de réinitialisation).");
}
