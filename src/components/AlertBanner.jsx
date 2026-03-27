import { useState, useEffect, useCallback, useRef } from 'react'
import { AlertTriangle, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../lib/api'

function timeAgo(dateStr) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMin = Math.floor((now - then) / 60000)
  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  return `il y a ${diffD}j`
}

const ROTATE_INTERVAL = 5000
const REFRESH_INTERVAL = 5 * 60 * 1000

export default function AlertBanner({ onAlertClick }) {
  const [alerts, setAlerts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)
  const rotateTimer = useRef(null)

  const fetchAlerts = useCallback(async () => {
    const data = await api.getAlerts()
    if (data && data.alerts) {
      setAlerts(data.alerts)
    }
  }, [])

  // Initial fetch + refresh every 5 min
  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  // Slide-down animation trigger
  useEffect(() => {
    if (alerts.length > 0 && !dismissed) {
      requestAnimationFrame(() => setVisible(true))
    }
  }, [alerts, dismissed])

  // Auto-rotate alerts
  useEffect(() => {
    if (alerts.length <= 1) return
    rotateTimer.current = setInterval(() => {
      setCurrentIndex(i => (i + 1) % alerts.length)
    }, ROTATE_INTERVAL)
    return () => clearInterval(rotateTimer.current)
  }, [alerts.length])

  const goTo = (dir) => {
    clearInterval(rotateTimer.current)
    setCurrentIndex(i => {
      if (dir === 'prev') return (i - 1 + alerts.length) % alerts.length
      return (i + 1) % alerts.length
    })
    // Restart auto-rotation
    rotateTimer.current = setInterval(() => {
      setCurrentIndex(i => (i + 1) % alerts.length)
    }, ROTATE_INTERVAL)
  }

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(() => setDismissed(true), 300)
  }

  const handleAlertClick = (alert) => {
    if (onAlertClick && alert.lat && alert.lng) {
      onAlertClick(alert.lat, alert.lng)
    }
  }

  if (!alerts.length || dismissed) return null

  const alert = alerts[currentIndex]
  const hasMultiple = alerts.length > 1

  return (
    <div style={{
      position: 'fixed',
      top: 56,
      left: 0,
      right: 0,
      zIndex: 200,
      padding: '0 12px',
      transform: visible ? 'translateY(0)' : 'translateY(-100%)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.3s ease, opacity 0.3s ease',
      pointerEvents: 'none',
    }}>
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        background: 'rgba(251, 191, 36, 0.12)',
        border: '1px solid rgba(251, 191, 36, 0.3)',
        borderRadius: 10,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'auto',
        overflow: 'hidden',
      }}>
        {/* Nav left */}
        {hasMultiple && (
          <button
            onClick={() => goTo('prev')}
            style={navBtnStyle}
            aria-label="Alerte précédente"
          >
            <ChevronLeft size={14} />
          </button>
        )}

        {/* Alert icon */}
        <AlertTriangle size={16} style={{ color: '#fbbf24', flexShrink: 0 }} />

        {/* Alert content (clickable) */}
        <div
          onClick={() => handleAlertClick(alert)}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: onAlertClick && alert.lat ? 'pointer' : 'default',
            overflow: 'hidden',
          }}
        >
          <span style={{
            color: '#fbbf24',
            fontFamily: 'var(--font-display, sans-serif)',
            fontWeight: 600,
            fontSize: 13,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {alert.data?.type || 'Alerte'}
          </span>

          <span style={{
            color: 'var(--text-primary)',
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            minWidth: 0,
            lineHeight: 1.3,
          }}>
            {alert.data?.description || ''}
          </span>

          <span style={{
            color: 'var(--text-muted)',
            fontSize: 11,
            fontFamily: 'var(--font-mono, monospace)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {timeAgo(alert.created_at)}
          </span>

          <span style={{
            color: 'var(--text-secondary)',
            fontSize: 11,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            — {alert.pseudo || 'Anonyme'}
          </span>
        </div>

        {/* Counter */}
        {hasMultiple && (
          <span style={{
            color: 'var(--text-muted)',
            fontSize: 11,
            fontFamily: 'var(--font-mono, monospace)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {currentIndex + 1}/{alerts.length}
          </span>
        )}

        {/* Nav right */}
        {hasMultiple && (
          <button
            onClick={() => goTo('next')}
            style={navBtnStyle}
            aria-label="Alerte suivante"
          >
            <ChevronRight size={14} />
          </button>
        )}

        {/* Close */}
        <button
          onClick={handleDismiss}
          style={{
            ...navBtnStyle,
            marginLeft: 2,
          }}
          aria-label="Fermer les alertes"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

const navBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  border: 'none',
  borderRadius: 6,
  background: 'rgba(251, 191, 36, 0.15)',
  color: '#fbbf24',
  cursor: 'pointer',
  flexShrink: 0,
  padding: 0,
}
