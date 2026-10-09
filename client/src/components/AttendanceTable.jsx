import React, { useState } from 'react';
import { 
  Users, CheckCircle2, Clock, AlertTriangle, ShieldCheck, 
  Calendar, Search, Filter, Camera, RefreshCw
} from 'lucide-react';

export default function AttendanceTable({ 
  todayAttendances, 
  auditLogs, 
  employees, 
  onQuickRegister,
  onRefresh 
}) {
  const [activeTab, setActiveTab] = useState('TODAY'); // 'TODAY' | 'EMPLOYEES' | 'AUDIT'
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAttendances = (todayAttendances || []).filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.employeeName?.toLowerCase().includes(q) ||
      item.employeeCode?.toLowerCase().includes(q) ||
      item.department?.toLowerCase().includes(q)
    );
  });

  const filteredEmployees = (employees || []).filter((emp) => {
    const q = searchTerm.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(q) ||
      emp.employeeCode?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q) ||
      emp.designation?.toLowerCase().includes(q)
    );
  });

  const formatTime = (timeStr) => {
    if (!timeStr) return '--';
    const d = new Date(timeStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-7 shadow-sm">
      
      {/* Tab Navigation & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between pb-6 border-b border-slate-100 gap-4">
        
        {/* Tabs (Light Theme) */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200/80 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('TODAY')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
              activeTab === 'TODAY'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Today's Attendance ({todayAttendances?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('EMPLOYEES')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
              activeTab === 'EMPLOYEES'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Staff Directory ({employees?.length || 5})</span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
              activeTab === 'AUDIT'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Live Audit Logs</span>
          </button>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center space-x-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, ID..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>

          <button
            onClick={onRefresh}
            title="Refresh Table"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0 border border-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* TAB 1: TODAY'S ATTENDANCE */}
      {activeTab === 'TODAY' && (
        <div className="mt-5 overflow-x-auto">
          {filteredAttendances.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Clock className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No attendance records logged yet today</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Employees can click the "Punch In" button above to automatically scan their face and log arrival.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px] bg-slate-50/50">
                  <th className="py-3 px-4 rounded-l-xl">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Punch In</th>
                  <th className="py-3 px-4">Punch Out</th>
                  <th className="py-3 px-4">Work Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Match Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAttendances.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shadow-sm">
                          {item.employeeName?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 tracking-tight">
                            {item.employeeName}
                          </div>
                          <div className="text-[11px] font-mono font-semibold text-blue-600">
                            {item.employeeCode}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="font-semibold">{item.department || '--'}</div>
                      <div className="text-[10px] text-slate-500">{item.designation}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-emerald-700 font-bold">
                      {formatTime(item.punchInTime)}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {item.punchOutTime ? formatTime(item.punchOutTime) : (
                        <span className="text-amber-600 text-[11px] font-semibold animate-pulse">
                          In Progress
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      {item.totalWorkFormatted ? (
                        <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                          {item.totalWorkFormatted}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">--</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {item.status === 'Completed' ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold flex items-center w-fit space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Punched Out</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold flex items-center w-fit space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                          <span>On Duty</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-slate-600 font-semibold">
                      {item.confidenceScore ? `${Math.round(item.confidenceScore * 100)}%` : 'AI'}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: STAFF DIRECTORY */}
      {activeTab === 'EMPLOYEES' && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px] bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-xl">Staff Member</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4">Biometrics</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredEmployees.map((emp) => (
                <tr key={emp.employeeCode} className="hover:bg-slate-50/70 transition-colors">
                  
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shadow-sm">
                        {emp.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 tracking-tight">{emp.name}</div>
                        <div className="text-[11px] font-mono font-semibold text-blue-600">{emp.employeeCode}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-700">
                    <div>{emp.email}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{emp.phone}</div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-700">
                    <div className="font-semibold">{emp.department}</div>
                    <div className="text-[11px] text-slate-500">{emp.designation}</div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {emp.joiningDate}
                  </td>

                  <td className="py-3.5 px-4">
                    {emp.faceRegistered ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold flex items-center w-fit space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Enrolled</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold flex items-center w-fit space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Pending</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onQuickRegister(emp)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-all cursor-pointer"
                    >
                      {emp.faceRegistered ? 'Re-enroll' : 'Enroll Face'}
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'AUDIT' && (
        <div className="mt-5 overflow-x-auto">
          {(!auditLogs || auditLogs.length === 0) ? (
            <div className="py-12 text-center text-slate-400">
              <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No biometric audit logs recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {auditLogs.map((log) => {
                const isSuccess = log.status === 'SUCCESS';
                return (
                  <div
                    key={log.id}
                    className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between transition-all ${
                      isSuccess
                        ? 'bg-emerald-50/40 border-emerald-200/70 text-slate-700'
                        : 'bg-rose-50/60 border-rose-200 text-rose-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                          log.punchType === 'IN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.punchType === 'OUT'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {log.punchType}
                      </span>

                      <div>
                        <div className="font-bold text-slate-900">
                          {log.employeeName || 'Unknown Staff'} {log.employeeCode && `(${log.employeeCode})`}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {log.message}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono text-[11px] text-slate-500 shrink-0 ml-4 font-semibold">
                      {formatTime(log.timestamp)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
