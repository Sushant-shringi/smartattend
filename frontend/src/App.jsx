import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConnectivityProvider } from './context/ConnectivityContext';
import { ToastProvider } from './components/common/Toast';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Auth Pages
import { Login } from './pages/auth/Login';
import { TeacherSignup } from './pages/auth/TeacherSignup';
import { StudentSignup } from './pages/auth/StudentSignup';

// Admin Pages
import { AdminDashboard } from './pages/admin/Dashboard';
import { TeacherRequests } from './pages/admin/TeacherRequests';
import { StudentRequests } from './pages/admin/StudentRequests';
import { Teachers } from './pages/admin/Teachers';
import { Students } from './pages/admin/Students';
import { Departments } from './pages/admin/Departments';
import { Semesters } from './pages/admin/Semesters';
import { Subjects } from './pages/admin/Subjects';
import { Classrooms } from './pages/admin/Classrooms';
import { Timetable } from './pages/admin/Timetable';
import { AttendanceLogs } from './pages/admin/AttendanceLogs';
import { Reports } from './pages/admin/Reports';
import { AuditLogs } from './pages/admin/AuditLogs';

// Teacher Pages
import { TeacherDashboard } from './pages/teacher/Dashboard';
import { MyClasses } from './pages/teacher/MyClasses';
import { Schedule } from './pages/teacher/Schedule';
import { StartAttendance } from './pages/teacher/StartAttendance';
import { LiveAttendance } from './pages/teacher/LiveAttendance';
import { TeacherHistory } from './pages/teacher/History';

// Student Pages
import { StudentDashboard } from './pages/student/Dashboard';
import { TodayClasses } from './pages/student/TodayClasses';
import { MarkAttendance } from './pages/student/MarkAttendance';
import { AttendanceHistory } from './pages/student/AttendanceHistory';
import { Notifications } from './pages/student/Notifications';
import { StudentProfile } from './pages/student/Profile';

const RoleRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'TEACHER') return <Navigate to="/teacher/dashboard" replace />;
  if (user.role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConnectivityProvider>
          <ToastProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup/teacher" element={<TeacherSignup />} />
              <Route path="/signup/student" element={<StudentSignup />} />

              {/* Admin Protected Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="teacher-requests" element={<TeacherRequests />} />
                <Route path="student-requests" element={<StudentRequests />} />
                <Route path="teachers" element={<Teachers />} />
                <Route path="students" element={<Students />} />
                <Route path="departments" element={<Departments />} />
                <Route path="semesters" element={<Semesters />} />
                <Route path="subjects" element={<Subjects />} />
                <Route path="classrooms" element={<Classrooms />} />
                <Route path="timetable" element={<Timetable />} />
                <Route path="attendance" element={<AttendanceLogs />} />
                <Route path="reports" element={<Reports />} />
                <Route path="audit-logs" element={<AuditLogs />} />
              </Route>

              {/* Teacher Protected Routes */}
              <Route
                path="/teacher"
                element={
                  <ProtectedRoute allowedRoles={['TEACHER']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<TeacherDashboard />} />
                <Route path="classes" element={<MyClasses />} />
                <Route path="schedule" element={<Schedule />} />
                <Route path="start-attendance" element={<StartAttendance />} />
                <Route path="live-attendance" element={<LiveAttendance />} />
                <Route path="history" element={<TeacherHistory />} />
                <Route path="reports" element={<Reports />} />
              </Route>

              {/* Student Protected Routes */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="classes" element={<TodayClasses />} />
                <Route path="mark-attendance" element={<MarkAttendance />} />
                <Route path="history" element={<AttendanceHistory />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="profile" element={<StudentProfile />} />
              </Route>

              {/* Root & Catch-all Fallback */}
              <Route path="/" element={<RoleRedirect />} />
              <Route path="*" element={<RoleRedirect />} />
            </Routes>
          </ToastProvider>
        </ConnectivityProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
