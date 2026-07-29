import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/logo.png'
import './AttendanceSummary.css'

const RECORDS = [
  { date: '20 Jul', day: 'Mon', checkIn: '09:25', checkOut: '16:02', status: 'Late', hours: '6h 37m' },
  { date: '21 Jul', day: 'Tue', checkIn: '07:55', checkOut: '16:05', status: 'Present', hours: '8h 10m' },
  { date: '22 Jul', day: 'Wed', checkIn: '08:02', checkOut: '16:10', status: 'Present', hours: '8h 08m' },
  { date: '23 Jul', day: 'Thu', checkIn: '--:--', checkOut: '--:--', status: 'Absent', hours: '--:--' },
  { date: '24 Jul', day: 'Fri', checkIn: '07:58', checkOut: 'In progress', status: 'Present', hours: '--:--' },
]

const STATUS_CLASS = {
  Late: 'status-late',
  Present: 'status-present',
  Absent: 'status-absent',
}

function AttendanceSummary() {
  const name = 'Thabiso Bosetsi'
  const employeeId = '222946276'

  const { weeklyTotal, onTimeRate } = useMemo(() => {
    const daysWithHours = RECORDS.filter((r) => r.hours !== '--:--')
    let totalMinutes = 0
    daysWithHours.forEach((r) => {
      const match = r.hours.match(/(\d+)h\s*(\d+)m/)
      if (match) totalMinutes += Number(match[1]) * 60 + Number(match[2])
    })
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    const trackedDays = RECORDS.filter((r) => r.status !== 'Absent')
    const onTimeDays = trackedDays.filter((r) => r.status === 'Present')
    const rate = trackedDays.length
      ? Math.round((onTimeDays.length / trackedDays.length) * 100)
      : 0

    return { weeklyTotal: `${hours}h ${minutes}m`, onTimeRate: rate }
  }, [])

  return (
    <div className="summary-page">
      <header className="summary-header">
        <img src={logo} alt="Clock It — Authenticate. Secure. Trust." className="summary-logo" />
        <div className="summary-title-bar">
          Attendance Summary : {name} ({employeeId})
        </div>
      </header>

      <main className="summary-main">
        <div className="summary-card">
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
              {RECORDS.map((r) => (
                <tr key={r.date}>
                  <td>{r.date}</td>
                  <td>{r.day}</td>
                  <td>{r.checkIn}</td>
                  <td>{r.checkOut}</td>
                  <td className={STATUS_CLASS[r.status]}>{r.status}</td>
                  <td>{r.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="summary-footer">
            Weekly total&nbsp;&nbsp;:{weeklyTotal} | On time rate : {onTimeRate}&nbsp;%
          </div>
        </div>

        <Link to="/" className="back-btn">Back</Link>
      </main>
    </div>
  )
}

export default AttendanceSummary
