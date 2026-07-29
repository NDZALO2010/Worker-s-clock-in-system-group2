import { Navigate, Route, Routes } from "react-router-dom";

import Landing from "./pages/Landing";
import AttendanceSummary from "./pages/AttendanceSummary";
import AttendanceClock from "./components/AttendanceClock";
import RegisterFace from "./components/RegisterFace";

import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Settings from "./pages/admin/Settings";

import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";

export default function App() {
    return (
        <Routes>
            {/* Landing */}
            <Route path="/" element={<Landing />} />

            {/* Authentication */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Attendance */}
            <Route path="/scan" element={<AttendanceClock />} />
            <Route
                path="/attendance-summary"
                element={<AttendanceSummary />}
            />

            {/* Admin */}
            <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="manage-account" element={<RegisterFace />} />
                <Route
                    path="attendance-summary"
                    element={<AttendanceSummary />}
                />
                <Route path="settings" element={<Settings />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}