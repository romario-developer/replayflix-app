// ============================================================
//  Frontend/app/+html.tsx  (v2)
//  Splash persiste até o app sinalizar que pode esconder.
//  O app dispara via window.__splashDone() quando os dados
//  carregam. Fallback de segurança: 20s.
// ============================================================

import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

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
        <title>ReplayFlix</title>

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: splashCSS }} />
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
  #initial-splash.hide {
    opacity: 0;
    pointer-events: none;
  }
  .splash-logo {
    color: #FFF;
    font-size: 34px;
    font-weight: 900;
    font-style: italic;
    letter-spacing: -1px;
    margin-bottom: 24px;
    animation: pulse 1.8s ease-in-out infinite;
  }
  .splash-logo span { color: #D30000; }
  .splash-bar {
    width: 180px;
    height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 14px;
  }
  .splash-bar-fill {
    height: 100%;
    width: 100%;
    background: #D30000;
    border-radius: 4px;
    animation: slide 1.2s ease-in-out infinite;
    transform-origin: left;
  }
  .splash-hint {
    color: #666;
    font-size: 13px;
    font-weight: 500;
  }
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

// Splash NÃO some sozinho. Ele espera o app chamar window.__splashDone()
// (quando os dados foram carregados de fato).
// Fallback: 20 segundos sem sinal, esconde mesmo assim.
const splashControllerScript = `
  (function() {
    var splash = document.getElementById('initial-splash');
    if (!splash) return;
    var hidden = false;
    var minShowMs = 600; // garante que o splash não pisque
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

    // Expõe API pro app chamar quando estiver pronto
    window.__splashDone = hideSplash;

    // Fallback de segurança: 20s sem sinal, esconde mesmo assim
    setTimeout(hideSplash, 20000);
  })();
`;
