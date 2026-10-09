import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  X, Camera, RefreshCw, CheckCircle2, AlertTriangle, 
  Sparkles, ScanFace, Upload, User, Clock, ShieldCheck, 
  Volume2, Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/audio';
import { API_ENDPOINTS } from '../config/api';

export default function CameraModal({ 
  isOpen, 
  onClose, 
  mode, // 'REGISTER' | 'PUNCH_IN' | 'PUNCH_OUT'
  targetEmployee, // For REGISTER mode { employeeCode, name, department, designation }
  onSuccessCallback 
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const autoScanTimerRef = useRef(null);
  const isRequestInProgressRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [scanStatusText, setScanStatusText] = useState('Initializing facial sensor...');
  const [isFaceDetected, setIsFaceDetected] = useState(false);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setScanResult(null);
      setErrorMessage(null);
      setCapturedSnapshot(null);
      isRequestInProgressRef.current = false;
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, mode]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam API is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraActive(true);
          setScanStatusText(
            mode === 'REGISTER' 
              ? 'Center your face inside the circle' 
              : 'Looking for face... Stand inside circle for automatic verification'
          );
        };
      }
    } catch (err) {
      console.warn('Camera access issue:', err.message);
      setCameraError(
        'Unable to access camera (' + err.message + '). You can use the "Upload Photo" button below to test.'
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (autoScanTimerRef.current) {
      clearInterval(autoScanTimerRef.current);
      autoScanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    isRequestInProgressRef.current = false;
  };

  // Capture current video frame into a base64 JPEG
  const captureFrame = useCallback(() => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    if (video.readyState < 2) return null; // Ensure video has data

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
    return dataUrl;
  }, []);

  // Submit captured image to backend endpoint
  const sendToBackend = async (imageBase64, isAuto = false) => {
    if (isRequestInProgressRef.current) return;
    isRequestInProgressRef.current = true;
    if (!isAuto) setProcessing(true);

    try {
      let endpoint = '';
      let payload = { image: imageBase64 };

      if (mode === 'REGISTER') {
        endpoint = API_ENDPOINTS.BIOMETRICS_REGISTER;
        payload.employeeCode = targetEmployee?.employeeCode;
      } else if (mode === 'PUNCH_IN') {
        endpoint = API_ENDPOINTS.BIOMETRICS_PUNCH_IN;
      } else if (mode === 'PUNCH_OUT') {
        endpoint = API_ENDPOINTS.BIOMETRICS_PUNCH_OUT;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // If it's a structural error (like already punched in or unverified), show message and pause
        if (data.alreadyPunchedIn || data.alreadyPunchedOut || res.status === 400 || res.status === 401 || res.status === 403) {
          sounds.playError();
          setErrorMessage(data.error || 'Biometric verification failed.');
          setScanStatusText(data.error || 'Verification alert');
          
          if (data.alreadyPunchedIn) {
            sounds.speak('Already punched in today.');
          } else if (data.alreadyPunchedOut) {
            sounds.speak('Already punched out today.');
          } else if (res.status === 401) {
            sounds.speak('Face not recognized. Please register first.');
          }

          // Stop auto scan on definitive error to avoid spamming
          if (autoScanTimerRef.current) {
            clearInterval(autoScanTimerRef.current);
            autoScanTimerRef.current = null;
          }
        } else {
          // If simply no face or transient detection issue, keep looking quietly
          setScanStatusText(data.error || 'Align face clearly inside the circle...');
        }
        return;
      }

      // SUCCESS!
      setIsFaceDetected(true);
      setCapturedSnapshot(imageBase64);
      setScanResult(data);
      setErrorMessage(null);

      // Stop auto scan timer
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }

      const matchedName = data.employee?.name || data.employeeName || targetEmployee?.name || 'Employee';

      if (mode === 'PUNCH_IN') {
        sounds.playSuccess();
        sounds.speak(`Punched in successfully, ${matchedName}!`);
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#3b82f6'],
        });
      } else if (mode === 'PUNCH_OUT') {
        sounds.playPunchOut();
        sounds.speak(`Punched out successfully, ${matchedName}!`);
      } else {
        sounds.playSuccess();
        sounds.speak(`Face registered successfully for ${matchedName}!`);
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#6366f1', '#06b6d4'],
        });
      }

      if (onSuccessCallback) {
        onSuccessCallback(data);
      }
    } catch (err) {
      console.error('Scan API Error:', err);
      if (!isAuto) {
        sounds.playError();
        setErrorMessage('Server connection error. Please verify backend is running.');
      }
    } finally {
      setProcessing(false);
      // Brief cool-down before allowing next auto-frame
      setTimeout(() => {
        isRequestInProgressRef.current = false;
      }, 700);
    }
  };

  // AUTO-SCAN ENGINE FOR PUNCH IN & PUNCH OUT
  // As requested: No "verify" button needed. Scans automatically when face is in circle!
  useEffect(() => {
    if (!isOpen || !cameraActive || scanResult) return;

    if (mode === 'PUNCH_IN' || mode === 'PUNCH_OUT') {
      // Start auto-scanning every 900ms
      autoScanTimerRef.current = setInterval(() => {
        if (!isRequestInProgressRef.current && videoRef.current && !scanResult) {
          const frame = captureFrame();
          if (frame) {
            setScanStatusText('Scanning face under circle...');
            sendToBackend(frame, true);
          }
        }
      }, 900);
    }

    return () => {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
    };
  }, [isOpen, cameraActive, mode, scanResult, captureFrame]);

  // Handle image file upload for testing
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setCapturedSnapshot(base64);
      sendToBackend(base64, false);
    };
    reader.readAsDataURL(file);
  };

  // Manual capture for Registration mode
  const handleRegisterCapture = () => {
    if (processing) return;
    const frame = captureFrame();
    if (frame) {
      setCapturedSnapshot(frame);
      sendToBackend(frame, false);
    } else {
      setErrorMessage('Could not capture camera frame.');
    }
  };

  if (!isOpen) return null;

  const modeTitles = {
    REGISTER: {
      title: 'Face Biometric Registration',
      badge: 'Profile Enrollment',
      subtitle: targetEmployee 
        ? `Align face inside circle to register ${targetEmployee.name} (${targetEmployee.employeeCode})`
        : 'Center face in the circle guide to enroll',
      accentColor: 'text-blue-600',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      circleBorder: 'border-blue-500',
      icon: ScanFace,
    },
    PUNCH_IN: {
      title: 'Automatic Punch In',
      badge: 'Auto Face Scan Active',
      subtitle: 'Stand naturally. As soon as your face is inside the circle, it automatically logs Punch In.',
      accentColor: 'text-emerald-600',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      circleBorder: 'border-emerald-500',
      icon: CheckCircle2,
    },
    PUNCH_OUT: {
      title: 'Automatic Punch Out',
      badge: 'Auto Face Scan Active',
      subtitle: 'Stand naturally. As soon as your face is inside the circle, it automatically logs Punch Out.',
      accentColor: 'text-purple-600',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      circleBorder: 'border-purple-500',
      icon: Clock,
    },
  };

  const currentMeta = modeTitles[mode] || modeTitles.PUNCH_IN;
  const ModeIcon = currentMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header (Clean Light Theme) */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3.5">
            <div className={`p-2.5 rounded-2xl bg-white shadow-sm border border-slate-200 ${currentMeta.accentColor}`}>
              <ModeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {currentMeta.title}
                </h3>
                <span className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${currentMeta.badgeBg}`}>
                  {currentMeta.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {/* SUCCESS RESULT CARD */}
          {scanResult ? (
            <div className="p-6 rounded-2xl bg-gradient-to-b from-emerald-50/60 to-white border border-emerald-200 text-center space-y-4 shadow-sm animate-fadeIn">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9 text-emerald-600 animate-bounce" />
              </div>

              <div>
                <span className="text-xs uppercase font-mono tracking-widest text-emerald-700 font-bold">
                  {mode === 'REGISTER' 
                    ? 'Registration Completed' 
                    : mode === 'PUNCH_IN' 
                    ? 'Punched In Successfully' 
                    : 'Punched Out Successfully'}
                </span>
                <h4 className="text-2xl font-bold text-slate-900 mt-1">
                  {scanResult.employee?.name || scanResult.employeeName || targetEmployee?.name}
                </h4>
                <p className="text-sm text-slate-600 font-medium mt-1">
                  {scanResult.message}
                </p>
              </div>

              {/* Photo Snapshot */}
              {capturedSnapshot && (
                <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md">
                  <img src={capturedSnapshot} alt="Snapshot" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Details Metrics Card */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Employee Code</span>
                  <div className="text-sm font-bold text-slate-900 font-mono">
                    {scanResult.employee?.employeeCode || scanResult.employeeCode || targetEmployee?.employeeCode}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Department</span>
                  <div className="text-sm font-semibold text-slate-800">
                    {scanResult.employee?.department || targetEmployee?.department || 'Operations'}
                  </div>
                </div>

                {mode === 'PUNCH_IN' && (
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">Punch In Time</span>
                    <div className="text-sm font-bold text-emerald-600 font-mono">
                      {scanResult.formattedTime || 'Logged'}
                    </div>
                  </div>
                )}

                {mode === 'PUNCH_OUT' && (
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">Total Work Duration</span>
                    <div className="text-sm font-bold text-purple-600 font-mono">
                      {scanResult.totalWorkFormatted || 'Completed'}
                    </div>
                  </div>
                )}

                {mode === 'REGISTER' && (
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">Biometric Quality</span>
                    <div className="text-sm font-bold text-blue-600 font-mono">
                      {Math.round((scanResult.detScore || 0.95) * 100)}%
                    </div>
                  </div>
                )}

                {scanResult.confidencePercent && (
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">Match Confidence</span>
                    <div className="text-sm font-bold text-teal-600 font-mono">
                      {scanResult.confidencePercent}%
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  Done & Continue
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Alert / Error Banner */}
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start space-x-3 text-sm animate-shake">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="font-semibold block">Attendance Alert</strong>
                    <span>{errorMessage}</span>
                  </div>
                  {/* Option to retry auto-scan if stopped */}
                  {(mode === 'PUNCH_IN' || mode === 'PUNCH_OUT') && (
                    <button
                      onClick={() => {
                        setErrorMessage(null);
                        setScanStatusText('Looking for face...');
                      }}
                      className="px-3 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold cursor-pointer shrink-0"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {/* Camera Error Alert */}
              {cameraError && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                  <span>{cameraError}</span>
                  <button
                    onClick={startCamera}
                    className="ml-2 px-3 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 font-semibold cursor-pointer shrink-0"
                  >
                    Retry Camera
                  </button>
                </div>
              )}

              {/* Viewfinder Video Area */}
              <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center">
                
                {/* Live Video */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover -scale-x-100 ${!cameraActive ? 'hidden' : ''}`}
                />

                {/* Placeholder when camera not active */}
                {!cameraActive && (
                  <div className="flex flex-col items-center justify-center p-6 text-slate-400 space-y-3 text-center">
                    <Camera className="w-12 h-12 text-slate-500 animate-pulse" />
                    <div>
                      <p className="font-medium text-slate-300">Camera Initializing...</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Please allow camera permissions or upload a test image below.
                      </p>
                    </div>
                  </div>
                )}

                {/* THE CIRCLE FACE GUIDE & AUTO-SCANNER OVERLAY */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    
                    {/* Semi-transparent outer mask */}
                    <div className="absolute inset-0 bg-slate-950/20" />

                    {/* TARGET CIRCLE / OVAL GUIDE */}
                    <div className={`relative w-60 h-72 rounded-[50%] border-4 ${
                      mode === 'PUNCH_IN' 
                        ? 'border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)]' 
                        : mode === 'PUNCH_OUT'
                        ? 'border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.5)]'
                        : 'border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.5)]'
                    } pulse-circle flex items-center justify-center`}>
                      
                      {/* Laser animated beam */}
                      <div className={`absolute w-full h-1 ${
                        mode === 'PUNCH_IN'
                          ? 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399]'
                          : mode === 'PUNCH_OUT'
                          ? 'bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_12px_#c084fc]'
                          : 'bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_12px_#60a5fa]'
                      } animate-scan`} />

                      {/* Alignment crosshairs */}
                      <div className="w-3.5 h-3.5 border-t-2 border-l-2 border-white absolute top-3 left-4" />
                      <div className="w-3.5 h-3.5 border-t-2 border-r-2 border-white absolute top-3 right-4" />
                      <div className="w-3.5 h-3.5 border-b-2 border-l-2 border-white absolute bottom-3 left-4" />
                      <div className="w-3.5 h-3.5 border-b-2 border-r-2 border-white absolute bottom-3 right-4" />

                      {/* Status pill under circle */}
                      <div className="absolute -bottom-10 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 text-xs font-semibold text-white tracking-wide shadow-lg flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${
                          mode === 'PUNCH_IN' ? 'bg-emerald-400' : mode === 'PUNCH_OUT' ? 'bg-purple-400' : 'bg-blue-400'
                        } animate-ping`} />
                        <span>{scanStatusText}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action / Help Section */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                
                {/* Upload Image Test alternative */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processing}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-center space-x-2 transition-colors cursor-pointer border border-slate-200"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Upload Image Test</span>
                  </button>
                </div>

                {/* In PUNCH_IN and PUNCH_OUT: NO VERIFY BUTTON! Automatic scanning! */}
                {mode === 'REGISTER' ? (
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRegisterCapture}
                      disabled={processing || !cameraActive}
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-500/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{processing ? 'Processing...' : 'Capture & Register Face'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                    <span className="text-xs text-slate-500 font-medium flex items-center space-x-1.5">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>Auto-detecting face in circle...</span>
                    </span>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer border border-slate-200"
                    >
                      Close
                    </button>
                  </div>
                )}

              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
}
