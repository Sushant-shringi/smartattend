import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Building2,
  Layers,
  FileCheck,
  BarChart3,
  ShieldAlert,
  Clock,
  Radio,
  History,
  Bell,
  UserCircle,
  LogOut,
  UserCheck,
  Sparkles,
  School
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getNavLinks = () => {
    if (user?.role === 'ADMIN') {
      return [
        { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Teacher Requests', path: '/admin/teacher-requests', icon: UserCheck },
        { label: 'Student Requests', path: '/admin/student-requests', icon: Users },
        { label: 'Teachers', path: '/admin/teachers', icon: GraduationCap },
        { label: 'Students', path: '/admin/students', icon: School },
        { label: 'Departments', path: '/admin/departments', icon: Building2 },
        { label: 'Semesters', path: '/admin/semesters', icon: Layers },
        { label: 'Subjects', path: '/admin/subjects', icon: BookOpen },
        { label: 'Classrooms', path: '/admin/classrooms', icon: Building2 },
        { label: 'Timetable', path: '/admin/timetable', icon: Calendar },
        { label: 'Attendance Logs', path: '/admin/attendance', icon: FileCheck },
        { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
        { label: 'Audit Logs', path: '/admin/audit-logs', icon: ShieldAlert },
      ];
    } else if (user?.role === 'TEACHER') {
      return [
        { label: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
        { label: 'My Classes', path: '/teacher/classes', icon: BookOpen },
        { label: "Today's Schedule", path: '/teacher/schedule', icon: Calendar },
        { label: 'Start Attendance', path: '/teacher/start-attendance', icon: Radio },
        { label: 'Live Attendance', path: '/teacher/live-attendance', icon: Clock },
        { label: 'Attendance History', path: '/teacher/history', icon: History },
        { label: 'Reports', path: '/teacher/reports', icon: BarChart3 },
      ];
    } else if (user?.role === 'STUDENT') {
      return [
        { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
        { label: "Today's Classes", path: '/student/classes', icon: Calendar },
        { label: 'Mark Attendance', path: '/student/mark-attendance', icon: Radio },
        { label: 'Attendance History', path: '/student/history', icon: History },
        { label: 'Notifications', path: '/student/notifications', icon: Bell },
        { label: 'My Profile', path: '/student/profile', icon: UserCircle },
      ];
    }
    return [];
  };

  const navLinks = getNavLinks();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-slate-100">
                SmartAttend
              </h1>
              <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 tracking-wider uppercase">
                Offline-First BLE
              </span>
            </div>
          </div>
        </div>

        {/* User Role Badge in Sidebar */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">
                {user?.full_name}
              </p>
              <span className="inline-block text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Logout & Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
