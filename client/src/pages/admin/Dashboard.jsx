import "./Dashboard.css";

const BAR_DATA = [
  { day: "M", value: 45, tone: "light" },
  { day: "T", value: 42, tone: "dark" },
  { day: "W", value: 30, tone: "light" },
  { day: "T", value: 48, tone: "dark" },
  { day: "F", value: 22, tone: "light" },
];

const GRID_LINES = [50, 40, 30, 20];

function AttendanceHealthChart() {
  const maxValue = 50;
  return (
    <div className="chart-card">
      <h2 className="card-title">Attendance Health</h2>
      <div className="bar-chart">
        <div className="bar-chart-grid">
          {GRID_LINES.map((line) => (
            <div key={line} className="grid-row">
              <span className="grid-label">{line}</span>
              <span className="grid-line" />
            </div>
          ))}
        </div>
        <div className="bar-chart-bars">
          {BAR_DATA.map((bar, i) => (
            <div className="bar-column" key={i}>
              <div
                className={"bar bar--" + bar.tone}
                style={{ height: `${(bar.value / maxValue) * 100}%` }}
              />
              <span className="bar-day">{bar.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DailyClockInCard() {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <h2 className="card-title">Daily ClockIn</h2>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#3a4fd6" strokeWidth="1.8">
          <circle cx="9" cy="8" r="3" />
          <path d="M4 19c1-3 3-4.5 5-4.5s4 1.5 5 4.5" strokeLinecap="round" />
          <path d="M16 6l2 2 3.2-3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="stat-subtitle">Tuesday</p>
      <p className="stat-value">45</p>
    </div>
  );
}

function TotalEmployeesCard() {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <h2 className="card-title">Total Employees</h2>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#3a4fd6" strokeWidth="1.8">
          <circle cx="8" cy="8" r="3" />
          <circle cx="16" cy="9" r="2.4" />
          <path d="M3 19c.8-3 2.8-4.5 5-4.5s4.2 1.5 5 4.5M14 15c1.6 0 3.4 1 4 3.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className="stat-value stat-value--solo">50</p>
    </div>
  );
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}

const GAUGE_SEGMENTS = [
  { start: -100, end: -42, color: "#12225a" },
  { start: -26, end: 26, color: "#4b5aea" },
  { start: 42, end: 100, color: "#12225a" },
];

function WeeklyAttendanceGauge({ percent }) {
  const cx = 150;
  const cy = 130;
  const r = 96;

  return (
    <div className="gauge-card">
      <h2 className="card-title">Weekly Attendance</h2>
      <div className="gauge-wrap">
        <svg viewBox="0 0 300 150" className="gauge-svg">
          {GAUGE_SEGMENTS.map((seg, i) => (
            <path
              key={i}
              d={describeArc(cx, cy, r, seg.start, seg.end)}
              fill="none"
              stroke={seg.color}
              strokeWidth="26"
              strokeLinecap="round"
            />
          ))}
        </svg>
        <span className="gauge-value">{percent}%</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="dashboard">
      <h1 className="dashboard-title">DashBoard</h1>
      <p className="dashboard-subtitle">Your Identity. Secured Every Time.</p>

      <div className="dashboard-grid">
        <div className="grid-chart">
          <AttendanceHealthChart />
        </div>
        <div className="grid-clockin">
          <DailyClockInCard />
        </div>
        <div className="grid-employees">
          <TotalEmployeesCard />
        </div>
        <div className="grid-gauge">
          <WeeklyAttendanceGauge percent="83,6" />
        </div>
      </div>
    </div>
  );
}
