import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import logo from '../assets/logo.png'
import * as attendance from '../api/attendance'
import { extractErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import './PersonalHistory.css'

const STATUS_CLASS = {
    Completed: 'status-present',
    'In Progress': 'status-late',
    'Checked in late': 'status-late',
}

function formatHours(clockIn, clockOut) {
    if (!clockOut) return '--:--'
    const minutes = dayjs(clockOut).diff(dayjs(clockIn), 'minute')
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${String(mins).padStart(2, '0')}m`
}

function PersonalHistory() {
    const { employee } = useAuth()
    const [records, setRecords] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        attendance
            .getHistory()
            .then(setRecords)
            .catch((err) => setError(extractErrorMessage(err, 'Failed to load your attendance history.')))
            .finally(() => setLoading(false))
    }, [])

    const { weeklyTotal, completedRate } = useMemo(() => {
        const startOfWeek = dayjs().startOf('week')
        const thisWeek = records.filter((r) => dayjs(r.attendanceDate).isAfter(startOfWeek.subtract(1, 'second')))

        let totalMinutes = 0
        thisWeek.forEach((r) => {
            if (r.clockOut) {
                totalMinutes += dayjs(r.clockOut).diff(dayjs(r.clockIn), 'minute')
            }
        })
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60

        const completed = records.filter((r) => r.status === 'Completed')
        const rate = records.length ? Math.round((completed.length / records.length) * 100) : 0

        return { weeklyTotal: `${hours}h ${minutes}m`, completedRate: rate }
    }, [records])

    const name = employee ? `${employee.firstName} ${employee.lastName}` : ''

    return (
        <div className="summary-page">
            <header className="summary-header">
                <img src={logo} alt="Clock It — Authenticate. Secure. Trust." className="summary-logo" />
                <div className="summary-title-bar">
                    Attendance Summary : {name} ({employee?.employeeNumber})
                </div>
            </header>

            <main className="summary-main">
                <div className="summary-card">
                    {error && <p className="camera-warning">{error}</p>}

                    <table className="summary-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Day</th>
                                <th>Check in</th>
                                <th>Check out</th>
                                <th>Status</th>
                                <th>Total hours</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!loading && records.length === 0 && (
                                <tr>
                                    <td colSpan="6">No attendance records yet.</td>
                                </tr>
                            )}
                            {records.map((r) => (
                                <tr key={r.attendanceId}>
                                    <td>{dayjs(r.attendanceDate).format('DD MMM')}</td>
                                    <td>{dayjs(r.attendanceDate).format('ddd')}</td>
                                    <td>{dayjs(r.clockIn).format('HH:mm')}</td>
                                    <td>{r.clockOut ? dayjs(r.clockOut).format('HH:mm') : 'In progress'}</td>
                                    <td className={STATUS_CLASS[r.status]}>{r.status}</td>
                                    <td>{formatHours(r.clockIn, r.clockOut)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="summary-footer">
                        Weekly total&nbsp;&nbsp;:{weeklyTotal} | Completed sessions : {completedRate}&nbsp;%
                    </div>
                </div>

                <Link to="/" className="back-btn">Back</Link>
            </main>
        </div>
    )
}

export default PersonalHistory
