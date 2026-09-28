import { useEffect } from 'react';
import { useApp } from './store/store';
import { ensureCurrent } from './store/actions';
import { useRoute } from './hooks/useRoute';
import { TabBar } from './components/TabBar';
import { Onboarding } from './pages/Onboarding';
import { Home } from './pages/Home';
import { Training } from './pages/Training';
import { Session } from './pages/Session';
import { Nutrition } from './pages/Nutrition';
import { Body } from './pages/Body';
import { Progress } from './pages/Progress';
import { Coach } from './pages/Coach';
import { Sources } from './pages/Sources';
import { Settings } from './pages/Settings';

export function App() {
  const user = useApp((s) => s.user);
  const { route } = useRoute();

  // Mise à jour du programme / des repas au lancement et au retour dans l'app (changement de jour/semaine).
  useEffect(() => {
    ensureCurrent();
    const onVisible = () => document.visibilityState === 'visible' && ensureCurrent();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user?.id]);

  if (!user) return <div className="app"><Onboarding /></div>;

  const page = (() => {
    switch (route) {
      case 'training':
        return <Training />;
      case 'session':
        return <Session />;
      case 'nutrition':
        return <Nutrition key="n" />;
      case 'nutrition-pantry':
        return <Nutrition key="np" initialTab="pantry" />;
      case 'nutrition-shopping':
        return <Nutrition key="ns" initialTab="shopping" />;
      case 'body':
        return <Body />;
      case 'progress':
        return <Progress />;
      case 'coach':
        return <Coach />;
      case 'sources':
        return <Sources />;
      case 'settings':
        return <Settings />;
      default:
        return <Home />;
    }
  })();

  return (
    <div className="app">
      <div key={route}>{page}</div>
      {route !== 'session' && <TabBar route={route} />}
    </div>
  );
}
