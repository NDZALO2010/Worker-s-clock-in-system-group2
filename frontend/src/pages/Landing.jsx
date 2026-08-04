import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useAuth } from '../context/AuthContext'
import './Landing.css'

function AuthMethodModal({ mode, onSelect, onClose }) {
  const actionLabel = mode === 'checkout' ? 'Check Out' : 'Check In'

  return (
    <div className="auth-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="auth-modal-title" className="auth-modal-title">
          Choose a method to {actionLabel}
        </h2>
        <p className="auth-modal-subtitle">Select how you'd like to verify your identity.</p>

        <div className="auth-modal-options">
          <button type="button" className="auth-modal-option" onClick={() => onSelect('face')}>
            Face Recognition
          </button>
          <button type="button" className="auth-modal-option" onClick={() => onSelect('fingerprint')}>
            Fingerprint
          </button>
        </div>

        <button type="button" className="auth-modal-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function Landing() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [pendingMode, setPendingMode] = useState(null)

  function goToScan(mode, method) {
    navigate('/scan', { state: { mode, method } })
  }

  function handleSelectMethod(method) {
    const mode = pendingMode
    setPendingMode(null)
    goToScan(mode, method)
  }

  // The portal is a shared kiosk entry point, so any lingering session from a
  // previous user must be cleared here — otherwise GuestOnlyRoute would skip
  // the login form and drop the next person straight into that account.
  function goToPortal() {
    logout()
    navigate('/login')
  }

  return (
    <div className="landing-page">
      <header className="landing-topbar">
        <button type="button" className="admin-link" onClick={goToPortal}>Portal</button>
      </header>

      <main className="landing-main">
        <div className="landing-brand">
          <img src={logo} alt="Clock It — Authenticate. Secure. Trust." className="landing-logo" />
        </div>

        <div className="landing-content">
          <h1 className="landing-headline">Your Identity. Secured Every Time.</h1>

          <div className="landing-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setPendingMode('checkin')}
            >
              Check In
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPendingMode('checkout')}
            >
              Check Out
            </button>
          </div>

          <Link to="/personal-history" className="landing-history-link">
            Already checked in? <span>view your personal history</span>
          </Link>
        </div>
      </main>

      {pendingMode && (
        <AuthMethodModal
          mode={pendingMode}
          onSelect={handleSelectMethod}
          onClose={() => setPendingMode(null)}
        />
      )}
    </div>
  )
}

export default Landing
