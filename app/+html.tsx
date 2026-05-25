// ============================================================
//  Frontend/app/+html.tsx
//  Este arquivo customiza o HTML wrapper que o Expo Web gera.
//  
//  CRÍTICO: o <body><div id="splash"> aparece IMEDIATAMENTE
//  antes do bundle JS baixar. Quando o React inicializa, ele
//  substitui o conteúdo do <div id="root"> e o splash é
//  ocultado via CSS (porque aí o <div id="root"> tem filhos).
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

        {/* Splash inline — aparece antes do bundle carregar */}
        <style dangerouslySetInnerHTML={{ __html: splashCSS }} />
      </head>
      <body>
        {/* Splash visível no boot — somente quando o React ainda não renderizou */}
        <div id="initial-splash">
          <div className="splash-logo">REPLAY<span>FLIX</span></div>
          <div className="splash-bar">
            <div className="splash-bar-fill"></div>
          </div>
          <div className="splash-hint">Carregando seus lances...</div>
        </div>

        {children}

        {/* Esconde o splash assim que o React montar */}
        <script dangerouslySetInnerHTML={{ __html: hideSplashScript }} />
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

const hideSplashScript = `
  (function() {
    // Observa o DOM até o React montar e renderizar conteúdo no #root
    var splash = document.getElementById('initial-splash');
    if (!splash) return;

    function tryHide() {
      var root = document.getElementById('root');
      if (root && root.children.length > 0) {
        splash.classList.add('hide');
        setTimeout(function() { splash.remove(); }, 500);
        return true;
      }
      return false;
    }

    if (!tryHide()) {
      var observer = new MutationObserver(function() {
        if (tryHide()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // Fallback de segurança: esconde após 20s mesmo que não tenha detectado
      setTimeout(function() {
        if (splash) {
          splash.classList.add('hide');
          setTimeout(function() { splash.remove(); }, 500);
        }
        observer.disconnect();
      }, 20000);
    }
  })();
`;
