import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AttendanceClock.css";
import logo from "../assets/logo.png";

/**
 * AttendanceClock
 * -----------------
 * Reproduces the Clock It face-scan attendance flow:
 *   1. scanning  – "Position your face within the frame"
 *   2. success   – "Attendance logged for {name}", auto-closes
 *   3. failure   – "Facial Recognition Failed", auto-retries
 *
 * This version opens the device camera and shows a live preview in the
 * frame, so it visually "scans" a real face. That said, actually
 * identifying WHO is in frame (matching against an enrolled employee)
 * still needs a real biometric service — e.g. AWS Rekognition, Azure
 * Face, or a face-api.js model with reference photos. Wire your own
 * check up through the `recognizeFace` prop; the default below just
 * simulates a network round-trip so you can see the UI states while
 * looking at your live camera feed.
 *
 * Usage:
 *   <AttendanceClock
 *     recognizeFace={async () => {
 *       // call your real API here and return the shape below
 *       const res = await fetch("/api/clock-in", { method: "POST" });
 *       const data = await res.json();
 *       return { success: data.matched, name: data.employeeName };
 *     }}
 *   />
 */

const SCAN_DURATION_MS = 2200;
const RESULT_HOLD_SECONDS = 3;

async function defaultRecognizeFace() {
  // Demo stand-in: waits like a real scan, then "succeeds" 75% of the time.
  await new Promise((resolve) => setTimeout(resolve, SCAN_DURATION_MS));
  const success = Math.random() < 0.75;
  return { success, name: success ? "Thabiso Bosetsi" : null };
}

function CameraFeed({ onError }) {
  const videoRef = useRef(null);

  useEffect(() => {
    let stream;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
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
  }, [onError]);

  return <video ref={videoRef} autoPlay playsInline muted className="camera-feed" />;
}

function FaceIcon() {
  return (
    <svg viewBox="0 0 120 120" className="face-icon" aria-hidden="true">
      <circle cx="60" cy="60" r="58" className="face-icon__bg" />
      <path
        className="face-icon__silhouette"
        d="M60 30c-12 0-20 9-20 22 0 9 3 16 8 20-9 4-16 12-18 22-1 4 1 7 5 7h50c4 0 6-3 5-7-2-10-9-18-18-22 5-4 8-11 8-20 0-13-8-22-20-22z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 80 80" className="result-icon" aria-hidden="true">
      <circle cx="40" cy="40" r="38" className="result-icon__ring result-icon__ring--success" />
      <path
        d="M24 41l10 10 22-24"
        className="result-icon__mark"
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 80 80" className="result-icon" aria-hidden="true">
      <circle cx="40" cy="40" r="38" className="result-icon__ring result-icon__ring--failure" />
      <path
        d="M27 27l26 26M53 27L27 53"
        className="result-icon__mark"
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AttendanceClock({
  recognizeFace = defaultRecognizeFace,
  onSuccess,
  onFailure,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = location.state?.mode === "checkout" ? "checkout" : "checkin";
  const actionLabel = mode === "checkout" ? "Checked out" : "Attendance logged";

  // phase: "scanning" | "success" | "failure"
  const [phase, setPhase] = useState("scanning");
  const [employeeName, setEmployeeName] = useState("");
  const [countdown, setCountdown] = useState(RESULT_HOLD_SECONDS);
  const [cameraError, setCameraError] = useState(false);
  const timers = useRef([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const startScan = useCallback(async () => {
    setPhase("scanning");
    try {
      const result = await recognizeFace();
      if (result?.success) {
        setEmployeeName(result.name || "");
        setPhase("success");
        onSuccess?.(result);
      } else {
        setPhase("failure");
        onFailure?.(result);
      }
    } catch (err) {
      setPhase("failure");
      onFailure?.(err);
    }
  }, [recognizeFace, onSuccess, onFailure]);

  // Kick off the first scan on mount.
  useEffect(() => {
    startScan();
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown + auto-transition once a result is shown.
  useEffect(() => {
    if (phase === "scanning") return;

    setCountdown(RESULT_HOLD_SECONDS);
    let remaining = RESULT_HOLD_SECONDS;

    const tick = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(tick);
        navigate("/");
      }
    }, 1000);

    timers.current.push(tick);
    return () => clearInterval(tick);
  }, [phase, navigate]);

  return (
    <div className="clockit-screen">
      <div className="clockit-card">
        <img src={logo} alt="Clock It — Authenticate. Secure. Trust." className="clockit-logo" />

        {phase === "scanning" && (
          <>
            <div className="scan-frame">
              <span className="scan-ring scan-ring--outer" />
              <span className="scan-ring scan-ring--inner" />
              {cameraError ? (
                <FaceIcon />
              ) : (
                <CameraFeed onError={() => setCameraError(true)} />
              )}
            </div>
            {cameraError && (
              <p className="camera-warning">
                Camera unavailable — check your browser's camera permission.
              </p>
            )}
            <p className="clockit-title">Position your face within the frame</p>
            <p className="clockit-status">
              <span className="dot-spinner" aria-hidden="true" />
              Scanning for attendance
              <span className="ellipsis" aria-hidden="true">
                ....
              </span>
            </p>
          </>
        )}

        {phase === "success" && (
          <div className="result-panel">
            <CheckIcon />
            <p className="result-title">Successful</p>
            <p className="clockit-status">
              {actionLabel} for {employeeName || "employee"}
            </p>
            <p className="result-footer">
              <span className="dot-spinner" aria-hidden="true" />
              Logging out in {countdown}s...
            </p>
          </div>
        )}

        {phase === "failure" && (
          <div className="result-panel">
            <CrossIcon />
            <p className="result-title">Unsuccessful</p>
            <p className="result-subtitle">
              Facial Recognition Failed <span className="warning-icon">⚠</span>
            </p>
            <button type="button" className="try-again-link" onClick={startScan}>
              Try again.
            </button>
            <p className="result-footer">
              <span className="dot-spinner" aria-hidden="true" />
              Loading home page in {countdown}s...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
