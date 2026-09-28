import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/store';
import { clearCoach, sendCoachMessage, startSession } from '../store/actions';
import { EXAMPLE_QUESTIONS } from '../engines/coach';
import { generateQuickWorkout } from '../engines/workoutGenerator';
import { sourceById } from '../data/sources';
import { navigate } from '../hooks/useRoute';
import { PageHeader, RichText } from '../components/ui';
import { IconSend, IconTrash } from '../components/Icons';
import type { CoachAction } from '../types/models';

export function Coach() {
  const messages = useApp((s) => s.coachMessages);
  const user = useApp((s) => s.user)!;
  const progress = useApp((s) => s.progress);
  const provider = useApp((s) => s.coachSettings.provider);
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, pending]);

  const send = async (q: string) => {
    if (!q.trim() || pending) return;
    setText('');
    setPending(true);
    await sendCoachMessage(q);
    setPending(false);
  };

  const runAction = (a: CoachAction) => {
    if (a.type === 'navigate') navigate(a.to);
    if (a.type === 'start_quick_workout') {
      const w = generateQuickWorkout(a.minutes, { level: user.level, goal: user.goal, equipment: user.equipment, priorities: user.musclePriorities, progress });
      startSession(w);
      navigate('session');
    }
  };

  return (
    <div className="page" style={{ paddingBottom: 190 }}>
      <PageHeader
        eyebrow={provider === 'ollama' ? 'IA locale (Ollama) + règles' : 'Hors-ligne · utilise tes données'}
        title="Coach"
        right={
          messages.length > 0 ? (
            <button className="icon-btn" onClick={() => confirm('Effacer la conversation ?') && clearCoach()} aria-label="Effacer">
              <IconTrash width={18} />
            </button>
          ) : undefined
        }
      />

      {messages.length === 0 && (
        <div className="stack fade-in">
          <div className="card hero">
            <div className="title-md">Pose-moi une question 👋</div>
            <p className="small muted" style={{ marginTop: 6 }}>
              Je connais ton programme, tes repas, ta récupération et ta progression. Je ne pose jamais de diagnostic médical.
            </p>
          </div>
          <div className="chips">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button key={q} className="chip" onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat">
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.role} ${m.severity === 'danger' ? 'danger' : m.severity === 'warning' ? 'warning' : ''}`}>
            <RichText text={m.text} />
            {m.actions && m.actions.length > 0 && (
              <div className="row wrap" style={{ marginTop: 10, gap: 6 }}>
                {m.actions.map((a, i) => (
                  <button key={i} className="btn sm primary" onClick={() => runAction(a)}>
                    {a.label}
                  </button>
                ))}
              </div>
            )}
            {m.sourceIds && m.sourceIds.length > 0 && (
              <div className="tiny faint" style={{ marginTop: 8 }}>
                Sources :{' '}
                {m.sourceIds
                  .map((id) => sourceById(id))
                  .filter(Boolean)
                  .map((src) => `${src!.authors.split(',')[0]} ${src!.year}`)
                  .join(' · ')}
              </div>
            )}
          </div>
        ))}
        {pending && <div className="bubble coach faint">…</div>}
        <div ref={endRef} />
      </div>

      {messages.length > 0 && (
        <div className="chips" style={{ marginTop: 16 }}>
          {EXAMPLE_QUESTIONS.slice(0, 4).map((q) => (
            <button key={q} className="chip" onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="composer">
        <form
          className="composer-inner"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <input className="input" style={{ borderRadius: 999 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Écris ta question…" enterKeyHint="send" />
          <button className="icon-btn" style={{ width: 50, height: 50, background: 'var(--text)', color: '#050506' }} type="submit" aria-label="Envoyer" disabled={pending}>
            <IconSend />
          </button>
        </form>
      </div>
    </div>
  );
}
