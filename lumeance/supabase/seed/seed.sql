-- LUMÉANCE — données de base (catégories et contenus éditoriaux). AUCUN produit :
-- les fiches ne seront créées qu'à partir de données fournisseurs vérifiées.
insert into public.categories (name, slug, description, position) values
  ('Lustres', 'lustres', 'Lustres monumentaux et compositions en cascade pour les grands volumes.', 1),
  ('Suspensions', 'suspensions', 'Suspensions XXL, verre soufflé, cristal et compositions organiques.', 2),
  ('Appliques', 'appliques', 'Appliques murales sculpturales, pour dessiner la lumière sur la paroi.', 3),
  ('Lampadaires', 'lampadaires', 'Lampadaires sculpturaux, présences lumineuses à hauteur d''homme.', 4)
on conflict (slug) do nothing;

insert into public.site_settings (setting_key, setting_value, is_public) values
  ('content.home', '{
    "heroTitle": "LUMÉANCE",
    "heroSignature": "L’art de révéler la lumière.",
    "heroText": "Des créations lumineuses pensées pour sublimer les espaces.",
    "manifestoTitle": "La lumière est une matière.",
    "manifestoText": "Chez LUMÉANCE, un luminaire n’est jamais un simple objet fonctionnel. C’est une présence. Il dessine l’espace, révèle les volumes, réchauffe la pierre et le bois, et donne à chaque pièce son atmosphère. Nous sélectionnons des créations sculpturales, en verre, en cristal et en métal, pensées pour devenir le cœur d’un intérieur.",
    "immersiveQuote": "La lumière devient architecture.",
    "newsletterTitle": "Entrez dans l’univers LUMÉANCE."
  }', true),
  ('shop.shipping', '{"standardAmount": 0, "freeThreshold": 0, "deliveryNote": "Délais communiqués pour chaque pièce après vérification auprès du fournisseur et du transporteur.", "countries": ["FR"]}', true),
  ('shop.contact', '{"email": "", "phone": "", "address": "", "legalName": "", "siret": ""}', true),
  ('seo.default', '{"title": "LUMÉANCE — Luminaires design haut de gamme", "description": "Maison française de luminaires décoratifs : lustres monumentaux, suspensions en verre et cristal, appliques et lampadaires sculpturaux."}', true)
on conflict (setting_key) do nothing;
