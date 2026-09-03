import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { StatCard } from '../../components/common/StatCard';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import {
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  UserX,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const metrics = await adminService.getDashboard();
        setData(metrics);
      } catch (err) {
        console.error('Failed to fetch dashboard metrics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="cards" count={4} />
        <LoadingSkeleton type="table" count={3} />
      </div>
    );
  }

  const pieData = data ? [
    { name: 'Present', value: data.status_breakdown.PRESENT, color: '#10b981' },
    { name: 'Late', value: data.status_breakdown.LATE, color: '#f59e0b' },
    { name: 'Absent', value: data.status_breakdown.ABSENT, color: '#64748b' },
    { name: 'Rejected', value: data.status_breakdown.REJECTED, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          University Attendance Overview
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Real-time metrics, offline synchronization logs, and department insights
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Students"
          value={data?.total_students || 0}
          subtitle="Enrolled students"
          icon={Users}
          color="teal"
        />
        <StatCard
          title="Total Teachers"
          value={data?.total_teachers || 0}
          subtitle="Active faculty members"
          icon={GraduationCap}
          color="emerald"
        />
        <StatCard
          title="Total Subjects"
          value={data?.total_subjects || 0}
          subtitle="Across all semesters"
          icon={BookOpen}
          color="indigo"
        />
        <StatCard
          title="Classrooms"
          value={data?.total_classes || 0}
          subtitle="With BLE beacon support"
          icon={Building2}
          color="sky"
        />
      </div>

      {/* Today's Attendance Summary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-3 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Today's Attendance</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">{data?.total_attendance_today || 0}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Present (On Time)</p>
            <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{data?.present_today || 0}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Late Marked</p>
            <h4 className="text-xl font-bold text-amber-600 dark:text-amber-400">{data?.late_today || 0}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pending Sync Queue</p>
            <h4 className="text-xl font-bold text-sky-600 dark:text-sky-400">{data?.pending_sync_count || 0}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sync Failures</p>
            <h4 className="text-xl font-bold text-rose-600 dark:text-rose-400">{data?.sync_failure_count || 0}</h4>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend Line Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">7-Day Attendance Trend</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Daily present and late attendances</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.attendance_trend || []}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc'
                  }}
                />
                <Area type="monotone" dataKey="present" stroke="#10b981" fillOpacity={1} fill="url(#colorPresent)" name="Present" />
                <Area type="monotone" dataKey="late" stroke="#f59e0b" fillOpacity={1} fill="url(#colorLate)" name="Late" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown Donut Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Status Distribution</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Present vs Late vs Absent vs Rejected</p>
          </div>
          <div className="h-60 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData.length > 0 ? pieData : [{ name: 'No data', value: 1, color: '#334155' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Subject-wise Attendance Rates Bar Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Subject Attendance Performance</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Average attendance percentage by course subject</p>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.subject_wise_attendance || []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="subject" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} unit="%" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc'
                }}
              />
              <Bar dataKey="rate" fill="#0d9488" radius={[8, 8, 0, 0]} name="Attendance Rate (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
