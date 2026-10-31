# Identité visuelle

Reconstitution vectorielle de la planche validée (symbole flamme + arc + étoile, lettrage serif espacé, signature).

| Fichier (`public/brand/`) | Usage |
|---|---|
| `logo-principal-ivoire.svg` | Logo principal sur fond ivoire |
| `logo-principal-noir.svg` | Logo principal sur fond noir |
| `symbole.svg` / `symbole-monochrome.svg` | Symbole seul |
| `logo-horizontal.svg` / `-clair.svg` | En-têtes, documents |
| `logo-vertical.svg` / `-clair.svg` | Transparent, fonds clairs / sombres |
| `logo-monochrome-noir.svg` / `-blanc.svg` | Gravure, tampon, marquage |
| `favicon.svg` (+ `app/icon.svg`, `app/apple-icon.png`, `icone-512.png`) | Favicon — sans l’arc fin, illisible en 16 px |
| `icone-reseaux.svg` / `.png` | Avatar réseaux sociaux (1080 px) |

Palette : Ivoire `#F1ECE4` · Crème `#E6DCCF` · Sable `#C6B49A` · Champagne `#A88A62` · Brun `#44372E` · Noir `#191817`.
Typographies : Cormorant Garamond (titres), Manrope (textes) — auto-hébergées. Le lettrage du logo est un tracé dérivé de Cormorant Garamond, interlettrage 0,34 em.

Source unique : `scripts/build-brand.mjs` (tracés du symbole et génération de tous les fichiers + `lib/brand/paths.generated.ts`).
