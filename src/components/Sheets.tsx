import { useState } from 'react';
import type { CardioWorkout, Feedback, RecoveryEntry } from '../types/models';
import { Scale5, Segmented, Sheet, Stepper } from './ui';
import { addWeight, logCardio, saveRecovery } from '../store/actions';
import { today } from '../utils';
import { assessText } from '../engines/safety';

export const FEEDBACK_LABELS: Record<Feedback, string> = {
  easy: 'Facile',
  ok: 'Correct',
  hard: 'Difficile',
  very_hard: 'Très difficile',
};

export function WeightSheet({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: number }) {
  const [kg, setKg] = useState(initial);
  const [date, setDate] = useState(today());
  return (
    <Sheet open={open} onClose={onClose} title="Enregistrer mon poids">
      <div className="stack-lg">
        <div className="row-between">
          <span className="muted">Poids (kg)</span>
          <Stepper value={kg} onChange={setKg} step={0.1} min={30} max={300} decimals={1} />
        </div>
        <div className="field">
          <label>Date</label>
          <input className="input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <p className="small faint">Conseil : pèse-toi le matin, à jeun, après être allé aux toilettes. Seule la moyenne sur 7 jours compte.</p>
        <button
          className="btn primary block"
          onClick={() => {
            addWeight(date, kg);
            onClose();
          }}
        >
          Enregistrer
        </button>
      </div>
    </Sheet>
  );
}

export function CardioLogSheet({ open, onClose, workout }: { open: boolean; onClose: () => void; workout?: CardioWorkout }) {
  const [minutes, setMinutes] = useState(Math.round(workout?.totalMinutes ?? 20));
  const [distance, setDistance] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>('ok');
  const [pain, setPain] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title={workout?.title ?? 'Cardio'}>
      {done ? (
        <div className="stack">
          <div className={`card ${pain ? 'warning' : 'accent'}`}>
            {pain ? (
              <p className="small">
                Tu as signalé une douleur. Évite l’activité qui la provoque. Si elle est importante ou persiste, consulte un professionnel de santé. Le prochain cardio sera plus doux.
              </p>
            ) : (
              <p>Bien joué ! Séance enregistrée. 💪</p>
            )}
          </div>
          <button className="btn primary block" onClick={onClose}>
            Fermer
          </button>
        </div>
      ) : (
        <div className="stack-lg">
          {workout && (
            <div className="card tight">
              <p className="small muted" style={{ marginBottom: 10 }}>
                {workout.description}
              </p>
              <div className="stack" style={{ gap: 6 }}>
                {workout.blocks.map((b, i) => (
                  <div key={i} className="row-between small">
                    <span>
                      {b.repeat ? `${b.repeat} × ` : ''}
                      {b.label}
                    </span>
                    <span className="faint">{b.repeat ? '' : `${Math.round(b.minutes)} min`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="row-between">
            <span className="muted">Durée réalisée (min)</span>
            <Stepper value={minutes} onChange={setMinutes} step={5} min={1} max={300} />
          </div>
          <div className="row-between">
            <span className="muted">Distance (km, facultatif)</span>
            <Stepper value={distance} onChange={setDistance} step={0.5} min={0} max={100} decimals={1} />
          </div>
          <div className="field">
            <label>Comment c’était ?</label>
            <Segmented value={feedback} onChange={setFeedback} options={(Object.keys(FEEDBACK_LABELS) as Feedback[]).map((f) => ({ value: f, label: FEEDBACK_LABELS[f] }))} />
          </div>
          <button className={`chip ${pain ? 'accent-on' : ''}`} onClick={() => setPain(!pain)}>
            {pain ? '⚠️ ' : ''}Douleur ou symptôme inhabituel
          </button>
          <button
            className="btn primary block"
            onClick={() => {
              logCardio({ date: today(), plannedId: workout?.id ?? 'libre', type: workout?.type ?? 'endurance', minutes, distanceKm: distance || undefined, feedback, pain });
              setDone(true);
            }}
          >
            Terminé
          </button>
        </div>
      )}
    </Sheet>
  );
}

export function CheckInForm({ initial, onDone }: { initial?: RecoveryEntry; onDone?: () => void }) {
  const [v, setV] = useState<Partial<RecoveryEntry>>(initial ?? {});
  const [note, setNote] = useState(initial?.note ?? '');
  const complete = v.energy && v.sleep && v.soreness && v.motivation;
  const safety = note ? assessText(note) : null;
  return (
    <div className="stack-lg">
      {(
        [
          ['energy', 'Énergie', ['Épuisé', 'Au top']],
          ['sleep', 'Sommeil', ['Très mauvais', 'Excellent']],
          ['soreness', 'Courbatures', ['Aucune', 'Très fortes']],
          ['motivation', 'Motivation', ['Nulle', 'Maximale']],
        ] as const
      ).map(([k, label, labels]) => (
        <div key={k} className="field">
          <label>{label}</label>
          <Scale5 value={v[k]} onChange={(n) => setV({ ...v, [k]: n })} labels={labels as unknown as [string, string]} />
        </div>
      ))}
      <button className={`chip ${v.pain ? 'accent-on' : ''}`} style={{ alignSelf: 'flex-start' }} onClick={() => setV({ ...v, pain: !v.pain })}>
        {v.pain ? '⚠️ ' : ''}J’ai une douleur / un symptôme
      </button>
      {v.pain && (
        <div className="field">
          <label>Décris brièvement (facultatif)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. douleur au genou droit" />
        </div>
      )}
      {safety && safety.level === 'urgent' && (
        <div className="card danger small" style={{ whiteSpace: 'pre-wrap' }}>
          {safety.message.replace(/\*\*/g, '')}
        </div>
      )}
      <button
        className="btn primary block"
        disabled={!complete}
        onClick={() => {
          saveRecovery({ date: today(), energy: v.energy!, sleep: v.sleep!, soreness: v.soreness!, motivation: v.motivation!, pain: v.pain, note: note || undefined });
          onDone?.();
        }}
      >
        Valider mon check-in
      </button>
    </div>
  );
}
