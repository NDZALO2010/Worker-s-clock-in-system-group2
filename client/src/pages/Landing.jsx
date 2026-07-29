import { Link } from 'react-router-dom'
import logo from '../assets/logo.png'
import './Landing.css'

function Landing() {
  return (
    <div className="landing-page">
      <header className="landing-topbar">
        <Link to="/admin" className="admin-link">Admin Portal</Link>
      </header>

      <main className="landing-main">
        <div className="landing-brand">
          <img src={logo} alt="Clock It — Authenticate. Secure. Trust." className="landing-logo" />
        </div>

        <div className="landing-content">
          <h1 className="landing-headline">Your Identity. Secured Every Time.</h1>

          <div className="landing-actions">
            <button type="button" className="btn btn-primary">Check In</button>
            <button type="button" className="btn btn-secondary">Check Out</button>
          </div>

          <Link to="/attendance-summary" className="landing-history-link">
            Already checked in? <span>view your personal history</span>
          </Link>
        </div>
      </main>
    </div>
  )
}

export default Landing
