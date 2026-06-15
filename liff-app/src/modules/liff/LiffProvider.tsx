import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initLiff, type LiffState } from './liff';
import { authService } from '../../services/authService';

interface LiffContextValue {
  state: LiffState;
  error: string | null;
}

const LiffContext = createContext<LiffContextValue>({ state: 'idle', error: null });

export function useLiffContext() {
  return useContext(LiffContext);
}

interface Props {
  liffId: string;
  children: ReactNode;
}

export function LiffProvider({ liffId, children }: Props) {
  const [state, setState] = useState<LiffState>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setState('loading');

    const mockMode = import.meta.env.VITE_DEV_MOCK_MODE === 'true';

    (async () => {
      if (mockMode) {
        // Dev: skip LIFF init, use stored token if available
        await authService.initFromStorage();
        setState('ready');
        return;
      }
      try {
        await initLiff(liffId);
        const idToken = (await import('./liff')).getIdToken();
        if (idToken) {
          await authService.login(idToken);
        }
        setState('ready');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'LIFF init failed';
        setError(msg);
        setState('error');
      }
    })();
  }, [liffId]);

  return <LiffContext.Provider value={{ state, error }}>{children}</LiffContext.Provider>;
}
