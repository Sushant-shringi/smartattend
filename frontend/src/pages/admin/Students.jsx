import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { useToast } from '../../components/common/Toast';
import { School, Search, UserX, UserCheck, Filter } from 'lucide-react';

export const Students = () => {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const { showToast } = useToast();

  const fetchStudents = async () => {
    try {
      const [sList, dList] = await Promise.all([
        adminService.getStudents({ department_id: selectedDept || undefined }),
        adminService.getDepartments()
      ]);
      setStudents(sList);
      setDepartments(dList);
    } catch (err) {
      console.error(err);
      showToast('Failed to load student directory', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedDept]);

  const handleToggleStatus = async (studentUser) => {
    const nextStatus = studentUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await adminService.updateStudentStatus(studentUser.id, nextStatus);
      showToast(`Student status updated to ${nextStatus}`, 'info');
      fetchStudents();
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const filteredStudents = students.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.student_profile?.student_id?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <LoadingSkeleton type="table" count={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Student Directory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enrolled students, academic classes, sections, and statuses
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
            ))}
          </select>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by roll number or name..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Roll Number</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Semester & Class</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
              {filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        {s.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{s.full_name}</p>
                        <p className="text-xs text-slate-400">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                    {s.student_profile?.student_id || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      {s.student_profile?.department?.code || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                    {s.student_profile?.semester ? `Semester ${s.student_profile.semester.number} - Sec ${s.student_profile.section?.name || 'A'}` : 'Not Assigned'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggleStatus(s)}
                      className={`p-1.5 rounded-xl border text-xs font-bold transition-colors ${
                        s.status === 'ACTIVE'
                          ? 'text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10'
                          : 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
                      }`}
                      title={s.status === 'ACTIVE' ? 'Suspend Student' : 'Activate Student'}
                    >
                      {s.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
