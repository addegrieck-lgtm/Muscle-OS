-- LUMÉANCE — premier super administrateur (à exécuter UNE FOIS dans SQL Editor).
-- Prérequis : avoir créé l'utilisateur dans Authentication → Users → Add user
-- (e-mail + mot de passe, « Auto Confirm User » coché).
-- Remplacer l'adresse ci-dessous par la vôtre, puis Run.
insert into public.admin_users (auth_user_id, email, role, active)
select id, email, 'super_admin', true
from auth.users
where email = 'VOTRE-EMAIL@exemple.fr'
on conflict (auth_user_id) do update set role = 'super_admin', active = true;

-- Vérification : doit renvoyer une ligne.
select email, role, active from public.admin_users;
