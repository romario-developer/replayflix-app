// ============================================================
//  HOOK: useAutoRefresh
//  Refaz dados automaticamente quando o usuário volta pra
//  página/app depois de ter saído. Funciona em web e mobile.
//
//  Coloque em: Frontend/hooks/use-auto-refresh.ts
// ============================================================

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

/**
 * Dispara o callback `onRefresh` sempre que o usuário volta para a
 * aplicação após tê-la deixado em segundo plano (mobile) ou trocado
 * de aba/minimizado o navegador (web).
 *
 * @param onRefresh   função chamada quando o app volta ao primeiro plano
 * @param minIntervalMs intervalo mínimo entre refreshes (default: 5s)
 *                      evita disparar várias vezes seguidas
 */
export function useAutoRefresh(
  onRefresh: () => void | Promise<void>,
  minIntervalMs: number = 5000
) {
  const lastRefreshRef = useRef<number>(Date.now());
  const callbackRef = useRef(onRefresh);

  // Mantém a callback sempre atualizada sem reanexar listeners
  useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const tryRefresh = () => {
      const now = Date.now();
      if (now - lastRefreshRef.current < minIntervalMs) return;
      lastRefreshRef.current = now;
      try {
        callbackRef.current();
      } catch (e) {
        console.error('Erro no auto-refresh:', e);
      }
    };

    // MOBILE: AppState
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') tryRefresh();
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);

    // WEB: visibilitychange + focus (complementares)
    let onVis: (() => void) | undefined;
    let onFocus: (() => void) | undefined;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      onVis = () => {
        if (document.visibilityState === 'visible') tryRefresh();
      };
      onFocus = () => tryRefresh();
      document.addEventListener('visibilitychange', onVis);
      window.addEventListener('focus', onFocus);
    }

    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        if (onVis) document.removeEventListener('visibilitychange', onVis);
        if (onFocus) window.removeEventListener('focus', onFocus);
      }
    };
  }, [minIntervalMs]);
}
