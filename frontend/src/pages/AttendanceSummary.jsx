import { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaSearch } from "react-icons/fa";
import { Link } from "react-router-dom";
import dayjs from "dayjs";

import logo from "../assets/logo.png";
import * as reports from "../api/reports";
import * as attendance from "../api/attendance";
import { extractErrorMessage } from "../api/client";
import "./AttendanceSummary.css";

const STATUS_CLASS = {
    Late: "status-late",
    Present: "status-present",
};

function formatHours(totalHoursWorked) {
    const hours = Math.floor(totalHoursWorked);
    const minutes = Math.round((totalHoursWorked - hours) * 60);
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function AttendanceSummary() {
    const [searchTerm, setSearchTerm] = useState("");
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        reports
            .generateReport()
            .then(setRecords)
            .catch((err) => setError(extractErrorMessage(err, "Failed to load attendance records.")))
            .finally(() => setLoading(false));
    }, []);

    const filteredRecords = useMemo(() => {
        const searchValue = searchTerm.trim().toLowerCase();
        if (!searchValue) return records;

        return records.filter((record) =>
            [record.employeeNumber, record.employeeName, record.date, record.isLate ? "Late" : "Present"].some(
                (value) => String(value).toLowerCase().includes(searchValue),
            ),
        );
    }, [records, searchTerm]);

    async function handleExportCsv() {
        setExporting(true);
        setError("");
        try {
            const startDate = dayjs().startOf("month").format("YYYY-MM-DD");
            const endDate = dayjs().format("YYYY-MM-DD");
            const blob = await attendance.exportPayrollCsv(startDate, endDate);

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Payroll_Attendance_${startDate}_to_${endDate}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(extractErrorMessage(err, "Failed to export payroll CSV."));
        } finally {
            setExporting(false);
        }
    }

    return (
        <main className="attendance-sheet-page">
            <section className="attendance-sheet-container">
                <header className="attendance-sheet-header">
                    <img
                        src={logo}
                        alt="Clock It - Authenticate, Secure, Trust"
                        className="attendance-sheet-logo"
                    />

                    <h1>Attendance Sheet</h1>
                </header>

                <section className="attendance-sheet-content">
                    {error && <p className="no-records-message">{error}</p>}

                    <div className="attendance-search-wrapper">
                        <FaSearch className="attendance-search-icon" aria-hidden="true" />

                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search"
                            aria-label="Search attendance records"
                        />
                    </div>

                    <button
                        type="button"
                        className="attendance-back-link"
                        onClick={handleExportCsv}
                        disabled={exporting}
                        style={{ border: "none", background: "none", cursor: "pointer", marginBottom: 16 }}
                    >
                        <span>{exporting ? "Exporting..." : "Export payroll CSV"}</span>
                    </button>

                    <div className="attendance-table-wrapper">
                        <table className="attendance-sheet-table">
                            <thead>
                                <tr>
                                    <th>EMP ID</th>
                                    <th>EMP Full Names</th>
                                    <th>Date</th>
                                    <th>Day</th>
                                    <th>Check in</th>
                                    <th>Check out</th>
                                    <th>Status</th>
                                    <th>Total hours</th>
                                </tr>
                            </thead>

                            <tbody>
                                {!loading && filteredRecords.length > 0 ? (
                                    filteredRecords.map((record) => (
                                        <tr key={`${record.employeeNumber}-${record.date}-${record.clockIn}`}>
                                            <td>{record.employeeNumber}</td>
                                            <td className="employee-name-cell">{record.employeeName}</td>
                                            <td>{dayjs(record.date).format("DD MMM")}</td>
                                            <td>{dayjs(record.date).format("ddd")}</td>
                                            <td>{record.clockIn}</td>
                                            <td>{record.clockOut === "N/A" ? "In progress" : record.clockOut}</td>
                                            <td className={STATUS_CLASS[record.isLate ? "Late" : "Present"]}>
                                                {record.isLate ? "Late" : "Present"}
                                            </td>
                                            <td>
                                                {record.clockOut === "N/A"
                                                    ? "--:--"
                                                    : formatHours(record.totalHoursWorked)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td className="no-records-message" colSpan="8">
                                            {loading ? "Loading attendance records..." : "No attendance records found."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Link to="/admin" className="attendance-back-link">
                        <span>Back</span>
                        <FaArrowLeft aria-hidden="true" />
                    </Link>
                </section>
            </section>
        </main>
    );
}

export default AttendanceSummary;
