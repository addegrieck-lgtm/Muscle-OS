import { useEffect, type ReactNode } from 'react';
import { IconClose } from './Icons';

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        {title && (
          <div className="row-between" style={{ marginBottom: 14 }}>
            <h2 className="title-lg">{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Fermer">
              <IconClose />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={String(o.value)} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)} type="button">
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Bar({ value, max, variant }: { value: number; max: number; variant?: 'accent' | 'blue' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`bar ${variant ?? ''}`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Ring({ value, max, size = 120, stroke = 10, color = 'var(--text)', children }: { value: number; max: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--card-2)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.2,0.8,0.2,1)' }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 999, decimals = 0 }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; decimals?: number }) {
  const clampV = (v: number) => Math.min(max, Math.max(min, Math.round(v * 10 ** decimals) / 10 ** decimals));
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(clampV(value - step))} aria-label="Moins">
        −
      </button>
      <input inputMode="decimal" value={value} onChange={(e) => onChange(clampV(parseFloat(e.target.value.replace(',', '.')) || 0))} />
      <button type="button" onClick={() => onChange(clampV(value + step))} aria-label="Plus">
        +
      </button>
    </div>
  );
}

export function Scale5({ value, onChange, labels }: { value?: number; onChange: (v: number) => void; labels?: [string, string] }) {
  return (
    <div>
      <div className="scale5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className={value === n ? 'on' : ''} onClick={() => onChange(n)}>
            {n}
          </button>
        ))}
      </div>
      {labels && (
        <div className="row-between tiny faint" style={{ marginTop: 4 }}>
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
    </div>
  );
}

/** Mini-rendu Markdown sûr : **gras**, _italique_, retours à la ligne (aucun HTML injecté). */
export function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={j}>{part.slice(2, -2)}</strong>
            ) : part.startsWith('_') && part.endsWith('_') && part.length > 2 ? (
              <em key={j} className="faint">
                {part.slice(1, -1)}
              </em>
            ) : (
              <span key={j}>{part}</span>
            ),
          )}
          {i < lines.length - 1 && '\n'}
        </span>
      ))}
    </>
  );
}

export function PageHeader({ eyebrow, title, right }: { eyebrow?: ReactNode; title: ReactNode; right?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>}
        <h1 className="title-xl">{title}</h1>
      </div>
      {right && <div className="row">{right}</div>}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="section-title">
      <h3>{children}</h3>
      {right}
    </div>
  );
}

export function Check({ on, round }: { on: boolean; round?: boolean }) {
  return (
    <span className={`check ${on ? 'on' : ''} ${round ? 'round' : ''}`}>
      {on && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      )}
    </span>
  );
}
