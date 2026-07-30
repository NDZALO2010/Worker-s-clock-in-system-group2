import { useState, useRef, useCallback, useEffect } from "react";
import "./RegisterFace.css";
import logo from "../assets/logo.png";

/**
 * RegisterFace
 * -------------
 * Admin screen for enrolling a new employee's face — same visual
 * language as the check-in scanner (logo, circular camera frame,
 * blue rings, success/failure cards).
 *
 * For now this goes straight to the camera (no name/employee-ID form)
 * — capture a face, save it. Once you're ready to tie captures to a
 * specific employee record, add that form back in and pass the
 * details through to `saveFace`.
 *
 * Flow:
 *   1. capture   – live camera preview, admin clicks "Capture face"
 *   2. saving    – brief "Saving face data..." state
 *   3. success   – "Face registered", then resets for the next capture
 *   4. failure   – "Registration Failed", with a retry
 *
 * Like AttendanceClock, this does NOT do real face detection/matching
 * on its own — capturing a photo and actually enrolling it in a
 * biometric system (so it can later be matched against) needs a real
 * backend/service. Wire that up through the `saveFace` prop; the
 * default below just simulates a save so you can see the UI states.
 *
 * Usage:
 *   <RegisterFace
 *     saveFace={async ({ imageDataUrl }) => {
 *       const res = await fetch("/api/employees/register-face", {
 *         method: "POST",
 *         headers: { "Content-Type": "application/json" },
 *         body: JSON.stringify({ imageDataUrl }),
 *       });
 *       const data = await res.json();
 *       return { success: data.ok };
 *     }}
 *   />
 */

const SAVE_DURATION_MS = 1400;
const RESULT_HOLD_SECONDS = 3;

async function defaultSaveFace() {
  await new Promise((resolve) => setTimeout(resolve, SAVE_DURATION_MS));
  return { success: true };
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

export default function RegisterFace({ saveFace = defaultSaveFace, onRegistered }) {
  // step: "capture" | "saving" | "success" | "failure"
  const [step, setStep] = useState("capture");
  const [cameraError, setCameraError] = useState(false);
  const [countdown, setCountdown] = useState(RESULT_HOLD_SECONDS);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    let imageDataUrl = null;

    if (video && video.videoWidth) {
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1); // un-mirror the saved image
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    }

    setStep("saving");
    try {
      const result = await saveFace({ imageDataUrl });
      if (result?.success) {
        setStep("success");
        onRegistered?.({ imageDataUrl });
      } else {
        setStep("failure");
      }
    } catch {
      setStep("failure");
    }
  }, [saveFace, onRegistered]);

  // Countdown that auto-resets after success/failure.
  useEffect(() => {
    if (step !== "success" && step !== "failure") return;

    setCountdown(RESULT_HOLD_SECONDS);
    let remaining = RESULT_HOLD_SECONDS;

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setStep("capture");
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [step]);

  return (
    <div className="clockit-screen">
      <div className="clockit-card">
        <img src={logo} alt="Clock It — Authenticate. Secure. Trust." className="clockit-logo" />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {step === "capture" && (
          <>
            <div className="scan-frame">
              <span className="scan-ring scan-ring--outer" />
              <span className="scan-ring scan-ring--inner" />
              {cameraError ? (
                <FaceIcon />
              ) : (
                <CameraFeed videoRef={videoRef} onError={() => setCameraError(true)} />
              )}
            </div>
            {cameraError && (
              <p className="camera-warning">
                Camera unavailable — check your browser's camera permission.
              </p>
            )}
            <p className="clockit-title">Position your face within the frame</p>
            <p className="clockit-status">Make sure the face is well-lit and centered</p>
            <button
              type="button"
              className="primary-button"
              disabled={cameraError}
              onClick={handleCapture}
              style={{ marginTop: 24, width: "100%" }}
            >
              Capture face
            </button>
          </>
        )}

        {step === "saving" && (
          <div className="result-panel">
            <span className="dot-spinner dot-spinner--large" aria-hidden="true" />
            <p className="clockit-status" style={{ marginTop: 16 }}>
              Saving face data....
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="result-panel">
            <CheckIcon />
            <p className="result-title">Registered</p>
            <p className="clockit-status">Face registered successfully</p>
            <p className="result-footer">
              <span className="dot-spinner" aria-hidden="true" />
              Ready for next capture in {countdown}s...
            </p>
          </div>
        )}

        {step === "failure" && (
          <div className="result-panel">
            <CrossIcon />
            <p className="result-title">Unsuccessful</p>
            <p className="result-subtitle">
              Face Registration Failed <span className="warning-icon">⚠</span>
            </p>
            <button type="button" className="try-again-link" onClick={() => setStep("capture")}>
              Try again.
            </button>
            <p className="result-footer">
              <span className="dot-spinner" aria-hidden="true" />
              Returning to capture in {countdown}s...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
