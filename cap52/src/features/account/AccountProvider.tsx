import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import Purchases from 'react-native-purchases';
import { isRevenueCatConfigured } from '../../config/env';
import { supabase } from '../../services/supabase';

interface AccountState {
  configured: boolean;
  session: Session | null;
  email: string | null;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AccountContext = createContext<AccountState | null>(null);

/** Compte facultatif : connexion par code à usage unique envoyé par e-mail (aucun mot de passe stocké). */
export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_event, next) => setSession(next));
    // Rafraîchissement du jeton uniquement quand l'app est au premier plan.
    const sub = AppState.addEventListener('change', (s) =>
      s === 'active' ? client.auth.startAutoRefresh() : client.auth.stopAutoRefresh(),
    );
    return () => {
      data.subscription.unsubscribe();
      sub.remove();
    };
  }, []);

  // Associe les achats au compte : le webhook RevenueCat met à jour les droits côté serveur.
  useEffect(() => {
    if (session?.user.id && isRevenueCatConfigured) Purchases.logIn(session.user.id).catch(() => undefined);
  }, [session?.user.id]);

  const require = () => {
    if (!supabase) throw new Error('Serveur non configuré');
    return supabase;
  };

  const value: AccountState = {
    configured: supabase !== null,
    session,
    email: session?.user.email ?? null,
    sendCode: async (email) => {
      const { error } = await require().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw error;
    },
    verifyCode: async (email, code) => {
      const { error } = await require().auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) throw error;
    },
    signOut: async () => {
      await require().auth.signOut();
    },
    deleteAccount: async () => {
      const client = require();
      const { error } = await client.functions.invoke('delete-account', { method: 'POST' });
      if (error) throw error;
      await client.auth.signOut();
    },
  };

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountState {
  const value = useContext(AccountContext);
  if (!value) throw new Error('useAccount doit être utilisé dans AccountProvider');
  return value;
}
