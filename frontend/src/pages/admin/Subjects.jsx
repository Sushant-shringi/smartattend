import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Modal } from '../../components/common/Modal';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { useToast } from '../../components/common/Toast';
import { BookOpen, Plus, Search, Layers, Award } from 'lucide-react';

export const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    credits: 4,
    department_id: '',
    semester_id: '',
    description: ''
  });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();

  const fetchAcademicData = async () => {
    try {
      const [subs, depts] = await Promise.all([
        adminService.getSubjects(),
        adminService.getDepartments()
      ]);
      setSubjects(subs);
      setDepartments(depts);
      if (depts.length > 0) {
        const sems = await adminService.getSemesters(depts[0].id);
        setSemesters(sems);
        setFormData(prev => ({
          ...prev,
          department_id: depts[0].id,
          semester_id: sems[0]?.id || ''
        }));
      }
    } catch (e) {
      showToast('Failed to load subjects', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicData();
  }, []);

  const handleDeptChange = async (deptId) => {
    setFormData(prev => ({ ...prev, department_id: deptId, semester_id: '' }));
    if (deptId) {
      const sems = await adminService.getSemesters(deptId);
      setSemesters(sems);
      if (sems.length > 0) {
        setFormData(prev => ({ ...prev, department_id: deptId, semester_id: sems[0].id }));
      }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.name || !formData.department_id || !formData.semester_id) return;
    setIsSubmitting(true);
    try {
      await adminService.createSubject({
        code: formData.code.toUpperCase(),
        name: formData.name,
        credits: Number(formData.credits),
        department_id: formData.department_id,
        semester_id: formData.semester_id,
        description: formData.description
      });
      showToast(`Subject ${formData.code} created!`, 'success');
      setIsAddOpen(false);
      setFormData(prev => ({ ...prev, code: '', name: '', description: '' }));
      fetchAcademicData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to create subject', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <LoadingSkeleton type="table" count={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Course Subjects
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Curriculum subjects, academic credits, and assigned semesters
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search course subjects..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-teal-500"
            />
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Subject
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Subject Code</th>
                <th className="px-6 py-4">Course Name</th>
                <th className="px-6 py-4">Credits</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Semester</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
              {filtered.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                    {sub.code}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{sub.name}</p>
                    {sub.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">{sub.description}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                      <Award className="w-3 h-3 text-amber-500" />
                      {sub.credits} Credits
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                    {sub.department?.name || 'MCA'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold px-2 py-1 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg">
                      Semester {sub.semester?.number || 1}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Course Subject">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject Code
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MCA201"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Credits
              </label>
              <input
                type="number"
                min="1"
                max="8"
                required
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Course Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Data Engineering"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <select
                value={formData.department_id}
                onChange={(e) => handleDeptChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Semester
              </label>
              <select
                value={formData.semester_id}
                onChange={(e) => setFormData({ ...formData, semester_id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>Semester {s.number}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Brief course objectives..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Subject'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
