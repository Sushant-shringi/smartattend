import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { attendanceService } from '../../services/attendanceService';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { BookOpen, Users, Clock, Radio, Award } from 'lucide-react';

export const MyClasses = () => {
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    attendanceService.getTeacherClasses()
      .then(setClasses)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingSkeleton type="cards" count={3} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          My Teaching Courses
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Courses assigned to you, semester details, and enrolled students
        </p>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Courses Assigned Yet"
          description="Contact your university administrator to assign courses and timetable slots to your profile."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((c) => (
            <div
              key={c.subject_id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                    {c.subject_code}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-500" />
                    {c.credits} Credits
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  {c.subject_name}
                </h3>

                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Semester {c.semester_number}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-teal-500" />
                    {c.student_count} Students
                  </span>
                </div>
              </div>

              <Link
                to="/teacher/start-attendance"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md transition-colors"
              >
                <Radio className="w-3.5 h-3.5" />
                Start Attendance Session
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
