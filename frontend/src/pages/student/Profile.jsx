import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, School, Building2, Layers, Mail, Phone, ShieldCheck } from 'lucide-react';

export const StudentProfile = () => {
  const { user } = useAuth();
  const profile = user?.student_profile;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Student Profile
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Personal university enrollment details and academic assignments
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-slate-100 dark:border-slate-800 text-center sm:text-left">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-teal-600 to-emerald-400 text-white font-extrabold text-3xl flex items-center justify-center shadow-lg shadow-teal-500/20">
            {user?.full_name?.charAt(0)}
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{user?.full_name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
            <p className="text-xs font-mono text-teal-600 dark:text-teal-400 font-bold mt-0.5">
              Roll No: {profile?.student_id || 'N/A'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Username: @{user?.username}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Mail className="w-4 h-4" />
              <span>Email Address</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{user?.email}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Phone className="w-4 h-4" />
              <span>Phone Number</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{user?.phone || '+91-9812345678'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Building2 className="w-4 h-4" />
              <span>Department</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {profile?.department?.name || 'Master of Computer Applications'} ({profile?.department?.code || 'MCA'})
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Layers className="w-4 h-4" />
              <span>Semester & Section</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Semester {profile?.semester?.number || 2} • Section {profile?.section?.name || 'A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
