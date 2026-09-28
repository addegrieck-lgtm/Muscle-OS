import { navigate, type Route } from '../hooks/useRoute';
import { IconBody, IconBowl, IconChart, IconCoach, IconDumbbell, IconHome } from './Icons';

const TABS: { route: Route; label: string; Icon: typeof IconHome; match: Route[] }[] = [
  { route: 'home', label: 'Accueil', Icon: IconHome, match: ['home', 'sources', 'settings'] },
  { route: 'training', label: 'Entraînement', Icon: IconDumbbell, match: ['training'] },
  { route: 'nutrition', label: 'Nutrition', Icon: IconBowl, match: ['nutrition', 'nutrition-pantry', 'nutrition-shopping'] },
  { route: 'body', label: 'Corps', Icon: IconBody, match: ['body'] },
  { route: 'progress', label: 'Progression', Icon: IconChart, match: ['progress'] },
  { route: 'coach', label: 'Coach', Icon: IconCoach, match: ['coach'] },
];

export function TabBar({ route }: { route: Route }) {
  return (
    <nav className="tabbar" aria-label="Navigation principale">
      <div className="tabbar-inner">
        {TABS.map(({ route: r, label, Icon, match }) => {
          const on = match.includes(route);
          return (
            <button key={r} className={`tab ${on ? 'on' : ''}`} onClick={() => navigate(r)} aria-current={on ? 'page' : undefined}>
              <Icon strokeWidth={on ? 2.1 : 1.7} />
              <span>{label}</span>
              <span className="tab-dot" />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
