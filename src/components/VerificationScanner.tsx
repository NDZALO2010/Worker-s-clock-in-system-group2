import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Scan,
  CheckCircle2,
  XCircle,
  Cpu,
  Layers,
  Sparkles,
  Sliders,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  UserCheck,
  Binary,
  Code
} from 'lucide-react';
import { Employee, MatchResult } from '../types';
import {
  cosineSimilarity,
  toByteArray,
  toBase64,
  generate512DVector,
  generateSimilarVector,
  matchFace
} from '../utils/biometrics';

interface VerificationScannerProps {
  employees: Employee[];
  onAddLog: (action: string, details: string, tag: 'POPIA' | 'INFERENCE' | 'SECURITY', status: 'PURGED' | 'SUCCESS' | 'WARNING', employeeId?: string) => void;
}

export const VerificationScanner: React.FC<VerificationScannerProps> = ({ employees, onAddLog }) => {
  const [useCamera, setUseCamera] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedSampleEmp, setSelectedSampleEmp] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(0.75);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [extractedVector, setExtractedVector] = useState<number[] | null>(null);
  const [vectorBase64, setVectorBase64] = useState<string>('');
  const [ramPurged, setRamPurged] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize camera stream if enabled
  useEffect(() => {
    if (useCamera) {
      navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
        .then((stream) => {
          setCameraStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error('Camera access denied or unnavigable:', err);
          setUseCamera(false);
        });
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [useCamera]);

  const handleCaptureCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
      setSelectedSampleEmp('');
      runPipeline(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        setCapturedImage(dataUrl);
        setSelectedSampleEmp('');
        runPipeline(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSampleEmployee = (empId: string) => {
    setSelectedSampleEmp(empId);
    const emp = employees.find(e => e.employeeId === empId);
    if (emp) {
      setCapturedImage(emp.avatarUrl);
      // Run match with slightly perturbed vector simulating live scan
      runPipeline(emp.avatarUrl, emp);
    }
  };

  const runPipeline = async (imageSrc: string, targetEmp?: Employee) => {
    setIsProcessing(true);
    setProcessingStep(1);
    setMatchResult(null);
    setRamPurged(false);

    // Step 1: OpenCvSharp decoding simulation
    await new Promise(r => setTimeout(r, 250));
    setProcessingStep(2);

    // Step 2: Resize to 112x112, BGR->RGB conversion & tensor normalization
    await new Promise(r => setTimeout(r, 300));
    setProcessingStep(3);

    // Step 3: ONNX Inference (ArcFace 512D embedding calculation)
    await new Promise(r => setTimeout(r, 350));
    
    let vector: number[];
    if (targetEmp) {
      // Small simulated lighting/angle perturbation for realistic match score (~0.85 to 0.94)
      vector = generateSimilarVector(targetEmp.vector512, 0.08);
    } else {
      // Extract pseudo vector based on image data or random visitor
      vector = generate512DVector(`scan-${imageSrc.substring(0, 30)}-${Date.now()}`);
    }

    const bytes = toByteArray(vector);
    const b64 = toBase64(bytes);

    setExtractedVector(vector);
    setVectorBase64(b64);
    setProcessingStep(4);

    // Step 4: POPIA RAM Purge
    await new Promise(r => setTimeout(r, 200));
    setRamPurged(true);
    onAddLog(
      'RAM_PURGE_SUCCESS',
      `Raw frame buffer (decoded OpenCV Mat) zero-cleared from RAM via Array.Clear(imageBytes) per POPIA compliance`,
      'POPIA',
      'PURGED',
      targetEmp?.employeeId
    );

    // Step 5: Match Face (1:N matching across registered profiles)
    setProcessingStep(5);
    await new Promise(r => setTimeout(r, 200));

    const knownProfiles = employees.map(e => ({
      employeeId: e.employeeId,
      vector: e.vector512
    }));

    const match = matchFace(vector, knownProfiles, threshold);
    const matchedEmp = employees.find(e => e.employeeId === match.matchedEmployeeId);

    const result: MatchResult = {
      employeeId: match.matchedEmployeeId,
      employeeName: matchedEmp?.name || null,
      employeeRole: matchedEmp?.role,
      department: matchedEmp?.department,
      avatarUrl: matchedEmp?.avatarUrl,
      similarityScore: match.highestScore,
      threshold,
      isMatched: Boolean(matchedEmp),
      processingTimeMs: Math.floor(45 + Math.random() * 25), // Ultra-low inference latency
      inputVector: vector,
      vectorBytesBase64: b64,
      matchedAt: new Date().toLocaleTimeString()
    };

    setMatchResult(result);
    setIsProcessing(false);

    onAddLog(
      'BIOMETRIC_1N_INFERENCE',
      result.isMatched
        ? `MATCH CONFIRMED: Employee ${result.employeeName} (${result.employeeId}). Score: ${result.similarityScore.toFixed(4)} >= threshold ${threshold}`
        : `MATCH REJECTED: Highest Cosine Score ${result.similarityScore.toFixed(4)} < threshold ${threshold}`,
      'INFERENCE',
      result.isMatched ? 'SUCCESS' : 'WARNING',
      result.employeeId || undefined
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Pipeline Intro */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-mono font-semibold">
                InsightFace ArcFace ONNX Model
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-mono">
                Tensor [1, 3, 112, 112]
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">1:N Biometric Facial Recognition Studio</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Extracts 512-dimensional vector embedding, executes Cosine Similarity matching, and purges raw memory for POPIA compliance.
            </p>
          </div>

          {/* Configurable Cosine Threshold Slider */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-4 min-w-[280px] w-full lg:w-auto">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-1.5 font-medium text-slate-300">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Verification Threshold:</span>
              </div>
              <span className="font-mono font-bold text-cyan-400 text-sm">{threshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.50"
              max="0.95"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>0.50 (Lenient)</span>
              <span>0.75 (Default C#)</span>
              <span>0.95 (Strict)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Capture & Input Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center justify-between">
              <span>Facial Input Stream</span>
              <span className="text-xs text-slate-500 font-mono font-normal">OpenCvSharp4 Ingestion</span>
            </h3>

            {/* Ingestion Mode Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setUseCamera(false)}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  !useCamera
                    ? 'bg-slate-800 text-cyan-400 border border-cyan-800/60 shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload / Samples</span>
              </button>
              <button
                onClick={() => setUseCamera(true)}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  useCamera
                    ? 'bg-slate-800 text-cyan-400 border border-cyan-800/60 shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Live Webcam</span>
              </button>
            </div>

            {/* Viewfinder / Canvas Area */}
            <div className="relative aspect-square w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center group">
              {useCamera ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Facial Scanner HUD Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-56 border-2 border-dashed border-cyan-400/70 rounded-full animate-pulse flex items-center justify-center">
                      <div className="w-32 h-40 border border-cyan-500/40 rounded-full" />
                    </div>
                  </div>
                </>
              ) : capturedImage ? (
                <div className="relative w-full h-full">
                  <img
                    src={capturedImage}
                    alt="Scan Face"
                    className="w-full h-full object-cover"
                  />
                  {/* Scanning Laser Line Effect during processing */}
                  {isProcessing && (
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse top-1/2" />
                  )}
                </div>
              ) : (
                <div className="text-center p-6 text-slate-500">
                  <Scan className="w-12 h-12 mx-auto mb-2 text-slate-600 animate-pulse" />
                  <p className="text-xs">No facial frame selected</p>
                  <p className="text-[10px] text-slate-600 mt-1">Upload a photo or choose an enrolled employee profile below</p>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Action Buttons */}
            <div className="mt-4 space-y-3">
              {useCamera ? (
                <button
                  onClick={handleCaptureCamera}
                  disabled={isProcessing}
                  className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture & Process Biometric Frame</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>Upload Image File</span>
                  </button>
                </div>
              )}

              {/* Sample Enrolled Employee Quick Test Selector */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                  Test against enrolled employee profile:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {employees.slice(0, 3).map((emp) => (
                    <button
                      key={emp.employeeId}
                      onClick={() => handleSelectSampleEmployee(emp.employeeId)}
                      className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                        selectedSampleEmp === emp.employeeId
                          ? 'bg-cyan-950/80 border-cyan-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <img
                        src={emp.avatarUrl}
                        alt={emp.name}
                        className="w-7 h-7 rounded-full object-cover mb-1 border border-slate-700"
                      />
                      <p className="text-[11px] font-semibold truncate leading-tight">{emp.name.split(' ')[0]}</p>
                      <p className="text-[9px] text-slate-500 truncate font-mono">{emp.employeeId.substring(0, 8)}...</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pipeline Execution & Cosine Match Results */}
        <div className="lg:col-span-7 space-y-4">
          {/* C# Pipeline Progress Execution Steps */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                FacialRecognitionService Pipeline Tracing
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-900">
                ONNX ArcFace (512D)
              </span>
            </h3>

            <div className="space-y-3 font-mono text-xs">
              {/* Step 1 */}
              <div className={`p-3 rounded-xl border transition-all ${
                processingStep >= 1 ? 'bg-slate-950 border-cyan-900/60 text-slate-200' : 'bg-slate-950/40 border-slate-800 text-slate-600'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cyan-400">1. OpenCV Frame Decoding (Cv2.ImDecode)</span>
                  {processingStep > 1 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : processingStep === 1 ? (
                    <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                  ) : (
                    <span className="text-[10px] text-slate-600">Pending</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-sans">
                  Decodes byte stream into OpenCV <code className="text-cyan-300">Mat (Color BGR)</code>.
                </p>
              </div>

              {/* Step 2 */}
              <div className={`p-3 rounded-xl border transition-all ${
                processingStep >= 2 ? 'bg-slate-950 border-cyan-900/60 text-slate-200' : 'bg-slate-950/40 border-slate-800 text-slate-600'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cyan-400">2. Pre-processing & Normalization</span>
                  {processingStep > 2 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : processingStep === 2 ? (
                    <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                  ) : (
                    <span className="text-[10px] text-slate-600">Pending</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-sans">
                  Resize to 112x112, BGR-&gt;RGB, Tensor <code className="text-cyan-300">[1, 3, 112, 112]</code> normalized by <code className="text-cyan-300">(pixel - 127.5) / 128.0</code>.
                </p>
              </div>

              {/* Step 3 */}
              <div className={`p-3 rounded-xl border transition-all ${
                processingStep >= 3 ? 'bg-slate-950 border-cyan-900/60 text-slate-200' : 'bg-slate-950/40 border-slate-800 text-slate-600'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cyan-400">3. ONNX Model Inference (512D ArcFace)</span>
                  {processingStep > 3 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : processingStep === 3 ? (
                    <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                  ) : (
                    <span className="text-[10px] text-slate-600">Pending</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-sans">
                  Generates 512-dimensional facial embedding vector array.
                </p>
              </div>

              {/* Step 4: POPIA Purge */}
              <div className={`p-3 rounded-xl border transition-all ${
                ramPurged ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300' : 'bg-slate-950/40 border-slate-800 text-slate-600'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1.5 text-emerald-400">
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                    4. POPIA Compliance RAM Purge (Array.Clear)
                  </span>
                  {ramPurged ? (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-900 text-emerald-300 font-bold">ZERO-CLEARED</span>
                  ) : (
                    <span className="text-[10px] text-slate-600">Pending</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-sans">
                  Raw frame image byte array and OpenCV Mat memory buffers destroyed to prevent privacy exposure.
                </p>
              </div>
            </div>
          </div>

          {/* Match Verification Outcome */}
          {matchResult ? (
            <div className={`border rounded-2xl p-6 text-white shadow-2xl transition-all ${
              matchResult.isMatched
                ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/50 border-emerald-500/50'
                : 'bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/50 border-rose-500/50'
            }`}>
              {/* Header Status */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  {matchResult.isMatched ? (
                    <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/40 shadow-lg shadow-rose-500/10">
                      <XCircle className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <span className={`text-xs font-mono font-bold uppercase tracking-wider ${
                      matchResult.isMatched ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {matchResult.isMatched ? 'VERIFICATION AUTHORIZED' : 'ACCESS REJECTED / UNKNOWN'}
                    </span>
                    <h3 className="text-xl font-bold text-white">
                      {matchResult.isMatched ? matchResult.employeeName : 'Unrecognized Individual'}
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-mono text-slate-400">Latency</p>
                  <p className="text-sm font-mono font-bold text-cyan-400">{matchResult.processingTimeMs} ms</p>
                </div>
              </div>

              {/* Similarity Score Meter */}
              <div className="mt-5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    MathUtility Cosine Similarity Score:
                  </span>
                  <span className="font-mono font-bold text-base text-cyan-300">
                    {matchResult.similarityScore.toFixed(4)}
                  </span>
                </div>

                {/* Score Progress Bar */}
                <div className="relative w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      matchResult.isMatched ? 'bg-gradient-to-r from-cyan-500 to-emerald-400' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, matchResult.similarityScore * 100)}%` }}
                  />
                  {/* Threshold Marker Indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_#ffffff] z-10"
                    style={{ left: `${threshold * 100}%` }}
                    title={`Threshold: ${threshold}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>0.00</span>
                  <span className="text-white font-semibold">Threshold Cutoff: {threshold.toFixed(2)}</span>
                  <span>1.00</span>
                </div>
              </div>

              {/* Employee Details Card if Matched */}
              {matchResult.isMatched && (
                <div className="mt-5 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-4">
                  {matchResult.avatarUrl && (
                    <img
                      src={matchResult.avatarUrl}
                      alt={matchResult.employeeName || ''}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-500/40 shadow"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{matchResult.employeeName}</h4>
                    <p className="text-xs text-slate-400 truncate">{matchResult.employeeRole} • {matchResult.department}</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-1">GUID: {matchResult.employeeId}</p>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-emerald-950 text-emerald-300 text-xs font-mono font-semibold border border-emerald-800">
                    ACCESS GRANTED
                  </div>
                </div>
              )}

              {/* 512D Vector & Binary Payload Inspector */}
              <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400 flex items-center gap-1.5">
                    <Binary className="w-3.5 h-3.5 text-cyan-400" />
                    Encrypted Vector Payload (MathUtility.ToByteArray)
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">512 Floats = 2,048 Bytes</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 break-all max-h-20 overflow-y-auto leading-relaxed">
                  <span className="text-cyan-400 font-semibold">[Base64]: </span>
                  {matchResult.vectorBytesBase64}
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 max-h-24 overflow-y-auto">
                  <span className="text-cyan-400 font-semibold">Float[512] Sample: </span>
                  {matchResult.inputVector.slice(0, 16).map(v => v.toFixed(4)).join(', ')} ...
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 shadow-xl">
              <Scan className="w-12 h-12 mx-auto mb-3 text-slate-600 animate-pulse" />
              <h3 className="text-sm font-semibold text-slate-300">Ready for Biometric Ingestion</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Capture a webcam frame or pick an employee profile to trigger the OpenCvSharp4 decoding, 512D ONNX extraction, and POPIA memory purge pipeline.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
