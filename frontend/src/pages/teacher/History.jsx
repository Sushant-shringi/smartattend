import React, { useState, useEffect } from 'react';
import { attendanceService } from '../../services/attendanceService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { History as HistoryIcon, Download } from 'lucide-react';

export const TeacherHistory = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    attendanceService.getAttendanceHistory(100)
      .then(setRecords)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingSkeleton type="table" count={5} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Attendance History
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Historical attendance logs for sessions conducted by you
        </p>
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No Attendance History Found"
          description="Attendance records marked in your classes will appear here."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Marked Date</th>
                  <th className="px-6 py-4">Student Roll</th>
                  <th className="px-6 py-4">Course Subject</th>
                  <th className="px-6 py-4">BLE Signal</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Sync Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-xs">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-slate-500 dark:text-slate-400">
                      {new Date(r.marked_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-teal-600 dark:text-teal-400 font-bold">
                      {r.student?.student_id || 'Student'}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                      {r.session?.subject?.name || 'Course'}
                    </td>
                    <td className="px-6 py-3.5 font-mono">
                      {r.ble_rssi !== null ? `${r.ble_rssi} dBm` : '-'}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={r.sync_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
