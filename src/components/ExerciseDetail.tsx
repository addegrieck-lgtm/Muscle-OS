import type { Exercise } from '../types/models';
import { EQUIPMENT_LABELS, muscleLabel } from '../data/reference';
import { exerciseById } from '../data/exercises';
import { useApp } from '../store/store';
import { exerciseHistory } from '../engines/analytics';
import { LineChart } from './Charts';
import { Sheet } from './ui';

export function ExerciseDetail({ exercise, onClose }: { exercise?: Exercise; onClose: () => void }) {
  const sessions = useApp((s) => s.sessions);
  if (!exercise) return null;
  const e = exercise;
  const prev = e.regression ? exerciseById(e.regression) : undefined;
  const next = e.progression ? exerciseById(e.progression) : undefined;
  const hist = exerciseHistory(sessions, e.id);
  return (
    <Sheet open onClose={onClose} title={e.name}>
      <div className="stack">
        <div className="chips">
          <span className="tag accent">{muscleLabel(e.primary)}</span>
          {e.secondary.map((m) => (
            <span key={m} className="tag">
              {muscleLabel(m)}
            </span>
          ))}
        </div>
        <div className="grid-3">
          <div className="card tight">
            <div className="tiny faint">Difficulté</div>
            <div style={{ fontWeight: 700 }}>{'●'.repeat(e.difficulty)}{'○'.repeat(5 - e.difficulty)}</div>
          </div>
          <div className="card tight">
            <div className="tiny faint">{e.mode === 'time' ? 'Durée' : 'Répétitions'}</div>
            <div style={{ fontWeight: 700 }}>
              {e.defaultRange[0]}-{e.defaultRange[1]}
              {e.mode === 'time' ? ' s' : ''}
            </div>
          </div>
          <div className="card tight">
            <div className="tiny faint">Repos</div>
            <div style={{ fontWeight: 700 }}>{e.restSec} s</div>
          </div>
        </div>
        <div className="small muted">Matériel : {e.equipment.length ? e.equipment.map((x) => EQUIPMENT_LABELS[x]).join(', ') : 'aucun'}{e.unilateral ? ' · unilatéral (chaque côté)' : ''}</div>

        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Consignes
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }} className="stack small">
            {e.cues.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Erreurs fréquentes
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }} className="stack small">
            {e.mistakes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Progression
          </div>
          <div className="small stack" style={{ gap: 6 }}>
            <div>⬇️ Plus facile : {prev ? prev.name : '—'}</div>
            <div>⬆️ Plus difficile : {next ? next.name : e.loadable ? 'augmenter la charge' : 'tempo lent (3 s en descente) ou lest'}</div>
          </div>
        </div>
        {hist.length > 0 && (
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              Ton historique (meilleure série)
            </div>
            <LineChart series={[{ label: 'Meilleure série', color: 'var(--accent)', points: hist.map((h) => ({ date: h.date, value: h.best })), dots: true, area: true }]} height={130} unit={e.mode === 'time' ? 's' : 'reps'} digits={0} />
          </div>
        )}
      </div>
    </Sheet>
  );
}
