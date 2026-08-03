import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as attendance from "../api/attendance";
import { extractErrorMessage } from "../api/client";
import "./AttendanceClock.css";
import logo from "../assets/logo.png";

/**
 * AttendanceClock
 * -----------------
 * Face-scan attendance flow: scanning -> success/failure, auto-closes.
 * Captures a frame from the live camera and posts it to the real
 * clock-in/clock-out endpoint. `recognizeFace` can be overridden by
 * callers (e.g. for tests) to bypass the camera/network call.
 */

const RESULT_HOLD_SECONDS = 3;

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

function captureFrameBlob(video, canvas) {
  return new Promise((resolve, reject) => {
    if (!video || !video.videoWidth) {
      reject(new Error("Camera feed is not ready yet."));
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Failed to capture image."))), "image/jpeg", 0.9);
  });
}

function getCurrentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: 0, longitude: 0 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve({ latitude: 0, longitude: 0 }),
      { timeout: 5000 },
    );
  });
}

function CameraFeed({ videoRef, onError }) {
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
  }, [videoRef, onError]);

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

function FingerprintIcon() {
  return (
    <svg viewBox="0 0 120 120" className="face-icon" aria-hidden="true">
      <circle cx="60" cy="60" r="58" className="face-icon__bg" />
      <path
        className="face-icon__silhouette"
        fill="none"
        stroke="#b9c3da"
        strokeWidth="4"
        strokeLinecap="round"
        d="M60 35c-16 0-28 12-28 30v10M60 35c16 0 28 12 28 30v6M45 42c-6 6-9 14-9 23v10M75 42c6 6 9 14 9 23M52 34c3-2 6-2 8-2s5 0 8 2M38 90c-2-6-3-13-3-18M82 90c2-6 3-13 3-18M60 50c-8 0-14 7-14 15v14M60 50c8 0 14 7 14 15v9M60 65v25"
      />
    </svg>
  );
}

export default function AttendanceClock({ recognizeFace, onSuccess, onFailure }) {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = location.state?.mode === "checkout" ? "checkout" : "checkin";
  const method = location.state?.method === "fingerprint" ? "fingerprint" : "face";
  const actionLabel = mode === "checkout" ? "Checked out" : "Attendance logged";

  // phase: "awaiting-fingerprint" | "scanning" | "success" | "failure"
  const [phase, setPhase] = useState(method === "fingerprint" ? "awaiting-fingerprint" : "scanning");
  const [employeeName, setEmployeeName] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [countdown, setCountdown] = useState(RESULT_HOLD_SECONDS);
  const [cameraError, setCameraError] = useState(false);
  const [fingerprintError, setFingerprintError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timers = useRef([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const submitScan = useCallback(
    async ({ faceBlob, fingerprintBlob }) => {
      const { latitude, longitude } = await getCurrentPosition();
      try {
        const response = await (mode === "checkout"
          ? attendance.clockOut({ latitude, longitude, deviceName: "Web Browser", faceBlob, fingerprintBlob })
          : attendance.clockIn({ latitude, longitude, deviceName: "Web Browser", faceBlob, fingerprintBlob }));

        return {
          success: true,
          name: response.employeeName || "",
          message: response.message,
        };
      } catch (err) {
        return { success: false, message: extractErrorMessage(err, "Biometric verification failed.") };
      }
    },
    [mode],
  );

  const performRealScan = useCallback(async () => {
    await waitForVideoReady(videoRef.current);
    const faceBlob = await captureFrameBlob(videoRef.current, canvasRef.current);
    return submitScan({ faceBlob });
  }, [submitScan]);

  const startScan = useCallback(
    async (fingerprintBlob) => {
      setPhase("scanning");
      try {
        const result = await (recognizeFace
          ? recognizeFace()
          : method === "fingerprint"
            ? submitScan({ fingerprintBlob })
            : performRealScan());
        if (result?.success) {
          setEmployeeName(result.name || "");
          setResultMessage(result.message || "");
          setPhase("success");
          onSuccess?.(result);
        } else {
          setResultMessage(result?.message || "");
          setPhase("failure");
          onFailure?.(result);
        }
      } catch (err) {
        setResultMessage(err?.message || "");
        setPhase("failure");
        onFailure?.(err);
      }
    },
    [recognizeFace, performRealScan, submitScan, method, onSuccess, onFailure],
  );

  function handleTryAgain() {
    if (method === "fingerprint") {
      setFingerprintError("");
      setPhase("awaiting-fingerprint");
    } else {
      startScan();
    }
  }

  function handleFingerprintFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFingerprintError("");
    startScan(file);
  }

  // Kick off the first scan on mount (face mode only — fingerprint waits for a file).
  useEffect(() => {
    if (method === "face") {
      startScan();
    }
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown + auto-transition once a result is shown.
  useEffect(() => {
    if (phase !== "success" && phase !== "failure") return;

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
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {phase === "awaiting-fingerprint" && (
          <>
            <div className="scan-frame">
              <span className="scan-ring scan-ring--outer" />
              <span className="scan-ring scan-ring--inner" />
              <FingerprintIcon />
            </div>
            <p className="clockit-title">Scan your fingerprint to continue</p>
            <label className="fingerprint-upload-btn">
              Choose fingerprint scan
              <input type="file" accept="image/*" onChange={handleFingerprintFileChange} hidden />
            </label>
            {fingerprintError && <p className="camera-warning">{fingerprintError}</p>}
          </>
        )}

        {phase === "scanning" && (
          <>
            <div className="scan-frame">
              <span className="scan-ring scan-ring--outer" />
              <span className="scan-ring scan-ring--inner" />
              {method === "fingerprint" ? (
                <FingerprintIcon />
              ) : cameraError ? (
                <FaceIcon />
              ) : (
                <CameraFeed videoRef={videoRef} onError={() => setCameraError(true)} />
              )}
            </div>
            {method === "face" && cameraError && (
              <p className="camera-warning">
                Camera unavailable — check your browser's camera permission.
              </p>
            )}
            <p className="clockit-title">
              {method === "fingerprint" ? "Verifying your fingerprint" : "Position your face within the frame"}
            </p>
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
              {resultMessage || `${actionLabel} for ${employeeName || "employee"}`}
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
              {resultMessage || (method === "fingerprint" ? "Fingerprint Recognition Failed" : "Facial Recognition Failed")}{" "}
              <span className="warning-icon">⚠</span>
            </p>
            <button type="button" className="try-again-link" onClick={handleTryAgain}>
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
