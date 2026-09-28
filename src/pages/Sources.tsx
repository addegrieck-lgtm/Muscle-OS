import { SOURCES, SOURCE_CATEGORY_LABELS } from '../data/sources';
import { ENGINE_CONFIG } from '../engines/config';
import { DISCLAIMER } from '../engines/safety';
import type { SourceCategory } from '../types/models';
import { PageHeader, SectionTitle } from '../components/ui';
import { IconBack } from '../components/Icons';
import { navigate } from '../hooks/useRoute';

const METHOD: { title: string; body: string; refs: string[] }[] = [
  {
    title: 'Volume par muscle',
    body: `Base : ${ENGINE_CONFIG.baseWeeklySets.beginner} / ${ENGINE_CONFIG.baseWeeklySets.intermediate} / ${ENGINE_CONFIG.baseWeeklySets.advanced} séries hebdomadaires directes (débutant / intermédiaire / avancé) pour un grand muscle, pondérées pour les petits muscles déjà sollicités indirectement. Priorités : ×${ENGINE_CONFIG.priorityMultiplier.important} (Important) et ×${ENGINE_CONFIG.priorityMultiplier.priority} (Prioritaire), plafonnées. Si le temps manque, tous les muscles sont réduits proportionnellement, les prioritaires moins vite, jamais sous un volume d’entretien.`,
    refs: ['schoenfeld-2017-volume', 'spiering-2021', 'acsm-2009'],
  },
  {
    title: 'Fréquence et ordre',
    body: 'Chaque muscle est travaillé 2 fois par semaine ou plus dès que possible ; les muscles prioritaires sont placés en début de séance, quand la fatigue est la plus faible.',
    refs: ['schoenfeld-2016-freq', 'grgic-2018-freq', 'simao-2012'],
  },
  {
    title: 'Intensité et entraînement maison',
    body: 'Les gains musculaires sont possibles sur une large plage de répétitions si l’effort est proche de l’échec (1-3 répétitions en réserve). Les pompes peuvent produire des gains comparables au développé couché à activation égale.',
    refs: ['schoenfeld-2017-load', 'refalo-2023', 'calatayud-2015', 'kotarsky-2018'],
  },
  {
    title: 'Progression',
    body: 'Double progression : on atteint le haut de la fourchette sur toutes les séries, puis +répétitions, +charge (≈5 %), variante plus difficile ou tempo plus lent — une seule variable à la fois. Deux séances en échec → réduction. Décharge programmée toutes les 5-8 semaines ou en cas de fatigue.',
    refs: ['acsm-2009', 'bell-2023'],
  },
  {
    title: 'Cardio',
    body: 'Référence OMS : 150-300 min d’activité modérée par semaine. Montée progressive ≤ 10 %/semaine, semaine allégée toutes les 4 semaines, majorité en intensité facile. Si l’objectif est musculaire, volume modéré et séances intenses éloignées des jours de jambes.',
    refs: ['who-2020', 'cdc-2018', 'garber-2011', 'stoggl-2014', 'nielsen-2014', 'wilson-2012', 'schumann-2022'],
  },
  {
    title: 'Énergie et macronutriments',
    body: 'Métabolisme de base (Mifflin-St Jeor) × facteur d’activité, puis ajustement selon l’objectif. Protéines : ≈1,6 g/kg/j (jusqu’à 2,2), davantage en déficit. Lipides ≈ 27 % des calories, glucides = le reste. Ce sont des ESTIMATIONS (≈ ±10 %) ajustées ensuite selon la tendance du poids.',
    refs: ['mifflin-1990', 'frankenfield-2005', 'morton-2018', 'jager-2017', 'helms-2014', 'iraki-2019', 'barakat-2020'],
  },
  {
    title: 'Récupération',
    body: 'Le check-in (énergie, sommeil, courbatures, motivation) donne un score de forme. Score bas → séries réduites de 20-40 %, plus de marge, cardio intense remplacé. Sommeil conseillé : 7 h ou plus.',
    refs: ['watson-2015', 'bell-2023'],
  },
  {
    title: 'Sécurité',
    body: 'Douleur thoracique, malaise, essoufflement inhabituel, vertiges ou douleur importante : arrêt immédiat et avis médical. L’application ne pose aucun diagnostic.',
    refs: ['riebe-2015'],
  },
];

export function Sources() {
  const categories = Object.keys(SOURCE_CATEGORY_LABELS) as SourceCategory[];
  return (
    <div className="page">
      <button className="icon-btn" onClick={() => navigate('home')} aria-label="Retour" style={{ marginBottom: 8 }}>
        <IconBack />
      </button>
      <PageHeader eyebrow={`${SOURCES.length} références`} title="Sources & méthode" />
      <div className="card warning small">{DISCLAIMER}</div>

      <SectionTitle>Méthode</SectionTitle>
      <div className="stack">
        {METHOD.map((m) => (
          <div key={m.title} className="card">
            <div className="title-md">{m.title}</div>
            <p className="small muted" style={{ marginTop: 6 }}>
              {m.body}
            </p>
            <div className="chips" style={{ marginTop: 10 }}>
              {m.refs.map((r) => {
                const s = SOURCES.find((x) => x.id === r)!;
                return (
                  <a key={r} href={`#src-${r}`} className="tag" style={{ textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); document.getElementById(`src-${r}`)?.scrollIntoView({ behavior: 'smooth' }); }}>
                    {s.authors.split(',')[0]} {s.year}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {categories.map((c) => {
        const list = SOURCES.filter((s) => s.category === c);
        if (!list.length) return null;
        return (
          <div key={c}>
            <SectionTitle>{SOURCE_CATEGORY_LABELS[c]}</SectionTitle>
            <div className="stack">
              {list.map((s) => (
                <div key={s.id} id={`src-${s.id}`} className="card tight">
                  <div className="small" style={{ fontWeight: 650 }}>
                    {s.title}
                  </div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>
                    {s.authors} · <em>{s.publication}</em> · {s.year}
                  </div>
                  <div className="tiny" style={{ marginTop: 6, color: 'var(--accent-soft)' }}>
                    Utilisé pour : {s.usedFor}
                  </div>
                  {(s.doi || s.url) && (
                    <a className="tiny faint" href={s.doi ? `https://doi.org/${s.doi}` : s.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 6 }}>
                      {s.doi ? `doi:${s.doi}` : s.url}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <p className="disclaimer">Les paramètres des algorithmes sont des choix de programmation raisonnables dérivés de ces travaux ; ils ne constituent pas des valeurs médicales définitives.</p>
    </div>
  );
}
