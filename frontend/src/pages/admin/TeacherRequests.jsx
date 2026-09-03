import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { useToast } from '../../components/common/Toast';
import { UserCheck, Check, X, Building2, GraduationCap, ShieldCheck } from 'lucide-react';

export const TeacherRequests = () => {
  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals state
  const [selectedUser, setSelectedUser] = useState(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [approveForm, setApproveForm] = useState({ department_id: '', designation: 'Assistant Professor' });
  const [isActionLoading, setIsActionLoading] = useState(false);

  const { showToast } = useToast();

  const fetchRequests = async () => {
    try {
      const [reqs, depts] = await Promise.all([
        adminService.getTeacherRequests(),
        adminService.getDepartments()
      ]);
      setRequests(reqs);
      setDepartments(depts);
    } catch (err) {
      console.error(err);
      showToast('Failed to load pending teacher requests', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const openApproveModal = (u) => {
    setSelectedUser(u);
    setApproveForm({
      department_id: u.teacher_profile?.department_id || (departments[0]?.id || ''),
      designation: u.teacher_profile?.designation || 'Assistant Professor'
    });
    setIsApproveOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedUser) return;
    setIsActionLoading(true);
    try {
      await adminService.approveTeacher(selectedUser.id, approveForm);
      showToast(`Teacher ${selectedUser.full_name} approved and activated!`, 'success');
      setIsApproveOpen(false);
      fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to approve teacher', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    setIsActionLoading(true);
    try {
      await adminService.rejectTeacher(selectedUser.id);
      showToast(`Teacher signup for ${selectedUser.full_name} was rejected.`, 'info');
      setIsRejectOpen(false);
      fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to reject teacher', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) return <LoadingSkeleton type="table" count={4} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          Faculty Pending Approvals
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review and approve newly registered instructors before they can conduct attendance
        </p>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="All Caught Up!"
          description="There are currently no faculty registration requests waiting for review."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Faculty Member</th>
                  <th className="px-6 py-4">Employee ID</th>
                  <th className="px-6 py-4">Department / Subject</th>
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
                        <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{u.full_name}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {u.teacher_profile?.employee_id || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        {u.teacher_profile?.department?.name || 'Unassigned'}
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
                          Approve
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

      {/* Approve Faculty Modal */}
      <Modal
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        title={`Approve Faculty: ${selectedUser?.full_name}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assign Department
            </label>
            <select
              value={approveForm.department_id}
              onChange={(e) => setApproveForm({ ...approveForm, department_id: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Designation
            </label>
            <input
              type="text"
              value={approveForm.designation}
              onChange={(e) => setApproveForm({ ...approveForm, designation: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

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
              {isActionLoading ? 'Activating...' : 'Approve & Activate'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Confirm Dialog */}
      <ConfirmDialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={handleReject}
        title="Reject Teacher Application"
        message={`Are you sure you want to reject registration for ${selectedUser?.full_name}? They will not be able to log in.`}
        confirmText="Reject Application"
        isDangerous={true}
        isLoading={isActionLoading}
      />
    </div>
  );
};
