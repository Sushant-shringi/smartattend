import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { attendanceService } from '../../services/attendanceService';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Calendar, Clock, Building2, User, ArrowRight, Radio } from 'lucide-react';

export const TodayClasses = () => {
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    attendanceService.getStudentTodayClasses()
      .then(setClasses)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingSkeleton type="cards" count={3} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Today's Lectures Schedule
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Assigned classes for your semester and section with live attendance availability
        </p>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Classes Scheduled Today"
          description="You are all caught up! There are no lectures on your timetable today."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((c) => (
            <div
              key={c.timetable_id}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                c.is_session_active && !c.already_marked
                  ? 'border-teal-500 ring-2 ring-teal-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{c.start_time} - {c.end_time}</span>
                  </div>

                  {c.already_marked ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      ✓ {c.marked_status || 'ATTENDED'}
                    </span>
                  ) : c.is_session_active ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500 text-slate-950 animate-pulse">
                      SESSION ACTIVE
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">
                      Scheduled
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                    {c.subject_code}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {c.subject_name}
                  </h3>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Instructor: <strong className="text-slate-800 dark:text-slate-200">{c.teacher_name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{c.classroom_name}</span>
                  </div>
                </div>
              </div>

              {c.is_session_active && !c.already_marked ? (
                <Link
                  to="/student/mark-attendance"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md transition-colors"
                >
                  <Radio className="w-4 h-4 animate-pulse" />
                  Mark Attendance (BLE Verified)
                </Link>
              ) : c.already_marked ? (
                <button
                  disabled
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 cursor-default"
                >
                  ✓ Attendance Already Recorded
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed"
                >
                  Attendance Not Started
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
