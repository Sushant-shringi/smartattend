import pytest
import uuid
from datetime import datetime, timezone

def test_mobile_offline_bundle_and_admin_monitoring_flow(client):
    """
    Validates end-to-end integration:
    1. Student & Teacher fetch offline bundles for offline caching
    2. Teacher creates attendance session (BLE beacon broadcast)
    3. Student marks attendance offline in Room DB queue (simulated)
    4. Automatic/Manual background sync to POST /api/v1/sync/attendance
    5. Admin Dashboard Reports & KPIs immediately display the synced record
    """
    # 1. Student fetches offline bundle
    s_login = client.post("/api/v1/auth/login", json={"username": "student1", "password": "student123"})
    assert s_login.status_code == 200
    s_token = s_login.json()["access_token"]

    s_bundle_res = client.get("/api/v1/student/offline-bundle", headers={"Authorization": f"Bearer {s_token}"})
    assert s_bundle_res.status_code == 200
    s_bundle = s_bundle_res.json()
    assert "student" in s_bundle
    assert "subjects" in s_bundle
    assert "timetable" in s_bundle
    assert "classrooms" in s_bundle
    assert len(s_bundle["subjects"]) > 0
    assert len(s_bundle["classrooms"]) > 0

    # 2. Teacher fetches offline bundle
    t_login = client.post("/api/v1/auth/login", json={"username": "teacher1", "password": "teacher123"})
    assert t_login.status_code == 200
    t_token = t_login.json()["access_token"]

    t_bundle_res = client.get("/api/v1/teacher/offline-bundle", headers={"Authorization": f"Bearer {t_token}"})
    assert t_bundle_res.status_code == 200
    t_bundle = t_bundle_res.json()
    assert "teacher" in t_bundle
    assert "timetable" in t_bundle
    assert len(t_bundle["timetable"]) > 0

    # 3. Teacher starts an active session
    chosen_class = t_bundle["timetable"][0]
    session_start_res = client.post(
        "/api/v1/attendance/sessions",
        json={
            "subject_id": chosen_class["subject_id"],
            "classroom_id": chosen_class["classroom_id"],
            "semester_id": chosen_class["semester_id"],
            "section_id": chosen_class["section_id"] or "A",
            "duration_minutes": 50,
            "late_threshold_minutes": 5,
            "rssi_threshold": -85
        },
        headers={"Authorization": f"Bearer {t_token}"}
    )
    assert session_start_res.status_code == 200
    session_data = session_start_res.json()
    session_id = session_data["id"]
    raw_session_token = session_data["raw_session_token"]
    ble_beacon = session_data["ble_identifier"]

    # 4. Student marks attendance offline with verified proximity (-58 dBm >= -85 dBm)
    now_iso = datetime.now(timezone.utc).isoformat()
    client_attendance_id = str(uuid.uuid4())

    offline_sync_batch = {
        "items": [
            {
                "attendance_id": client_attendance_id,
                "session_id": session_id,
                "subject_id": chosen_class["subject_id"],
                "classroom_id": chosen_class["classroom_id"],
                "session_token": raw_session_token,
                "ble_rssi": -58,
                "device_id": "student-android-device-pixel",
                "marked_at": now_iso,
                "verification_source": "BLE"
            }
        ]
    }

    # Student synchronizes offline queue when connectivity is active
    sync_res = client.post(
        "/api/v1/sync/attendance",
        json=offline_sync_batch,
        headers={"Authorization": f"Bearer {s_token}"}
    )
    assert sync_res.status_code == 200
    sync_result = sync_res.json()
    assert sync_result["success_count"] == 1
    assert sync_result["results"][0]["status"] == "SYNCED"

    # 5. Admin logs into existing Admin Dashboard & views the synchronized attendance
    admin_login = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]

    # Check Admin Dashboard Reports endpoint
    admin_reports_res = client.get(
        "/api/v1/admin/reports",
        params={"subject_id": chosen_class["subject_id"]},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert admin_reports_res.status_code == 200
    reports_data = admin_reports_res.json()
    assert reports_data["total_records"] >= 1

    # Verify the specific synchronized record appears in Admin Dashboard
    matching_row = next((r for r in reports_data["rows"] if r["attendance_id"] == client_attendance_id), None)
    assert matching_row is not None, "Synced attendance record must be immediately visible in Admin Reports"
    assert matching_row["student_roll"] == "MCA-2026-01"
    assert matching_row["student_name"] == "Aarav Mehta"
    assert matching_row["ble_rssi"] == -58
    assert matching_row["status"] == "PRESENT"
    assert matching_row["sync_status"] == "SYNCED"
    assert matching_row["teacher_name"] == "Prof. Rahul Sharma"

    # Check Admin Dashboard KPI Analytics
    dashboard_res = client.get("/api/v1/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    assert dashboard_res.status_code == 200
    analytics = dashboard_res.json()
    assert analytics["total_attendance_today"] >= 1
