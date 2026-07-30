import { useMemo, useState } from "react";
import { FaArrowLeft, FaSearch } from "react-icons/fa";
import { Link } from "react-router-dom";

import logo from "../assets/logo.png";
import "./AttendanceSummary.css";
import "./admin/Dashboard.jsx"

const RECORDS = [
    {
        employeeId: "336001",
        employeeName: "Bokang Ngwetjana",
        date: "20 Jul",
        day: "Mon",
        checkIn: "09:25",
        checkOut: "16:02",
        status: "Late",
        hours: "6h 37m",
    },
    {
        employeeId: "336002",
        employeeName: "Thobile Nsima",
        date: "21 Jul",
        day: "Tue",
        checkIn: "07:55",
        checkOut: "16:05",
        status: "Present",
        hours: "8h 10m",
    },
    {
        employeeId: "336003",
        employeeName: "Retang Maloma",
        date: "22 Jul",
        day: "Wed",
        checkIn: "08:02",
        checkOut: "16:10",
        status: "Present",
        hours: "8h 08m",
    },
    {
        employeeId: "336004",
        employeeName: "Bonolo Mokgwadi",
        date: "23 Jul",
        day: "Thu",
        checkIn: "--:--",
        checkOut: "--:--",
        status: "Absent",
        hours: "--:--",
    },
    {
        employeeId: "336005",
        employeeName: "Hellen Anna",
        date: "24 Jul",
        day: "Fri",
        checkIn: "07:58",
        checkOut: "In progress",
        status: "Present",
        hours: "--:--",
    },
];

const STATUS_CLASS = {
    Late: "status-late",
    Present: "status-present",
    Absent: "status-absent",
};

function AttendanceSummary() {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredRecords = useMemo(() => {
        const searchValue = searchTerm.trim().toLowerCase();

        if (!searchValue) {
            return RECORDS;
        }

        return RECORDS.filter((record) =>
            [
                record.employeeId,
                record.employeeName,
                record.date,
                record.day,
                record.status,
            ].some((value) => value.toLowerCase().includes(searchValue)),
        );
    }, [searchTerm]);

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
                                {filteredRecords.length > 0 ? (
                                    filteredRecords.map((record) => (
                                        <tr
                                            key={`${record.employeeId}-${record.date}`}
                                        >
                                            <td>{record.employeeId}</td>
                                            <td className="employee-name-cell">
                                                {record.employeeName}
                                            </td>
                                            <td>{record.date}</td>
                                            <td>{record.day}</td>
                                            <td>{record.checkIn}</td>
                                            <td>{record.checkOut}</td>
                                            <td className={STATUS_CLASS[record.status]}>
                                                {record.status}
                                            </td>
                                            <td>{record.hours}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td className="no-records-message" colSpan="8">
                                            No attendance records found.
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