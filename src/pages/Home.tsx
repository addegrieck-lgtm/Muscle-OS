import { useMemo, useState } from 'react';
import { useApp } from '../store/store';
import { dayPlan, emptyIntake, intakeTotals, nutritionPlan, workoutById } from '../store/selectors';
import { addWater, startSession, toggleEaten } from '../store/actions';
import { computeAdjustment, adjustWorkout } from '../engines/recoveryAdjuster';
import { latestWeight } from '../engines/analytics';
import { MEAL_LABELS } from '../engines/mealGenerator';
import { DISCLAIMER } from '../engines/safety';
import { muscleLabel, WEEKDAYS } from '../data/reference';
import { daysBetween, fmt, formatDate, startOfWeek, today, weekdayIndex } from '../utils';
import { navigate } from '../hooks/useRoute';
import { Bar, Check, PageHeader, Ring, SectionTitle, Sheet } from '../components/ui';
import { IconBook, IconChevron, IconDrop, IconPlay, IconRun, IconScale, IconSettings } from '../components/Icons';
import { CardioLogSheet, CheckInForm, WeightSheet } from '../components/Sheets';

export function Home() {
  const s = useApp((x) => x);
  const t = today();
  const user = s.user!;
  const plan = nutritionPlan(s);
  const day = dayPlan(s, t);
  const workout = workoutById(s, day?.workoutId);
  const checkin = s.recovery.find((r) => r.date === t);
  const adj = computeAdjustment(checkin);
  const intake = s.intake[t] ?? emptyIntake(t);
  const eaten = intakeTotals(s, t);
  const meals = s.mealPlan?.days.find((d) => d.date === t)?.meals ?? [];
  const weight = latestWeight(s.weights) ?? user.weightKg;
  const dayNumber = daysBetween(user.startDate, t) + 1;
  const doneToday = s.sessions.filter((x) => x.date === t && x.finishedAt);
  const cardioToday = s.cardioSessions.filter((c) => c.date === t);
  const [weightOpen, setWeightOpen] = useState(false);
  const [cardioOpen, setCardioOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);

  const weekStart = startOfWeek(t);
  const weekSessions = s.sessions.filter((x) => x.finishedAt && x.date >= weekStart).length;
  const plannedWeek = s.program?.workouts.filter((w) => w.kind !== 'core').length ?? user.daysPerWeek;
  const adjusted = useMemo(() => (workout ? adjustWorkout(workout, adj) : undefined), [workout, adj.volumeFactor, adj.extraRir]);

  return (
    <div className="page">
      <PageHeader
        eyebrow={formatDate(t, { weekday: 'long', day: 'numeric', month: 'long' })}
        title="Aujourd’hui"
        right={
          <>
            <button className="icon-btn" onClick={() => navigate('sources')} aria-label="Sources & méthode">
              <IconBook />
            </button>
            <button className="icon-btn" onClick={() => navigate('settings')} aria-label="Profil & réglages">
              <IconSettings />
            </button>
          </>
        }
      />

      <div className="card hero pad-lg">
        <div className="row-between">
          <div>
            <div className="eyebrow" style={{ color: 'var(--accent-soft)' }}>
              🔥 Jour {dayNumber}
            </div>
            <div className="title-lg" style={{ marginTop: 6 }}>
              {user.name ? `Salut ${user.name}` : 'Salut'} 👋
            </div>
            <p className="small muted" style={{ marginTop: 4 }}>
              Semaine {s.program?.week ?? 1} · {s.program?.splitName}
              {s.program?.deload && <span className="tag accent" style={{ marginLeft: 6 }}>Décharge</span>}
            </p>
          </div>
          <Ring value={weekSessions} max={plannedWeek} size={74} stroke={7} color="var(--accent)">
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {weekSessions}/{plannedWeek}
            </div>
            <div className="tiny faint">séances</div>
          </Ring>
        </div>
      </div>

      {/* Check-in récupération */}
      <SectionTitle>Récupération</SectionTitle>
      {checkin ? (
        <button className={`card clickable ${adj.band === 'low' || checkin.pain ? 'warning' : ''}`} style={{ width: '100%', textAlign: 'left' }} onClick={() => setCheckinOpen(true)}>
          <div className="row-between">
            <div className="row">
              <Ring value={adj.score} max={100} size={54} stroke={5} color={adj.score >= 55 ? 'var(--ok)' : adj.score >= 38 ? 'var(--warn)' : 'var(--danger)'}>
                <span style={{ fontWeight: 800, fontSize: 14 }}>{adj.score}</span>
              </Ring>
              <div>
                <div style={{ fontWeight: 700 }}>Forme du jour</div>
                <div className="small muted">{adj.message}</div>
              </div>
            </div>
          </div>
        </button>
      ) : (
        <div className="card accent">
          <div className="row-between">
            <div>
              <div className="title-md">Comment te sens-tu ?</div>
              <p className="small muted">30 secondes pour adapter ta séance à ta forme.</p>
            </div>
            <button className="btn primary sm" onClick={() => setCheckinOpen(true)}>
              Check-in
            </button>
          </div>
        </div>
      )}

      {/* Séance */}
      <SectionTitle right={<button className="small muted" onClick={() => navigate('training')}>Semaine →</button>}>
        Séance
      </SectionTitle>
      <div className="stack">
        {workout && adjusted ? (
          <div className="card">
            <div className="row-between">
              <div style={{ flex: 1 }}>
                <div className="eyebrow">🏋️ Musculation</div>
                <div className="title-md" style={{ marginTop: 4 }}>
                  {workout.focus.map(muscleLabel).join(' + ') || workout.title}
                </div>
                <div className="small muted">
                  {workout.title} · {adjusted.exercises.length} exercices · ≈ {adjusted.estimatedMinutes} min
                </div>
                {adj.volumeFactor < 1 && <div className="small" style={{ color: 'var(--warn)', marginTop: 4 }}>Séance allégée selon ton check-in</div>}
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              {doneToday.some((d) => d.workoutId === workout.id) ? (
                <div className="tag ok">✓ Terminée</div>
              ) : s.activeSession ? (
                <button className="btn accent block" onClick={() => navigate('session')}>
                  Reprendre la séance en cours
                </button>
              ) : (
                <button
                  className="btn primary block"
                  onClick={() => {
                    startSession(adjusted, adj.volumeFactor < 1 ? adj.message : undefined);
                    navigate('session');
                  }}
                >
                  <IconPlay width={16} height={16} /> Démarrer
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="eyebrow">😴 Récupération</div>
            <div className="title-md" style={{ marginTop: 4 }}>
              Pas de musculation aujourd’hui
            </div>
            <p className="small muted">Le muscle se construit aussi au repos. Une marche active est bienvenue.</p>
          </div>
        )}

        {day?.cardio && (
          <div className="card">
            <div className="row-between">
              <div className="row">
                <div className="icon-btn" style={{ color: 'var(--blue)' }}>
                  <IconRun />
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    🏃 {day.cardio.title} · {Math.round(day.cardio.totalMinutes)} min
                  </div>
                  <div className="small muted">{day.cardio.hard && adj.replaceHardCardio ? 'À remplacer par du facile aujourd’hui (récupération)' : day.cardio.description.split('.')[0]}</div>
                </div>
              </div>
              {cardioToday.length ? <span className="tag ok">✓</span> : <button className="btn sm" onClick={() => setCardioOpen(true)}>Fait</button>}
            </div>
          </div>
        )}

        {day?.core && (
          <div className="card">
            <div className="row-between">
              <div>
                <div style={{ fontWeight: 700 }}>🧱 Gainage & abdos</div>
                <div className="small muted">Mini-séance ≈ {workoutById(s, 'w-core')?.estimatedMinutes ?? 12} min</div>
              </div>
              {doneToday.some((d) => d.workoutId === 'w-core') ? (
                <span className="tag ok">✓</span>
              ) : (
                <button
                  className="btn sm"
                  onClick={() => {
                    const core = workoutById(s, 'w-core');
                    if (core) {
                      startSession(adjustWorkout(core, adj));
                      navigate('session');
                    }
                  }}
                >
                  Go
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Nutrition */}
      <SectionTitle right={<button className="small muted" onClick={() => navigate('nutrition')}>Détails →</button>}>
        Nutrition
      </SectionTitle>
      {plan && (
        <div className="grid-2">
          <div className="card tight">
            <div className="eyebrow">🍗 Protéines</div>
            <div className="stat-value" style={{ marginTop: 6 }}>
              {fmt(eaten.protein)}
              <small>/ {plan.protein} g</small>
            </div>
            <div style={{ marginTop: 10 }}>
              <Bar value={eaten.protein} max={plan.protein} variant="accent" />
            </div>
          </div>
          <div className="card tight">
            <div className="eyebrow">⚡ Calories</div>
            <div className="stat-value" style={{ marginTop: 6 }}>
              {fmt(eaten.kcal)}
              <small>/ {fmt(plan.targetKcal)}</small>
            </div>
            <div style={{ marginTop: 10 }}>
              <Bar value={eaten.kcal} max={plan.targetKcal} />
            </div>
          </div>
          <div className="card tight">
            <div className="eyebrow">💧 Eau</div>
            <div className="stat-value" style={{ marginTop: 6 }}>
              {fmt(intake.waterMl / 1000, 1)}
              <small>/ {fmt(plan.waterL, 1)} L</small>
            </div>
            <div className="row" style={{ marginTop: 8, gap: 6 }}>
              <button className="btn sm" style={{ flex: 1, padding: 0 }} onClick={() => addWater(t, 250)}>
                <IconDrop width={14} height={14} /> +25 cl
              </button>
              <button className="btn sm ghost" style={{ padding: '0 8px' }} onClick={() => addWater(t, -250)} aria-label="Retirer 25 cl">
                −
              </button>
            </div>
          </div>
          <button className="card tight clickable" style={{ textAlign: 'left' }} onClick={() => setWeightOpen(true)}>
            <div className="eyebrow">⚖️ Poids</div>
            <div className="stat-value" style={{ marginTop: 6 }}>
              {fmt(weight, 1)}
              <small>kg</small>
            </div>
            <div className="small muted row" style={{ marginTop: 10, gap: 4 }}>
              <IconScale width={14} height={14} /> {s.weights.some((w) => w.date === t) ? 'Pesé aujourd’hui' : 'Me peser'}
            </div>
          </button>
        </div>
      )}

      {meals.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="list">
            {meals.map((m) => {
              const on = intake.eatenMealIds.includes(m.id);
              return (
                <button key={m.id} className="list-item" onClick={() => toggleEaten(t, m.id)}>
                  <Check on={on} round />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="tiny faint" style={{ textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
                      {MEAL_LABELS[m.type]}
                    </div>
                    <div className={on ? 'strike' : ''} style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.name}
                    </div>
                  </div>
                  <div className="small faint" style={{ textAlign: 'right' }}>
                    {m.macros.kcal} kcal
                    <br />
                    {m.macros.protein} g P
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Semaine */}
      <SectionTitle>Cette semaine</SectionTitle>
      <div className="card">
        <div className="week-strip">
          {WEEKDAYS.map((d, i) => {
            const dp = s.program?.schedule[i];
            const isToday = i === weekdayIndex(t);
            return (
              <div key={d} className={`day-pill ${isToday ? 'today' : ''}`}>
                <span style={{ fontWeight: 700 }}>{d.slice(0, 1)}</span>
                <span className="day-dots">
                  {dp?.workoutId && <i />}
                  {dp?.cardio && <i className="c" />}
                  {dp?.core && <i className="k" />}
                </span>
              </div>
            );
          })}
        </div>
        <div className="legend" style={{ marginTop: 12 }}>
          <span>
            <i style={{ background: 'var(--text-2)', borderRadius: 99 }} />
            Muscu
          </span>
          <span>
            <i style={{ background: 'var(--blue)', borderRadius: 99 }} />
            Cardio
          </span>
          <span>
            <i style={{ background: 'var(--accent)', borderRadius: 99 }} />
            Gainage
          </span>
        </div>
      </div>

      <button className="card clickable row-between" style={{ width: '100%', marginTop: 12, textAlign: 'left' }} onClick={() => navigate('coach')}>
        <div>
          <div style={{ fontWeight: 700 }}>🤖 Une question ?</div>
          <div className="small muted">« Je n’ai que 20 minutes », « Que manger ce soir ? »…</div>
        </div>
        <IconChevron />
      </button>

      <p className="disclaimer">{DISCLAIMER}</p>

      {weightOpen && <WeightSheet open onClose={() => setWeightOpen(false)} initial={weight} />}
      {cardioOpen && <CardioLogSheet open onClose={() => setCardioOpen(false)} workout={day?.cardio} />}
      <Sheet open={checkinOpen} onClose={() => setCheckinOpen(false)} title="Comment te sens-tu ?">
        <CheckInForm initial={checkin} onDone={() => setCheckinOpen(false)} />
      </Sheet>
    </div>
  );
}
