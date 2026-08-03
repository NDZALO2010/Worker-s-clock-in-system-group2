import { Navigate, Route, Routes } from "react-router-dom";

import Landing from "./pages/Landing";
import AttendanceSummary from "./pages/AttendanceSummary";
import AttendanceClock from "./components/AttendanceClock";

import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Settings from "./pages/admin/Settings";
import Employees from "./pages/admin/Employees";
import RegisterEmployee from "./pages/admin/RegisterEmployee";
import TeamStatus from "./pages/admin/TeamStatus";
import Notifications from "./pages/admin/Notifications";
import AuditLogs from "./pages/admin/AuditLogs";
import IpAccess from "./pages/admin/IpAccess";

import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import PersonalHistory from "./pages/PersonalHistory";

import { GuestOnlyRoute, ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
    return (
        <Routes>
            {/* Landing */}
            <Route path="/" element={<Landing />} />

            {/* Authentication */}
            <Route
                path="/login"
                element={
                    <GuestOnlyRoute>
                        <Login />
                    </GuestOnlyRoute>
                }
            />
            <Route
                path="/register"
                element={
                    <GuestOnlyRoute>
                        <Register />
                    </GuestOnlyRoute>
                }
            />

            {/* Check-in / check-out kiosk flow — biometric scan verifies identity, no login required */}
            <Route path="/scan" element={<AttendanceClock />} />

            {/* Attendance (any authenticated employee) */}
            <Route element={<ProtectedRoute />}>
                <Route path="/personal-history" element={<PersonalHistory />} />
            </Route>

            {/* Authenticated portal */}
            <Route element={<ProtectedRoute />}>
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="notifications" element={<Notifications />} />
                    <Route path="settings" element={<Settings />} />

                    <Route element={<ProtectedRoute roles={["Admin", "Supervisor", "HR"]} />}>
                        <Route path="attendance-summary" element={<AttendanceSummary />} />
                        <Route path="team-status" element={<TeamStatus />} />
                    </Route>

                    <Route element={<ProtectedRoute roles={["Admin"]} />}>
                        <Route path="employees" element={<Employees />} />
                        <Route path="employees/new" element={<RegisterEmployee />} />
                        <Route path="audit-logs" element={<AuditLogs />} />
                        <Route path="ip-access" element={<IpAccess />} />
                    </Route>
                </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
