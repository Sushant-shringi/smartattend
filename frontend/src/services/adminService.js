import { api } from './api';

export const adminService = {
  getDashboard: async () => {
    const res = await api.get('/admin/dashboard');
    return res.data;
  },

  // Teacher Approvals & Management
  getTeacherRequests: async () => {
    const res = await api.get('/admin/teacher-requests');
    return res.data;
  },

  approveTeacher: async (userId, data = {}) => {
    const res = await api.post(`/admin/teachers/${userId}/approve`, data);
    return res.data;
  },

  rejectTeacher: async (userId) => {
    const res = await api.post(`/admin/teachers/${userId}/reject`);
    return res.data;
  },

  updateTeacherStatus: async (userId, status, reason = '') => {
    const res = await api.post(`/admin/teachers/${userId}/status`, { status, reason });
    return res.data;
  },

  getTeachers: async () => {
    const res = await api.get('/admin/teachers');
    return res.data;
  },

  assignSubjectToTeacher: async (teacherId, subjectId) => {
    const res = await api.post('/admin/teachers/assign-subject', {
      teacher_id: teacherId,
      subject_id: subjectId
    });
    return res.data;
  },

  // Student Approvals & Management
  getStudentRequests: async () => {
    const res = await api.get('/admin/student-requests');
    return res.data;
  },

  approveStudent: async (userId, assignmentData) => {
    const res = await api.post(`/admin/students/${userId}/approve`, assignmentData);
    return res.data;
  },

  rejectStudent: async (userId) => {
    const res = await api.post(`/admin/students/${userId}/reject`);
    return res.data;
  },

  updateStudentStatus: async (userId, status, reason = '') => {
    const res = await api.post(`/admin/students/${userId}/status`, { status, reason });
    return res.data;
  },

  getStudents: async (params = {}) => {
    const res = await api.get('/admin/students', { params });
    return res.data;
  },

  // Academic Entities
  getDepartments: async () => {
    const res = await api.get('/departments');
    return res.data;
  },

  createDepartment: async (data) => {
    const res = await api.post('/departments', data);
    return res.data;
  },

  getSemesters: async (departmentId = null) => {
    const res = await api.get('/semesters', { params: { department_id: departmentId } });
    return res.data;
  },

  createSemester: async (data) => {
    const res = await api.post('/semesters', data);
    return res.data;
  },

  getSections: async (semesterId = null) => {
    const res = await api.get('/sections', { params: { semester_id: semesterId } });
    return res.data;
  },

  createSection: async (data) => {
    const res = await api.post('/sections', data);
    return res.data;
  },

  getSubjects: async (params = {}) => {
    const res = await api.get('/subjects', { params });
    return res.data;
  },

  createSubject: async (data) => {
    const res = await api.post('/subjects', data);
    return res.data;
  },

  getClassrooms: async () => {
    const res = await api.get('/classrooms');
    return res.data;
  },

  createClassroom: async (data) => {
    const res = await api.post('/classrooms', data);
    return res.data;
  },

  // Timetable
  getTimetable: async (params = {}) => {
    const res = await api.get('/timetable', { params });
    return res.data;
  },

  createTimetable: async (data) => {
    const res = await api.post('/timetable', data);
    return res.data;
  },

  deleteTimetable: async (id) => {
    const res = await api.delete(`/timetable/${id}`);
    return res.data;
  },

  // Reports & Audits
  getReports: async (params = {}) => {
    const res = await api.get('/admin/reports', { params });
    return res.data;
  },

  exportReportsCsv: async (params = {}) => {
    const res = await api.get('/admin/reports/export-csv', {
      params,
      responseType: 'blob'
    });
    return res.data;
  },

  getAuditLogs: async (limit = 50, offset = 0) => {
    const res = await api.get('/admin/audit-logs', { params: { limit, offset } });
    return res.data;
  }
};
