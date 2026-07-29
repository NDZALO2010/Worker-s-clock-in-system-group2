import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import AttendanceSummary from './pages/AttendanceSummary.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/attendance-summary" element={<AttendanceSummary />} />
    </Routes>
  )
}

export default App
