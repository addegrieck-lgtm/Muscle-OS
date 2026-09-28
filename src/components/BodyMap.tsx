import { useState } from 'react';
import type { MuscleGroupId, MusclePriorities, PriorityLevel } from '../types/models';
import { MUSCLE_GROUPS, muscleLabel, PRIORITY_LABELS } from '../data/reference';
import { Segmented } from './ui';

/**
 * Corps anatomique stylisé (SVG vectoriel, aucune photo).
 * Chaque muscle est dessiné sur la moitié gauche puis symétrisé → rendu parfaitement symétrique.
 * viewBox 0 0 200 420, axe de symétrie x = 100.
 */

type View = 'front' | 'back';
type Fiber = 'v' | 'd1' | 'd2' | 'h';

interface MuscleShape {
  id: MuscleGroupId;
  paths: string[];
  fiber: Fiber;
}

const SILHOUETTE =
  'M100,44 L92,44 C92,52 92,57 91,60 C86,64 78,66 70,68 C61,70 56,77 55,88 C54,100 53,114 52,128 C50,142 48,154 47,164 ' +
  'C45,178 43,194 42,208 C41,214 40,220 41,226 C42,232 45,236 48,234 C50,230 50,224 49,218 C52,204 56,186 58,172 ' +
  'C60,164 62,156 63,148 C64,136 65,124 66,112 C67,106 69,102 71,100 C72,112 73,126 73,138 C73,150 72,160 72,170 ' +
  'C71,182 70,194 70,204 C69,226 69,250 70,272 C71,294 72,312 72,326 C71,344 72,364 74,384 C75,392 74,398 71,404 ' +
  'C69,408 70,412 76,412 L90,412 C92,410 91,404 90,398 C89,390 89,382 89,374 C91,358 92,342 92,328 C93,312 95,294 96,276 ' +
  'C97,262 98,246 100,236 Z';

const FOREARM = 'M52,158 C49,170 46,184 44,198 C43,204 43,208 44,210 C47,210 49,208 50,204 C53,192 57,178 60,166 C61,162 61,159 60,156 Z';

const FRONT: MuscleShape[] = [
  { id: 'traps', fiber: 'd2', paths: ['M91,58 C88,62 83,65 76,67 C80,70 84,72 88,73 C92,72 96,72 99,72 L99,61 C96,61 93,60 91,58 Z'] },
  { id: 'shoulders', fiber: 'v', paths: ['M70,70 C62,71 57,77 56,88 C55,97 56,104 57,108 C60,104 64,99 67,95 C71,89 74,82 76,76 C75,72 73,70 70,70 Z'] },
  { id: 'chest', fiber: 'h', paths: ['M99,76 C92,74 84,73 78,76 C75,83 71,92 69,99 C70,106 76,111 84,112 C91,113 96,112 99,110 Z'] },
  { id: 'biceps', fiber: 'v', paths: ['M58,108 C55,120 54,134 56,146 C58,152 61,154 63,152 C65,142 65,128 65,116 C64,110 62,106 60,104 Z'] },
  { id: 'forearms', fiber: 'd1', paths: [FOREARM] },
  {
    id: 'abs',
    fiber: 'v',
    paths: [
      'M99,115 L91,116 Q89,116 89,118 L89,128 Q89,130 91,130 L99,130 Z',
      'M99,133 L91,133 Q89,133 89,135 L89,146 Q89,148 91,148 L99,148 Z',
      'M99,151 L91,151 Q89,151 89,153 L89,164 Q89,166 91,166 L99,166 Z',
      'M99,169 L91,169 Q89,169 89,171 C89,182 92,194 96,202 C97,204 99,205 99,205 Z',
    ],
  },
  { id: 'obliques', fiber: 'd2', paths: ['M87,116 C82,115 77,116 74,118 C73,130 73,146 74,160 C74,172 76,184 80,194 C84,197 88,200 92,203 C89,193 87,182 87,170 Z'] },
  { id: 'quads', fiber: 'v', paths: ['M72,212 C70,232 70,256 72,280 C73,294 76,306 80,314 C84,316 89,314 91,308 C92,290 92,272 91,256 C90,240 88,226 84,214 C80,210 76,209 72,212 Z'] },
  { id: 'adductors', fiber: 'd1', paths: ['M97,226 C93,230 90,238 91,250 C92,262 93,274 94,286 C96,274 98,258 99,242 C99,234 98,228 97,226 Z'] },
  { id: 'calves', fiber: 'v', paths: ['M76,328 C73,342 73,356 75,370 C77,380 80,388 84,390 C88,380 90,366 90,352 C90,342 89,332 87,326 C83,324 79,324 76,328 Z'] },
];

const BACK: MuscleShape[] = [
  { id: 'traps', fiber: 'd1', paths: ['M99,50 C96,56 92,60 88,63 C82,66 76,68 70,70 C77,74 84,80 89,90 C94,102 97,116 99,132 Z'] },
  { id: 'shoulders', fiber: 'v', paths: ['M70,70 C62,71 57,77 56,88 C55,97 56,104 57,108 C61,103 66,97 70,92 C74,87 76,80 76,75 C75,72 73,70 70,70 Z'] },
  { id: 'lats', fiber: 'd2', paths: ['M77,94 C73,102 71,112 71,124 C72,140 75,154 81,166 C86,174 91,180 96,184 C96,170 95,156 93,144 C91,130 89,116 87,104 C84,98 80,95 77,94 Z'] },
  { id: 'triceps', fiber: 'v', paths: ['M58,108 C55,118 54,132 55,144 C56,150 59,154 62,153 C65,146 66,132 66,120 C66,112 64,106 62,103 Z'] },
  { id: 'forearms', fiber: 'd1', paths: [FOREARM] },
  { id: 'lower_back', fiber: 'v', paths: ['M99,136 C95,142 92,152 92,164 C92,178 93,190 96,198 C97,200 99,201 99,201 Z'] },
  { id: 'obliques', fiber: 'd2', paths: ['M76,164 C75,174 76,184 79,194 C83,193 86,188 87,181 C84,176 80,170 76,164 Z'] },
  { id: 'glutes', fiber: 'd2', paths: ['M99,202 C91,199 81,200 75,207 C70,215 70,228 73,238 C77,246 85,250 92,250 C96,250 99,248 99,246 Z'] },
  { id: 'hamstrings', fiber: 'v', paths: ['M74,252 C71,268 71,284 73,300 C75,308 78,315 82,318 C86,318 90,314 92,306 C94,290 95,272 94,257 C88,254 81,253 74,252 Z'] },
  { id: 'adductors', fiber: 'd1', paths: ['M97,252 C95,258 95,268 96,278 C97,272 98,264 99,256 Z'] },
  { id: 'calves', fiber: 'v', paths: ['M75,326 C72,338 72,352 74,364 C76,374 80,382 84,384 C88,378 91,366 91,352 C91,340 89,330 86,324 C82,322 78,322 75,326 Z'] },
];

// Détails décoratifs (non interactifs) : clavicules, rotules, séparation des mollets…
const DETAILS: Record<View, string[]> = {
  front: ['M99,69 Q90,70 80,67', 'M69,99 C73,104 78,108 84,110', 'M81,318 Q84,313 88,318 Q84,324 81,318', 'M80,340 C82,352 83,366 84,380'],
  back: ['M99,52 L99,200', 'M83,330 C83,344 83,360 84,376', 'M72,238 C78,246 88,250 99,248'],
};

const MIRROR = 'matrix(-1 0 0 1 200 0)';

function Figure({ view, priorities, active, onSelect }: { view: View; priorities: MusclePriorities; active?: MuscleGroupId; onSelect: (m: MuscleGroupId) => void }) {
  const shapes = view === 'front' ? FRONT : BACK;
  const muscleEls = (mirror: boolean) =>
    shapes.map((s, si) =>
      s.paths.map((d, pi) => {
        const lvl = priorities[s.id];
        const cls = ['muscle', lvl !== 'normal' ? `lvl-${lvl}` : '', active === s.id ? 'active' : ''].join(' ');
        const fill = lvl === 'normal' ? (active === s.id ? '#9a9aa4' : `url(#mg-${view})`) : undefined;
        return (
          <g key={`${s.id}-${pi}-${mirror}`} style={{ animation: `fade 0.6s ease ${0.03 * si}s both` }}>
            <path
              d={d}
              className={cls}
              fill={fill}
              filter={lvl === 'priority' ? `url(#glow-${view})` : undefined}
              onClick={() => onSelect(s.id)}
              role="button"
              aria-label={muscleLabel(s.id)}
            />
            <path d={d} fill={`url(#fiber-${s.fiber}-${view})`} pointerEvents="none" opacity={lvl === 'normal' ? 0.35 : 0.22} />
          </g>
        );
      }),
    );

  return (
    <svg viewBox="0 0 200 420" aria-label={view === 'front' ? 'Vue de face' : 'Vue de dos'}>
      <defs>
        <linearGradient id={`body-${view}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#222228" />
          <stop offset="100%" stopColor="#141417" />
        </linearGradient>
        <radialGradient id={`mg-${view}`} cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#5a5a64" />
          <stop offset="100%" stopColor="#35353d" />
        </radialGradient>
        <filter id={`rim-${view}`} x="-10%" y="-5%" width="120%" height="110%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.6" floodColor="#ffffff" floodOpacity="0.08" />
        </filter>
        <filter id={`glow-${view}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {(
          [
            ['v', 90],
            ['d1', 60],
            ['d2', 120],
            ['h', 10],
          ] as const
        ).map(([k, a]) => (
          <pattern key={k} id={`fiber-${k}-${view}`} width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform={`rotate(${a})`}>
            <line x1="0" y1="0" x2="0" y2="2.4" stroke="#000" strokeWidth="0.55" strokeOpacity="0.55" />
          </pattern>
        ))}
      </defs>

      {/* socle au sol */}
      <ellipse cx="100" cy="414" rx="46" ry="5" fill="rgba(255,255,255,0.05)" />

      {/* silhouette */}
      <g fill={`url(#body-${view})`} filter={`url(#rim-${view})`}>
        <path d={SILHOUETTE} />
        <path d={SILHOUETTE} transform={MIRROR} />
        <ellipse cx="100" cy="28" rx="15" ry="19" />
      </g>
      {view === 'front' ? (
        <g fill="none" stroke="#2a2a30" strokeWidth="0.6">
          <path d="M93,36 Q100,40 107,36" opacity="0.4" />
        </g>
      ) : null}

      {/* muscles */}
      <g>{muscleEls(false)}</g>
      <g transform={MIRROR}>{muscleEls(true)}</g>

      {/* détails */}
      <g fill="none" stroke="#050506" strokeWidth="0.7" opacity="0.55" pointerEvents="none">
        {DETAILS[view].map((d, i) => (
          <path key={i} d={d} />
        ))}
        <g transform={MIRROR}>
          {DETAILS[view].map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </g>
    </svg>
  );
}

export const FRONT_MUSCLES = [...new Set(FRONT.map((s) => s.id))];
export const BACK_MUSCLES = [...new Set(BACK.map((s) => s.id))];

export function BodyMap({ priorities, onChange }: { priorities: MusclePriorities; onChange: (p: MusclePriorities) => void }) {
  const [view, setView] = useState<View>('front');
  const [active, setActive] = useState<MuscleGroupId | undefined>();

  const select = (m: MuscleGroupId) => {
    setActive(m);
    if (navigator.vibrate) navigator.vibrate(8);
  };

  const setLevel = (lvl: PriorityLevel) => {
    if (!active) return;
    onChange({ ...priorities, [active]: lvl });
  };

  const selected = MUSCLE_GROUPS.filter((m) => priorities[m.id] !== 'normal').sort((a, b) =>
    priorities[a.id] === priorities[b.id] ? 0 : priorities[a.id] === 'priority' ? -1 : 1,
  );

  return (
    <div className="stack">
      <div className="bodymap-stage bodymap">
        <div className="bodymap-label">
          {active ? (
            <div key={active}>
              <div className="name">{muscleLabel(active).toUpperCase()}</div>
              <div className="small" style={{ color: priorities[active] === 'normal' ? 'var(--text-3)' : 'var(--accent-soft)', fontWeight: 600 }}>
                {PRIORITY_LABELS[priorities[active]]}
              </div>
            </div>
          ) : (
            <div className="small faint" style={{ marginTop: 6 }}>
              Touche un muscle
            </div>
          )}
        </div>
        <div style={{ padding: '58px 18px 12px' }}>
          <div className={`bodymap-flip ${view === 'back' ? 'back' : ''}`}>
            <div className="bodymap-face">
              <Figure view="front" priorities={priorities} active={active} onSelect={select} />
            </div>
            <div className="bodymap-face rear">
              <Figure view="back" priorities={priorities} active={active} onSelect={select} />
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'front', label: 'Face' },
              { value: 'back', label: 'Dos' },
            ]}
          />
        </div>
        <div style={{ height: 56 }} />
      </div>

      <div className="legend">
        <span>
          <i style={{ background: '#3a3a42' }} />
          Normal
        </span>
        <span>
          <i style={{ background: 'var(--accent-soft)' }} />
          Important
        </span>
        <span>
          <i style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
          Prioritaire
        </span>
      </div>

      <div className={`card ${active ? 'accent' : ''}`} style={{ transition: 'all .2s' }}>
        {active ? (
          <div className="stack">
            <div className="row-between">
              <div>
                <div className="eyebrow">Quel niveau de priorité ?</div>
                <div className="title-md" style={{ marginTop: 4 }}>
                  {muscleLabel(active)}
                </div>
              </div>
            </div>
            <Segmented
              value={priorities[active]}
              onChange={setLevel}
              options={(['normal', 'important', 'priority'] as PriorityLevel[]).map((l) => ({ value: l, label: PRIORITY_LABELS[l] }))}
            />
          </div>
        ) : (
          <p className="muted small">Touche un muscle sur le corps (ou dans la liste ci-dessous), puis choisis son niveau de priorité. Tu peux en sélectionner plusieurs.</p>
        )}
      </div>

      <div className="chips">
        {MUSCLE_GROUPS.map((m) => {
          const lvl = priorities[m.id];
          return (
            <button
              key={m.id}
              className={`chip ${lvl !== 'normal' ? 'accent-on' : ''}`}
              style={active === m.id ? { borderColor: 'var(--text)' } : undefined}
              onClick={() => {
                select(m.id);
                const onFront = FRONT_MUSCLES.includes(m.id);
                const onBack = BACK_MUSCLES.includes(m.id);
                if (view === 'front' && !onFront && onBack) setView('back');
                if (view === 'back' && !onBack && onFront) setView('front');
              }}
            >
              {lvl === 'priority' && <span style={{ color: 'var(--accent)' }}>●</span>}
              {lvl === 'important' && <span style={{ color: 'var(--accent-soft)' }}>●</span>}
              {m.label}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="card tight">
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Tes priorités
          </div>
          <div className="stack" style={{ gap: 6 }}>
            {selected.map((m) => (
              <div key={m.id} className="row-between small">
                <span style={{ fontWeight: 650 }}>{m.label.toUpperCase()}</span>
                <span className={`tag ${priorities[m.id] === 'priority' ? 'accent' : ''}`}>{PRIORITY_LABELS[priorities[m.id]]}</span>
              </div>
            ))}
            <div className="tiny faint" style={{ marginTop: 4 }}>
              Tous les autres muscles restent entraînés (volume d’entretien au minimum).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
