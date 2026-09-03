import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { attendanceService } from '../../services/attendanceService';
import { StatCard } from '../../components/common/StatCard';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Radio,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BookOpen,
  Calendar,
  ArrowRight,
  TrendingUp,
  Percent
} from 'lucide-react';

export const StudentDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [todayClasses, setTodayClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const [stats, classes] = await Promise.all([
          attendanceService.getStudentDashboard(),
          attendanceService.getStudentTodayClasses()
        ]);
        setAnalytics(stats);
        setTodayClasses(classes);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudentData();
  }, []);

  if (isLoading) return <LoadingSkeleton type="cards" count={4} />;

  const hasActiveSession = todayClasses.some(c => c.is_session_active && !c.already_marked);

  return (
    <div className="space-y-8">
      {/* Active Attendance Notification Banner */}
      {hasActiveSession && (
        <div className="bg-gradient-to-r from-teal-500/20 via-emerald-500/20 to-teal-500/20 border-2 border-teal-500/40 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse-slow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/30">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500 text-slate-950 uppercase">
                ATTENDANCE IN PROGRESS
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                Your class attendance session is currently active!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You are within classroom range. Mark your presence offline or online.
              </p>
            </div>
          </div>

          <Link
            to="/student/mark-attendance"
            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-md transition-colors whitespace-nowrap"
          >
            Mark Attendance Now →
          </Link>
        </div>
      )}

      {/* Low Attendance Warning Alert */}
      {analytics?.low_attendance_warning && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-600 dark:text-amber-400 text-xs font-semibold">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>
            Warning: Your overall attendance is below 75% ({analytics.overall_percentage}%). University guidelines require minimum 75% attendance to appear in semester examinations.
          </span>
        </div>
      )}

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Overall Attendance"
          value={`${analytics?.overall_percentage || 0}%`}
          subtitle={analytics?.overall_percentage >= 75 ? 'Above 75% requirement' : 'Low attendance warning'}
          icon={Percent}
          color={analytics?.overall_percentage >= 75 ? 'teal' : 'amber'}
        />
        <StatCard
          title="Present (On Time)"
          value={analytics?.present_count || 0}
          subtitle="Classes attended on time"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Late Marks"
          value={analytics?.late_count || 0}
          subtitle="Marked in late window"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Total Conducted"
          value={analytics?.total_sessions || 0}
          subtitle="Semester lectures"
          icon={BookOpen}
          color="indigo"
        />
      </div>

      {/* Subject-Wise Attendance Progress Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          Subject-Wise Attendance Percentage
        </h2>

        {analytics?.subject_stats?.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No Course Attendance Recorded"
            description="Attendance percentages will appear once class sessions are conducted."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {analytics?.subject_stats?.map((sub) => {
              const isLow = sub.percentage < 75 && sub.total_sessions > 0;
              return (
                <div
                  key={sub.subject_id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                        {sub.subject_code}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {sub.subject_name}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-extrabold font-mono ${isLow ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {sub.percentage}%
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {sub.attended_sessions}/{sub.total_sessions} Lectures
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-amber-500' : 'bg-teal-500'}`}
                      style={{ width: `${Math.min(100, sub.percentage)}%` }}
                    />
                  </div>

                  {isLow && (
                    <p className="text-[11px] text-amber-500 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Attendance below 75% threshold
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Today's Schedule Shortcut */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Today's Schedule & Attendance Status
          </h2>
          <Link to="/student/classes" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline">
            View Schedule →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {todayClasses.map((item) => (
            <div
              key={item.timetable_id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono text-xs font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{item.start_time} - {item.end_time}</span>
                </div>
                {item.already_marked ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    ✓ {item.marked_status || 'MARKED'}
                  </span>
                ) : item.is_session_active ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500 text-slate-950 animate-pulse">
                    ACTIVE NOW
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">
                    Not Started
                  </span>
                )}
              </div>

              <div>
                <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                  {item.subject_code}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {item.subject_name}
                </h3>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{item.classroom_name}</span>
                {item.is_session_active && !item.already_marked && (
                  <Link
                    to="/student/mark-attendance"
                    className="font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                  >
                    Mark <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
