import React, { useState, useEffect } from 'react';
import { ScanFace, Clock, Database, Cpu, Activity, RefreshCw } from 'lucide-react';

export default function Navbar({ systemStatus, onRefresh }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = time.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Terminal Info */}
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-[2px] shadow-md shadow-blue-500/20">
              <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
                <ScanFace className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  HRMS
                </span>
                {/* <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  v2.1 AI
                </span> */}
              </div>
              {/* <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                InsightFace Biometric Kiosk Terminal
              </p> */}
            </div>
          </div>

          {/* Center Digital Clock */}
          <div className="hidden md:flex flex-col items-center px-5 py-1.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-inner">
            <div className="flex items-center space-x-2 font-mono text-xl font-bold tracking-wider text-slate-900">
              <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
              <span>{formattedTime}</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {formattedDate}
            </span>
          </div>

          {/* Right Status Badges & Refresh */}
          <div className="flex items-center space-x-2.5">
            {/* AI Engine Status */}
            {/* <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-slate-700 font-semibold">InsightFace</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
            </div> */}

            {/* PostgreSQL Status */}
            {/* <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-slate-700 font-semibold">Postgres 17</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
            </div> */}

            {/* Refresh button */}
            <button
              onClick={onRefresh}
              title="Refresh Data"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
