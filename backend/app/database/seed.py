from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database.session import SessionLocal, engine, Base
from app.models.user import User, Teacher, Student, UserRole, UserStatus
from app.models.academic import Department, Semester, Section, Subject, Classroom, TeacherSubject, StudentEnrollment
from app.models.timetable import Timetable
from app.models.attendance import AttendanceSession, AttendanceRecord, SessionStatus, AttendanceStatus, SyncStatus
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.auth.security import get_password_hash
from app.utils.timezone import utc_now
from app.utils.qr_ble import generate_session_token

def seed_database(db: Session = None):
    auto_close = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        auto_close = True

    try:
        # Check if already seeded
        admin_user = db.query(User).filter(User.username == "admin").first()
        if admin_user:
            print("Database already contains seed data. Skipping seed.")
            return

        print("Seeding initial SmartAttend database...")

        # 1. Admin User
        admin = User(
            username="admin",
            email="admin@smartattend.edu",
            hashed_password=get_password_hash("admin123"),
            full_name="System Administrator",
            phone="+91-9876543210",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db.add(admin)
        db.flush()

        # 2. Departments
        dept_mca = Department(name="Master of Computer Applications", code="MCA")
        dept_cse = Department(name="Computer Science & Engineering", code="CSE")
        db.add_all([dept_mca, dept_cse])
        db.flush()

        # 3. Semesters
        sem_mca_1 = Semester(department_id=dept_mca.id, number=1, academic_year="2026-2027")
        sem_mca_2 = Semester(department_id=dept_mca.id, number=2, academic_year="2026-2027")
        sem_cse_4 = Semester(department_id=dept_cse.id, number=4, academic_year="2026-2027")
        db.add_all([sem_mca_1, sem_mca_2, sem_cse_4])
        db.flush()

        # 4. Sections
        sec_mca_a = Section(semester_id=sem_mca_2.id, name="A")
        sec_mca_b = Section(semester_id=sem_mca_2.id, name="B")
        sec_cse_a = Section(semester_id=sem_cse_4.id, name="A")
        db.add_all([sec_mca_a, sec_mca_b, sec_cse_a])
        db.flush()

        # 5. Classrooms
        cr_204 = Classroom(name="Room 204", building="Computing Block", room_number="204", capacity=60, ble_identifier="SMARTATTEND-RM204")
        cr_305 = Classroom(name="Room 305", building="Main Science Block", room_number="305", capacity=50, ble_identifier="SMARTATTEND-RM305")
        cr_lab1 = Classroom(name="Lab 102", building="Innovation Wing", room_number="102", capacity=45, ble_identifier="SMARTATTEND-LAB102")
        db.add_all([cr_204, cr_305, cr_lab1])
        db.flush()

        # 6. Subjects for MCA Sem 2
        sub_de = Subject(code="MCA201", name="Data Engineering", credits=4, department_id=dept_mca.id, semester_id=sem_mca_2.id, description="Modern data pipeline architectures, streaming and batch systems")
        sub_ds = Subject(code="MCA202", name="Distributed Systems", credits=4, department_id=dept_mca.id, semester_id=sem_mca_2.id, description="Consensus algorithms, microservices, and distributed primitives")
        sub_cna = Subject(code="MCA203", name="Cloud Native Architectures", credits=3, department_id=dept_mca.id, semester_id=sem_mca_2.id, description="Containers, Kubernetes, service mesh, and serverless architectures")
        sub_db = Subject(code="MCA204", name="Database Systems", credits=4, department_id=dept_mca.id, semester_id=sem_mca_2.id, description="High performance storage engines, indexing, and transactional isolation")
        db.add_all([sub_de, sub_ds, sub_cna, sub_db])
        db.flush()

        # 7. Teachers
        t1_user = User(username="teacher1", email="rahul.sharma@smartattend.edu", hashed_password=get_password_hash("teacher123"), full_name="Prof. Rahul Sharma", phone="+91-9876500001", role=UserRole.TEACHER, status=UserStatus.ACTIVE)
        t2_user = User(username="teacher2", email="priya.patel@smartattend.edu", hashed_password=get_password_hash("teacher123"), full_name="Prof. Priya Patel", phone="+91-9876500002", role=UserRole.TEACHER, status=UserStatus.ACTIVE)
        t_pending_user = User(username="teacher_pending", email="anil.gupta@smartattend.edu", hashed_password=get_password_hash("teacher123"), full_name="Dr. Anil Gupta", phone="+91-9876500003", role=UserRole.TEACHER, status=UserStatus.PENDING)
        db.add_all([t1_user, t2_user, t_pending_user])
        db.flush()

        t1_profile = Teacher(user_id=t1_user.id, employee_id="EMP-1001", department_id=dept_mca.id, qualification="Ph.D in Distributed Systems", designation="Associate Professor")
        t2_profile = Teacher(user_id=t2_user.id, employee_id="EMP-1002", department_id=dept_mca.id, qualification="M.Tech in Data Science", designation="Assistant Professor")
        t_pending_profile = Teacher(user_id=t_pending_user.id, employee_id="EMP-1003", department_id=dept_mca.id, qualification="Ph.D in Cloud Computing", designation="Assistant Professor")
        db.add_all([t1_profile, t2_profile, t_pending_profile])
        db.flush()

        # Teacher Subject Mappings
        ts1 = TeacherSubject(teacher_id=t1_profile.id, subject_id=sub_de.id)
        ts2 = TeacherSubject(teacher_id=t1_profile.id, subject_id=sub_cna.id)
        ts3 = TeacherSubject(teacher_id=t2_profile.id, subject_id=sub_ds.id)
        ts4 = TeacherSubject(teacher_id=t2_profile.id, subject_id=sub_db.id)
        db.add_all([ts1, ts2, ts3, ts4])
        db.flush()

        # 8. Students
        students_info = [
            ("student1", "Aarav Mehta", "aarav.mehta@smartattend.edu", "MCA-2026-01", UserStatus.ACTIVE),
            ("student2", "Diya Sharma", "diya.sharma@smartattend.edu", "MCA-2026-02", UserStatus.ACTIVE),
            ("student3", "Rohan Verma", "rohan.verma@smartattend.edu", "MCA-2026-03", UserStatus.ACTIVE),
            ("student4", "Ananya Gupta", "ananya.gupta@smartattend.edu", "MCA-2026-04", UserStatus.ACTIVE),
            ("student5", "Vikram Rao", "vikram.rao@smartattend.edu", "MCA-2026-05", UserStatus.ACTIVE),
            ("student_pending", "Siddharth Malhotra", "sid.m@smartattend.edu", "MCA-2026-06", UserStatus.PENDING),
        ]

        created_students = []
        for uname, fname, email, roll, ustatus in students_info:
            s_user = User(
                username=uname,
                email=email,
                hashed_password=get_password_hash("student123"),
                full_name=fname,
                phone="+91-9812345678",
                role=UserRole.STUDENT,
                status=ustatus
            )
            db.add(s_user)
            db.flush()

            s_profile = Student(
                user_id=s_user.id,
                student_id=roll,
                department_id=dept_mca.id if ustatus == UserStatus.ACTIVE else None,
                semester_id=sem_mca_2.id if ustatus == UserStatus.ACTIVE else None,
                section_id=sec_mca_a.id if ustatus == UserStatus.ACTIVE else None
            )
            db.add(s_profile)
            db.flush()

            if ustatus == UserStatus.ACTIVE:
                created_students.append(s_profile)
                for sub in [sub_de, sub_ds, sub_cna, sub_db]:
                    db.add(StudentEnrollment(student_id=s_profile.id, subject_id=sub.id, semester_id=sem_mca_2.id))

        db.flush()

        # 9. Timetable (All Days of Week)
        for day in range(5): # Mon to Fri (0 to 4)
            db.add_all([
                Timetable(teacher_id=t1_profile.id, subject_id=sub_de.id, classroom_id=cr_204.id, semester_id=sem_mca_2.id, section_id=sec_mca_a.id, day_of_week=day, start_time="10:00", end_time="11:00", is_active=1),
                Timetable(teacher_id=t2_profile.id, subject_id=sub_ds.id, classroom_id=cr_305.id, semester_id=sem_mca_2.id, section_id=sec_mca_a.id, day_of_week=day, start_time="11:15", end_time="12:15", is_active=1),
                Timetable(teacher_id=t1_profile.id, subject_id=sub_cna.id, classroom_id=cr_lab1.id, semester_id=sem_mca_2.id, section_id=sec_mca_a.id, day_of_week=day, start_time="13:30", end_time="14:30", is_active=1),
                Timetable(teacher_id=t2_profile.id, subject_id=sub_db.id, classroom_id=cr_204.id, semester_id=sem_mca_2.id, section_id=sec_mca_a.id, day_of_week=day, start_time="14:45", end_time="15:45", is_active=1),
            ])
        db.flush()

        # 10. Sample Past Attendance Sessions & Records (For rich dashboards & analytics)
        now = utc_now()
        for days_ago in range(5, 0, -1):
            past_time = now - timedelta(days=days_ago, hours=2)
            past_expiry = past_time + timedelta(minutes=50)
            raw_t, t_hash = generate_session_token()

            past_session = AttendanceSession(
                teacher_id=t1_profile.id,
                subject_id=sub_de.id,
                classroom_id=cr_204.id,
                semester_id=sem_mca_2.id,
                section_id=sec_mca_a.id,
                start_time=past_time,
                expiry_time=past_expiry,
                duration_minutes=50,
                late_threshold_minutes=5,
                rssi_threshold=-85,
                session_token_hash=t_hash,
                ble_identifier="SMARTATTEND-RM204",
                status=SessionStatus.STOPPED,
                created_at=past_time
            )
            db.add(past_session)
            db.flush()

            # Record attendance for active students
            for idx, stud in enumerate(created_students):
                att_status = AttendanceStatus.PRESENT if idx != 3 else (AttendanceStatus.LATE if days_ago % 2 == 0 else AttendanceStatus.PRESENT)
                db.add(AttendanceRecord(
                    session_id=past_session.id,
                    student_id=stud.id,
                    subject_id=sub_de.id,
                    classroom_id=cr_204.id,
                    marked_at=past_time + timedelta(minutes=2 + idx),
                    status=att_status,
                    ble_rssi=-52 - (idx * 5),
                    device_id=f"device-{stud.student_id}",
                    sync_status=SyncStatus.SYNCED,
                    synced_at=past_time + timedelta(minutes=3 + idx),
                    verification_source="BLE",
                    created_at=past_time
                ))

        # 11. Initial Notifications
        for s in created_students:
            db.add(Notification(
                user_id=s.user_id,
                title="Welcome to SmartAttend",
                message="Your student profile has been verified and active. You can now use BLE smart attendance.",
                type="SUCCESS",
                created_at=now
            ))

        # 12. Initial Audit Logs
        db.add(AuditLog(
            user_id=admin.id,
            action="SYSTEM_INIT",
            status="SUCCESS",
            entity="System",
            message="SmartAttend database initialized with seed academic data.",
            created_at=now
        ))

        db.commit()
        print("Database seeded successfully with Admin, Teachers, Students, Timetables, and Analytics data.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        if auto_close:
            db.close()

if __name__ == "__main__":
    seed_database()
