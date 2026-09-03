import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { attendanceService } from '../../services/attendanceService';
import { StatCard } from '../../components/common/StatCard';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { useConnectivity } from '../../context/ConnectivityContext';
import {
  BookOpen,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Radio,
  Building2,
  ArrowRight,
  Sparkles,
  StopCircle
} from 'lucide-react';

export const TeacherDashboard = () => {
  const [data, setData] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const { registerActiveSessionBeacon } = useConnectivity();

  const fetchDashboard = async () => {
    try {
      const [dash, sched] = await Promise.all([
        attendanceService.getTeacherDashboard(),
        attendanceService.getTeacherSchedule()
      ]);
      setData(dash);
      setSchedule(sched);

      if (dash.active_session) {
        registerActiveSessionBeacon(
          dash.active_session.ble_identifier,
          dash.active_session.classroom?.name || 'Classroom'
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading) return <LoadingSkeleton type="cards" count={4} />;

  const todayWeekday = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const todayClasses = schedule.filter(s => s.day_of_week === todayWeekday);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-teal-800/40 shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Faculty Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {data?.teacher_name}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Employee ID: <span className="font-mono text-teal-400">{data?.employee_id}</span> • {data?.designation}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/teacher/start-attendance"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-teal-500/25 transition-all whitespace-nowrap"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              Start Attendance
            </Link>
          </div>
        </div>
      </div>

      {/* Active Session Notification Card (If attendance is actively broadcasting) */}
      {data?.active_session && (
        <div className="bg-emerald-500/10 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-lg animate-pulse-slow flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950 uppercase">
                  ACTIVE BROADCASTING
                </span>
                <span className="text-xs font-mono text-slate-400">{data.active_session.ble_identifier}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                {data.active_session.subject?.name} ({data.active_session.classroom?.name})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nearby student devices can detect BLE beacon and mark attendance offline or online.
              </p>
            </div>
          </div>

          <Link
            to={`/teacher/live-attendance`}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors whitespace-nowrap"
          >
            Monitor Live Attendance →
          </Link>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Assigned Courses"
          value={data?.assigned_subjects_count || 0}
          subtitle="Curriculum subjects"
          icon={BookOpen}
          color="teal"
        />
        <StatCard
          title="Students in Classes"
          value={data?.total_students || 0}
          subtitle="Total enrolled"
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="Today's Classes"
          value={data?.today_classes_count || 0}
          subtitle="Scheduled lectures"
          icon={Calendar}
          color="indigo"
        />
        <StatCard
          title="Present Today"
          value={data?.present_today || 0}
          subtitle={`${data?.late_today || 0} late marks`}
          icon={CheckCircle2}
          color="sky"
        />
      </div>

      {/* Today's Classes List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Today's Assigned Classes
          </h2>
          <Link to="/teacher/schedule" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline">
            View Full Weekly Schedule →
          </Link>
        </div>

        {todayClasses.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No Lectures Scheduled Today"
            description="You do not have any classes scheduled for today on the timetable."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {todayClasses.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{item.start_time} - {item.end_time}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Sem {item.semester?.number}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                    {item.subject?.code}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {item.subject?.name}
                  </h3>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{item.classroom?.name}</span>
                  </div>

                  <Link
                    to="/teacher/start-attendance"
                    className="font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                  >
                    Start <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
