import { useState } from 'react';
import { PanelLeftOpen, PanelRightOpen, X } from 'lucide-react';

/**
 * MobileToggle — Boutons flottants pour afficher/masquer les panneaux sur mobile.
 * Visible uniquement sous 768px via CSS.
 */
export default function MobileToggle({ showLeft, showRight, onToggleLeft, onToggleRight }) {
  return (
    <div className="mobile-toggle-bar">
      <button
        onClick={onToggleLeft}
        className="mobile-toggle-btn"
        style={{
          background: showLeft ? 'rgba(34, 211, 238, 0.15)' : 'var(--glass-bg)',
          borderColor: showLeft ? 'rgba(34, 211, 238, 0.3)' : 'var(--glass-border)',
        }}
        title="Couches & filtres"
      >
        {showLeft ? <X size={16} color="var(--cyan)" /> : <PanelLeftOpen size={16} color="var(--text-secondary)" />}
      </button>

      <button
        onClick={onToggleRight}
        className="mobile-toggle-btn"
        style={{
          background: showRight ? 'rgba(34, 211, 238, 0.15)' : 'var(--glass-bg)',
          borderColor: showRight ? 'rgba(34, 211, 238, 0.3)' : 'var(--glass-border)',
        }}
        title="Details & legende"
      >
        {showRight ? <X size={16} color="var(--cyan)" /> : <PanelRightOpen size={16} color="var(--text-secondary)" />}
      </button>
    </div>
  );
}
