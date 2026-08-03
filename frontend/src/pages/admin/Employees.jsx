import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as auth from "../../api/auth";
import { extractErrorMessage } from "../../api/client";
import "./Employees.css";

const EMPTY_FORM = {
    employeeNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "Employee",
    supervisorId: "",
    isActive: true,
};

const ROLES = ["Employee", "Supervisor", "Admin", "HR"];

export default function Employees() {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await auth.listUsers();
            setEmployees(data);
        } catch (err) {
            setError(extractErrorMessage(err, "Failed to load employees."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        auth
            .listUsers()
            .then(setEmployees)
            .catch((err) => setError(extractErrorMessage(err, "Failed to load employees.")))
            .finally(() => setLoading(false));
    }, []);

    function handleChange(event) {
        const { name, value, type, checked } = event.target;
        setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    }

    function openEditForm(employee) {
        setEditingId(employee.employeeId);
        setForm({
            employeeNumber: employee.employeeNumber,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            password: "",
            role: employee.role,
            supervisorId: employee.supervisorId || "",
            isActive: employee.isActive,
        });
        setMessage("");
        setFormOpen(true);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");
        setMessage("");

        try {
            await auth.updateUser(editingId, {
                employeeNumber: form.employeeNumber,
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                password: form.password || null,
                role: form.role,
                supervisorId: form.supervisorId || null,
                isActive: form.isActive,
            });
            setMessage("Employee updated successfully.");
            setFormOpen(false);
            await load();
        } catch (err) {
            setError(extractErrorMessage(err, "Failed to save employee."));
        } finally {
            setSaving(false);
        }
    }

    async function handleDeactivate(employee) {
        if (!window.confirm(`Deactivate ${employee.firstName} ${employee.lastName}?`)) return;
        setError("");
        setMessage("");
        try {
            await auth.deactivateUser(employee.employeeId);
            setMessage("Employee deactivated.");
            await load();
        } catch (err) {
            setError(extractErrorMessage(err, "Failed to deactivate employee."));
        }
    }

    async function handleActivate(employee) {
        setError("");
        setMessage("");
        try {
            await auth.activateUser(employee.employeeId);
            setMessage("Employee activated.");
            await load();
        } catch (err) {
            setError(extractErrorMessage(err, "Failed to activate employee."));
        }
    }

    async function handleDelete(employee) {
        if (
            !window.confirm(
                `Permanently delete ${employee.firstName} ${employee.lastName}? This removes their account, attendance history, and biometric data, and cannot be undone.`,
            )
        )
            return;
        setError("");
        setMessage("");
        try {
            await auth.deleteUser(employee.employeeId);
            setMessage("Employee deleted.");
            await load();
        } catch (err) {
            setError(extractErrorMessage(err, "Failed to delete employee."));
        }
    }

    async function handleEraseBiometrics(employee) {
        if (
            !window.confirm(
                `Erase all biometric data for ${employee.firstName} ${employee.lastName}? This cannot be undone.`,
            )
        )
            return;
        setError("");
        setMessage("");
        try {
            await auth.eraseBiometricData(employee.employeeId);
            setMessage("Biometric data erased.");
        } catch (err) {
            setError(extractErrorMessage(err, "Failed to erase biometric data."));
        }
    }

    function supervisorName(supervisorId) {
        const supervisor = employees.find((e) => e.employeeId === supervisorId);
        return supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : "—";
    }

    return (
        <div className="emp-page">
            <div className="emp-header">
                <h1>Employees</h1>
                <button type="button" className="emp-btn-primary" onClick={() => navigate("/admin/employees/new")}>
                    Add Employee
                </button>
            </div>

            {error && <p className="emp-message emp-message--error">{error}</p>}
            {message && <p className="emp-message emp-message--success">{message}</p>}

            {formOpen && (
                <form className="emp-card emp-form" onSubmit={handleSubmit}>
                    <h2 className="emp-form-title">Edit Employee</h2>
                    <div className="emp-form-grid">
                        <label className="emp-field">
                            <span>Employee number</span>
                            <input name="employeeNumber" value={form.employeeNumber} onChange={handleChange} required />
                        </label>
                        <label className="emp-field">
                            <span>First name</span>
                            <input name="firstName" value={form.firstName} onChange={handleChange} required />
                        </label>
                        <label className="emp-field">
                            <span>Last name</span>
                            <input name="lastName" value={form.lastName} onChange={handleChange} required />
                        </label>
                        <label className="emp-field">
                            <span>Email</span>
                            <input type="email" name="email" value={form.email} onChange={handleChange} required />
                        </label>
                        <label className="emp-field">
                            <span>New password (optional)</span>
                            <input type="password" name="password" value={form.password} onChange={handleChange} />
                        </label>
                        <label className="emp-field">
                            <span>Role</span>
                            <select name="role" value={form.role} onChange={handleChange}>
                                {ROLES.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="emp-field">
                            <span>Supervisor employee number (optional)</span>
                            <input name="supervisorId" value={form.supervisorId} onChange={handleChange} />
                        </label>
                        <label className="emp-field emp-field--checkbox">
                            <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
                            <span>Active</span>
                        </label>
                    </div>
                    <div className="emp-form-actions">
                        <button type="submit" className="emp-btn-primary" disabled={saving}>
                            {saving ? "Saving..." : "Save"}
                        </button>
                        <button type="button" className="emp-btn-cancel" onClick={() => setFormOpen(false)}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <div className="emp-card">
                {loading ? (
                    <p className="emp-empty">Loading employees...</p>
                ) : employees.length === 0 ? (
                    <p className="emp-empty">No employees found.</p>
                ) : (
                    <div className="emp-table-wrapper">
                        <table className="emp-table">
                            <thead>
                                <tr>
                                    <th>Emp #</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Supervisor</th>
                                    <th>Active</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((employee) => (
                                    <tr key={employee.employeeId}>
                                        <td>{employee.employeeNumber}</td>
                                        <td>
                                            {employee.firstName} {employee.lastName}
                                        </td>
                                        <td>{employee.email}</td>
                                        <td>{employee.role}</td>
                                        <td>{supervisorName(employee.supervisorId)}</td>
                                        <td>{employee.isActive ? "Yes" : "No"}</td>
                                        <td className="emp-actions">
                                            <button type="button" onClick={() => openEditForm(employee)}>
                                                Edit
                                            </button>
                                            {employee.isActive ? (
                                                <button type="button" onClick={() => handleDeactivate(employee)}>
                                                    Deactivate
                                                </button>
                                            ) : (
                                                <button type="button" onClick={() => handleActivate(employee)}>
                                                    Activate
                                                </button>
                                            )}
                                            <button type="button" onClick={() => handleEraseBiometrics(employee)}>
                                                Erase biometrics
                                            </button>
                                            <button type="button" className="emp-btn-danger" onClick={() => handleDelete(employee)}>
                                                Delete
                                            </button>
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
