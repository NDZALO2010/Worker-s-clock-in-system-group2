import { useEffect, useState } from "react";
import * as ipAccess from "../../api/ipAccess";
import { extractErrorMessage } from "../../api/client";
import "./IpAccess.css";

export default function IpAccess() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        ipAccess
            .list()
            .then(setLogs)
            .catch((err) => setError(extractErrorMessage(err, "Failed to load IP access logs.")))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="ipa-page">
            <h1 className="ipa-title">IP Access Logs</h1>

            {error && <p className="ipa-message">{error}</p>}

            <div className="ipa-card">
                {loading ? (
                    <p className="ipa-empty">Loading IP access logs...</p>
                ) : logs.length === 0 ? (
                    <p className="ipa-empty">No login attempts recorded.</p>
                ) : (
                    <div className="ipa-table-wrapper">
                        <table className="ipa-table">
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
