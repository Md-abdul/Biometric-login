import React from 'react';
import { Users, UserCheck, LogIn, LogOut, CheckCircle2 } from 'lucide-react';

export default function StatsBar({ stats }) {
  const safeStats = stats || {
    totalEmployees: 5,
    registeredFaces: 0,
    presentToday: 0,
    currentlyIn: 0,
    punchedOutToday: 0,
  };

  const cards = [
    {
      title: 'Authorized Staff',
      value: safeStats.totalEmployees,
      label: 'Pre-seeded Catalog',
      icon: Users,
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      iconBg: 'bg-blue-100/70 text-blue-600',
    },
    {
      title: 'Biometric Enrolled',
      value: `${safeStats.registeredFaces} / ${safeStats.totalEmployees}`,
      label: 'InsightFace Profiles',
      icon: UserCheck,
      badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      iconBg: 'bg-cyan-100/70 text-cyan-600',
    },
    {
      title: 'Present Today',
      value: safeStats.presentToday,
      label: 'Marked Attendance',
      icon: CheckCircle2,
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconBg: 'bg-emerald-100/70 text-emerald-600',
    },
    {
      title: 'Active on Duty',
      value: safeStats.currentlyIn,
      label: 'Currently Punched In',
      icon: LogIn,
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      iconBg: 'bg-amber-100/70 text-amber-600',
    },
    {
      title: 'Completed Shift',
      value: safeStats.punchedOutToday,
      label: 'Punched Out Today',
      icon: LogOut,
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      iconBg: 'bg-purple-100/70 text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-1.5 rounded-xl ${card.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
              {card.value}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              {card.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
