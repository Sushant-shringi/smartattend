import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
import { GraduationCap, Search, Plus, BookOpen, UserX, UserCheck, Shield } from 'lucide-react';

export const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Assign Subject Modal
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const { showToast } = useToast();

  const fetchTeachers = async () => {
    try {
      const [tList, subList] = await Promise.all([
        adminService.getTeachers(),
        adminService.getSubjects()
      ]);
      setTeachers(tList);
      setSubjects(subList);
      if (subList.length > 0) setSelectedSubjectId(subList[0].id);
    } catch (err) {
      console.error(err);
      showToast('Failed to load faculty roster', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleAssignSubject = async () => {
    if (!selectedTeacher || !selectedSubjectId) return;
    setIsActionLoading(true);
    try {
      await adminService.assignSubjectToTeacher(selectedTeacher.teacher_profile.id, selectedSubjectId);
      showToast('Subject successfully assigned to faculty member!', 'success');
      setIsAssignOpen(false);
      fetchTeachers();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to assign subject', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleStatus = async (teacherUser) => {
    const nextStatus = teacherUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await adminService.updateTeacherStatus(teacherUser.id, nextStatus);
      showToast(`Faculty account marked as ${nextStatus}`, 'info');
      fetchTeachers();
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const filteredTeachers = teachers.filter((t) =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase()) ||
    t.teacher_profile?.employee_id?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <LoadingSkeleton type="table" count={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Faculty Directory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage instructors, course assignments, and account statuses
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search faculty..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Faculty</th>
                <th className="px-6 py-4">Employee ID</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
              {filteredTeachers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                        {t.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{t.full_name}</p>
                        <p className="text-xs text-slate-400">{t.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                    {t.teacher_profile?.employee_id || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      {t.teacher_profile?.department?.name || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t.teacher_profile?.designation || 'Instructor'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setSelectedTeacher(t); setIsAssignOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 rounded-xl border border-teal-500/20 transition-colors"
                        title="Assign Course Subject"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Assign Subject
                      </button>
                      <button
                        onClick={() => handleToggleStatus(t)}
                        className={`p-1.5 rounded-xl border text-xs font-bold transition-colors ${
                          t.status === 'ACTIVE'
                            ? 'text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10'
                            : 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
                        }`}
                        title={t.status === 'ACTIVE' ? 'Suspend Faculty' : 'Activate Faculty'}
                      >
                        {t.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Subject Modal */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title={`Assign Subject: ${selectedTeacher?.full_name}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Course Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code}: {sub.name} (Sem {sub.semester?.number || 1})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setIsAssignOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignSubject}
              disabled={isActionLoading}
              className="px-5 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {isActionLoading ? 'Assigning...' : 'Assign Course'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
