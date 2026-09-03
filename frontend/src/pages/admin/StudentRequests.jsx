import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { useToast } from '../../components/common/Toast';
import { School, Check, X, ShieldCheck } from 'lucide-react';

export const StudentRequests = () => {
  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [selectedUser, setSelectedUser] = useState(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [approveForm, setApproveForm] = useState({ department_id: '', semester_id: '', section_id: '' });
  const [isActionLoading, setIsActionLoading] = useState(false);

  const { showToast } = useToast();

  const fetchRequests = async () => {
    try {
      const [reqs, depts] = await Promise.all([
        adminService.getStudentRequests(),
        adminService.getDepartments()
      ]);
      setRequests(reqs);
      setDepartments(depts);
    } catch (err) {
      console.error(err);
      showToast('Failed to load pending student requests', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleDeptSelect = async (deptId) => {
    setApproveForm(prev => ({ ...prev, department_id: deptId, semester_id: '', section_id: '' }));
    if (deptId) {
      const sems = await adminService.getSemesters(deptId);
      setSemesters(sems);
      if (sems.length > 0) {
        handleSemesterSelect(sems[0].id);
      }
    } else {
      setSemesters([]);
      setSections([]);
    }
  };

  const handleSemesterSelect = async (semId) => {
    setApproveForm(prev => ({ ...prev, semester_id: semId, section_id: '' }));
    if (semId) {
      const secs = await adminService.getSections(semId);
      setSections(secs);
      if (secs.length > 0) {
        setApproveForm(prev => ({ ...prev, semester_id: semId, section_id: secs[0].id }));
      }
    } else {
      setSections([]);
    }
  };

  const openApproveModal = async (u) => {
    setSelectedUser(u);
    const initialDeptId = u.student_profile?.department_id || (departments[0]?.id || '');
    setApproveForm({
      department_id: initialDeptId,
      semester_id: '',
      section_id: ''
    });
    if (initialDeptId) {
      const sems = await adminService.getSemesters(initialDeptId);
      setSemesters(sems);
      const targetSemId = u.student_profile?.semester_id || (sems[0]?.id || '');
      if (targetSemId) {
        const secs = await adminService.getSections(targetSemId);
        setSections(secs);
        setApproveForm({
          department_id: initialDeptId,
          semester_id: targetSemId,
          section_id: secs[0]?.id || ''
        });
      }
    }
    setIsApproveOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedUser || !approveForm.department_id || !approveForm.semester_id || !approveForm.section_id) {
      showToast('Please select department, semester, and section.', 'warning');
      return;
    }
    setIsActionLoading(true);
    try {
      await adminService.approveStudent(selectedUser.id, approveForm);
      showToast(`Student ${selectedUser.full_name} approved and enrolled in class!`, 'success');
      setIsApproveOpen(false);
      fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to approve student', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    setIsActionLoading(true);
    try {
      await adminService.rejectStudent(selectedUser.id);
      showToast(`Student signup for ${selectedUser.full_name} was rejected.`, 'info');
      setIsRejectOpen(false);
      fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to reject student', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) return <LoadingSkeleton type="table" count={4} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Student Pending Approvals
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Verify student roll numbers, assign academic semesters/sections, and activate enrollment
        </p>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No Pending Student Signups"
          description="All student registrations have been reviewed and activated."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Roll Number</th>
                  <th className="px-6 py-4">Requested Department</th>
                  <th className="px-6 py-4">Registered Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {requests.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{u.full_name}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {u.student_profile?.student_id || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        {u.student_profile?.department?.name || 'Pending Assignment'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openApproveModal(u)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve & Assign
                        </button>
                        <button
                          onClick={() => { setSelectedUser(u); setIsRejectOpen(true); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve & Assign Modal */}
      <Modal
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        title={`Assign & Approve: ${selectedUser?.full_name}`}
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Roll Number: <span className="font-mono text-teal-600 dark:text-teal-400">{selectedUser?.student_profile?.student_id}</span></p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Department
            </label>
            <select
              value={approveForm.department_id}
              onChange={(e) => handleDeptSelect(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Semester
              </label>
              <select
                value={approveForm.semester_id}
                onChange={(e) => handleSemesterSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>Semester {s.number}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Section
              </label>
              <select
                value={approveForm.section_id}
                onChange={(e) => setApproveForm({ ...approveForm, section_id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            * Approving this student will automatically enroll them in all active courses for the selected semester.
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setIsApproveOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={isActionLoading}
              className="px-5 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {isActionLoading ? 'Assigning...' : 'Approve & Auto-Enroll'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Dialog */}
      <ConfirmDialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={handleReject}
        title="Reject Student Registration"
        message={`Are you sure you want to reject the student signup for ${selectedUser?.full_name}?`}
        confirmText="Reject Student"
        isDangerous={true}
        isLoading={isActionLoading}
      />
    </div>
  );
};
