import React, { useState, useEffect } from 'react';
import { attendanceService } from '../../services/attendanceService';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Calendar, Clock, Building2, BookOpen } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const Schedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    attendanceService.getTeacherSchedule()
      .then(setSchedule)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingSkeleton type="cards" count={3} />;

  const filtered = schedule.filter(s => s.day_of_week === selectedDay);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          My Teaching Schedule
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Weekly timetable assigned by administrator
        </p>
      </div>

      {/* Day Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {DAYS.map((dayName, idx) => (
          <button
            key={dayName}
            onClick={() => setSelectedDay(idx)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedDay === idx
                ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {dayName}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={`No Classes on ${DAYS[selectedDay]}`}
          description="You do not have any teaching sessions scheduled for this day."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono text-xs font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{item.start_time} - {item.end_time}</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {DAYS[item.day_of_week]}
                </span>
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
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{item.classroom?.name} ({item.classroom?.building})</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Semester {item.semester?.number} • Section {item.section?.name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
