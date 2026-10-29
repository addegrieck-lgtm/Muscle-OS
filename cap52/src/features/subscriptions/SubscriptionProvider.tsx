import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { APP_CONFIG } from '../../config/app';
import { ENV, isRevenueCatConfigured } from '../../config/env';
import { useAppData } from '../data/AppDataProvider';

export interface Offer {
  id: string;
  period: 'monthly' | 'annual' | 'other';
  priceString: string; // prix réel fourni par le store, jamais codé en dur
  title: string;
}

type Status = 'not_configured' | 'loading' | 'ready' | 'error';

interface SubscriptionState {
  status: Status;
  /** Vrai uniquement si le droit est actif côté store (ou simulation explicite en développement). */
  isPremium: boolean;
  source: 'store' | 'demo' | null;
  offers: Offer[];
  expiresAt: string | null;
  willRenew: boolean;
  purchase: (offerId: string) => Promise<'purchased' | 'cancelled'>;
  restore: () => Promise<boolean>;
  reloadOffers: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionState | null>(null);

function entitlementOf(info: CustomerInfo | null) {
  return info?.entitlements.active[APP_CONFIG.subscriptions.entitlementId] ?? null;
}

let configured = false;

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { prefs } = useAppData();
  const [status, setStatus] = useState<Status>(isRevenueCatConfigured ? 'loading' : 'not_configured');
  const [info, setInfo] = useState<CustomerInfo | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);

  const reloadOffers = useCallback(async () => {
    if (!isRevenueCatConfigured) return;
    try {
      const offerings = await Purchases.getOfferings();
      setPackages(offerings.current?.availablePackages ?? []);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!isRevenueCatConfigured || !ENV.revenueCatKey) return;
    if (!configured) {
      Purchases.configure({ apiKey: ENV.revenueCatKey });
      configured = true;
    }
    const listener = (next: CustomerInfo) => setInfo(next);
    Purchases.addCustomerInfoUpdateListener(listener);
    Purchases.getCustomerInfo().then(setInfo).catch(() => setStatus('error'));
    // Offres chargées depuis le store ; l'état est mis à jour après l'await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reloadOffers();
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [reloadOffers]);

  const entitlement = entitlementOf(info);
  // La simulation n'existe que dans les builds de développement (__DEV__ est faux en production).
  const demo = __DEV__ && prefs.demoPremium;

  const offers = useMemo<Offer[]>(
    () =>
      packages.map((p) => ({
        id: p.identifier,
        period: p.packageType === 'MONTHLY' ? 'monthly' : p.packageType === 'ANNUAL' ? 'annual' : 'other',
        priceString: p.product.priceString,
        title: p.product.title,
      })),
    [packages],
  );

  const value: SubscriptionState = {
    status,
    isPremium: entitlement !== null || demo,
    source: entitlement ? 'store' : demo ? 'demo' : null,
    offers,
    expiresAt: entitlement?.expirationDate ?? null,
    willRenew: entitlement?.willRenew ?? false,
    reloadOffers,
    purchase: async (offerId) => {
      const pkg = packages.find((p) => p.identifier === offerId);
      if (!pkg) throw new Error('Offre introuvable');
      try {
        const result = await Purchases.purchasePackage(pkg);
        setInfo(result.customerInfo);
        return 'purchased';
      } catch (e) {
        if ((e as { userCancelled?: boolean }).userCancelled) return 'cancelled';
        throw e;
      }
    },
    restore: async () => {
      const restored = await Purchases.restorePurchases();
      setInfo(restored);
      return entitlementOf(restored) !== null;
    },
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionState {
  const value = useContext(SubscriptionContext);
  if (!value) throw new Error('useSubscription doit être utilisé dans SubscriptionProvider');
  return value;
}
