import { useEffect, useRef, useState } from 'react';
import type { MeasurementField, MusclePriorities, PhotoPose, ProgressPhoto } from '../types/models';
import { useApp } from '../store/store';
import { addMeasurement, addPhoto, deleteMeasurement, deletePhoto, setPriorities } from '../store/actions';
import { photoStore } from '../store/storage';
import { MEASUREMENT_LABELS } from '../data/reference';
import { fmt, formatDate, today } from '../utils';
import { BodyMap } from '../components/BodyMap';
import { LineChart } from '../components/Charts';
import { PageHeader, SectionTitle, Segmented, Sheet } from '../components/ui';
import { IconCamera, IconPlus, IconTrash } from '../components/Icons';
import { navigate } from '../hooks/useRoute';

type Tab = 'muscles' | 'measures' | 'photos';
const FIELDS = Object.keys(MEASUREMENT_LABELS) as MeasurementField[];
const POSES: { value: PhotoPose; label: string }[] = [
  { value: 'front', label: 'Face' },
  { value: 'side', label: 'Profil' },
  { value: 'back', label: 'Dos' },
];

export function usePhotoUrl(key?: string) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!key) return;
    let u: string | undefined;
    let alive = true;
    photoStore
      .get(key)
      .then((b) => {
        if (b && alive) {
          u = URL.createObjectURL(b);
          setUrl(u);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [key]);
  return url;
}

function Thumb({ photo, onClick }: { photo: ProgressPhoto; onClick: () => void }) {
  const url = usePhotoUrl(photo.blobKey);
  return (
    <button className="photo-thumb" onClick={onClick}>
      {url && <img src={url} alt={`Photo ${photo.pose} du ${photo.date}`} />}
      <span className="tag" style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,.6)' }}>
        {formatDate(photo.date)}
      </span>
    </button>
  );
}

function Compare({ before, after }: { before: ProgressPhoto; after: ProgressPhoto }) {
  const a = usePhotoUrl(before.blobKey);
  const b = usePhotoUrl(after.blobKey);
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const move = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <div
      ref={ref}
      className="compare"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={(e) => e.buttons && move(e.clientX)}
    >
      {b && <img src={b} alt="Aujourd’hui" />}
      {a && <img src={a} alt="Départ" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />}
      <div className="handle" style={{ left: `${pos}%` }} />
      <span className="lbl" style={{ left: 10 }}>
        Départ · {formatDate(before.date)}
      </span>
      <span className="lbl" style={{ right: 10 }}>
        Aujourd’hui · {formatDate(after.date)}
      </span>
    </div>
  );
}

export function Body() {
  const user = useApp((s) => s.user)!;
  const measurements = useApp((s) => s.measurements);
  const photos = useApp((s) => s.photos);
  const [tab, setTab] = useState<Tab>('muscles');
  const [draft, setDraft] = useState<MusclePriorities>(user.musclePriorities);
  const [applied, setApplied] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);
  const [mVals, setMVals] = useState<Partial<Record<MeasurementField, string>>>({});
  const [mDate, setMDate] = useState(today());
  const [field, setField] = useState<MeasurementField>('arm');
  const [pose, setPose] = useState<PhotoPose>('front');
  const [viewer, setViewer] = useState<ProgressPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(user.musclePriorities);
  const posePhotos = photos.filter((p) => p.pose === pose).sort((a, b) => a.date.localeCompare(b.date));
  const series = measurements.filter((m) => m.values[field] != null).map((m) => ({ date: m.date, value: m.values[field]! }));
  const lastM = measurements.at(-1);
  const firstM = measurements[0];

  return (
    <div className="page">
      <PageHeader eyebrow="Objectif musculaire · mensurations · photos" title="Corps" />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'muscles', label: 'Muscles' },
          { value: 'measures', label: 'Mensurations' },
          { value: 'photos', label: 'Transformation' },
        ]}
      />
      <div style={{ height: 16 }} />

      {tab === 'muscles' && (
        <div className="fade-in">
          <h2 className="title-lg" style={{ marginBottom: 6 }}>
            Quelles zones veux-tu développer davantage ?
          </h2>
          <p className="small muted" style={{ marginBottom: 14 }}>
            Le programme se recalcule automatiquement : plus de volume et de fréquence pour tes priorités, entretien pour le reste.
          </p>
          <BodyMap
            priorities={draft}
            onChange={(p) => {
              setDraft(p);
              setApplied(false);
            }}
          />
          <div style={{ height: 80 }} />
          {(dirty || applied) && (
            <div className="fab-bottom" style={{ bottom: 'calc(var(--tabbar-h) + var(--safe-bottom))', paddingBottom: 12 }}>
              <div>
                {applied && !dirty ? (
                  <button className="btn block" onClick={() => navigate('training')}>
                    ✓ Programme adapté — voir l’entraînement
                  </button>
                ) : (
                  <button
                    className="btn accent block"
                    onClick={() => {
                      setPriorities(draft);
                      setApplied(true);
                    }}
                  >
                    Appliquer et adapter mon programme
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'measures' && (
        <div className="stack fade-in">
          <button className="btn primary block" onClick={() => setMeasureOpen(true)}>
            <IconPlus width={18} /> Nouvelles mensurations
          </button>
          <div className="chips" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
            {FIELDS.map((f) => (
              <button key={f} className={`chip ${field === f ? 'on' : ''}`} style={{ flexShrink: 0 }} onClick={() => setField(f)}>
                {MEASUREMENT_LABELS[f]}
              </button>
            ))}
          </div>
          <div className="card">
            <div className="row-between" style={{ marginBottom: 10 }}>
              <div className="title-md">{MEASUREMENT_LABELS[field]}</div>
              {series.length >= 2 && (
                <span className="tag accent">
                  {series.at(-1)!.value - series[0].value > 0 ? '+' : ''}
                  {fmt(series.at(-1)!.value - series[0].value, 1)} cm
                </span>
              )}
            </div>
            <LineChart series={[{ label: MEASUREMENT_LABELS[field], color: 'var(--accent)', points: series, dots: true, area: true }]} unit="cm" />
          </div>
          {lastM && (
            <div className="card">
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                Dernières mesures · {formatDate(lastM.date, { day: 'numeric', month: 'long' })}
              </div>
              <div className="grid-3">
                {FIELDS.map((f) => (
                  <div key={f}>
                    <div className="tiny faint">{MEASUREMENT_LABELS[f]}</div>
                    <div style={{ fontWeight: 700 }}>{lastM.values[f] != null ? `${fmt(lastM.values[f]!, 1)} cm` : '—'}</div>
                    {firstM && firstM !== lastM && firstM.values[f] != null && lastM.values[f] != null && (
                      <div className="tiny" style={{ color: 'var(--accent-soft)' }}>
                        {lastM.values[f]! - firstM.values[f]! >= 0 ? '+' : ''}
                        {fmt(lastM.values[f]! - firstM.values[f]!, 1)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {measurements.length > 0 && (
            <div className="card">
              <div className="list">
                {[...measurements].reverse().map((m) => (
                  <div key={m.date} className="list-item">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{formatDate(m.date, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      <div className="small faint">
                        {FIELDS.filter((f) => m.values[f] != null)
                          .map((f) => `${MEASUREMENT_LABELS[f]} ${fmt(m.values[f]!, 1)}`)
                          .join(' · ')}
                      </div>
                    </div>
                    <button className="icon-btn" onClick={() => confirm('Supprimer ces mesures ?') && deleteMeasurement(m.date)} aria-label="Supprimer">
                      <IconTrash width={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="small faint">Mesure toujours au même endroit, le matin, muscle relâché (sauf bras : contracté si tu préfères, mais toujours pareil).</p>
        </div>
      )}

      {tab === 'photos' && (
        <div className="stack fade-in">
          <div className="card small muted">🔒 Les photos restent uniquement sur cet appareil (stockage local), pour ton suivi personnel.</div>
          <Segmented value={pose} onChange={setPose} options={POSES} />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              setBusy(true);
              try {
                await addPhoto(f, pose, today());
              } catch {
                alert('Impossible d’enregistrer la photo.');
              } finally {
                setBusy(false);
              }
            }}
          />
          <button className="btn primary block" disabled={busy} onClick={() => fileRef.current?.click()}>
            <IconCamera width={18} /> {busy ? 'Enregistrement…' : `Prendre / importer (${POSES.find((p) => p.value === pose)!.label.toLowerCase()})`}
          </button>
          {posePhotos.length >= 2 && (
            <>
              <SectionTitle>Départ / Aujourd’hui</SectionTitle>
              <Compare before={posePhotos[0]} after={posePhotos[posePhotos.length - 1]} />
            </>
          )}
          <SectionTitle>{posePhotos.length} photo(s)</SectionTitle>
          {posePhotos.length ? (
            <div className="photo-grid">
              {[...posePhotos].reverse().map((p) => (
                <Thumb key={p.id} photo={p} onClick={() => setViewer(p)} />
              ))}
            </div>
          ) : (
            <div className="empty small">Aucune photo {POSES.find((p) => p.value === pose)!.label.toLowerCase()} pour l’instant. Prends ta photo de départ !</div>
          )}
        </div>
      )}

      <Sheet open={measureOpen} onClose={() => setMeasureOpen(false)} title="Mensurations (cm)">
        <div className="stack">
          <div className="field">
            <label>Date</label>
            <input className="input" type="date" value={mDate} max={today()} onChange={(e) => setMDate(e.target.value)} />
          </div>
          <div className="grid-2">
            {FIELDS.map((f) => (
              <div key={f} className="field">
                <label>{MEASUREMENT_LABELS[f]}</label>
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder={lastM?.values[f] != null ? String(lastM.values[f]) : 'cm'}
                  value={mVals[f] ?? ''}
                  onChange={(e) => setMVals({ ...mVals, [f]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <button
            className="btn primary block"
            disabled={!Object.values(mVals).some((v) => v && parseFloat(v.replace(',', '.')) > 0)}
            onClick={() => {
              const values: Partial<Record<MeasurementField, number>> = {};
              for (const f of FIELDS) {
                const v = parseFloat((mVals[f] ?? '').replace(',', '.'));
                if (v > 0 && v < 300) values[f] = v;
              }
              addMeasurement({ date: mDate, values });
              setMVals({});
              setMeasureOpen(false);
            }}
          >
            Enregistrer
          </button>
        </div>
      </Sheet>

      <Sheet open={!!viewer} onClose={() => setViewer(null)} title={viewer ? formatDate(viewer.date, { day: 'numeric', month: 'long', year: 'numeric' }) : ''}>
        {viewer && <PhotoViewer photo={viewer} onDelete={() => { deletePhoto(viewer.id); setViewer(null); }} />}
      </Sheet>
    </div>
  );
}

function PhotoViewer({ photo, onDelete }: { photo: ProgressPhoto; onDelete: () => void }) {
  const url = usePhotoUrl(photo.blobKey);
  return (
    <div className="stack">
      {url && <img src={url} alt="" style={{ width: '100%', borderRadius: 18 }} />}
      <button className="btn danger block" onClick={() => confirm('Supprimer définitivement cette photo ?') && onDelete()}>
        <IconTrash width={16} /> Supprimer
      </button>
    </div>
  );
}
