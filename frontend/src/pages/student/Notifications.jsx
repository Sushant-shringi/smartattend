import React, { useState, useEffect } from 'react';
import { attendanceService } from '../../services/attendanceService';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Bell, CheckCircle2, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const data = await attendanceService.getStudentNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await attendanceService.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <LoadingSkeleton type="cards" count={3} />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Notifications & Alerts
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Important announcements, low attendance warnings, and class alerts
        </p>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="All Caught Up!"
          description="You do not have any unread notifications."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const icons = {
              SUCCESS: CheckCircle2,
              WARNING: AlertTriangle,
              ALERT: AlertCircle,
              INFO: Info
            };
            const Icon = icons[n.type] || Info;

            return (
              <div
                key={n.id}
                onClick={() => handleMarkRead(n.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  n.is_read
                    ? 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-70'
                    : 'bg-white dark:bg-slate-900 border-teal-500/40 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{n.title}</h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
