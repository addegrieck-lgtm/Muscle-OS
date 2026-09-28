import { useMemo, useState } from 'react';
import type { Exercise, MuscleGroupId, Workout } from '../types/models';
import { useApp, store } from '../store/store';
import { startSession, deleteSession, regenerateProgram } from '../store/actions';
import { EXERCISES, getExercise } from '../data/exercises';
import { MUSCLE_GROUPS, muscleLabel, WEEKDAYS } from '../data/reference';
import { hasEquipment } from '../engines/workoutGenerator';
import { computeAdjustment, adjustWorkout } from '../engines/recoveryAdjuster';
import { formatDate, normalize, today, weekdayIndex } from '../utils';
import { navigate } from '../hooks/useRoute';
import { PageHeader, SectionTitle, Sheet } from '../components/ui';
import { HBars } from '../components/Charts';
import { ExerciseDetail } from '../components/ExerciseDetail';
import { CardioLogSheet } from '../components/Sheets';
import { IconChevron, IconPlay, IconRefresh } from '../components/Icons';

function WorkoutCard({ w, onExercise, onStart }: { w: Workout; onExercise: (e: Exercise) => void; onStart: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <button className="row-between" style={{ width: '100%', textAlign: 'left' }} onClick={() => setOpen(!open)}>
        <div>
          <div style={{ fontWeight: 750 }}>{w.title}</div>
          <div className="small muted">
            {w.focus.map(muscleLabel).join(' · ')} · ≈ {w.estimatedMinutes} min
          </div>
        </div>
        <IconChevron style={{ transform: open ? 'rotate(90deg)' : undefined, transition: 'transform .2s' }} />
      </button>
      {open && (
        <div className="fade-in" style={{ marginTop: 10 }}>
          <div className="list">
            {w.exercises.map((p, i) => {
              const ex = getExercise(p.exerciseId);
              return (
                <button key={i} className="list-item" onClick={() => onExercise(ex)}>
                  <span className="tag" style={{ minWidth: 28, justifyContent: 'center' }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{ex.name}</div>
                    <div className="small faint">
                      {p.sets} × {p.repMin}-{p.repMax}
                      {ex.mode === 'time' ? ' s' : ''}
                      {p.load ? ` · ${p.load} kg` : ''} · repos {p.restSec}s{p.tempo ? ` · tempo ${p.tempo}` : ''}
                    </div>
                    {p.note && <div className="tiny" style={{ color: 'var(--accent-soft)', marginTop: 2 }}>{p.note}</div>}
                  </div>
                  <span className="tiny faint">{muscleLabel(ex.primary)}</span>
                </button>
              );
            })}
          </div>
          <button className="btn primary block" style={{ marginTop: 12 }} onClick={onStart}>
            <IconPlay width={16} height={16} /> Démarrer cette séance
          </button>
        </div>
      )}
    </div>
  );
}

export function Training() {
  const s = useApp((x) => x);
  const t = today();
  const [selDay, setSelDay] = useState(weekdayIndex(t));
  const [detail, setDetail] = useState<Exercise | undefined>();
  const [cardioOpen, setCardioOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroupId | 'all'>('all');
  const [onlyMine, setOnlyMine] = useState(true);
  const [libOpen, setLibOpen] = useState(false);
  const program = s.program;
  const user = s.user!;
  const adj = computeAdjustment(s.recovery.find((r) => r.date === t));
  const day = program?.schedule[selDay];
  const dayWorkout = program?.workouts.find((w) => w.id === day?.workoutId);

  const library = useMemo(
    () =>
      EXERCISES.filter((e) => (muscle === 'all' || e.primary === muscle) && (!onlyMine || hasEquipment(e, user.equipment)) && (!query || normalize(e.name).includes(normalize(query)))).sort(
        (a, b) => a.primary.localeCompare(b.primary) || a.difficulty - b.difficulty,
      ),
    [muscle, onlyMine, query, user.equipment],
  );

  const start = (w: Workout) => {
    if (s.activeSession && !confirm('Une séance est déjà en cours. La remplacer ?')) return;
    const isToday = selDay === weekdayIndex(t);
    startSession(isToday ? adjustWorkout(w, adj) : w, isToday && adj.volumeFactor < 1 ? adj.message : undefined);
    navigate('session');
  };

  const summary = s.lastSessionSummary;

  return (
    <div className="page">
      <PageHeader
        eyebrow={`Semaine ${program?.week ?? 1} · ${program?.splitName ?? ''}`}
        title="Entraînement"
        right={
          <button className="icon-btn" onClick={() => regenerateProgram('Programme régénéré.')} aria-label="Régénérer le programme">
            <IconRefresh />
          </button>
        }
      />

      {s.activeSession && (
        <button className="card accent clickable row-between" style={{ width: '100%', textAlign: 'left', marginBottom: 12 }} onClick={() => navigate('session')}>
          <div>
            <div style={{ fontWeight: 700 }}>Séance en cours</div>
            <div className="small muted">{s.activeSession.title}</div>
          </div>
          <IconChevron />
        </button>
      )}

      {summary && (
        <div className="card accent fade-in" style={{ marginBottom: 12 }}>
          <div className="row-between">
            <div className="title-md">Bilan de ta séance ✅</div>
            <button className="btn ghost sm" onClick={() => store.set({ lastSessionSummary: undefined })}>
              OK
            </button>
          </div>
          <div className="stack small" style={{ marginTop: 10, gap: 8 }}>
            {summary.messages.map((m) => (
              <div key={m.exerciseId}>
                <strong>{getExercise(m.exerciseId).name}</strong>
                <div className="muted">
                  {m.change === 'variant' ? '🚀 ' : m.change === 'load' || m.change === 'reps' ? '📈 ' : m.change === 'reduce' || m.change === 'regress' ? '🔧 ' : '➖ '}
                  {m.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="week-strip">
        {WEEKDAYS.map((d, i) => {
          const dp = program?.schedule[i];
          return (
            <button key={d} className={`day-pill ${i === weekdayIndex(t) ? 'today' : ''} ${i === selDay ? 'sel' : ''}`} onClick={() => setSelDay(i)}>
              <span style={{ fontWeight: 700 }}>{d.slice(0, 3)}</span>
              <span className="day-dots">
                {dp?.workoutId && <i />}
                {dp?.cardio && <i className="c" />}
                {dp?.core && <i className="k" />}
              </span>
            </button>
          );
        })}
      </div>

      <SectionTitle>{WEEKDAYS[selDay]}</SectionTitle>
      <div className="stack">
        {dayWorkout && <WorkoutCard w={dayWorkout} onExercise={setDetail} onStart={() => start(dayWorkout)} />}
        {day?.cardio && (
          <div className="card">
            <div className="row-between">
              <div>
                <div className="eyebrow" style={{ color: 'var(--blue)' }}>
                  Cardio {day.cardio.hard ? '· intense' : '· facile'}
                </div>
                <div style={{ fontWeight: 750, marginTop: 4 }}>
                  {day.cardio.title} · {Math.round(day.cardio.totalMinutes)} min
                </div>
              </div>
              {selDay === weekdayIndex(t) && (
                <button className="btn sm" onClick={() => setCardioOpen(true)}>
                  Faire
                </button>
              )}
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>
              {day.cardio.description}
            </p>
            <div className="stack small" style={{ marginTop: 10, gap: 4 }}>
              {day.cardio.blocks.map((b, i) => (
                <div key={i} className="row-between">
                  <span>
                    {b.repeat ? `${b.repeat} × ` : ''}
                    {b.label}
                  </span>
                  {!b.repeat && <span className="faint">{Math.round(b.minutes)} min</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {day?.core && program?.workouts.find((w) => w.id === 'w-core') && (
          <WorkoutCard w={program.workouts.find((w) => w.id === 'w-core')!} onExercise={setDetail} onStart={() => start(program.workouts.find((w) => w.id === 'w-core')!)} />
        )}
        {day?.rest && (
          <div className="card">
            <div style={{ fontWeight: 700 }}>😴 Repos</div>
            <p className="small muted">Récupération active possible : marche, mobilité, étirements doux.</p>
          </div>
        )}
      </div>

      {program && program.notes.length > 0 && (
        <>
          <SectionTitle>Notes du coach</SectionTitle>
          <div className="card stack small">
            {program.notes.map((n, i) => (
              <div key={i}>• {n}</div>
            ))}
          </div>
        </>
      )}

      <SectionTitle>Toutes mes séances</SectionTitle>
      <div className="stack">
        {program?.workouts.map((w) => (
          <WorkoutCard key={w.id} w={w} onExercise={setDetail} onStart={() => start(w)} />
        ))}
      </div>

      <SectionTitle>Cardio de la semaine · {Math.round(program?.weeklyCardioMinutes ?? 0)} min</SectionTitle>
      <div className="card">
        <div className="list">
          {program?.schedule
            .filter((d) => d.cardio)
            .map((d) => (
              <div key={d.weekday} className="list-item">
                <span className="tag">{WEEKDAYS[d.weekday].slice(0, 3)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{d.cardio!.title}</div>
                  <div className="small faint">{d.cardio!.hard ? 'Intense' : 'Facile'} · {Math.round(d.cardio!.totalMinutes)} min</div>
                </div>
              </div>
            ))}
          {!program?.schedule.some((d) => d.cardio) && <div className="empty small">Pas de cardio cette semaine.</div>}
        </div>
        <p className="tiny faint" style={{ marginTop: 10 }}>
          Progression ≤ 10 %/semaine, semaine allégée toutes les 4 semaines, majorité en intensité facile (OMS, ACSM).
        </p>
      </div>

      <SectionTitle>Volume hebdomadaire par muscle (séries)</SectionTitle>
      <div className="card">
        <HBars
          data={(program?.volumes ?? [])
            .slice()
            .sort((a, b) => b.weeklySets - a.weeklySets)
            .map((v) => ({
              label: muscleLabel(v.muscle),
              value: v.weeklySets,
              note: `${v.frequency}×/sem`,
              color: user.musclePriorities[v.muscle] === 'priority' ? 'var(--accent)' : user.musclePriorities[v.muscle] === 'important' ? 'var(--accent-soft)' : 'var(--text-2)',
            }))}
        />
        <p className="tiny faint" style={{ marginTop: 12 }}>
          ≈10 séries/semaine et plus sont associées à davantage d’hypertrophie (Schoenfeld 2017). Les muscles non prioritaires gardent au moins un volume d’entretien.
        </p>
      </div>

      <SectionTitle right={<button className="small muted" onClick={() => setLibOpen(true)}>Ouvrir →</button>}>
        Bibliothèque · {EXERCISES.length} exercices
      </SectionTitle>

      <SectionTitle>Historique</SectionTitle>
      <div className="card">
        {s.sessions.length === 0 ? (
          <div className="empty small">Aucune séance enregistrée pour l’instant.</div>
        ) : (
          <div className="list">
            {[...s.sessions]
              .reverse()
              .slice(0, 15)
              .map((x) => (
                <div key={x.id} className="list-item">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{x.title}</div>
                    <div className="small faint">
                      {formatDate(x.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {x.durationMin ?? '?'} min · {x.exercises.reduce((a, e) => a + e.sets.filter((z) => z.done).length, 0)} séries
                    </div>
                  </div>
                  <button className="btn ghost sm" onClick={() => confirm('Supprimer cette séance ?') && deleteSession(x.id)}>
                    Suppr.
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      <Sheet open={libOpen} onClose={() => setLibOpen(false)} title="Bibliothèque">
        <div className="stack">
          <input className="input" placeholder="Rechercher un exercice" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="chips" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
            <button className={`chip ${muscle === 'all' ? 'on' : ''}`} onClick={() => setMuscle('all')}>
              Tous
            </button>
            {MUSCLE_GROUPS.map((m) => (
              <button key={m.id} className={`chip ${muscle === m.id ? 'on' : ''}`} style={{ flexShrink: 0 }} onClick={() => setMuscle(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
          <button className={`chip ${onlyMine ? 'on' : ''}`} style={{ alignSelf: 'flex-start' }} onClick={() => setOnlyMine(!onlyMine)}>
            Avec mon matériel uniquement
          </button>
          <div className="list">
            {library.map((e) => (
              <button key={e.id} className="list-item" onClick={() => setDetail(e)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{e.name}</div>
                  <div className="small faint">
                    {muscleLabel(e.primary)} · {'●'.repeat(e.difficulty)}
                  </div>
                </div>
                <IconChevron width={18} />
              </button>
            ))}
          </div>
        </div>
      </Sheet>

      <ExerciseDetail exercise={detail} onClose={() => setDetail(undefined)} />
      {cardioOpen && <CardioLogSheet open onClose={() => setCardioOpen(false)} workout={day?.cardio} />}
    </div>
  );
}
