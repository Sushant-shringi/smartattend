import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Modal } from '../../components/common/Modal';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
import { Calendar, Plus, Clock, Building2, User, BookOpen, Trash2 } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const Timetable = () => {
  const [timetables, setTimetables] = useState([]);
  const [selectedDay, setSelectedDay] = useState(0); // 0 = Mon
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    teacher_id: '',
    subject_id: '',
    classroom_id: '',
    semester_id: '',
    section_id: '',
    day_of_week: 0,
    start_time: '10:00',
    end_time: '11:00'
  });

  const { showToast } = useToast();

  const fetchTimetableData = async () => {
    try {
      const [ttList, tList, subList, crList, semList] = await Promise.all([
        adminService.getTimetable({ day_of_week: selectedDay }),
        adminService.getTeachers(),
        adminService.getSubjects(),
        adminService.getClassrooms(),
        adminService.getSemesters()
      ]);
      setTimetables(ttList);
      setTeachers(tList);
      setSubjects(subList);
      setClassrooms(crList);
      setSemesters(semList);

      if (semList.length > 0) {
        const secList = await adminService.getSections(semList[0].id);
        setSections(secList);
        setFormData(prev => ({
          ...prev,
          teacher_id: tList[0]?.teacher_profile?.id || '',
          subject_id: subList[0]?.id || '',
          classroom_id: crList[0]?.id || '',
          semester_id: semList[0]?.id || '',
          section_id: secList[0]?.id || ''
        }));
      }
    } catch (e) {
      showToast('Failed to load timetable data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetableData();
  }, [selectedDay]);

  const handleSemesterChange = async (semId) => {
    setFormData(prev => ({ ...prev, semester_id: semId, section_id: '' }));
    if (semId) {
      const secList = await adminService.getSections(semId);
      setSections(secList);
      if (secList.length > 0) {
        setFormData(prev => ({ ...prev, semester_id: semId, section_id: secList[0].id }));
      }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.teacher_id || !formData.subject_id || !formData.classroom_id || !formData.semester_id || !formData.section_id) {
      showToast('Please fill all required timetable fields', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      await adminService.createTimetable({
        teacher_id: formData.teacher_id,
        subject_id: formData.subject_id,
        classroom_id: formData.classroom_id,
        semester_id: formData.semester_id,
        section_id: formData.section_id,
        day_of_week: Number(formData.day_of_week),
        start_time: formData.start_time,
        end_time: formData.end_time
      });
      showToast('Timetable schedule entry created!', 'success');
      setIsAddOpen(false);
      fetchTimetableData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to create timetable slot', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminService.deleteTimetable(id);
      showToast('Timetable slot removed', 'info');
      fetchTimetableData();
    } catch (e) {
      showToast('Failed to delete timetable entry', 'error');
    }
  };

  if (isLoading) return <LoadingSkeleton type="cards" count={4} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Timetable Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Assign instructors, subjects, classrooms, and periodic schedule slots
          </p>
        </div>

        <button
          onClick={() => {
            setFormData(prev => ({ ...prev, day_of_week: selectedDay }));
            setIsAddOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Schedule Slot
        </button>
      </div>

      {/* Day of Week Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {DAYS.map((dayName, idx) => (
          <button
            key={dayName}
            onClick={() => setSelectedDay(idx)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedDay === idx
                ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            {dayName}
          </button>
        ))}
      </div>

      {/* Timetable Schedule Cards */}
      {timetables.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={`No classes scheduled on ${DAYS[selectedDay]}`}
          description="Click 'Add Schedule Slot' to create lecture entries for this day."
          actionLabel="Add Schedule Slot"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {timetables.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono text-xs font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{item.start_time} - {item.end_time}</span>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors"
                  title="Delete Slot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                  {item.subject?.code}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {item.subject?.name}
                </h3>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Instructor: <strong className="text-slate-900 dark:text-slate-100">{item.teacher?.user?.full_name || 'Assigned Faculty'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{item.classroom?.name} ({item.classroom?.building})</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sem {item.semester?.number} - Sec {item.section?.name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Timetable Slot Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Timetable Slot">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Day of Week
              </label>
              <select
                value={formData.day_of_week}
                onChange={(e) => setFormData({ ...formData, day_of_week: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
              >
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Classroom
              </label>
              <select
                value={formData.classroom_id}
                onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.building})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Course Subject
              </label>
              <select
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.code}: {sub.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Faculty Instructor
              </label>
              <select
                value={formData.teacher_id}
                onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
              >
                {teachers.filter(t => t.teacher_profile).map((t) => (
                  <option key={t.teacher_profile.id} value={t.teacher_profile.id}>
                    {t.full_name} ({t.teacher_profile.employee_id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Semester
              </label>
              <select
                value={formData.semester_id}
                onChange={(e) => handleSemesterChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
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
                value={formData.section_id}
                onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500"
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>Section {sec.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Time
              </label>
              <input
                type="text"
                required
                placeholder="10:00"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                End Time
              </label>
              <input
                type="text"
                required
                placeholder="11:00"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>
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
              {isSubmitting ? 'Saving...' : 'Save Schedule Slot'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
