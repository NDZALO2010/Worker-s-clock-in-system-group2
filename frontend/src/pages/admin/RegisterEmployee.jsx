import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as auth from "../../api/auth";
import * as faces from "../../api/faces";
import { extractErrorMessage } from "../../api/client";
import "./RegisterEmployee.css";

const EMPTY_FORM = {
    employeeNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "Employee",
    supervisorId: "",
    isActive: true,
    consentGranted: false,
};

const ROLES = ["Employee", "Supervisor", "Admin", "HR"];

const STEPS = [
    { key: "details", label: "Personal details" },
    { key: "face", label: "Face enrollment" },
    { key: "done", label: "Done" },
];

function waitForVideoReady(video, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        (function poll() {
            if (video?.videoWidth) {
                resolve();
            } else if (Date.now() - start > timeoutMs) {
                reject(new Error("Camera feed is not ready yet."));
            } else {
                setTimeout(poll, 100);
            }
        })();
    });
}

function CheckIcon() {
    return (
        <svg viewBox="0 0 80 80" className="reg-popup-icon" aria-hidden="true">
            <circle cx="40" cy="40" r="38" className="reg-popup-icon__ring" />
            <path
                d="M24 41l10 10 22-24"
                fill="none"
                stroke="#fff"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function CameraFeed({ videoRef, onError }) {
    useEffect(() => {
        let stream;
        let cancelled = false;

        async function start() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                onError?.(err);
            }
        }

        start();

        return () => {
            cancelled = true;
            stream?.getTracks().forEach((t) => t.stop());
        };
    }, [videoRef, onError]);

    return <video ref={videoRef} autoPlay playsInline muted className="reg-camera-feed" />;
}

export default function RegisterEmployee() {
    const navigate = useNavigate();

    const [stepIndex, setStepIndex] = useState(0);
    const step = STEPS[stepIndex].key;

    // Step 1: personal details
    const [form, setForm] = useState(EMPTY_FORM);
    const [detailsError, setDetailsError] = useState("");
    const [savingDetails, setSavingDetails] = useState(false);
    const [createdEmployee, setCreatedEmployee] = useState(null);

    // Step 2: face enrollment
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [cameraError, setCameraError] = useState(false);
    const [faceStatus, setFaceStatus] = useState("idle"); // idle | scanning | success | error
    const [faceError, setFaceError] = useState("");
    const [showFaceSuccessPopup, setShowFaceSuccessPopup] = useState(false);

    function handleChange(event) {
        const { name, value, type, checked } = event.target;
        setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    }

    async function handleDetailsSubmit(event) {
        event.preventDefault();
        setDetailsError("");

        if (!form.consentGranted) {
            setDetailsError("Employee consent for biometric data capture is required to continue.");
            return;
        }

        setSavingDetails(true);
        try {
            const result = await auth.createUser({
                employeeNumber: form.employeeNumber,
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                password: form.password,
                role: form.role,
                supervisorId: form.supervisorId || null,
                isActive: form.isActive,
                popiaConsentGranted: true,
            });

            // Grant is idempotent server-side; createUser already persisted consent = true.
            setCreatedEmployee({
                employeeId: result.employeeId,
                firstName: form.firstName,
                lastName: form.lastName,
                employeeNumber: form.employeeNumber,
            });
            setStepIndex(1);
        } catch (err) {
            setDetailsError(extractErrorMessage(err, "Failed to create employee."));
        } finally {
            setSavingDetails(false);
        }
    }

    const captureFaceBlob = useCallback(() => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return Promise.resolve(null);

        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9));
    }, []);

    const runFaceCapture = useCallback(async () => {
        setFaceStatus("scanning");
        setFaceError("");
        try {
            await waitForVideoReady(videoRef.current);
            const blob = await captureFaceBlob();
            if (!blob) {
                throw new Error("Camera feed is not ready yet.");
            }
            await faces.registerFace(createdEmployee.employeeId, blob);
            setFaceStatus("success");
            setShowFaceSuccessPopup(true);
        } catch (err) {
            setFaceError(extractErrorMessage(err, "Face registration failed."));
            setFaceStatus("error");
        }
    }, [captureFaceBlob, createdEmployee]);

    // Automatically scan and register the employee's face as soon as the camera
    // is available, mirroring the check-in/check-out scan flow (no manual button).
    useEffect(() => {
        if (step === "face" && createdEmployee && faceStatus === "idle" && !cameraError) {
            runFaceCapture();
        }
    }, [step, createdEmployee, faceStatus, cameraError, runFaceCapture]);

    // Auto-dismiss the success pop-up after a few seconds; the success panel
    // beneath it (with Retake/Continue actions) remains visible.
    useEffect(() => {
        if (!showFaceSuccessPopup) return;
        const timer = setTimeout(() => setShowFaceSuccessPopup(false), 2500);
        return () => clearTimeout(timer);
    }, [showFaceSuccessPopup]);

    return (
        <div className="reg-page">
            <div className="reg-header">
                <h1>Register Employee</h1>
                <button type="button" className="reg-btn-link" onClick={() => navigate("/admin/employees")}>
                    Back to employees
                </button>
            </div>

            <ol className="reg-steps">
                {STEPS.map((s, index) => (
                    <li
                        key={s.key}
                        className={
                            "reg-step" +
                            (index === stepIndex ? " reg-step--active" : "") +
                            (index < stepIndex ? " reg-step--done" : "")
                        }
                    >
                        <span className="reg-step-dot">{index < stepIndex ? "✓" : index + 1}</span>
                        <span>{s.label}</span>
                    </li>
                ))}
            </ol>

            {step === "details" && (
                <form className="reg-card" onSubmit={handleDetailsSubmit}>
                    <h2 className="reg-card-title">Personal details</h2>
                    {detailsError && <p className="reg-message reg-message--error">{detailsError}</p>}
                    <div className="reg-form-grid">
                        <label className="reg-field">
                            <span>Employee number</span>
                            <input name="employeeNumber" value={form.employeeNumber} onChange={handleChange} required />
                        </label>
                        <label className="reg-field">
                            <span>First name</span>
                            <input name="firstName" value={form.firstName} onChange={handleChange} required />
                        </label>
                        <label className="reg-field">
                            <span>Last name</span>
                            <input name="lastName" value={form.lastName} onChange={handleChange} required />
                        </label>
                        <label className="reg-field">
                            <span>Email</span>
                            <input type="email" name="email" value={form.email} onChange={handleChange} required />
                        </label>
                        <label className="reg-field">
                            <span>Password</span>
                            <input type="password" name="password" value={form.password} onChange={handleChange} required />
                        </label>
                        <label className="reg-field">
                            <span>Role</span>
                            <select name="role" value={form.role} onChange={handleChange}>
                                {ROLES.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="reg-field">
                            <span>Supervisor employee number (optional)</span>
                            <input name="supervisorId" value={form.supervisorId} onChange={handleChange} />
                        </label>
                        <label className="reg-field reg-field--checkbox">
                            <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
                            <span>Active</span>
                        </label>
                    </div>

                    <label className="reg-consent">
                        <input type="checkbox" name="consentGranted" checked={form.consentGranted} onChange={handleChange} />
                        <span>
                            The employee has consented to the capture and storage of their biometric data for attendance
                            verification, in accordance with POPIA. This is required before facial enrollment.
                        </span>
                    </label>

                    <div className="reg-form-actions">
                        <button type="submit" className="reg-btn-primary" disabled={savingDetails}>
                            {savingDetails ? "Creating..." : "Create & continue to face enrollment"}
                        </button>
                    </div>
                </form>
            )}

            {step === "face" && createdEmployee && (
                <div className="reg-card">
                    <h2 className="reg-card-title">
                        Face enrollment for {createdEmployee.firstName} {createdEmployee.lastName}
                    </h2>
                    <p className="reg-hint">
                        Facial biometric enrollment is required so this employee can clock in and out. Position the face
                        clearly within the frame — it will be scanned and registered automatically.
                    </p>

                    <div className="reg-scan-frame">
                        <canvas ref={canvasRef} style={{ display: "none" }} />
                        {cameraError ? (
                            <p className="reg-camera-warning">
                                Camera unavailable — check your browser's camera permission.
                            </p>
                        ) : (
                            <CameraFeed videoRef={videoRef} onError={() => setCameraError(true)} />
                        )}
                    </div>

                    {faceStatus === "scanning" && !cameraError && (
                        <p className="reg-message reg-message--info">Scanning face, please hold still…</p>
                    )}

                    {faceStatus === "error" && (
                        <>
                            <p className="reg-message reg-message--error">{faceError}</p>
                            <div className="reg-form-actions">
                                <button type="button" className="reg-btn-primary" onClick={() => setFaceStatus("idle")}>
                                    Retry scan
                                </button>
                            </div>
                        </>
                    )}

                    {faceStatus === "success" && (
                        <>
                            <p className="reg-message reg-message--success">Face registered successfully.</p>
                            <div className="reg-form-actions">
                                <button type="button" className="reg-btn-cancel" onClick={() => setFaceStatus("idle")}>
                                    Retake
                                </button>
                                <button type="button" className="reg-btn-primary" onClick={() => setStepIndex(2)}>
                                    Continue
                                </button>
                            </div>
                        </>
                    )}

                    {showFaceSuccessPopup && (
                        <div className="reg-popup-overlay" role="alertdialog" aria-live="assertive">
                            <div className="reg-popup-card">
                                <CheckIcon />
                                <p className="reg-popup-title">Face recognized successfully</p>
                                <p className="reg-popup-subtitle">
                                    {createdEmployee.firstName} {createdEmployee.lastName}'s face was scanned and
                                    registered.
                                </p>
                                <button
                                    type="button"
                                    className="reg-btn-primary"
                                    onClick={() => setShowFaceSuccessPopup(false)}
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {step === "done" && createdEmployee && (
                <div className="reg-card">
                    <h2 className="reg-card-title">Employee registered</h2>
                    <ul className="reg-summary">
                        <li>
                            {createdEmployee.firstName} {createdEmployee.lastName} ({createdEmployee.employeeNumber})
                        </li>
                        <li>Face enrollment: {faceStatus === "success" ? "Complete" : "Not completed"}</li>
                    </ul>
                    <p className="reg-hint">
                        Fingerprint sign-in uses this employee's own device sensor, so it isn't set up here — once
                        they log in to their portal, they can register it from Settings.
                    </p>
                    <div className="reg-form-actions">
                        <button type="button" className="reg-btn-primary" onClick={() => navigate("/admin/employees")}>
                            Back to employees
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
