import React, { useState } from 'react';
import { 
  Search, User, Mail, Phone, Building2, Briefcase, 
  Calendar, ShieldCheck, AlertCircle, Camera, CheckCircle2,
  Sparkles, RefreshCw
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { API_ENDPOINTS } from '../config/api';

export default function RegisterSection({ onStartCameraRegistration }) {
  const [employeeCodeInput, setEmployeeCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [error, setError] = useState(null);

  // Quick chips for effortless testing
  const sampleCodes = ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005'];

  const handleLookup = async (codeToSearch) => {
    const code = (codeToSearch || employeeCodeInput || '').trim().toUpperCase();
    if (!code) {
      setError('Please enter your Employee Code (e.g. EMP001)');
      setEmployeeDetails(null);
      return;
    }

    setLoading(true);
    setError(null);
    setEmployeeDetails(null);

    try {
      const res = await fetch(API_ENDPOINTS.EMPLOYEE_BY_CODE(code));
      const data = await res.json();

      if (!res.ok || !data.success) {
        sounds.playError();
        setError(data.error || `Employee Code "${code}" is not in company database.`);
        setEmployeeDetails(null);
      } else {
        setEmployeeDetails(data.employee);
        sounds.playSuccess();
      }
    } catch (err) {
      console.error(err);
      sounds.playError();
      setError('Connection error while searching employee records.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (code) => {
    setEmployeeCodeInput(code);
    handleLookup(code);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLookup();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Header card (Light Theme) */}
      <div className="p-6 md:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Employee Face Registration
            </h2>
            <p className="text-xs text-slate-500">
              Enter your authorized employee code to verify identity and register your face profile.
            </p>
          </div>
        </div>

        {/* Input box */}
        <div className="mt-5 space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Enter Unique Employee Code
          </label>
          <div className="flex items-center space-x-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={employeeCodeInput}
                onChange={(e) => {
                  setEmployeeCodeInput(e.target.value.toUpperCase());
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="e.g. EMP001"
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 text-slate-900 font-mono text-base placeholder-slate-400 transition-all outline-none"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>

            <button
              onClick={() => handleLookup()}
              disabled={loading || !employeeCodeInput.trim()}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer shrink-0"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <span>Verify Code</span>
              )}
            </button>
          </div>

          {/* Quick Select demo pills 
          <div className="flex flex-wrap items-center gap-2 pt-1.5">
            <span className="text-[11px] text-slate-500 font-semibold">Quick Sample IDs:</span>
            {sampleCodes.map((code) => (
              <button
                key={code}
                onClick={() => handleQuickSelect(code)}
                className={`text-xs font-mono font-medium px-3 py-1 rounded-xl transition-all border cursor-pointer ${
                  employeeCodeInput === code
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300'
                }`}
              >
                {code}
              </button>
            ))}
          </div>*/}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start space-x-3 text-sm animate-shake">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">Authorization Failed</strong>
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Employee Details Card (Rendered when code matches) */}
      {employeeDetails && (
        <div className="p-6 md:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm animate-fadeIn space-y-6">
          
          {/* Top Profile Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold font-mono shadow-md shadow-blue-500/20">
                {employeeDetails.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {employeeDetails.name}
                  </h3>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {employeeDetails.employeeCode}
                  </span>
                </div>
                <p className="text-sm text-blue-600 font-semibold mt-0.5">
                  {employeeDetails.designation} &bull; {employeeDetails.department}
                </p>
                <p className="text-xs text-slate-500">
                  {employeeDetails.company}
                </p>
              </div>
            </div>

            {/* Face Registration Status Badge */}
            <div>
              {employeeDetails.faceRegistered ? (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Face Already Registered</span>
                </div>
              ) : (
                <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Biometrics Pending</span>
                </div>
              )}
            </div>
          </div>

          {/* Grid of full employee fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1 font-medium">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Work Email</span>
              </div>
              <div className="text-xs font-semibold text-slate-800 truncate">
                {employeeDetails.email}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1 font-medium">
                <Phone className="w-3.5 h-3.5 text-cyan-600" />
                <span>Phone Number</span>
              </div>
              <div className="text-xs font-semibold text-slate-800 font-mono">
                {employeeDetails.phone}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1 font-medium">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                <span>Employment Type</span>
              </div>
              <div className="text-xs font-semibold text-slate-800">
                {employeeDetails.employmentType}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1 font-medium">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Department</span>
              </div>
              <div className="text-xs font-semibold text-slate-800">
                {employeeDetails.department}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                <span>Joining Date</span>
              </div>
              <div className="text-xs font-semibold text-slate-800 font-mono">
                {employeeDetails.joiningDate}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center space-x-2 text-slate-500 text-xs mb-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Account Status</span>
              </div>
              <div className="text-xs font-bold text-emerald-700">
                {employeeDetails.status}
              </div>
            </div>

          </div>

          {/* Action button below details */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              {employeeDetails.faceRegistered 
                ? 'Biometric template is enrolled in PostgreSQL. You can re-scan anytime to update.' 
                : 'Click below to open the camera and complete face biometric enrollment.'}
            </p>

            <button
              onClick={() => onStartCameraRegistration(employeeDetails)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer shrink-0"
            >
              <Camera className="w-4 h-4" />
              <span>
                {employeeDetails.faceRegistered 
                  ? 'Re-Register / Update Face ID' 
                  : 'Complete Face Registration'}
              </span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
