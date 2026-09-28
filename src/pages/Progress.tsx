import { useMemo, useState } from 'react';
import { useApp } from '../store/store';
import { deleteWeight } from '../store/actions';
import { LineChart, BarChart } from '../components/Charts';
import { PageHeader, SectionTitle, Segmented } from '../components/ui';
import { WeightSheet } from '../components/Sheets';
import { IconPlus, IconTrash } from '../components/Icons';
import { adherence, latestWeight, weeklyTonnage, weeklyWeightChangePct } from '../engines/analytics';
import { readinessScore } from '../engines/progressionEngine';
import { getExercise } from '../data/exercises';
import { addDays, daysBetween, fmt, formatDate, movingAverage, startOfWeek, today } from '../utils';

const RANGES = [
  { value: 7, label: '7 j' },
  { value: 30, label: '30 j' },
  { value: 90, label: '90 j' },
  { value: 182, label: '6 m' },
  { value: 365, label: '1 an' },
];

export function Progress() {
  const s = useApp((x) => x);
  const t = today();
  const [range, setRange] = useState(30);
  const [weightOpen, setWeightOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const user = s.user!;

  const inRange = s.weights.filter((w) => daysBetween(w.date, t) < range && daysBetween(w.date, t) >= 0);
  const pts = inRange.map((w) => ({ date: w.date, value: w.kg }));
  // moyenne glissante calculée sur tout l'historique (pour être juste en début de fenêtre)
  const ma = movingAverage(s.weights.map((w) => ({ date: w.date, value: w.kg })), 7).filter((p) => daysBetween(p.date, t) < range && daysBetween(p.date, t) >= 0);
  const trend = weeklyWeightChangePct(s.weights, t);
  const first = s.weights[0];
  const current = latestWeight(s.weights);
  const currentAvg = ma.at(-1)?.value;

  const weeks = useMemo(() => {
    const data = weeklyTonnage(s.sessions);
    const out: { label: string; value: number }[] = [];
    const ws = startOfWeek(t);
    for (let i = 7; i >= 0; i--) {
      const w = addDays(ws, -7 * i);
      out.push({ label: formatDate(w, { day: 'numeric', month: 'numeric' }), value: data.find((d) => d.week === w)?.sets ?? 0 });
    }
    return out;
  }, [s.sessions, t]);

  const cardioWeeks = useMemo(() => {
    const ws = startOfWeek(t);
    return Array.from({ length: 8 }, (_, k) => {
      const i = 7 - k;
      const w = addDays(ws, -7 * i);
      const end = addDays(w, 7);
      return { label: formatDate(w, { day: 'numeric', month: 'numeric' }), value: s.cardioSessions.filter((c) => c.date >= w && c.date < end).reduce((a, c) => a + c.minutes, 0) };
    });
  }, [s.cardioSessions, t]);

  const readiness = s.recovery
    .filter((r) => daysBetween(r.date, t) < 30)
    .map((r) => ({ date: r.date, value: readinessScore(r) }));

  const progressList = Object.values(s.progress)
    .filter((p) => p.updatedAt)
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));

  const adh = adherence(s.sessions, user.daysPerWeek, 4, t);
  const totalSessions = s.sessions.filter((x) => x.finishedAt).length;
  const totalCardio = s.cardioSessions.reduce((a, c) => a + c.minutes, 0);

  return (
    <div className="page">
      <PageHeader eyebrow="Tes données, ta progression" title="Progression" />

      <div className="grid-3">
        <div className="card tight">
          <div className="tiny faint">Séances</div>
          <div className="stat-value">{totalSessions}</div>
        </div>
        <div className="card tight">
          <div className="tiny faint">Régularité 4 sem.</div>
          <div className="stat-value">
            {adh}
            <small>%</small>
          </div>
        </div>
        <div className="card tight">
          <div className="tiny faint">Cardio total</div>
          <div className="stat-value">
            {Math.round(totalCardio / 60)}
            <small>h</small>
          </div>
        </div>
      </div>

      <SectionTitle right={<button className="btn sm" onClick={() => setWeightOpen(true)}><IconPlus width={16} /> Poids</button>}>Poids</SectionTitle>
      <div className="card">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <div>
            <div className="stat-value">
              {currentAvg ? fmt(currentAvg, 1) : current ? fmt(current, 1) : '—'}
              <small>kg (moy. 7 j)</small>
            </div>
            <div className="small muted">
              {first && current ? `${current - first.kg >= 0 ? '+' : ''}${fmt(current - first.kg, 1)} kg depuis le départ` : ''}
              {trend != null ? ` · ${trend > 0 ? '+' : ''}${fmt(trend, 2)} %/sem.` : ''}
            </div>
          </div>
        </div>
        <Segmented value={range} onChange={setRange} options={RANGES} />
        <div style={{ marginTop: 14 }}>
          <LineChart
            series={[
              { label: 'Moyenne glissante 7 j', color: 'var(--accent)', points: ma, width: 2.6 },
              { label: 'Pesées', color: 'var(--text-3)', points: pts, width: 1, dots: true, dashed: true },
            ]}
            unit="kg"
          />
        </div>
        <p className="tiny faint" style={{ marginTop: 10 }}>
          La moyenne glissante lisse les variations quotidiennes (eau, sel, digestion). Base tes décisions sur elle, pas sur une pesée isolée.
        </p>
        {s.weights.length > 0 && (
          <>
            <div className="divider" />
            <div className="list">
              {[...s.weights]
                .reverse()
                .slice(0, showAll ? 60 : 4)
                .map((w) => (
                  <div key={w.date} className="list-item" style={{ padding: '10px 0' }}>
                    <span style={{ flex: 1 }} className="small">
                      {formatDate(w.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <strong>{fmt(w.kg, 1)} kg</strong>
                    <button className="btn ghost sm" onClick={() => confirm('Supprimer cette pesée ?') && deleteWeight(w.date)} aria-label="Supprimer">
                      <IconTrash width={14} />
                    </button>
                  </div>
                ))}
            </div>
            {s.weights.length > 4 && (
              <button className="btn ghost sm" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Réduire' : 'Tout voir'}
              </button>
            )}
          </>
        )}
      </div>

      <SectionTitle>Séries de musculation / semaine</SectionTitle>
      <div className="card">
        <BarChart data={weeks} highlight={weeks.length - 1} color="var(--text-2)" />
      </div>

      <SectionTitle>Cardio (min) / semaine</SectionTitle>
      <div className="card">
        <BarChart data={cardioWeeks} highlight={cardioWeeks.length - 1} color="var(--blue)" />
      </div>

      <SectionTitle>Progression des exercices</SectionTitle>
      <div className="card">
        {progressList.length === 0 ? (
          <div className="empty small">Termine une séance : l’app suivra chaque exercice et ajustera automatiquement tes objectifs.</div>
        ) : (
          <div className="list">
            {progressList.slice(0, 20).map((p) => {
              const ex = getExercise(p.exerciseId);
              const base = getExercise(p.baseExerciseId);
              return (
                <div key={p.baseExerciseId} className="list-item" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 650 }}>
                      {ex.name}
                      {ex.id !== base.id && <span className="tag accent" style={{ marginLeft: 6 }}>variante</span>}
                    </div>
                    <div className="small faint">
                      Objectif {p.repMin}-{p.repMax}
                      {ex.mode === 'time' ? ' s' : ' reps'}
                      {p.load ? ` · ${p.load} kg` : ''}
                      {p.tempo ? ` · tempo ${p.tempo}` : ''}
                    </div>
                    {p.lastMessage && <div className="small" style={{ color: 'var(--accent-soft)', marginTop: 2 }}>{p.lastMessage}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SectionTitle>Forme (check-ins, 30 j)</SectionTitle>
      <div className="card">
        <LineChart series={[{ label: 'Forme', color: 'var(--ok)', points: readiness, dots: true, area: true }]} unit="/100" digits={0} />
      </div>

      {weightOpen && <WeightSheet open onClose={() => setWeightOpen(false)} initial={current ?? user.weightKg} />}
    </div>
  );
}
