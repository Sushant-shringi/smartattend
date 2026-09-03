import pytest
import uuid
from datetime import datetime, timedelta, timezone

def test_attendance_session_and_marking_flow(client):
    # 1. Login as Teacher
    t_login = client.post("/api/v1/auth/login", json={"username": "teacher1", "password": "teacher123"})
    t_token = t_login.json()["access_token"]
    
    # Get subjects and classrooms
    sub_res = client.get("/api/v1/subjects")
    subjects = sub_res.json()
    cr_res = client.get("/api/v1/classrooms")
    classrooms = cr_res.json()
    
    # Start attendance session
    start_res = client.post(
        "/api/v1/attendance/sessions",
        json={
            "subject_id": subjects[0]["id"],
            "classroom_id": classrooms[0]["id"],
            "semester_id": subjects[0]["semester_id"],
            "section_id": "none",
            "duration_minutes": 50,
            "late_threshold_minutes": 5,
            "rssi_threshold": -85
        },
        headers={"Authorization": f"Bearer {t_token}"}
    )
    assert start_res.status_code == 200
    session_data = start_res.json()
    session_id = session_data["id"]
    raw_token = session_data["raw_session_token"]
    assert raw_token is not None
    assert session_data["status"] == "ACTIVE"

    # 2. Login as Student
    s_login = client.post("/api/v1/auth/login", json={"username": "student1", "password": "student123"})
    s_token = s_login.json()["access_token"]

    # 3. Student Marks Attendance (Valid)
    client_att_id = str(uuid.uuid4())
    mark_res = client.post(
        "/api/v1/attendance/mark",
        json={
            "attendance_id": client_att_id,
            "session_id": session_id,
            "subject_id": subjects[0]["id"],
            "classroom_id": classrooms[0]["id"],
            "session_token": raw_token,
            "ble_rssi": -60,
            "device_id": "test-device-1",
            "verification_source": "BLE"
        },
        headers={"Authorization": f"Bearer {s_token}"}
    )
    assert mark_res.status_code == 200
    record_data = mark_res.json()
    assert record_data["status"] == "PRESENT"
    assert record_data["sync_status"] == "SYNCED"

    # 4. Duplicate Check (Idempotency test) - repeat same request
    dup_res = client.post(
        "/api/v1/attendance/mark",
        json={
            "attendance_id": client_att_id,
            "session_id": session_id,
            "subject_id": subjects[0]["id"],
            "classroom_id": classrooms[0]["id"],
            "session_token": raw_token,
            "ble_rssi": -60,
            "device_id": "test-device-1",
            "verification_source": "BLE"
        },
        headers={"Authorization": f"Bearer {s_token}"}
    )
    assert dup_res.status_code == 200
    assert dup_res.json()["id"] == record_data["id"]

    # 5. Invalid Session Token Rejection
    s2_login = client.post("/api/v1/auth/login", json={"username": "student2", "password": "student123"})
    s2_token = s2_login.json()["access_token"]

    bad_token_res = client.post(
        "/api/v1/attendance/mark",
        json={
            "session_id": session_id,
            "subject_id": subjects[0]["id"],
            "classroom_id": classrooms[0]["id"],
            "session_token": "fake-invalid-token",
            "ble_rssi": -60
        },
        headers={"Authorization": f"Bearer {s2_token}"}
    )
    assert bad_token_res.status_code == 400
    assert "Invalid session token" in bad_token_res.json()["detail"]

    # 6. Weak BLE RSSI Rejection (e.g. -95 dBm < -85 dBm)
    weak_rssi_res = client.post(
        "/api/v1/attendance/mark",
        json={
            "session_id": session_id,
            "subject_id": subjects[0]["id"],
            "classroom_id": classrooms[0]["id"],
            "session_token": raw_token,
            "ble_rssi": -95
        },
        headers={"Authorization": f"Bearer {s2_token}"}
    )
    assert weak_rssi_res.status_code == 400
    assert "BLE signal too weak" in weak_rssi_res.json()["detail"]

    # 7. Teacher Stops Session
    stop_res = client.post(
        f"/api/v1/attendance/sessions/{session_id}/stop",
        headers={"Authorization": f"Bearer {t_token}"}
    )
    assert stop_res.status_code == 200
    assert stop_res.json()["status"] == "STOPPED"
