import { useCallback, useEffect, useState } from "react";
import * as auth from "../../api/auth";
import * as webauthnApi from "../../api/webauthn";
import { extractErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { isWebAuthnSupported, registerFingerprint } from "../../utils/webauthn";
import "./Settings.css";

function guessDeviceLabel() {
  const ua = navigator.userAgent || "";
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android device";
  if (/macintosh/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows PC";
  return "This device";
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M4 20l.9-3.6a2 2 0 0 1 .53-.95L16.4 4.5a1.5 1.5 0 0 1 2.12 0l1 1a1.5 1.5 0 0 1 0 2.12L8.55 18.57a2 2 0 0 1-.95.53L4 20z"
        stroke="#9CA3AF"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AvatarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="46" height="46" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.5" fill="#fff" />
      <path d="M4.5 20c1.2-4 4-6 7.5-6s6.3 2 7.5 6" fill="#fff" />
    </svg>
  );
}

function Field({ id, label, value, onChange, editable, readOnly, type = "text", placeholder }) {
  const [locked, setLocked] = useState(Boolean(editable));
  const isLocked = readOnly ? true : locked;
  const showPencil = editable && !readOnly;

  return (
    <div className="set-field">
      <label htmlFor={id} className="set-field-label">
        {label}
      </label>
      <div className="set-field-input-wrap">
        <input
          id={id}
          name={id}
          className="set-field-input"
          type={type}
          value={value}
          placeholder={placeholder}
          readOnly={isLocked}
          onChange={(e) => onChange(e.target.value)}
        />
        {showPencil && (
          <button
            type="button"
            className="set-field-pencil"
            aria-label={`Edit ${label}`}
            onClick={() => setLocked((l) => !l)}
          >
            <PencilIcon />
          </button>
        )}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  employeeNumber: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "Employee",
  supervisorId: "",
  isActive: true,
};

export default function Settings() {
  const { employee, hasRole } = useAuth();
  const isAdmin = hasRole("Admin");

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    employeeNumber: employee?.employeeNumber || "",
    firstName: employee?.firstName || "",
    lastName: employee?.lastName || "",
    email: employee?.email || "",
    role: employee?.role || "Employee",
  });
  const [saving, setSaving] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [credentials, setCredentials] = useState([]);
  const [credentialsLoading, setCredentialsLoading] = useState(true);
  const [registeringFingerprint, setRegisteringFingerprint] = useState(false);
  const [bioError, setBioError] = useState("");
  const [bioMessage, setBioMessage] = useState("");

  const loadCredentials = useCallback(() => {
    setCredentialsLoading(true);
    webauthnApi
      .listCredentials()
      .then(setCredentials)
      .catch(() => setCredentials([]))
      .finally(() => setCredentialsLoading(false));
  }, []);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  async function handleRegisterFingerprint() {
    setRegisteringFingerprint(true);
    setBioError("");
    setBioMessage("");
    try {
      await registerFingerprint({ deviceLabel: guessDeviceLabel() });
      setBioMessage("Fingerprint registered on this device.");
      loadCredentials();
    } catch (err) {
      setBioError(extractErrorMessage(err, "Fingerprint registration failed."));
    } finally {
      setRegisteringFingerprint(false);
    }
  }

  async function handleRemoveCredential(id) {
    setBioError("");
    setBioMessage("");
    try {
      await webauthnApi.deleteCredential(id);
      loadCredentials();
    } catch (err) {
      setBioError(extractErrorMessage(err, "Failed to remove fingerprint credential."));
    }
  }

  useEffect(() => {
    if (!isAdmin || !employee) return;
    auth
      .listUsers()
      .then((users) => {
        const self = users.find((u) => u.employeeId === employee.employeeId);
        if (self) {
          setForm((f) => ({
            ...f,
            employeeNumber: self.employeeNumber,
            firstName: self.firstName,
            lastName: self.lastName,
            email: self.email,
            role: self.role,
            supervisorId: self.supervisorId || "",
            isActive: self.isActive,
          }));
        }
      })
      .catch(() => {});
  }, [isAdmin, employee]);

  const update = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSave(event) {
    event.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await auth.updateUser(employee.employeeId, {
        employeeNumber: form.employeeNumber,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password || null,
        role: form.role,
        supervisorId: form.supervisorId || null,
        isActive: form.isActive,
      });
      setMessage("Account settings saved.");
      setForm((f) => ({ ...f, password: "", confirmPassword: "" }));
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to save account settings."));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm((f) => ({ ...f, password: "", confirmPassword: "" }));
  }

  async function handleGrantConsent() {
    setConsentLoading(true);
    setError("");
    setMessage("");
    try {
      await auth.grantConsent();
      setMessage("POPIA consent granted.");
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to grant consent."));
    } finally {
      setConsentLoading(false);
    }
  }

  return (
    <div className="set-page">
      <div className="set-header">
        <h1>Account Settings</h1>
      </div>

      <form className="set-card" onSubmit={handleSave}>
        <div className="set-avatar">
          <AvatarIcon />
        </div>

        {error && <p className="login-error-message">{error}</p>}
        {message && <p className="login-error-message" style={{ borderColor: "#12b76a", color: "#027a48", background: "#ecfdf3" }}>{message}</p>}

        <div className="set-fields-grid">
          <Field
            id="firstName"
            label="First name"
            value={form.firstName}
            onChange={update("firstName")}
            editable={isAdmin}
            readOnly={!isAdmin}
          />
          <Field
            id="lastName"
            label="Last name"
            value={form.lastName}
            onChange={update("lastName")}
            editable={isAdmin}
            readOnly={!isAdmin}
          />

          <Field
            id="email"
            label="E-mail"
            value={form.email}
            onChange={update("email")}
            editable={isAdmin}
            readOnly={!isAdmin}
            type="email"
          />
          <Field
            id="password"
            label="Password"
            value={form.password}
            onChange={update("password")}
            editable={isAdmin}
            readOnly={!isAdmin}
            type="password"
            placeholder={isAdmin ? "Leave blank to keep current password" : "**********"}
          />

          <Field
            id="employeeNumber"
            label="Employee number"
            value={form.employeeNumber}
            onChange={update("employeeNumber")}
            readOnly
          />
          <Field
            id="confirmPassword"
            label="Confirm Password"
            value={form.confirmPassword}
            onChange={update("confirmPassword")}
            editable={isAdmin}
            readOnly={!isAdmin}
            type="password"
            placeholder="**********"
          />
        </div>

        {isAdmin ? (
          <div className="set-actions">
            <button type="submit" className="set-btn-save" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button type="button" className="set-btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="set-actions">
            <button
              type="button"
              className="set-btn-save"
              onClick={handleGrantConsent}
              disabled={consentLoading}
            >
              {consentLoading ? "Granting consent..." : "Grant POPIA Consent"}
            </button>
          </div>
        )}
      </form>

      <div className="set-card set-biometrics-card">
        <h2 className="set-card-title">Biometrics</h2>
        <p className="set-hint">
          Register this device's fingerprint sensor so you can clock in and out with a fingerprint
          instead of a face scan. Registration happens on whichever device you're using right now —
          for a phone's sensor, open this page on the phone.
        </p>

        {bioError && <p className="login-error-message">{bioError}</p>}
        {bioMessage && (
          <p className="login-error-message" style={{ borderColor: "#12b76a", color: "#027a48", background: "#ecfdf3" }}>
            {bioMessage}
          </p>
        )}

        {!isWebAuthnSupported() && (
          <p className="set-hint set-hint--warning">
            This browser or device doesn't support fingerprint sign-in (no platform authenticator was
            found).
          </p>
        )}

        {credentialsLoading ? (
          <p className="set-hint">Loading registered devices…</p>
        ) : credentials.length > 0 ? (
          <ul className="set-cred-list">
            {credentials.map((cred) => (
              <li key={cred.id} className="set-cred-item">
                <span>{cred.deviceLabel}</span>
                <button type="button" className="set-cred-remove" onClick={() => handleRemoveCredential(cred.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="set-hint">No fingerprint is registered on any device yet.</p>
        )}

        <div className="set-actions">
          <button
            type="button"
            className="set-btn-save"
            onClick={handleRegisterFingerprint}
            disabled={registeringFingerprint || !isWebAuthnSupported()}
          >
            {registeringFingerprint ? "Waiting for fingerprint…" : "Register this device's fingerprint"}
          </button>
        </div>
      </div>
    </div>
  );
}
