import React, { useState, useEffect } from 'react';
import { 
  ScanFace, LogIn, LogOut, UserPlus, Sparkles, 
  ShieldCheck, RefreshCw, AlertCircle, CheckCircle2 
} from 'lucide-react';
import Navbar from './components/Navbar';
import StatsBar from './components/StatsBar';
import CameraModal from './components/CameraModal';
import RegisterSection from './components/RegisterSection';
import AttendanceTable from './components/AttendanceTable';
import { API_ENDPOINTS } from './config/api';

export default function App() {
  // Navigation & Action state
  const [activeTab, setActiveTab] = useState('REGISTER'); // 'REGISTER' | 'DASHBOARD'
  
  // Camera Modal state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState('PUNCH_IN'); // 'REGISTER' | 'PUNCH_IN' | 'PUNCH_OUT'
  const [targetEmployeeForReg, setTargetEmployeeForReg] = useState(null);

  // Data states
  const [systemStatus, setSystemStatus] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [todayAttendances, setTodayAttendances] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Fetch all initial data
  const loadAllData = async () => {
    try {
      const [statusRes, empRes, attRes, logsRes] = await Promise.all([
        fetch(API_ENDPOINTS.STATUS).then((r) => r.json()).catch(() => null),
        fetch(API_ENDPOINTS.EMPLOYEES).then((r) => r.json()).catch(() => null),
        fetch(API_ENDPOINTS.ATTENDANCE_TODAY).then((r) => r.json()).catch(() => null),
        fetch(API_ENDPOINTS.ATTENDANCE_LOGS).then((r) => r.json()).catch(() => null),
      ]);

      if (statusRes?.success) setSystemStatus(statusRes);
      if (empRes?.success) setEmployees(empRes.employees);
      if (attRes?.success) setTodayAttendances(attRes.attendances);
      if (logsRes?.success) setAuditLogs(logsRes.logs);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    loadAllData();
    // Auto refresh data every 12 seconds
    const interval = setInterval(loadAllData, 12000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // 1. Action: Register Face Button
  const handleOpenRegister = () => {
    setActiveTab('REGISTER');
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  // Trigger camera modal for Registration after verifying employee code
  const handleStartCameraRegistration = (employee) => {
    setTargetEmployeeForReg(employee);
    setCameraMode('REGISTER');
    setCameraModalOpen(true);
  };

  // 2. Action: Punch In Directly (Automatic face detection without verify button!)
  const handleOpenPunchIn = () => {
    setCameraMode('PUNCH_IN');
    setTargetEmployeeForReg(null);
    setCameraModalOpen(true);
  };

  // 3. Action: Punch Out Directly (Automatic face detection without verify button!)
  const handleOpenPunchOut = () => {
    setCameraMode('PUNCH_OUT');
    setTargetEmployeeForReg(null);
    setCameraModalOpen(true);
  };

  // Callback after successful registration / punch in / punch out
  const handleCameraSuccess = (result) => {
    loadAllData();
    showToast(result.message || 'Biometric scan completed successfully!', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <Navbar systemStatus={systemStatus} onRefresh={loadAllData} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Real-time Status Metric Badges */}
        {/* <StatsBar stats={systemStatus?.stats} /> */}

        {/* 3 PRIMARY ACTION BUTTONS (HERO SECTION - LIGHT THEME) */}
        <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
          
          {/* Subtle Light Ambient Glows */}
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />

          <div className="relative text-center max-w-2xl mx-auto mb-8 space-y-2">
            {/* <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Automatic Face Biometrics Kiosk</span>
            </div> */}
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Instant Biometric Punch In & Out
            </h1>
            {/* <p className="text-sm text-slate-500">
              Powered by InsightFace ArcFace AI. Position your face in the circle for instant hands-free automatic detection.
            </p> */}
          </div>

          {/* THE 3 CORE BUTTONS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 max-w-4xl mx-auto">
            
            {/* BUTTON 1: REGISTER */}
            <button
              onClick={handleOpenRegister}
              className={`group relative p-6 rounded-3xl border transition-all duration-300 text-left flex flex-col justify-between overflow-hidden cursor-pointer ${
                activeTab === 'REGISTER'
                  ? 'bg-gradient-to-br from-blue-50 to-indigo-50/40 border-blue-300 shadow-md ring-2 ring-blue-200/50'
                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 group-hover:scale-105 transition-transform shadow-inner">
                  <UserPlus className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-700 border border-blue-200">
                  Step 1
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  1. Register Face
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Enter authorized employee code, view personal details, and enroll your biometric face template.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                <span>Enter Code & Register &rarr;</span>
              </div>
            </button>

            {/* BUTTON 2: PUNCH IN (AUTOMATIC WITHOUT VERIFY BUTTON) */}
            <button
              onClick={handleOpenPunchIn}
              className="group relative p-6 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white hover:from-emerald-100/60 transition-all duration-300 text-left flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-300 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform shadow-inner">
                  <LogIn className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                  Auto Scan
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  2. Punch In
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Opens camera. Position face inside circle and it automatically detects, verifies, and logs Punch In!
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
                <span>Direct Face Scan &rarr;</span>
              </div>
            </button>

            {/* BUTTON 3: PUNCH OUT (AUTOMATIC WITHOUT VERIFY BUTTON) */}
            <button
              onClick={handleOpenPunchOut}
              className="group relative p-6 rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50/70 to-white hover:from-purple-100/60 transition-all duration-300 text-left flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md hover:border-purple-300 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 group-hover:scale-105 transition-transform shadow-inner">
                  <LogOut className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  Departure
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                  3. Punch Out
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Opens camera. Face is automatically detected in circle, calculates total login hours & logs departure.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-purple-100 flex items-center text-xs font-bold text-purple-700 group-hover:translate-x-1 transition-transform">
                <span>Direct Face Scan &rarr;</span>
              </div>
            </button>

          </div>
        </div>

        {/* SECTION 1: REGISTRATION WORKFLOW */}
        <RegisterSection 
          onStartCameraRegistration={handleStartCameraRegistration} 
        />

        {/* SECTION 2: ATTENDANCE RECORDS & AUDIT TRAILS 
        <AttendanceTable
          todayAttendances={todayAttendances}
          auditLogs={auditLogs}
          employees={employees}
          onQuickRegister={handleStartCameraRegistration}
          onRefresh={loadAllData}
        />*/}

      </main>

      {/* Interactive Biometric Camera Scanner Modal */}
      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        mode={cameraMode}
        targetEmployee={targetEmployeeForReg}
        onSuccessCallback={handleCameraSuccess}
      />

      {/* Toast Notification (Light Theme) */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-5 py-3.5 rounded-2xl bg-white border border-slate-200 shadow-xl text-sm font-semibold text-slate-800 animate-slideUp">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      

    </div>
  );
}
