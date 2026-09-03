import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
import { Download, Filter, FileSpreadsheet, CheckCircle2, Clock, XCircle, Search } from 'lucide-react';

export const Reports = () => {
  const [reportData, setReportData] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    subject_id: '',
    teacher_id: '',
    status: ''
  });

  const { showToast } = useToast();

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const [res, subList, tList] = await Promise.all([
        adminService.getReports(filters),
        adminService.getSubjects(),
        adminService.getTeachers()
      ]);
      setReportData(res);
      setSubjects(subList);
      setTeachers(tList);
    } catch (e) {
      showToast('Failed to load attendance reports', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const blob = await adminService.exportReportsCsv(filters);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `smartattend-report-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToast('Attendance report CSV downloaded!', 'success');
    } catch (e) {
      showToast('Failed to download CSV report', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Attendance Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate, filter, and export verified proximity attendance records
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={isExporting || reportData?.total_records === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Exporting...' : 'Export to CSV'}
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div>
          <label className="block font-semibold text-slate-500 dark:text-slate-400 mb-1">Subject</label>
          <select
            value={filters.subject_id}
            onChange={(e) => setFilters({ ...filters, subject_id: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-teal-500"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-500 dark:text-slate-400 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">PRESENT</option>
            <option value="LATE">LATE</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-500 dark:text-slate-400 mb-1">From Date</label>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-500 dark:text-slate-400 mb-1">To Date</label>
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={() => setFilters({ start_date: '', end_date: '', subject_id: '', teacher_id: '', status: '' })}
            className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Summary KPI Counters */}
      {reportData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Records</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">{reportData.total_records}</h4>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Present (On-Time)</p>
            <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{reportData.present_count}</h4>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Late Marked</p>
            <h4 className="text-xl font-bold text-amber-600 dark:text-amber-400">{reportData.late_count}</h4>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Rejected Records</p>
            <h4 className="text-xl font-bold text-rose-600 dark:text-rose-400">{reportData.rejected_count}</h4>
          </div>
        </div>
      )}

      {/* Report Records Table */}
      {isLoading ? (
        <LoadingSkeleton type="table" count={5} />
      ) : reportData?.rows?.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No Attendance Records Found"
          description="No attendance records match your filter criteria."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Roll Number</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Instructor</th>
                  <th className="px-6 py-4">Marked Time (UTC)</th>
                  <th className="px-6 py-4">BLE RSSI</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-xs">
                {reportData.rows.map((row) => (
                  <tr key={row.attendance_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                      {row.student_name}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-teal-600 dark:text-teal-400 font-bold">
                      {row.student_roll}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-bold">{row.subject_code}</span>: {row.subject_name}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400">
                      {row.teacher_name}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-500 dark:text-slate-400">
                      {new Date(row.marked_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 font-mono">
                      {row.ble_rssi !== null ? (
                        <span className={row.ble_rssi >= -85 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                          {row.ble_rssi} dBm
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={row.sync_status} />
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
