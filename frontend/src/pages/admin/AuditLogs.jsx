import { useEffect, useState } from "react";
import * as auditLogs from "../../api/auditLogs";
import { extractErrorMessage } from "../../api/client";
import "./AuditLogs.css";

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        auditLogs
            .list()
            .then(setLogs)
            .catch((err) => setError(extractErrorMessage(err, "Failed to load audit logs.")))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="aud-page">
            <h1 className="aud-title">Audit Logs</h1>

            {error && <p className="aud-message">{error}</p>}

            <div className="aud-card">
                {loading ? (
                    <p className="aud-empty">Loading audit logs...</p>
                ) : logs.length === 0 ? (
                    <p className="aud-empty">No audit log entries found.</p>
                ) : (
                    <div className="aud-table-wrapper">
                        <table className="aud-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Action</th>
                                    <th>Performed by</th>
                                    <th>IP address</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.auditLogId}>
                                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                                        <td>{log.action}</td>
                                        <td>{log.performedBy}</td>
                                        <td>{log.ipAddress}</td>
                                        <td>{log.details}</td>
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
