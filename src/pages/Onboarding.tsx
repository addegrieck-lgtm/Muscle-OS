import { useState, type ReactNode } from 'react';
import type { ActivityLevel, Allergen, CardioEquipment, Equipment, GoalId, Level, RunningExperience, User } from '../types/models';
import { ALLERGEN_LABELS, CARDIO_LABELS, defaultPriorities, EQUIPMENT_LABELS, GOALS, muscleLabel, PRIORITY_LABELS } from '../data/reference';
import { SELECTABLE_FOODS } from '../data/foods';
import { BodyMap } from '../components/BodyMap';
import { Segmented, Stepper } from '../components/ui';
import { IconBack } from '../components/Icons';
import { completeOnboarding } from '../store/actions';
import { DISCLAIMER } from '../engines/safety';
import { calculateNutrition } from '../engines/nutritionCalculator';
import { today, uid } from '../utils';

const EQUIPMENT_ORDER: Equipment[] = ['none', 'bodyweight', 'chair', 'table', 'backpack', 'dumbbells', 'kettlebell', 'bands', 'pullup_bar', 'bench', 'other'];
const CARDIO_ORDER: CardioEquipment[] = ['outdoor_run', 'treadmill', 'bike', 'jump_rope', 'none', 'other'];

const draftUser = (): User => ({
  id: uid('user'),
  name: '',
  createdAt: new Date().toISOString(),
  startDate: today(),
  age: 30,
  sex: 'male',
  heightCm: 178,
  weightKg: 75,
  level: 'beginner',
  runningExperience: 'none',
  activityLevel: 'light',
  goal: 'muscle_gain',
  daysPerWeek: 3,
  sessionMinutes: 45,
  equipment: ['bodyweight'],
  cardioEquipment: ['outdoor_run'],
  musclePriorities: defaultPriorities(),
  nutrition: { mealsPerDay: 4, diet: 'omnivore', likedFoods: [], dislikedFoods: [], allergies: [], budget: 'medium', cookingTime: 'moderate' },
});

function Choice({ on, onClick, icon, title, desc }: { on: boolean; onClick: () => void; icon?: ReactNode; title: string; desc?: string }) {
  return (
    <button className={`choice ${on ? 'on' : ''}`} onClick={onClick} type="button">
      {icon && <span className="ico">{icon}</span>}
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 650 }}>{title}</span>
        {desc && <span className="small muted">{desc}</span>}
      </span>
    </button>
  );
}

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function Onboarding() {
  const [u, setU] = useState<User>(draftUser);
  const [step, setStep] = useState(0);
  const patch = (p: Partial<User>) => setU((x) => ({ ...x, ...p }));
  const patchN = (p: Partial<User['nutrition']>) => setU((x) => ({ ...x, nutrition: { ...x.nutrition, ...p } }));

  const steps: { key: string; title: string; subtitle?: string; body: ReactNode; valid?: boolean }[] = [
    {
      key: 'welcome',
      title: 'Bienvenue dans ton coach personnel.',
      subtitle: 'Musculation, cardio, gainage et nutrition — un programme construit pour toi, basé sur la science, qui s’adapte à tes progrès.',
      body: (
        <div className="stack">
          <div className="field">
            <label>Ton prénom (facultatif)</label>
            <input className="input" value={u.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Prénom" autoComplete="given-name" />
          </div>
          <div className="card tight small muted">
            🔒 Tout reste sur ton téléphone : aucune inscription, aucun serveur, aucun abonnement.
          </div>
          <p className="tiny faint">{DISCLAIMER}</p>
        </div>
      ),
    },
    {
      key: 'goal',
      title: 'Quel est ton objectif ?',
      body: (
        <div className="stack" style={{ gap: 10 }}>
          {GOALS.map((g) => (
            <Choice key={g.id} on={u.goal === g.id} onClick={() => patch({ goal: g.id as GoalId })} icon={g.icon} title={g.label} desc={g.description} />
          ))}
        </div>
      ),
    },
    {
      key: 'info',
      title: 'Parle-moi de toi',
      subtitle: 'Ces données servent à estimer tes besoins énergétiques.',
      valid: u.age >= 14 && u.age <= 99 && u.heightCm >= 120 && u.heightCm <= 230 && u.weightKg >= 30 && u.weightKg <= 300,
      body: (
        <div className="stack-lg">
          <div className="field">
            <label>Sexe (utilisé pour l’équation métabolique)</label>
            <Segmented
              value={u.sex}
              onChange={(v) => patch({ sex: v })}
              options={[
                { value: 'male', label: 'Homme' },
                { value: 'female', label: 'Femme' },
              ]}
            />
          </div>
          {(
            [
              ['Âge', 'age', 1, 14, 99, 0, 'ans'],
              ['Taille', 'heightCm', 1, 120, 230, 0, 'cm'],
              ['Poids', 'weightKg', 0.5, 30, 300, 1, 'kg'],
            ] as const
          ).map(([label, key, step, min, max, dec, unit]) => (
            <div key={key} className="row-between">
              <div>
                <div style={{ fontWeight: 650 }}>{label}</div>
                <div className="small faint">{unit}</div>
              </div>
              <Stepper value={u[key]} onChange={(v) => patch({ [key]: v } as Partial<User>)} step={step} min={min} max={max} decimals={dec} />
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'level',
      title: 'Ton niveau',
      body: (
        <div className="stack-lg">
          <div className="stack" style={{ gap: 10 }}>
            {(
              [
                ['beginner', 'Débutant', 'Moins de 6 mois de musculation régulière'],
                ['intermediate', 'Intermédiaire', '6 mois à 2 ans de pratique régulière'],
                ['advanced', 'Avancé', 'Plus de 2 ans, technique maîtrisée'],
              ] as [Level, string, string][]
            ).map(([v, t, d]) => (
              <Choice key={v} on={u.level === v} onClick={() => patch({ level: v })} title={t} desc={d} />
            ))}
          </div>
          <div className="field">
            <label>Expérience en course à pied</label>
            <Segmented
              value={u.runningExperience}
              onChange={(v) => patch({ runningExperience: v as RunningExperience })}
              options={[
                { value: 'none', label: 'Aucune' },
                { value: 'some', label: 'Un peu' },
                { value: 'regular', label: 'Régulière' },
              ]}
            />
          </div>
          <div className="field">
            <label>Activité quotidienne (hors sport)</label>
            <select className="input" value={u.activityLevel} onChange={(e) => patch({ activityLevel: e.target.value as ActivityLevel })}>
              <option value="sedentary">Sédentaire (bureau, peu de marche)</option>
              <option value="light">Légère (marche quotidienne)</option>
              <option value="moderate">Modérée (debout souvent)</option>
              <option value="active">Active (travail physique)</option>
              <option value="very_active">Très active</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      key: 'days',
      title: 'Combien de jours par semaine ?',
      subtitle: 'Pour la musculation. Le cardio sera réparti intelligemment autour.',
      body: (
        <div className="num-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button key={n} className={`num-choice ${u.daysPerWeek === n ? 'on' : ''}`} onClick={() => patch({ daysPerWeek: n })}>
              {n}
              <small>jour{n > 1 ? 's' : ''}</small>
            </button>
          ))}
        </div>
      ),
    },
    {
      key: 'duration',
      title: 'Durée moyenne d’une séance',
      body: (
        <div className="num-grid">
          {[15, 20, 30, 45, 60, 90].map((n) => (
            <button key={n} className={`num-choice ${u.sessionMinutes === n ? 'on' : ''}`} onClick={() => patch({ sessionMinutes: n })}>
              {n}
              <small>min</small>
            </button>
          ))}
        </div>
      ),
    },
    {
      key: 'equipment',
      title: 'Ton matériel',
      subtitle: 'Sélectionne tout ce que tu as. Les exercices s’adapteront.',
      body: (
        <div className="chips">
          {EQUIPMENT_ORDER.map((e) => {
            const on = e === 'none' ? u.equipment.length === 1 && u.equipment[0] === 'bodyweight' : u.equipment.includes(e);
            return (
              <button
                key={e}
                className={`chip ${on ? 'on' : ''}`}
                onClick={() =>
                  setU((x) => {
                    if (e === 'none' || e === 'bodyweight') return { ...x, equipment: e === 'none' ? ['bodyweight'] : x.equipment };
                    const next = toggle(x.equipment, e);
                    return { ...x, equipment: next.includes('bodyweight') ? next : ['bodyweight', ...next] };
                  })
                }
              >
                {EQUIPMENT_LABELS[e]}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      key: 'cardio',
      title: 'Cardio disponible',
      body: (
        <div className="chips">
          {CARDIO_ORDER.map((c) => (
            <button
              key={c}
              className={`chip ${u.cardioEquipment.includes(c) ? 'on' : ''}`}
              onClick={() =>
                setU((x) => {
                  if (c === 'none') return { ...x, cardioEquipment: ['none'] };
                  const next = toggle(x.cardioEquipment.filter((y) => y !== 'none'), c);
                  return { ...x, cardioEquipment: next.length ? next : ['none'] };
                })
              }
            >
              {CARDIO_LABELS[c]}
            </button>
          ))}
          <p className="small faint" style={{ marginTop: 8 }}>
            Sans matériel, la marche active et le conditionnement au poids du corps sont toujours possibles.
          </p>
        </div>
      ),
    },
    {
      key: 'muscles',
      title: 'Quelles zones veux-tu développer davantage ?',
      subtitle: 'Les muscles prioritaires recevront plus de volume — sans jamais négliger les autres.',
      body: <BodyMap priorities={u.musclePriorities} onChange={(p) => patch({ musclePriorities: p })} />,
    },
    {
      key: 'nutrition',
      title: 'Ton alimentation',
      body: (
        <div className="stack-lg">
          <div className="field">
            <label>Repas par jour</label>
            <Segmented value={u.nutrition.mealsPerDay} onChange={(v) => patchN({ mealsPerDay: v })} options={[3, 4, 5].map((n) => ({ value: n as 3 | 4 | 5, label: `${n}` }))} />
          </div>
          <div className="field">
            <label>Régime</label>
            <Segmented
              value={u.nutrition.diet}
              onChange={(v) => patchN({ diet: v })}
              options={[
                { value: 'omnivore', label: 'Omnivore' },
                { value: 'pescatarian', label: 'Pescétarien' },
                { value: 'vegetarian', label: 'Végétarien' },
              ]}
            />
          </div>
          <div className="field">
            <label>Allergies / intolérances</label>
            <div className="chips">
              {(Object.keys(ALLERGEN_LABELS) as Allergen[]).map((a) => (
                <button key={a} className={`chip ${u.nutrition.allergies.includes(a) ? 'on' : ''}`} onClick={() => setU((x) => ({ ...x, nutrition: { ...x.nutrition, allergies: toggle(x.nutrition.allergies, a) } }))}>
                  {ALLERGEN_LABELS[a]}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Aliments que tu aimes (favorisés)</label>
            <div className="chips">
              {SELECTABLE_FOODS.map((f) => (
                <button
                  key={f.id}
                  className={`chip ${u.nutrition.likedFoods.includes(f.id) ? 'on' : ''}`}
                  onClick={() => setU((x) => ({ ...x, nutrition: { ...x.nutrition, likedFoods: toggle(x.nutrition.likedFoods, f.id), dislikedFoods: x.nutrition.dislikedFoods.filter((y) => y !== f.id) } }))}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Aliments que tu n’aimes pas (exclus)</label>
            <div className="chips">
              {SELECTABLE_FOODS.map((f) => (
                <button
                  key={f.id}
                  className={`chip ${u.nutrition.dislikedFoods.includes(f.id) ? 'accent-on' : ''}`}
                  onClick={() => setU((x) => ({ ...x, nutrition: { ...x.nutrition, dislikedFoods: toggle(x.nutrition.dislikedFoods, f.id), likedFoods: x.nutrition.likedFoods.filter((y) => y !== f.id) } }))}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Budget alimentaire</label>
            <Segmented
              value={u.nutrition.budget}
              onChange={(v) => patchN({ budget: v })}
              options={[
                { value: 'low', label: 'Serré' },
                { value: 'medium', label: 'Moyen' },
                { value: 'high', label: 'Confort' },
              ]}
            />
          </div>
          <div className="field">
            <label>Temps pour cuisiner</label>
            <Segmented
              value={u.nutrition.cookingTime}
              onChange={(v) => patchN({ cookingTime: v })}
              options={[
                { value: 'minimal', label: '≤ 15 min' },
                { value: 'moderate', label: '≤ 25 min' },
                { value: 'plenty', label: 'J’ai le temps' },
              ]}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'summary',
      title: 'Ton programme est prêt à être généré',
      body: <Summary u={u} />,
    },
  ];

  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="page no-tabbar" style={{ paddingBottom: 120 }}>
      <div className="row" style={{ marginBottom: 18, gap: 12 }}>
        {step > 0 ? (
          <button className="icon-btn" onClick={() => setStep(step - 1)} aria-label="Retour">
            <IconBack />
          </button>
        ) : (
          <div style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, letterSpacing: '-0.05em' }}>M/</div>
        )}
        <div className="progress-dots" style={{ flex: 1 }}>
          {steps.map((x, i) => (
            <i key={x.key} className={i <= step ? 'on' : ''} />
          ))}
        </div>
      </div>

      <div key={s.key} className="fade-in">
        {step === 0 && (
          <div style={{ margin: '28px 0 18px' }}>
            <div className="eyebrow">MUSCLEOS</div>
          </div>
        )}
        <h1 className={step === 0 ? 'title-xl' : 'title-lg'} style={{ marginBottom: 8, fontSize: step === 0 ? 40 : undefined }}>
          {s.title}
        </h1>
        {s.subtitle && (
          <p className="muted" style={{ marginBottom: 22 }}>
            {s.subtitle}
          </p>
        )}
        {!s.subtitle && <div style={{ height: 14 }} />}
        {s.body}
      </div>

      <div className="fab-bottom">
        <div>
          <button
            className={`btn block ${last ? 'accent' : 'primary'}`}
            disabled={s.valid === false}
            onClick={() => {
              if (last) completeOnboarding(u);
              else setStep(step + 1);
            }}
          >
            {step === 0 ? 'Commencer' : last ? 'Générer mon programme' : 'Continuer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Summary({ u }: { u: User }) {
  const n = calculateNutrition({
    sex: u.sex,
    age: u.age,
    heightCm: u.heightCm,
    weightKg: u.weightKg,
    activityLevel: u.activityLevel,
    goal: u.goal,
    level: u.level,
    trainingDaysPerWeek: u.daysPerWeek,
    sessionMinutes: u.sessionMinutes,
  });
  const prios = Object.entries(u.musclePriorities).filter(([, p]) => p !== 'normal');
  return (
    <div className="stack">
      <div className="card hero">
        <div className="eyebrow">Objectif</div>
        <div className="title-md" style={{ marginTop: 4 }}>
          {GOALS.find((g) => g.id === u.goal)?.label}
        </div>
        <div className="divider" />
        <div className="grid-2 small">
          <div>
            <div className="faint">Entraînement</div>
            <div style={{ fontWeight: 650 }}>
              {u.daysPerWeek} j × {u.sessionMinutes} min
            </div>
          </div>
          <div>
            <div className="faint">Calories estimées</div>
            <div style={{ fontWeight: 650 }}>≈ {n.targetKcal} kcal</div>
          </div>
          <div>
            <div className="faint">Protéines</div>
            <div style={{ fontWeight: 650 }}>{n.protein} g/j</div>
          </div>
          <div>
            <div className="faint">Matériel</div>
            <div style={{ fontWeight: 650 }}>{u.equipment.filter((e) => e !== 'bodyweight').map((e) => EQUIPMENT_LABELS[e]).join(', ') || 'Poids du corps'}</div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          Priorités musculaires
        </div>
        {prios.length ? (
          <div className="chips">
            {prios.map(([m, p]) => (
              <span key={m} className={`tag ${p === 'priority' ? 'accent' : ''}`}>
                {muscleLabel(m as never)} · {PRIORITY_LABELS[p]}
              </span>
            ))}
          </div>
        ) : (
          <p className="small muted">Programme équilibré (aucune priorité).</p>
        )}
      </div>
      <p className="tiny faint">Les calories sont une estimation (≈ ±10 %) qui sera ajustée selon l’évolution de ton poids. {DISCLAIMER}</p>
    </div>
  );
}
