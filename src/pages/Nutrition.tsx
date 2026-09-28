import { useMemo, useState } from 'react';
import type { Meal } from '../types/models';
import { useApp } from '../store/store';
import { emptyIntake, intakeTotals, nutritionPlan } from '../store/selectors';
import {
  addExtraMacros,
  generateShopping,
  regenerateMeals,
  resetExtra,
  setCalorieOffset,
  setPantry,
  setPantryMode,
  swapMeal,
  toggleEaten,
  toggleShoppingItem,
  updateUser,
} from '../store/actions';
import { describeItem, MEAL_LABELS } from '../engines/mealGenerator';
import { groupByCategory } from '../engines/shoppingListGenerator';
import { suggestCalorieAdjustment } from '../engines/nutritionCalculator';
import { weeklyWeightChangePct } from '../engines/analytics';
import { FOODS, getFood, SELECTABLE_FOODS } from '../data/foods';
import { ALLERGEN_LABELS, SHOPPING_LABELS } from '../data/reference';
import { sourceById } from '../data/sources';
import type { Allergen, FoodCategory } from '../types/models';
import { fmt, formatDate, today } from '../utils';
import { navigate } from '../hooks/useRoute';
import { Bar, Check, PageHeader, Ring, SectionTitle, Segmented, Sheet, Stepper } from '../components/ui';
import { IconRefresh } from '../components/Icons';

type Tab = 'today' | 'week' | 'pantry' | 'shopping' | 'prefs';

function MealCard({ meal, date, eaten, onOpen }: { meal: Meal; date: string; eaten: boolean; onOpen: () => void }) {
  return (
    <div className="card">
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <button onClick={onOpen} style={{ textAlign: 'left', flex: 1 }}>
          <div className="eyebrow">{MEAL_LABELS[meal.type]}</div>
          <div className={`title-md ${eaten ? 'strike' : ''}`} style={{ marginTop: 4 }}>
            {meal.name}
          </div>
          <div className="small muted" style={{ marginTop: 4 }}>
            {meal.items
              .map((i) => getFood(i.foodId).name.split(' (')[0])
              .slice(0, 5)
              .join(' · ')}
          </div>
        </button>
        <button onClick={() => toggleEaten(date, meal.id)} aria-label="Marquer comme mangé" style={{ padding: 4 }}>
          <Check on={eaten} round />
        </button>
      </div>
      <div className="row small" style={{ marginTop: 12, gap: 14, flexWrap: 'wrap' }}>
        <span>
          <strong>{meal.macros.kcal}</strong> <span className="faint">kcal</span>
        </span>
        <span>
          <strong>{meal.macros.protein}</strong> <span className="faint">g P</span>
        </span>
        <span>
          <strong>{meal.macros.carbs}</strong> <span className="faint">g G</span>
        </span>
        <span>
          <strong>{meal.macros.fat}</strong> <span className="faint">g L</span>
        </span>
        <span className="faint">⏱ {meal.prepMinutes} min</span>
        <button className="small muted" style={{ marginLeft: 'auto' }} onClick={() => swapMeal(date, meal.id)}>
          ↻ Changer
        </button>
      </div>
    </div>
  );
}

export function Nutrition({ initialTab }: { initialTab?: Tab }) {
  const s = useApp((x) => x);
  const t = today();
  const plan = nutritionPlan(s);
  const [tab, setTab] = useState<Tab>(initialTab ?? 'today');
  const [openMeal, setOpenMeal] = useState<{ meal: Meal; date: string } | null>(null);
  const [showMethod, setShowMethod] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quick, setQuick] = useState({ kcal: 0, protein: 0 });
  const [dayIdx, setDayIdx] = useState(0);
  const [pantryCat, setPantryCat] = useState<FoodCategory | 'all'>('all');
  const user = s.user!;
  const intake = s.intake[t] ?? emptyIntake(t);
  const eaten = intakeTotals(s, t);
  const todayMeals = s.mealPlan?.days.find((d) => d.date === t);
  const trend = weeklyWeightChangePct(s.weights, t);
  const suggestion = suggestCalorieAdjustment(user.goal, trend);
  const groups = useMemo(() => (s.shoppingList ? groupByCategory(s.shoppingList) : []), [s.shoppingList]);

  if (!plan) return null;

  const toggleArr = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Estimation personnalisée"
        title="Nutrition"
        right={
          <button className="icon-btn" onClick={() => regenerateMeals()} aria-label="Régénérer les repas">
            <IconRefresh />
          </button>
        }
      />

      <div className="card hero pad-lg">
        <div className="row-between">
          <div>
            <div className="eyebrow">Cible du jour</div>
            <div className="stat-value" style={{ fontSize: 36, marginTop: 4 }}>
              {fmt(plan.targetKcal)}
              <small>kcal</small>
            </div>
            <div className="small muted">≈ estimation, pas une vérité médicale</div>
          </div>
          <Ring value={eaten.kcal} max={plan.targetKcal} size={86} stroke={8} color="var(--accent)">
            <div style={{ fontWeight: 800 }}>{Math.round((eaten.kcal / plan.targetKcal) * 100)}%</div>
          </Ring>
        </div>
        <div className="grid-3" style={{ marginTop: 16 }}>
          {(
            [
              ['Protéines', eaten.protein, plan.protein, 'accent'],
              ['Glucides', eaten.carbs, plan.carbs, undefined],
              ['Lipides', eaten.fat, plan.fat, 'blue'],
            ] as const
          ).map(([l, v, m, variant]) => (
            <div key={l}>
              <div className="tiny faint">{l}</div>
              <div style={{ fontWeight: 750 }}>
                {fmt(v)}
                <span className="faint small"> / {m} g</span>
              </div>
              <div style={{ marginTop: 6 }}>
                <Bar value={v} max={m} variant={variant} />
              </div>
            </div>
          ))}
        </div>
        <button className="small muted" style={{ marginTop: 14 }} onClick={() => setShowMethod(true)}>
          ⓘ Comment c’est calculé ?
        </button>
      </div>

      <div style={{ margin: '16px 0', overflowX: 'auto' }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'today', label: 'Jour' },
            { value: 'week', label: 'Semaine' },
            { value: 'pantry', label: 'Frigo' },
            { value: 'shopping', label: 'Courses' },
            { value: 'prefs', label: 'Réglages' },
          ]}
        />
      </div>

      {tab === 'today' && (
        <div className="stack fade-in">
          {s.mealPlan?.pantryMode && <div className="tag accent" style={{ alignSelf: 'flex-start' }}>Mode « j’ai ces aliments » actif</div>}
          {todayMeals?.meals.map((m) => (
            <MealCard key={m.id} meal={m} date={t} eaten={intake.eatenMealIds.includes(m.id)} onOpen={() => setOpenMeal({ meal: m, date: t })} />
          ))}
          {!todayMeals && <div className="empty">Aucun repas planifié. Touche ↻ pour générer.</div>}
          <div className="card">
            <div className="row-between">
              <div>
                <div style={{ fontWeight: 700 }}>Écart / ajout libre</div>
                <div className="small muted">
                  {intake.extra.kcal ? `+${intake.extra.kcal} kcal · +${intake.extra.protein} g P` : 'Tu as mangé autre chose ? Ajoute-le.'}
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                {intake.extra.kcal > 0 && (
                  <button className="btn ghost sm" onClick={() => resetExtra(t)}>
                    Effacer
                  </button>
                )}
                <button className="btn sm" onClick={() => setQuickOpen(true)}>
                  + Ajouter
                </button>
              </div>
            </div>
          </div>
          {todayMeals && (
            <p className="small faint" style={{ textAlign: 'center' }}>
              Total planifié : {todayMeals.totals.kcal} kcal · {todayMeals.totals.protein} g protéines
            </p>
          )}
        </div>
      )}

      {tab === 'week' && s.mealPlan && (
        <div className="stack fade-in">
          <div className="chips" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
            {s.mealPlan.days.map((d, i) => (
              <button key={d.date} className={`chip ${dayIdx === i ? 'on' : ''}`} style={{ flexShrink: 0 }} onClick={() => setDayIdx(i)}>
                {formatDate(d.date, { weekday: 'short', day: 'numeric' })}
              </button>
            ))}
          </div>
          {s.mealPlan.days[dayIdx]?.meals.map((m) => (
            <MealCard
              key={m.id}
              meal={m}
              date={s.mealPlan!.days[dayIdx].date}
              eaten={(s.intake[s.mealPlan!.days[dayIdx].date]?.eatenMealIds ?? []).includes(m.id)}
              onOpen={() => setOpenMeal({ meal: m, date: s.mealPlan!.days[dayIdx].date })}
            />
          ))}
        </div>
      )}

      {tab === 'pantry' && (
        <div className="stack fade-in">
          <div className="card accent">
            <div className="title-md">J’ai déjà ces aliments</div>
            <p className="small muted" style={{ marginTop: 4 }}>
              Sélectionne ce que tu as chez toi. Les repas seront générés uniquement à partir de ces aliments (sel, poivre et épices sont considérés disponibles).
            </p>
            <div className="row-between" style={{ marginTop: 14 }}>
              <span className="small">{s.pantry.length} aliment(s) sélectionné(s)</span>
              <button
                className={`btn sm ${s.pantryMode ? 'accent' : 'primary'}`}
                disabled={s.pantry.length < 3}
                onClick={() => {
                  setPantryMode(!s.pantryMode);
                  setTab('today');
                }}
              >
                {s.pantryMode ? 'Désactiver' : 'Générer mes repas'}
              </button>
            </div>
            {s.pantry.length < 3 && <p className="tiny faint" style={{ marginTop: 6 }}>Sélectionne au moins 3 aliments.</p>}
          </div>
          <div className="chips" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
            {(
              [
                ['all', 'Tous'],
                ['protein', 'Protéines'],
                ['starch', 'Féculents'],
                ['vegetable', 'Légumes'],
                ['fruit', 'Fruits'],
                ['dairy', 'Laitiers'],
                ['fat', 'Gras'],
              ] as const
            ).map(([k, l]) => (
              <button key={k} className={`chip ${pantryCat === k ? 'on' : ''}`} style={{ flexShrink: 0 }} onClick={() => setPantryCat(k)}>
                {l}
              </button>
            ))}
          </div>
          <div className="chips">
            {SELECTABLE_FOODS.filter((f) => pantryCat === 'all' || f.category === pantryCat).map((f) => (
              <button key={f.id} className={`chip ${s.pantry.includes(f.id) ? 'on' : ''}`} onClick={() => setPantry(toggleArr(s.pantry, f.id))}>
                {f.name}
              </button>
            ))}
          </div>
          {s.pantry.length > 0 && (
            <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setPantry([])}>
              Tout désélectionner
            </button>
          )}
        </div>
      )}

      {tab === 'shopping' && (
        <div className="stack fade-in">
          <div className="card">
            <div className="row-between">
              <div>
                <div className="title-md">Liste de courses de la semaine</div>
                <div className="small muted">
                  {s.shoppingList ? `${s.shoppingList.items.filter((i) => i.checked).length}/${s.shoppingList.items.length} cochés · ≈ ${s.shoppingList.estimatedTotal} €` : 'Basée sur tes repas planifiés'}
                </div>
              </div>
              <button className="btn primary sm" onClick={() => generateShopping()}>
                {s.shoppingList ? 'Mettre à jour' : 'Générer'}
              </button>
            </div>
            <p className="tiny faint" style={{ marginTop: 8 }}>
              Jours restants de la semaine. Les aliments cochés dans « Frigo » sont retirés. Prix = estimation indicative.
            </p>
          </div>
          {s.shoppingList && groups.length === 0 && (
            <div className="card empty">✅ Tu as déjà tout ce qu’il faut pour tes repas de la semaine.</div>
          )}
          {groups.map((g) => (
            <div key={g.category} className="card">
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                {SHOPPING_LABELS[g.category].emoji} {SHOPPING_LABELS[g.category].label}
              </div>
              <div className="list">
                {g.items.map((i) => (
                  <button key={i.id} className="list-item" onClick={() => toggleShoppingItem(i.id)}>
                    <Check on={i.checked} />
                    <div style={{ flex: 1 }}>
                      <div className={i.checked ? 'strike' : ''} style={{ fontWeight: 600 }}>
                        {i.name}
                      </div>
                      <div className="small faint">{i.display}</div>
                    </div>
                    <span className="small faint">{fmt(i.estimatedCost, 2)} €</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'prefs' && (
        <div className="stack fade-in">
          <div className="card">
            <div className="title-md">Ajustement selon ton poids</div>
            <p className="small muted" style={{ marginTop: 6 }}>
              {trend != null ? `Tendance : ${trend > 0 ? '+' : ''}${fmt(trend, 2)} %/semaine. ` : ''}
              {suggestion.message}
            </p>
            <div className="row-between" style={{ marginTop: 12 }}>
              <span className="small">Correction actuelle : {s.calorieOffset > 0 ? '+' : ''}{s.calorieOffset} kcal/j</span>
              <div className="row" style={{ gap: 6 }}>
                {suggestion.delta !== 0 && (
                  <button className="btn sm accent" onClick={() => setCalorieOffset(s.calorieOffset + suggestion.delta)}>
                    Appliquer {suggestion.delta > 0 ? '+' : ''}
                    {suggestion.delta}
                  </button>
                )}
                {s.calorieOffset !== 0 && (
                  <button className="btn sm ghost" onClick={() => setCalorieOffset(0)}>
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="card stack">
            <div className="field">
              <label>Repas par jour</label>
              <Segmented value={user.nutrition.mealsPerDay} onChange={(v) => updateUser({ nutrition: { ...user.nutrition, mealsPerDay: v } }, { meals: true })} options={[3, 4, 5].map((n) => ({ value: n as 3 | 4 | 5, label: String(n) }))} />
            </div>
            <div className="field">
              <label>Régime</label>
              <Segmented
                value={user.nutrition.diet}
                onChange={(v) => updateUser({ nutrition: { ...user.nutrition, diet: v } }, { meals: true })}
                options={[
                  { value: 'omnivore', label: 'Omnivore' },
                  { value: 'pescatarian', label: 'Pescétarien' },
                  { value: 'vegetarian', label: 'Végétarien' },
                ]}
              />
            </div>
            <div className="field">
              <label>Budget</label>
              <Segmented
                value={user.nutrition.budget}
                onChange={(v) => updateUser({ nutrition: { ...user.nutrition, budget: v } }, { meals: true })}
                options={[
                  { value: 'low', label: 'Serré' },
                  { value: 'medium', label: 'Moyen' },
                  { value: 'high', label: 'Confort' },
                ]}
              />
            </div>
            <div className="field">
              <label>Temps de cuisine</label>
              <Segmented
                value={user.nutrition.cookingTime}
                onChange={(v) => updateUser({ nutrition: { ...user.nutrition, cookingTime: v } }, { meals: true })}
                options={[
                  { value: 'minimal', label: '≤ 15 min' },
                  { value: 'moderate', label: '≤ 25 min' },
                  { value: 'plenty', label: 'Libre' },
                ]}
              />
            </div>
            <div className="field">
              <label>Allergies / intolérances</label>
              <div className="chips">
                {(Object.keys(ALLERGEN_LABELS) as Allergen[]).map((a) => (
                  <button
                    key={a}
                    className={`chip ${user.nutrition.allergies.includes(a) ? 'on' : ''}`}
                    onClick={() => updateUser({ nutrition: { ...user.nutrition, allergies: toggleArr(user.nutrition.allergies, a) } }, { meals: true })}
                  >
                    {ALLERGEN_LABELS[a]}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Aliments exclus (je n’aime pas)</label>
              <div className="chips">
                {SELECTABLE_FOODS.map((f) => (
                  <button
                    key={f.id}
                    className={`chip ${user.nutrition.dislikedFoods.includes(f.id) ? 'accent-on' : ''}`}
                    onClick={() => updateUser({ nutrition: { ...user.nutrition, dislikedFoods: toggleArr(user.nutrition.dislikedFoods, f.id) } }, { meals: true })}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Aliments favoris</label>
              <div className="chips">
                {SELECTABLE_FOODS.map((f) => (
                  <button
                    key={f.id}
                    className={`chip ${user.nutrition.likedFoods.includes(f.id) ? 'on' : ''}`}
                    onClick={() => updateUser({ nutrition: { ...user.nutrition, likedFoods: toggleArr(user.nutrition.likedFoods, f.id) } }, { meals: true })}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <SectionTitle>Base d’aliments</SectionTitle>
      <p className="small faint">{FOODS.length - 1} aliments · valeurs moyennes Ciqual (ANSES), arrondies.</p>

      <Sheet open={!!openMeal} onClose={() => setOpenMeal(null)} title={openMeal?.meal.name}>
        {openMeal && (
          <div className="stack">
            <div className="chips">
              <span className="tag">{MEAL_LABELS[openMeal.meal.type]}</span>
              <span className="tag">⏱ {openMeal.meal.prepMinutes} min</span>
              <span className="tag accent">{openMeal.meal.macros.kcal} kcal</span>
            </div>
            <div className="card">
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Ingrédients (quantités calculées pour toi)
              </div>
              <div className="list">
                {openMeal.meal.items.map((i) => {
                  const f = getFood(i.foodId);
                  return (
                    <div key={i.foodId} className="list-item">
                      <div style={{ flex: 1 }}>{f.name}</div>
                      <div className="small muted">{describeItem(i)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid-3">
              <div className="card tight">
                <div className="tiny faint">Protéines</div>
                <strong>{openMeal.meal.macros.protein} g</strong>
              </div>
              <div className="card tight">
                <div className="tiny faint">Glucides</div>
                <strong>{openMeal.meal.macros.carbs} g</strong>
              </div>
              <div className="card tight">
                <div className="tiny faint">Lipides</div>
                <strong>{openMeal.meal.macros.fat} g</strong>
              </div>
            </div>
            <div className="card">
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Préparation
              </div>
              <ol style={{ margin: 0, paddingLeft: 18 }} className="stack small">
                {openMeal.meal.steps.map((st) => (
                  <li key={st}>{st}</li>
                ))}
              </ol>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn block"
                onClick={() => {
                  swapMeal(openMeal.date, openMeal.meal.id);
                  setOpenMeal(null);
                }}
              >
                ↻ Autre recette
              </button>
              <button
                className="btn primary block"
                onClick={() => {
                  toggleEaten(openMeal.date, openMeal.meal.id);
                  setOpenMeal(null);
                }}
              >
                {(s.intake[openMeal.date]?.eatenMealIds ?? []).includes(openMeal.meal.id) ? 'Pas mangé' : 'Mangé ✓'}
              </button>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={showMethod} onClose={() => setShowMethod(false)} title="Méthode de calcul">
        <div className="stack small">
          {plan.explanation.map((e) => (
            <p key={e}>• {e}</p>
          ))}
          <div className="divider" />
          <p className="muted">Eau : ≈ {fmt(plan.waterL, 1)} L/j de boissons (références EFSA + entraînement).</p>
          <div className="divider" />
          <div className="eyebrow">Sources</div>
          {plan.sourceIds.map((id) => {
            const src = sourceById(id);
            return src ? (
              <p key={id} className="faint">
                {src.authors} ({src.year}). {src.title}. <em>{src.publication}</em>
              </p>
            ) : null;
          })}
          <button className="btn block" onClick={() => navigate('sources')}>
            Toutes les sources
          </button>
        </div>
      </Sheet>

      <Sheet open={quickOpen} onClose={() => setQuickOpen(false)} title="Ajout libre">
        <div className="stack-lg">
          <div className="row-between">
            <span className="muted">Calories</span>
            <Stepper value={quick.kcal} onChange={(v) => setQuick({ ...quick, kcal: v })} step={50} max={3000} />
          </div>
          <div className="row-between">
            <span className="muted">Protéines (g)</span>
            <Stepper value={quick.protein} onChange={(v) => setQuick({ ...quick, protein: v })} step={5} max={200} />
          </div>
          <button
            className="btn primary block"
            disabled={!quick.kcal && !quick.protein}
            onClick={() => {
              addExtraMacros(t, { kcal: quick.kcal, protein: quick.protein, carbs: 0, fat: 0 });
              setQuick({ kcal: 0, protein: 0 });
              setQuickOpen(false);
            }}
          >
            Ajouter
          </button>
        </div>
      </Sheet>
    </div>
  );
}
