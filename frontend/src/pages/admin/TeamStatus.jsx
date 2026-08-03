import { useEffect, useState } from "react";
import * as auth from "../../api/auth";
import * as attendance from "../../api/attendance";
import { extractErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import "./TeamStatus.css";

const STATUS_CLASS = {
    "Clocked In": "ts-status-in",
    "Checked in late": "ts-status-late",
    "Clocked Out": "ts-status-out",
    Absent: "ts-status-absent",
    "Day Off": "ts-status-dayoff",
};

export default function TeamStatus() {
    const { employee, hasRole } = useAuth();
    const isAdmin = hasRole("Admin");

    const [supervisors, setSupervisors] = useState([]);
    const [selectedSupervisorId, setSelectedSupervisorId] = useState("");
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const activeSupervisorId = isAdmin ? selectedSupervisorId : employee?.employeeId;

    useEffect(() => {
        if (!isAdmin) return;
        auth
            .listUsers()
            .then((data) => setSupervisors(data.filter((e) => e.role === "Supervisor")))
            .catch(() => setSupervisors([]));
    }, [isAdmin]);

    useEffect(() => {
        if (!activeSupervisorId) return;
        attendance
            .getTeamStatus(activeSupervisorId)
            .then(setTeam)
            .catch((err) => setError(extractErrorMessage(err, "Failed to load team status.")))
            .finally(() => setLoading(false));
    }, [activeSupervisorId]);

    return (
        <div className="ts-page">
            <div className="ts-header">
                <h1>Team Status</h1>
                {isAdmin && (
                    <select
                        className="ts-select"
                        value={selectedSupervisorId}
                        onChange={(event) => setSelectedSupervisorId(event.target.value)}
                    >
                        <option value="">Select a supervisor</option>
                        {supervisors.map((s) => (
                            <option key={s.employeeId} value={s.employeeId}>
                                {s.firstName} {s.lastName} ({s.employeeNumber})
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {error && <p className="ts-message">{error}</p>}

            <div className="ts-card">
                {!activeSupervisorId ? (
                    <p className="ts-empty">Choose a supervisor to view their team.</p>
                ) : loading ? (
                    <p className="ts-empty">Loading team status...</p>
                ) : team.length === 0 ? (
                    <p className="ts-empty">No team members found.</p>
                ) : (
                    <div className="ts-table-wrapper">
                        <table className="ts-table">
                            <thead>
                                <tr>
                                    <th>Emp #</th>
                                    <th>Name</th>
                                    <th>Status</th>
                                    <th>Clock-in time</th>
                                    <th>Confidence</th>
                                </tr>
                            </thead>
                            <tbody>
                                {team.map((member) => (
                                    <tr key={member.employeeId}>
                                        <td>{member.employeeNumber}</td>
                                        <td>{member.fullName}</td>
                                        <td className={STATUS_CLASS[member.status] || ""}>{member.status}</td>
                                        <td>
                                            {member.clockInTime
                                                ? new Date(member.clockInTime).toLocaleTimeString()
                                                : "--:--"}
                                        </td>
                                        <td>
                                            {member.similarityScore != null
                                                ? `${Math.round(member.similarityScore * 100)}%`
                                                : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
