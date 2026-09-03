# SmartAttend — Offline-First Smart University Attendance System

**SmartAttend** is a production-grade, offline-first attendance management platform built for colleges and universities. It allows students to mark attendance in classrooms **without requiring an active internet connection**, using Bluetooth Low Energy (BLE) proximity detection, local IndexedDB persistence, cryptographic session tokens, and automatic background synchronization when network connectivity is restored.

---

## 🌟 Key Features

1. **Zero-Internet Proximity Attendance**:
   - Students detect active teacher lecture sessions using Bluetooth Low Energy (BLE) or the interactive BLE Simulator Adapter.
   - Proximity verification enforces strict signal strength (`RSSI >= -85 dBm`) and anti-clock manipulation guards.
   - Attendance records are immediately saved to client-side **IndexedDB (`SmartAttendDB`)** with status `PENDING_SYNC`.
2. **Automatic Background Synchronization**:
   - As soon as network connectivity is restored (or periodically every 15 seconds), the frontend sync engine batches offline records and dispatches them to `POST /api/v1/sync/attendance`.
   - Built-in idempotency (composite unique keys `student_id + session_id` and client UUID `attendance_id`) prevents duplicate markings.
   - Detailed sync result tracking and exponential backoff retry mechanism.
3. **Role-Isolated Dashboards**:
   - **Admin Portal**: System KPI cards, attendance trends, subject performance analytics, pending faculty/student approvals, timetable scheduler, CSV report exporter, security audit logs.
   - **Teacher Portal**: Today's timetable, course management, one-click BLE attendance broadcast activation with countdown timer, live student attendance roster with auto-polling.
   - **Student Portal**: Overall attendance percentage with 75% warning alert, subject-wise attendance breakdown, today's schedule, BLE proximity scanner, instant offline/online attendance marking.
4. **Dual BLE Engine**:
   - Full Web Bluetooth API (`navigator.bluetooth`) peripheral support.
   - Interactive high-fidelity **Demo BLE Simulator** with live signal strength slider (-30 dBm to -95 dBm), distance estimator, and classroom beacon broadcast simulation.
5. **Strict Timezone-Aware UTC**:
   - All backend calculations and comparisons strictly use timezone-aware UTC (`datetime.now(timezone.utc)`), eliminating datetime comparison bugs.
6. **Progressive Web App (PWA)**:
   - Installable on mobile and desktop devices with Service Worker offline shell caching.

---

## 🏗️ Architecture

```
                                SMARTATTEND
                                     |
              +----------------------+----------------------+
              |                      |                      |
            ADMIN                 TEACHER                STUDENT
              |                      |                      |
         Management               Teaching              Attendance
              |                      |                      |
              +----------------------+----------------------+
                                     |
                              OFFLINE-FIRST CORE
                                     |
                       BLE Proximity + IndexedDB
                                     |
                             Background Sync
                                     |
                              FastAPI (REST)
                                     |
                           SQLite / PostgreSQL
```

---

## 🔑 Pre-Seeded Demo Credentials

The database is automatically seeded on first launch with realistic university departments (MCA, CSE), classrooms (Room 204, Room 305, Lab 102), subjects, timetables, and demo accounts:

| Role | Username | Password | Full Name / Details | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | System Administrator | `ACTIVE` |
| **Teacher** | `teacher1` | `teacher123` | Prof. Rahul Sharma (`EMP-1001`) | `ACTIVE` |
| **Teacher** | `teacher2` | `teacher123` | Prof. Priya Patel (`EMP-1002`) | `ACTIVE` |
| **Teacher (Pending)** | `teacher_pending` | `teacher123` | Dr. Anil Gupta (`EMP-1003`) | `PENDING` (For Admin Approval testing) |
| **Student** | `student1` | `student123` | Aarav Mehta (`MCA-2026-01`, Sem 2 Sec A) | `ACTIVE` |
| **Student** | `student2` | `student123` | Diya Sharma (`MCA-2026-02`, Sem 2 Sec A) | `ACTIVE` |
| **Student** | `student3` | `student123` | Rohan Verma (`MCA-2026-03`, Sem 2 Sec A) | `ACTIVE` |
| **Student (Pending)** | `student_pending` | `student123` | Siddharth Malhotra (`MCA-2026-06`) | `PENDING` (For Admin Approval testing) |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (Tested on Python 3.13)
- **Node.js 18+** & **npm 9+**

---

### Step 1: Start Backend (FastAPI)

```bash
# Navigate to backend directory
cd smartattend/backend

# Create virtual environment (optional)
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API Base URL: `http://localhost:8000/api/v1`
- Interactive Swagger API Docs: `http://localhost:8000/api/v1/docs`

---

### Step 2: Start Frontend (React + Vite + Tailwind)

```bash
# Open a new terminal and navigate to frontend directory
cd smartattend/frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

- Web App: `http://localhost:5173`

---

## 🧪 Automated Testing

SmartAttend includes a comprehensive test suite covering Authentication, Role Authorization, Attendance Sessions, Cryptographic Token Verification, Weak BLE Signal Rejections, and Offline Batch Sync with Idempotency.

```bash
cd smartattend/backend
python -m pytest tests/ -v
```

Expected output:
```
tests/test_attendance.py::test_attendance_session_and_marking_flow PASSED
tests/test_auth.py::test_admin_login PASSED
tests/test_auth.py::test_teacher_login PASSED
tests/test_auth.py::test_student_login PASSED
tests/test_auth.py::test_invalid_password PASSED
tests/test_auth.py::test_pending_user_cannot_login PASSED
tests/test_auth.py::test_student_signup_and_admin_approval PASSED
tests/test_auth.py::test_role_access_authorization PASSED
tests/test_sync.py::test_offline_batch_sync PASSED
======================== 9 passed in 5.94s ========================
```

---

## 📲 Step-by-Step Demo Flow

Follow this complete flow to demonstrate the system end-to-end:

1. **Faculty Starts Class Attendance**:
   - Log in as `teacher1` (password: `teacher123`).
   - Go to **Start Attendance** in the sidebar.
   - Select **Data Engineering (MCA201)** and **Room 204**.
   - Click **START ATTENDANCE SESSION**.
   - The session becomes `ACTIVE` and broadcasts beacon `SMARTATTEND-RM204`.
2. **Student Marks Attendance (Online or Offline)**:
   - In an Incognito / separate window, log in as `student1` (password: `student123`).
   - Notice the prompt **"ATTENDANCE IN PROGRESS"**.
   - Click **Mark Attendance Now**.
   - The animated BLE Radar discovers the teacher's beacon in Room 204.
   - Click **MARK ATTENDANCE NOW**.
   - Confetti triggers and the record is saved with verified proximity RSSI (`-58 dBm`).
3. **Simulate True Offline Attendance**:
   - In the student browser window, open DevTools -> Network -> set to **Offline** (or disconnect Wi-Fi).
   - The top banner will display `🔴 OFFLINE MODE`.
   - Log in as `student2` (cached) or mark attendance for another lecture.
   - Click **MARK ATTENDANCE** -> Notice: `✓ Attendance saved locally in Offline Mode (PENDING_SYNC)` in IndexedDB without errors.
   - Switch DevTools Network back to **Online**.
   - The background sync worker immediately triggers `POST /api/v1/sync/attendance` and updates status to `✓ SYNCED` (Green badge).
4. **Live Teacher Monitor**:
   - On `teacher1`'s screen, go to **Live Attendance**.
   - Notice the student roster auto-updates in real time with `PRESENT`, `LATE`, BLE signal strength, and `SYNCED` badges.
5. **Admin Approvals & Reports**:
   - Log in as `admin` (password: `admin123`).
   - Review pending signups in **Teacher Requests** and **Student Requests**.
   - Go to **Reports** -> Filter by date / subject -> Click **Export to CSV**.

---

## 🐳 Docker Deployment

To launch the complete full-stack environment with Docker Compose:

```bash
cd smartattend
docker-compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api/v1`

---

## 🛡️ Anti-Fraud & Security Guarantees

- **No Raw Token Storage**: Only cryptographic SHA-256 hashes of session tokens are stored in the database.
- **Strict Role Enforcement**: Separate dashboards, sidebar menus, and API route guards for `ADMIN`, `TEACHER`, and `STUDENT`.
- **RSSI Proximity Verification**: Rejects attendance if BLE RSSI is below `-85 dBm`.
- **Anti-Clock Skew**: Rejects attendance if the client device clock is more than 3 minutes in the future.
- **Idempotent Sync**: Composite uniqueness constraints on `(session_id, student_id)` and UUID `attendance_id` guarantee no duplicates.
