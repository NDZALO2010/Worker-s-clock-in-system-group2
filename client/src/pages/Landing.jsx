import { Link, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import './Landing.css'

function Landing() {
  const navigate = useNavigate()

  return (
    <div className="landing-page">
      <header className="landing-topbar">
        <Link to="/login" className="admin-link">Admin Portal</Link>
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
              onClick={() => navigate('/scan', { state: { mode: 'checkin' } })}
            >
              Check In
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/scan', { state: { mode: 'checkout' } })}
            >
              Check Out
            </button>
          </div>

          <Link to="/personal-history" className="landing-history-link">
            Already checked in? <span>view your personal history</span>
          </Link>
        </div>
      </main>
    </div>
  )
}

export default Landing
