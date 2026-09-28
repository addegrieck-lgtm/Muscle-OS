import { useRef, useState } from 'react';
import type { ActivityLevel, CardioEquipment, Equipment, GoalId, Level, RunningExperience } from '../types/models';
import { useApp, store } from '../store/store';
import { exportData, importData, resetAll, updateUser } from '../store/actions';
import { CARDIO_LABELS, EQUIPMENT_LABELS, GOALS } from '../data/reference';
import { DISCLAIMER } from '../engines/safety';
import { PageHeader, SectionTitle, Segmented, Stepper } from '../components/ui';
import { IconBack } from '../components/Icons';
import { navigate } from '../hooks/useRoute';
import { today } from '../utils';

const EQ: Equipment[] = ['chair', 'table', 'backpack', 'dumbbells', 'kettlebell', 'bands', 'pullup_bar', 'bench', 'other'];
const CARDIO: CardioEquipment[] = ['outdoor_run', 'treadmill', 'bike', 'jump_rope', 'none', 'other'];

export function Settings() {
  const user = useApp((s) => s.user)!;
  const coach = useApp((s) => s.coachSettings);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="page">
      <button className="icon-btn" onClick={() => navigate('home')} aria-label="Retour" style={{ marginBottom: 8 }}>
        <IconBack />
      </button>
      <PageHeader eyebrow="Toute modification recalcule ton programme" title="Profil" />

      <div className="card stack">
        <div className="field">
          <label>Prénom</label>
          <input className="input" defaultValue={user.name} onBlur={(e) => updateUser({ name: e.target.value }, { regenerate: false, meals: false })} />
        </div>
        <div className="field">
          <label>Objectif</label>
          <select className="input" value={user.goal} onChange={(e) => updateUser({ goal: e.target.value as GoalId })}>
            {GOALS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        {(
          [
            ['Âge', 'age', 1, 14, 99, 0],
            ['Taille (cm)', 'heightCm', 1, 120, 230, 0],
          ] as const
        ).map(([l, k, st, mi, ma, d]) => (
          <div key={k} className="row-between">
            <span>{l}</span>
            <Stepper value={user[k]} onChange={(v) => updateUser({ [k]: v })} step={st} min={mi} max={ma} decimals={d} />
          </div>
        ))}
        <div className="field">
          <label>Sexe</label>
          <Segmented value={user.sex} onChange={(v) => updateUser({ sex: v })} options={[{ value: 'male', label: 'Homme' }, { value: 'female', label: 'Femme' }]} />
        </div>
        <div className="field">
          <label>Niveau</label>
          <Segmented
            value={user.level}
            onChange={(v) => updateUser({ level: v as Level })}
            options={[
              { value: 'beginner', label: 'Débutant' },
              { value: 'intermediate', label: 'Intermédiaire' },
              { value: 'advanced', label: 'Avancé' },
            ]}
          />
        </div>
        <div className="field">
          <label>Course à pied</label>
          <Segmented
            value={user.runningExperience}
            onChange={(v) => updateUser({ runningExperience: v as RunningExperience })}
            options={[
              { value: 'none', label: 'Aucune' },
              { value: 'some', label: 'Un peu' },
              { value: 'regular', label: 'Régulière' },
            ]}
          />
        </div>
        <div className="field">
          <label>Activité quotidienne</label>
          <select className="input" value={user.activityLevel} onChange={(e) => updateUser({ activityLevel: e.target.value as ActivityLevel })}>
            <option value="sedentary">Sédentaire</option>
            <option value="light">Légère</option>
            <option value="moderate">Modérée</option>
            <option value="active">Active</option>
            <option value="very_active">Très active</option>
          </select>
        </div>
      </div>

      <SectionTitle>Disponibilité</SectionTitle>
      <div className="card stack">
        <div className="field">
          <label>Jours par semaine</label>
          <Segmented value={user.daysPerWeek} onChange={(v) => updateUser({ daysPerWeek: v })} options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))} />
        </div>
        <div className="field">
          <label>Durée d’une séance (min)</label>
          <Segmented value={user.sessionMinutes} onChange={(v) => updateUser({ sessionMinutes: v })} options={[15, 20, 30, 45, 60, 90].map((n) => ({ value: n, label: String(n) }))} />
        </div>
      </div>

      <SectionTitle>Matériel</SectionTitle>
      <div className="card">
        <div className="chips">
          {EQ.map((e) => (
            <button key={e} className={`chip ${user.equipment.includes(e) ? 'on' : ''}`} onClick={() => updateUser({ equipment: toggle(store.get().user!.equipment, e) }, { regenerate: true, meals: false })}>
              {EQUIPMENT_LABELS[e]}
            </button>
          ))}
        </div>
        <div className="divider" />
        <div className="chips">
          {CARDIO.map((c) => (
            <button
              key={c}
              className={`chip ${user.cardioEquipment.includes(c) ? 'on' : ''}`}
              onClick={() => {
                const next = c === 'none' ? ['none' as CardioEquipment] : toggle(store.get().user!.cardioEquipment.filter((x) => x !== 'none'), c);
                updateUser({ cardioEquipment: next.length ? next : ['none'] }, { regenerate: true, meals: false });
              }}
            >
              {CARDIO_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <SectionTitle>Coach IA (optionnel, gratuit)</SectionTitle>
      <div className="card stack">
        <p className="small muted">
          Par défaut, le coach fonctionne hors-ligne avec des règles. Tu peux brancher un modèle d’IA <strong>local et gratuit</strong> via Ollama (installé sur ton ordinateur, même réseau Wi-Fi). Aucune API payante.
        </p>
        <Segmented
          value={coach.provider}
          onChange={(v) => store.set({ coachSettings: { ...coach, provider: v } })}
          options={[
            { value: 'local', label: 'Règles locales' },
            { value: 'ollama', label: 'Ollama' },
          ]}
        />
        {coach.provider === 'ollama' && (
          <>
            <div className="field">
              <label>URL Ollama</label>
              <input className="input" value={coach.ollamaUrl} onChange={(e) => store.set({ coachSettings: { ...coach, ollamaUrl: e.target.value } })} />
            </div>
            <div className="field">
              <label>Modèle</label>
              <input className="input" value={coach.ollamaModel} onChange={(e) => store.set({ coachSettings: { ...coach, ollamaModel: e.target.value } })} />
            </div>
            <p className="tiny faint">Sur l’ordinateur : `OLLAMA_ORIGINS=* ollama serve`, puis `ollama pull llama3.1`. Depuis l’iPhone, remplace localhost par l’adresse IP de l’ordinateur. En cas d’échec, le coach local répond.</p>
          </>
        )}
      </div>

      <SectionTitle>Mes données</SectionTitle>
      <div className="card stack">
        <p className="small muted">Tout est stocké sur cet appareil. Exporte régulièrement une sauvegarde (fichier JSON).</p>
        <div className="grid-2">
          <button
            className="btn"
            onClick={async () => {
              const blob = await exportData(false);
              download(blob, `muscleos-${today()}.json`);
            }}
          >
            Exporter
          </button>
          <button
            className="btn"
            onClick={async () => {
              const blob = await exportData(true);
              download(blob, `muscleos-photos-${today()}.json`);
            }}
          >
            Exporter + photos
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              await importData(f);
              setMsg('Données restaurées ✓');
            } catch {
              setMsg('Fichier invalide.');
            }
          }}
        />
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Importer une sauvegarde
        </button>
        {msg && <div className="small">{msg}</div>}
        <button
          className="btn danger"
          onClick={() => {
            if (confirm('Tout effacer ? Cette action est irréversible (pense à exporter avant).')) {
              resetAll();
              navigate('home');
            }
          }}
        >
          Réinitialiser l’application
        </button>
      </div>

      <p className="disclaimer">
        MUSCLEOS v1.0 · 100 % local · {DISCLAIMER}
      </p>
    </div>
  );
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
