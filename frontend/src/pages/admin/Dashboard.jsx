import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "./Dashboard.css";
import * as reports from "../../api/reports";
import * as auth from "../../api/auth";
import * as attendance from "../../api/attendance";
import { useAuth } from "../../context/AuthContext";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F"];
const WEEKDAY_TONES = ["light", "dark", "light", "dark", "light"];

function weekdayBars(entries, dateGetter, valueReducer) {
    const startOfWeek = dayjs().startOf("week").add(1, "day"); // Monday
    return WEEKDAY_LABELS.map((label, index) => {
        const day = startOfWeek.add(index, "day");
        const dayEntries = entries.filter((entry) => dayjs(dateGetter(entry)).isSame(day, "day"));
        return { day: label, tone: WEEKDAY_TONES[index], value: valueReducer(dayEntries) };
    });
}

function AttendanceHealthChart({ bars }) {
    const maxValue = Math.max(...bars.map((b) => b.value), 1);
    const gridLines = [1, 0.8, 0.6, 0.4].map((f) => Math.round(maxValue * f));

    return (
        <div className="chart-card">
            <h2 className="card-title">Attendance Health</h2>
            <div className="bar-chart">
                <div className="bar-chart-grid">
                    {gridLines.map((line, i) => (
                        <div key={i} className="grid-row">
                            <span className="grid-label">{line}</span>
                            <span className="grid-line" />
                        </div>
                    ))}
                </div>
                <div className="bar-chart-bars">
                    {bars.map((bar, i) => (
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

function DailyClockInCard({ title, subtitle, value }) {
    return (
        <div className="stat-card">
            <div className="stat-card-header">
                <h2 className="card-title">{title}</h2>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#3a4fd6" strokeWidth="1.8">
                    <circle cx="9" cy="8" r="3" />
                    <path d="M4 19c1-3 3-4.5 5-4.5s4 1.5 5 4.5" strokeLinecap="round" />
                    <path d="M16 6l2 2 3.2-3.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            <p className="stat-subtitle">{subtitle}</p>
            <p className="stat-value">{value}</p>
        </div>
    );
}

function TotalEmployeesCard({ title, value }) {
    return (
        <div className="stat-card">
            <div className="stat-card-header">
                <h2 className="card-title">{title}</h2>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#3a4fd6" strokeWidth="1.8">
                    <circle cx="8" cy="8" r="3" />
                    <circle cx="16" cy="9" r="2.4" />
                    <path d="M3 19c.8-3 2.8-4.5 5-4.5s4.2 1.5 5 4.5M14 15c1.6 0 3.4 1 4 3.5" strokeLinecap="round" />
                </svg>
            </div>
            <p className="stat-value stat-value--solo">{value}</p>
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
    const { employee, hasRole } = useAuth();
    const isAdmin = hasRole("Admin");
    const isSupervisor = hasRole("Supervisor", "HR");

    const [weekReport, setWeekReport] = useState([]);
    const [totalEmployees, setTotalEmployees] = useState(null);
    const [teamStatus, setTeamStatus] = useState([]);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const startDate = dayjs().startOf("week").add(1, "day").format("YYYY-MM-DD");
        const endDate = dayjs().format("YYYY-MM-DD");

        if (isAdmin || isSupervisor) {
            reports.generateReport({ startDate, endDate }).then(setWeekReport).catch(() => setWeekReport([]));
        }
        if (isAdmin) {
            auth.listUsers().then((data) => setTotalEmployees(data.length)).catch(() => setTotalEmployees(null));
        }
        if (isSupervisor && employee) {
            attendance
                .getTeamStatus(employee.employeeId)
                .then(setTeamStatus)
                .catch(() => setTeamStatus([]));
        }
        if (!isAdmin && !isSupervisor) {
            attendance.getHistory().then(setHistory).catch(() => setHistory([]));
        }
    }, [isAdmin, isSupervisor, employee]);

    const bars = useMemo(() => {
        if (isAdmin || isSupervisor) {
            return weekdayBars(weekReport, (r) => r.date, (entries) => entries.length);
        }
        return weekdayBars(
            history,
            (r) => r.attendanceDate,
            (entries) =>
                entries.reduce((sum, r) => {
                    if (!r.clockOut) return sum;
                    return sum + dayjs(r.clockOut).diff(dayjs(r.clockIn), "minute") / 60;
                }, 0),
        );
    }, [isAdmin, isSupervisor, weekReport, history]);

    const onTimePercent = useMemo(() => {
        if (isAdmin || isSupervisor) {
            if (weekReport.length === 0) return 0;
            const onTime = weekReport.filter((r) => !r.isLate).length;
            return Math.round((onTime / weekReport.length) * 100);
        }
        if (history.length === 0) return 0;
        const completed = history.filter((r) => r.status === "Completed").length;
        return Math.round((completed / history.length) * 100);
    }, [isAdmin, isSupervisor, weekReport, history]);

    const today = dayjs().format("YYYY-MM-DD");
    const todaysCount = weekReport.filter((r) => r.date === today).length;

    let clockInTitle = "Today's Sessions";
    let clockInValue = todaysCount;
    let secondCardTitle = "Total Employees";
    let secondCardValue = totalEmployees ?? "—";

    if (isSupervisor) {
        secondCardTitle = "My Team";
        secondCardValue = teamStatus.length;
        clockInValue = teamStatus.filter((m) => m.status === "Clocked In" || m.status === "Checked in late").length;
    } else if (!isAdmin) {
        const todaysEntry = history.find((r) => dayjs(r.attendanceDate).isSame(dayjs(), "day"));
        clockInTitle = "Today";
        clockInValue = todaysEntry ? (todaysEntry.clockOut ? "Clocked out" : "Clocked in") : "Not yet";

        const weekMinutes = bars.reduce((sum, b) => sum + b.value, 0) * 60;
        secondCardTitle = "Hours This Week";
        secondCardValue = `${Math.floor(weekMinutes / 60)}h ${Math.round(weekMinutes % 60)}m`;
    }

    return (
        <div className="dashboard">
            <h1 className="dashboard-title">DashBoard</h1>
            <p className="dashboard-subtitle">Your Identity. Secured Every Time.</p>

            <div className="dashboard-grid">
                <div className="grid-chart">
                    <AttendanceHealthChart bars={bars} />
                </div>
                <div className="grid-clockin">
                    <DailyClockInCard title={clockInTitle} subtitle={dayjs().format("dddd")} value={clockInValue} />
                </div>
                <div className="grid-employees">
                    <TotalEmployeesCard title={secondCardTitle} value={secondCardValue} />
                </div>
                <div className="grid-gauge">
                    <WeeklyAttendanceGauge percent={onTimePercent} />
                </div>
            </div>
        </div>
    );
}
