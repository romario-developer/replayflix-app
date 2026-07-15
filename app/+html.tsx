// ============================================================
//  Frontend/app/+html.tsx  (v3 - com pré-fetch)
//
//  Mudanças desta versão:
//  - Pré-fetch de /api/replays DISPARADO no HTML inline,
//    ANTES do bundle JS baixar. Resultado fica em
//    window.__prefetchedReplays e o HomeScreen lê direto.
//  - Splash continua esperando __splashDone() pra esconder.
// ============================================================

import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

const API_URL = 'https://api.replayflix.com.br/api';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="google" content="notranslate" />
        <meta name="theme-color" content="#0A0A0A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="ReplayFlix" />
        <title>ReplayFlix</title>

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: splashCSS }} />

        {/* ATENÇÃO: este script roda IMEDIATAMENTE quando o HTML é parseado,
            ANTES do bundle JS baixar. Inicia o fetch dos replays em paralelo
            com o download do React/Expo. */}
        <script dangerouslySetInnerHTML={{ __html: prefetchScript(API_URL) }} />
        <script dangerouslySetInnerHTML={{ __html: serviceWorkerScript }} />
      </head>
      <body>
        <div id="initial-splash">
          <div className="splash-logo">REPLAY<span>FLIX</span></div>
          <div className="splash-bar">
            <div className="splash-bar-fill"></div>
          </div>
          <div className="splash-hint">Carregando seus lances...</div>
        </div>

        {children}

        <script dangerouslySetInnerHTML={{ __html: splashControllerScript }} />
      </body>
    </html>
  );
}

// Registra o service worker do PWA (public/sw.js)
const serviceWorkerScript = `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js')
        .then(function(reg) { console.log('[SW] registrado, scope:', reg.scope); })
        .catch(function(err) { console.warn('[SW] falha ao registrar:', err); });
    });
  }
`;

const splashCSS = `
  body { background:#0A0A0A; margin:0; }
  #initial-splash {
    position: fixed;
    inset: 0;
    background: linear-gradient(160deg, #0A0A0A 0%, #1a0000 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    transition: opacity 0.4s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  #initial-splash.hide { opacity: 0; pointer-events: none; }
  .splash-logo {
    color: #FFF; font-size: 34px; font-weight: 900; font-style: italic;
    letter-spacing: -1px; margin-bottom: 24px;
    animation: pulse 1.8s ease-in-out infinite;
  }
  .splash-logo span { color: #D30000; }
  .splash-bar {
    width: 180px; height: 4px; background: rgba(255,255,255,0.1);
    border-radius: 4px; overflow: hidden; margin-bottom: 14px;
  }
  .splash-bar-fill {
    height: 100%; width: 100%; background: #D30000; border-radius: 4px;
    animation: slide 1.2s ease-in-out infinite; transform-origin: left;
  }
  .splash-hint { color: #666; font-size: 13px; font-weight: 500; }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(0.97); }
  }
  @keyframes slide {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(0); }
    100% { transform: translateX(100%); }
  }
`;

// Script de PRÉ-FETCH — roda no <head>, antes do React montar.
// Se o usuário estiver logado (userId no localStorage), dispara
// já a chamada pra /api/replays. Quando o React precisar dos
// dados depois, o resultado já estará pronto em window.__prefetchedReplays.
function prefetchScript(apiUrl: string) {
  return `
    (function() {
      try {
        var startTs = Date.now();
        window.__prefetchedReplays = null;

        // Ler userId direto do AsyncStorage do React Native Web
        // (que internamente é o localStorage com prefixo)
        var userId = null;
        try {
          // RN Web AsyncStorage usa chave direta no localStorage
          userId = localStorage.getItem('userId');
        } catch (e) {}

        var url = '${apiUrl}/replays';
        if (userId) url += '?user_id=' + encodeURIComponent(userId);

        var promise = fetch(url, {
          method: 'GET',
          credentials: 'omit',
          headers: { 'Accept': 'application/json' }
        }).then(function(r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        }).then(function(data) {
          var elapsed = Date.now() - startTs;
          console.log('[PREFETCH] /api/replays OK em', elapsed + 'ms, n=' + (data?.length || 0));
          window.__prefetchedReplays = data;
          window.dispatchEvent(new CustomEvent('replays-prefetched', { detail: data }));
          return data;
        }).catch(function(err) {
          console.warn('[PREFETCH] falha:', err.message);
          window.__prefetchedReplays = null;
        });

        // Expõe a promise pro código React esperar se ainda não terminou
        window.__prefetchPromise = promise;
      } catch (e) {
        console.warn('[PREFETCH] erro inicial:', e);
      }
    })();
  `;
}

// Splash NÃO some sozinho. Espera __splashDone() do app.
const splashControllerScript = `
  (function() {
    var splash = document.getElementById('initial-splash');
    if (!splash) return;
    var hidden = false;
    var minShowMs = 600;
    var bootStart = Date.now();

    function hideSplash() {
      if (hidden) return;
      hidden = true;
      var elapsed = Date.now() - bootStart;
      var wait = Math.max(0, minShowMs - elapsed);
      setTimeout(function() {
        splash.classList.add('hide');
        setTimeout(function() {
          if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
        }, 500);
      }, wait);
    }

    window.__splashDone = hideSplash;
    setTimeout(hideSplash, 20000);
  })();
`;
