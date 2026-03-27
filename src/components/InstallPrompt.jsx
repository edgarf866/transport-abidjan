import { useState, useEffect, useCallback } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';

/**
 * InstallPrompt — Bannière d'installation PWA
 *
 * - Android/Chrome : intercepte beforeinstallprompt et propose l'install native
 * - iOS Safari : detecte iOS et affiche un guide avec les etapes manuelles
 * - Ne s'affiche qu'une fois par session (ou apres 30s de navigation)
 * - L'utilisateur peut fermer, et on ne remontre pas avant 7 jours
 */

const DISMISS_KEY = 'transportmap_install_dismissed';
const DISMISS_DAYS = 7;

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function wasDismissedRecently() {
  try {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) return false;
    const diff = Date.now() - parseInt(dismissed, 10);
    return diff < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Ne pas afficher si deja installe ou recemment ferme
    if (isInStandaloneMode() || wasDismissedRecently()) return;

    // Chrome / Android : intercepter le prompt natif
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Attendre 20s avant d'afficher pour ne pas agresser l'utilisateur
      setTimeout(() => setShowBanner(true), 20000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // iOS : afficher apres 25s si c'est un iPhone/iPad sur Safari
    if (isIOS()) {
      const isChrome = /CriOS/.test(navigator.userAgent);
      const isFirefox = /FxiOS/.test(navigator.userAgent);
      // Seulement sur Safari natif (pas Chrome/Firefox iOS)
      if (!isChrome && !isFirefox) {
        setTimeout(() => {
          if (!isInStandaloneMode()) {
            setShowIOSGuide(true);
            setShowBanner(true);
          }
        }, 25000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
    setInstalling(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {}
  }, []);

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 70,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      width: 'calc(100% - 24px)',
      maxWidth: 400,
      animation: 'installSlideUp 0.4s ease',
    }}>
      <div style={{
        background: 'rgba(8, 15, 28, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(34, 211, 238, 0.25)',
        borderRadius: 16,
        boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 20px rgba(34,211,238,0.08)',
        overflow: 'hidden',
      }}>
        {/* Barre accent en haut */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, #22d3ee, #06b6d4, #0891b2)',
        }} />

        <div style={{ padding: '14px 16px' }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            {/* Icone app */}
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: 'rgba(34, 211, 238, 0.1)',
              border: '1px solid rgba(34, 211, 238, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 22 }}>🗺️</span>
            </div>

            {/* Texte */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--font-display, -apple-system, sans-serif)',
                fontSize: 14, fontWeight: 700,
                color: '#f1f5f9',
                lineHeight: '20px',
              }}>
                Installer TransportMap
              </div>
              <div style={{
                fontFamily: 'var(--font-display, -apple-system, sans-serif)',
                fontSize: 12,
                color: '#94a3b8',
                lineHeight: '18px',
                marginTop: 2,
              }}>
                {showIOSGuide
                  ? "Ajoutez l'app sur votre ecran d'accueil pour un acces rapide"
                  : "Acces rapide, fonctionne hors-ligne, comme une vraie app"
                }
              </div>
            </div>

            {/* Bouton fermer */}
            <button
              onClick={handleDismiss}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#64748b', padding: 4, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* iOS Guide */}
          {showIOSGuide && (
            <div style={{
              marginTop: 12, padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 9, letterSpacing: 0.5,
                color: '#64748b', marginBottom: 8,
              }}>
                COMMENT FAIRE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Step number="1" icon={<Share size={14} />}>
                  Appuyez sur le bouton <strong style={{ color: '#22d3ee' }}>Partager</strong> en bas
                </Step>
                <Step number="2" icon={<Plus size={14} />}>
                  Selectionnez <strong style={{ color: '#22d3ee' }}>"Sur l'ecran d'accueil"</strong>
                </Step>
                <Step number="3" icon={<Download size={14} />}>
                  Appuyez sur <strong style={{ color: '#22d3ee' }}>Ajouter</strong>
                </Step>
              </div>
            </div>
          )}

          {/* Bouton installer (Android/Chrome) */}
          {!showIOSGuide && deferredPrompt && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                onClick={handleInstall}
                disabled={installing}
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px 16px', borderRadius: 10,
                  background: 'linear-gradient(135deg, rgba(34,211,238,0.25), rgba(6,182,212,0.15))',
                  border: '1px solid rgba(34,211,238,0.4)',
                  color: '#22d3ee',
                  fontFamily: 'var(--font-display, -apple-system, sans-serif)',
                  fontSize: 13, fontWeight: 600,
                  cursor: installing ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Download size={15} />
                {installing ? 'Installation...' : 'Installer'}
              </button>
              <button
                onClick={handleDismiss}
                style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#64748b',
                  fontFamily: 'var(--font-display, -apple-system, sans-serif)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Plus tard
              </button>
            </div>
          )}

          {/* Badge en bas */}
          <div style={{
            marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
            justifyContent: 'center',
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 6px #22c55e',
            }} />
            <span style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 8, letterSpacing: 1,
              color: '#475569',
            }}>
              GRATUIT &bull; HORS-LIGNE &bull; RAPIDE
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes installSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(30px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// Sous-composant pour les etapes iOS
function Step({ number, icon, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: 'rgba(34,211,238,0.1)',
        border: '1px solid rgba(34,211,238,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: '#22d3ee',
        fontFamily: 'var(--font-display, sans-serif)',
        flexShrink: 0,
      }}>
        {number}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        color: '#94a3b8',
      }}>
        {icon}
        <span style={{
          fontFamily: 'var(--font-display, -apple-system, sans-serif)',
          fontSize: 11, lineHeight: '16px',
        }}>
          {children}
        </span>
      </div>
    </div>
  );
}
