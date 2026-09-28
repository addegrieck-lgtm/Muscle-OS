import { useEffect, useState } from 'react';
import type { Exercise, ExerciseLog, Feedback } from '../types/models';
import { useApp } from '../store/store';
import { cancelSession, finishSession, updateActiveSession } from '../store/actions';
import { getExercise } from '../data/exercises';
import { muscleLabel } from '../data/reference';
import { rankExercisesFor, prescribe } from '../engines/workoutGenerator';
import { navigate } from '../hooks/useRoute';
import { ExerciseDetail } from '../components/ExerciseDetail';
import { FEEDBACK_LABELS } from '../components/Sheets';
import { Sheet } from '../components/ui';
import { IconCheck, IconClose, IconInfo, IconRefresh } from '../components/Icons';

function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, Math.floor(sec % 60))).padStart(2, '0')}`;

function beep() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.4);
  } catch {
    /* audio indisponible */
  }
  navigator.vibrate?.([120, 60, 120]);
}

function ExerciseBlock({
  log,
  index,
  onRest,
  onInfo,
  onSwap,
}: {
  log: ExerciseLog;
  index: number;
  onRest: (sec: number) => void;
  onInfo: (e: Exercise) => void;
  onSwap: (index: number) => void;
}) {
  const ex = getExercise(log.exerciseId);
  const p = log.planned;
  const allDone = log.sets.length > 0 && log.sets.every((s) => s.done);
  const update = (fn: (l: ExerciseLog) => ExerciseLog) =>
    updateActiveSession((s) => ({ ...s, exercises: s.exercises.map((l, i) => (i === index ? fn(l) : l)) }));

  const setField = (si: number, field: 'reps' | 'load', value: number) =>
    update((l) => ({ ...l, sets: l.sets.map((st, j) => (j === si ? { ...st, [field]: value } : field === 'load' && j > si && !st.done ? { ...st, load: value } : st)) }));

  const toggleDone = (si: number) => {
    const wasDone = log.sets[si].done;
    update((l) => ({ ...l, sets: l.sets.map((st, j) => (j === si ? { ...st, done: !st.done } : st)) }));
    if (!wasDone && si < log.sets.length - 1) onRest(p.restSec);
  };

  return (
    <div className={`card ${allDone && log.feedback ? '' : ''}`} style={{ opacity: allDone && log.feedback ? 0.7 : 1 }}>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div className="eyebrow">
            {index + 1} · {muscleLabel(ex.primary)}
          </div>
          <div className="title-md" style={{ marginTop: 4 }}>
            {ex.name}
          </div>
          <div className="small muted" style={{ marginTop: 2 }}>
            {p.sets} séries · {p.repMin}-{p.repMax} {ex.mode === 'time' ? 's' : 'reps'}
            {ex.unilateral ? ' / côté' : ''} · repos {p.restSec}s · {p.rir} RIR{p.tempo ? ` · tempo ${p.tempo}` : ''}
          </div>
          {p.note && <div className="small" style={{ color: 'var(--accent-soft)', marginTop: 4 }}>{p.note}</div>}
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="icon-btn" onClick={() => onSwap(index)} aria-label="Remplacer l’exercice">
            <IconRefresh width={18} />
          </button>
          <button className="icon-btn" onClick={() => onInfo(ex)} aria-label="Consignes">
            <IconInfo width={18} />
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="set-row head">
          <span>#</span>
          <span style={{ textAlign: 'center' }}>{ex.mode === 'time' ? 'Secondes' : 'Reps'}</span>
          <span style={{ textAlign: 'center' }}>{ex.loadable ? 'Charge kg' : ''}</span>
          <span />
        </div>
        {log.sets.map((st, si) => (
          <div key={si} className={`set-row ${st.done ? 'done' : ''}`}>
            <span className="n">{si + 1}</span>
            <input className="set-input" inputMode="numeric" value={st.reps || ''} placeholder={String(p.repMax)} onChange={(e) => setField(si, 'reps', parseInt(e.target.value, 10) || 0)} />
            {ex.loadable ? (
              <input
                className="set-input"
                inputMode="decimal"
                value={st.load ?? ''}
                placeholder="—"
                onChange={(e) => setField(si, 'load', parseFloat(e.target.value.replace(',', '.')) || 0)}
              />
            ) : (
              <span />
            )}
            <button className="set-check" onClick={() => toggleDone(si)} aria-label={`Valider la série ${si + 1}`}>
              <IconCheck width={20} />
            </button>
          </div>
        ))}
        <div className="row" style={{ marginTop: 6, gap: 6 }}>
          <button className="btn ghost sm" onClick={() => update((l) => ({ ...l, sets: [...l.sets, { reps: l.sets.at(-1)?.reps ?? p.repMin, load: l.sets.at(-1)?.load, done: false }] }))}>
            + Série
          </button>
          {log.sets.length > 1 && (
            <button className="btn ghost sm" onClick={() => update((l) => ({ ...l, sets: l.sets.slice(0, -1) }))}>
              − Série
            </button>
          )}
        </div>
      </div>

      {allDone && (
        <div className="fade-in" style={{ marginTop: 12 }}>
          <div className="small" style={{ fontWeight: 650, marginBottom: 8 }}>
            Comment était l’exercice ?
          </div>
          <div className="grid-2" style={{ gap: 8 }}>
            {(Object.keys(FEEDBACK_LABELS) as Feedback[]).map((f) => (
              <button key={f} className={`chip ${log.feedback === f ? 'on' : ''}`} style={{ justifyContent: 'center' }} onClick={() => update((l) => ({ ...l, feedback: f }))}>
                {FEEDBACK_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
      )}
      <button className={`chip ${log.pain ? 'accent-on' : ''}`} style={{ marginTop: 10 }} onClick={() => update((l) => ({ ...l, pain: !l.pain }))}>
        {log.pain ? '⚠️ Douleur signalée' : 'Douleur ?'}
      </button>
      {log.pain && (
        <div className="card warning small" style={{ marginTop: 10 }}>
          <strong>Arrête cet exercice.</strong> Ne force pas sur une douleur. Continue uniquement les exercices qui ne la déclenchent pas. Si la douleur est importante, persiste ou s’accompagne
          d’un gonflement, consulte un professionnel de santé. La prochaine fois, une variante plus douce te sera proposée.
        </div>
      )}
    </div>
  );
}

export function Session() {
  const session = useApp((s) => s.activeSession);
  const user = useApp((s) => s.user);
  const progress = useApp((s) => s.progress);
  const now = useNow();
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [info, setInfo] = useState<Exercise | undefined>();
  const [swapIndex, setSwapIndex] = useState<number | null>(null);

  const restLeft = restEnd ? Math.ceil((restEnd - now) / 1000) : 0;
  useEffect(() => {
    if (restEnd && restLeft <= 0) {
      beep();
      setRestEnd(null);
    }
  }, [restLeft, restEnd]);

  if (!session || !user) {
    return (
      <div className="page no-tabbar">
        <div className="empty">
          <p>Aucune séance en cours.</p>
          <button className="btn primary" style={{ marginTop: 16 }} onClick={() => navigate('training')}>
            Voir l’entraînement
          </button>
        </div>
      </div>
    );
  }

  const elapsed = Math.floor((now - Date.parse(session.startedAt)) / 1000);
  const totalSets = session.exercises.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = session.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const swapEx = swapIndex != null ? getExercise(session.exercises[swapIndex].exerciseId) : undefined;
  const alternatives = swapEx ? rankExercisesFor(swapEx.primary, user.equipment, user.level, user.goal).filter((e) => e.id !== swapEx.id && !session.exercises.some((l) => l.exerciseId === e.id)) : [];

  return (
    <div className="page no-tabbar" style={{ paddingBottom: 140 }}>
      <div className="row-between" style={{ marginBottom: 14 }}>
        <button
          className="icon-btn"
          aria-label="Abandonner"
          onClick={() => {
            if (confirm('Abandonner la séance ? Les séries saisies seront perdues.')) {
              cancelSession();
              navigate('training');
            }
          }}
        >
          <IconClose />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div className="eyebrow">{session.title}</div>
          <div style={{ fontWeight: 800, fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>{mmss(elapsed)}</div>
        </div>
        <button className="icon-btn" onClick={() => navigate('home')} aria-label="Réduire">
          ↓
        </button>
      </div>
      <div className="bar accent" style={{ marginBottom: 16 }}>
        <span style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }} />
      </div>

      {session.adjusted && <div className="card warning small" style={{ marginBottom: 12 }}>{session.adjusted}</div>}

      <div className="stack">
        {session.exercises.map((log, i) => (
          <ExerciseBlock key={`${log.exerciseId}-${i}`} log={log} index={i} onRest={(sec) => setRestEnd(Date.now() + sec * 1000)} onInfo={setInfo} onSwap={setSwapIndex} />
        ))}
      </div>

      <p className="small faint" style={{ marginTop: 16, textAlign: 'center' }}>
        RIR = répétitions en réserve : arrête la série quand il t’en reste environ autant « dans le réservoir ».
      </p>

      {restEnd && restLeft > 0 ? (
        <div className="rest-timer row-between">
          <div>
            <div className="eyebrow">Repos</div>
            <div style={{ fontSize: 30, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{mmss(restLeft)}</div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn sm" onClick={() => setRestEnd(restEnd + 15000)}>
              +15 s
            </button>
            <button className="btn sm primary" onClick={() => setRestEnd(null)}>
              Passer
            </button>
          </div>
        </div>
      ) : (
        <div className="fab-bottom">
          <div>
            <button
              className="btn accent block"
              disabled={doneSets === 0}
              onClick={() => {
                // exercice terminé sans ressenti → « correct » par défaut
                updateActiveSession((s) => ({ ...s, exercises: s.exercises.map((l) => (l.sets.some((x) => x.done) && !l.feedback ? { ...l, feedback: 'ok' } : l)) }));
                finishSession();
                navigate('training');
              }}
            >
              Terminer la séance · {doneSets}/{totalSets} séries
            </button>
          </div>
        </div>
      )}

      <ExerciseDetail exercise={info} onClose={() => setInfo(undefined)} />
      <Sheet open={swapIndex != null} onClose={() => setSwapIndex(null)} title="Remplacer par…">
        <div className="list">
          {alternatives.slice(0, 8).map((e) => (
            <button
              key={e.id}
              className="list-item"
              onClick={() => {
                const planned = prescribe(e, session.exercises[swapIndex!].planned.sets, user.level, user.goal, progress[e.id]);
                updateActiveSession((s) => ({
                  ...s,
                  exercises: s.exercises.map((l, i) =>
                    i === swapIndex ? { exerciseId: e.id, planned, sets: Array.from({ length: planned.sets }, () => ({ reps: planned.repMin, load: planned.load, done: false })) } : l,
                  ),
                }));
                setSwapIndex(null);
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{e.name}</div>
                <div className="small faint">{'●'.repeat(e.difficulty)} · {e.equipment.length ? 'matériel' : 'sans matériel'}</div>
              </div>
            </button>
          ))}
          {alternatives.length === 0 && <div className="empty small">Aucune alternative avec ton matériel.</div>}
        </div>
      </Sheet>
    </div>
  );
}
