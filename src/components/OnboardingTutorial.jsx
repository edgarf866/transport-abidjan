import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, X, Search, Layers, Filter, MapPin, MousePointer, Navigation, PenLine, AlertTriangle } from 'lucide-react';

const STEPS = [
  {
    icon: '🗺️',
    title: 'Bienvenue sur TransportMap',
    desc: 'Explorez le réseau de transport du Grand Abidjan en temps réel. Naviguez sur la carte, zoomez et cliquez sur les éléments pour en savoir plus.',
    target: null,
  },
  {
    icon: '🔍',
    title: 'Recherche rapide',
    desc: 'Utilisez la barre de recherche en haut pour trouver un arrêt, une ligne, une gare ou une commune par nom. La carte zoomera automatiquement sur le résultat.',
    target: 'search',
    IconComp: Search,
  },
  {
    icon: '📂',
    title: 'Couches de données',
    desc: 'Activez ou désactivez les couches à gauche : lignes de bus, arrêts, gares, routes, communes, transport lagunaire et voies ferrées.',
    target: 'layers',
    IconComp: Layers,
  },
  {
    icon: '🎯',
    title: 'Filtre par opérateur',
    desc: 'Filtrez les arrêts par opérateur : SOTRA (réseau formel) ou Informel (gbaka, woro-woro). Pratique pour comparer les réseaux.',
    target: 'filter',
    IconComp: Filter,
  },
  {
    icon: '📍',
    title: 'Cliquez pour explorer',
    desc: 'Cliquez sur une ligne, un arrêt ou une gare pour voir ses détails. Les clusters orange regroupent les arrêts : cliquez pour zoomer.',
    target: 'map',
    IconComp: MapPin,
  },
  {
    icon: '🧭',
    title: 'Itinéraire multimodal',
    desc: 'Appuyez sur le bouton avion en bas à droite pour calculer un trajet A → B. Combinez bus, gbaka, woro-woro et marche à pied pour trouver le meilleur itinéraire.',
    target: 'travel',
    IconComp: Navigation,
  },
  {
    icon: '📝',
    title: 'Contribuer',
    desc: 'Aidez à enrichir la carte ! Le bouton 📝 au-dessus permet de signaler un arrêt manquant, corriger un nom, proposer un trajet ou signaler une alerte.',
    target: 'contribute',
    IconComp: PenLine,
  },
  {
    icon: '⚠️',
    title: 'Alertes en temps réel',
    desc: 'Un bandeau jaune apparaît en haut quand des alertes transport sont actives (route coupée, grève, déviation). Cliquez dessus pour voir le lieu concerné.',
    target: 'alerts',
    IconComp: AlertTriangle,
  },
  {
    icon: '🌓',
    title: 'Mode clair / sombre',
    desc: 'Utilisez le bouton soleil/lune dans la barre du haut pour basculer entre le thème sombre et clair selon votre environnement.',
    target: 'theme',
    IconComp: MousePointer,
  },
];

const STORAGE_KEY = 'transport-onboarding-done';

export default function OnboardingTutorial() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (done) return;

      // Attendre que la bannière install soit fermée ou absente avant d'afficher le guide
      // La bannière install s'affiche après 5s, on attend un peu plus
      const checkAndShow = () => {
        const installBanner = document.querySelector('[data-install-prompt]');
        if (installBanner) {
          // La bannière install est visible, on réessaie dans 2s
          const retry = setTimeout(checkAndShow, 2000);
          return () => clearTimeout(retry);
        }
        setVisible(true);
      };

      // Délai initial : 8s (après les 5s de la bannière install + marge)
      const t = setTimeout(checkAndShow, 8000);
      return () => clearTimeout(t);
    } catch {}
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  }

  function prev() {
    if (step > 0) setStep(s => s - 1);
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* Overlay sombre */}
      <div
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 10000,
          animation: 'fadeIn 0.3s ease',
        }}
      />

      {/* Card tutoriel */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10000,
        width: 380,
        maxWidth: 'calc(100vw - 32px)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--glass-border)',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        animation: 'fadeInUp 0.4s ease',
      }}>
        {/* Header avec icône */}
        <div style={{
          padding: '24px 24px 16px',
          textAlign: 'center',
          borderBottom: '1px solid var(--glass-border)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{current.icon}</div>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            {current.title}
          </h3>
        </div>

        {/* Body */}
        <div style={{
          padding: '16px 24px',
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--text-secondary)',
        }}>
          {current.desc}
        </div>

        {/* Progress dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          padding: '0 24px 12px',
        }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              onClick={() => setStep(i)}
              style={{
                width: i === step ? 20 : 8,
                height: 8,
                borderRadius: 4,
                background: i === step ? 'var(--cyan)' : 'var(--glass-border)',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px 16px',
          borderTop: '1px solid var(--glass-border)',
        }}>
          {/* Skip */}
          <button
            onClick={dismiss}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--text-muted)', letterSpacing: 0.5,
            }}
          >
            PASSER
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Prev */}
            {step > 0 && (
              <button
                onClick={prev}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', borderRadius: 8,
                  border: '1px solid var(--glass-border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)',
                  fontSize: 12, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <ChevronLeft size={14} />
                Retour
              </button>
            )}

            {/* Next / Finish */}
            <button
              onClick={next}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 16px', borderRadius: 8,
                border: 'none',
                background: 'var(--cyan)',
                color: '#fff',
                fontFamily: 'var(--font-display)',
                fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(34, 211, 238, 0.3)',
              }}
            >
              {isLast ? 'Commencer' : 'Suivant'}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
