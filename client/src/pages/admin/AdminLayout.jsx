import { NavLink, Link, Outlet } from "react-router-dom";
import logo from "../../assets/logo.png";
import "./AdminLayout.css";

const ADMIN_NAME = "Bokang Ngwetjana";
const ADMIN_EMAIL = "beekay@gmail.com";

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function SummaryIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" strokeLinecap="round" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="12" r="2" />
      <path d="M15 10h3M15 14h3M6 16.5c.7-1.3 1.9-2 3-2s2.3.7 3 2" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 3v2M12 19v2M4.2 6.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 17.8l1.4-1.4M18.4 5.6l1.4-1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="11" />
      <circle cx="12" cy="10" r="3.4" />
      <path d="M5.5 19c1.4-2.6 3.8-4 6.5-4s5.1 1.4 6.5 4" strokeLinecap="round" />
    </svg>
  );
}

const NAV_ITEMS = [
  { to: "/admin", end: true, label: "Dashboard", icon: DashboardIcon },
  { to: "/admin/attendance-summary", label: "Attendace Summary", icon: SummaryIcon },
  { to: "/admin/manage-account", label: "Manage Account", icon: AccountIcon },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

export default function AdminLayout() {
  const firstName = ADMIN_NAME.split(" ")[0];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src={logo} alt="Clock It — Authenticate. Secure. Trust." className="admin-logo" />
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => "admin-nav-link" + (isActive ? " is-active" : "")}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <Link to="/" className="admin-logout">
          <LogoutIcon />
          <span>LogOut</span>
        </Link>
      </aside>

      <div className="admin-content">
        <header className="admin-topbar">
          <h1 className="admin-greeting">Hello {firstName}</h1>
          <div className="admin-user">
            <UserIcon />
            <div className="admin-user-info">
              <span className="admin-user-name">{ADMIN_NAME}</span>
              <span className="admin-user-email">{ADMIN_EMAIL}</span>
            </div>
          </div>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
