import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Modal } from '../../components/common/Modal';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { useToast } from '../../components/common/Toast';
import { Layers, Plus, Building2, Calendar } from 'lucide-react';

export const Semesters = () => {
  const [semesters, setSemesters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({ department_id: '', number: 1, academic_year: '2026-2027' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();

  const fetchSemesters = async () => {
    try {
      const [sList, dList] = await Promise.all([
        adminService.getSemesters(selectedDept || undefined),
        adminService.getDepartments()
      ]);
      setSemesters(sList);
      setDepartments(dList);
      if (dList.length > 0 && !formData.department_id) {
        setFormData(prev => ({ ...prev, department_id: dList[0].id }));
      }
    } catch (e) {
      showToast('Failed to load semesters', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, [selectedDept]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.department_id) return;
    setIsSubmitting(true);
    try {
      await adminService.createSemester({
        department_id: formData.department_id,
        number: Number(formData.number),
        academic_year: formData.academic_year
      });
      showToast('Semester created successfully!', 'success');
      setIsAddOpen(false);
      fetchSemesters();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to create semester', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSkeleton type="cards" count={3} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Academic Semesters
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure dynamic semesters and terms per department without hardcoding
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

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Semester
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {semesters.map((sem) => (
          <div
            key={sem.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400">
                {sem.department?.code || 'MCA'}
              </span>
              <Layers className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              Semester {sem.number}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              {sem.academic_year}
            </p>
          </div>
        ))}
      </div>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Semester">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Department
            </label>
            <select
              value={formData.department_id}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Semester Number
            </label>
            <input
              type="number"
              min="1"
              max="12"
              required
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Academic Year
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 2026-2027"
              value={formData.academic_year}
              onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
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
              {isSubmitting ? 'Creating...' : 'Create Semester'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
