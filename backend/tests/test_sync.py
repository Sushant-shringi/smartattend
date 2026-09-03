import pytest
import uuid
from datetime import datetime, timezone

def test_offline_batch_sync(client):
    # 1. Teacher starts session
    t_login = client.post("/api/v1/auth/login", json={"username": "teacher1", "password": "teacher123"})
    t_token = t_login.json()["access_token"]
    
    subjects = client.get("/api/v1/subjects").json()
    classrooms = client.get("/api/v1/classrooms").json()

    start_res = client.post(
        "/api/v1/attendance/sessions",
        json={
            "subject_id": subjects[1]["id"],
            "classroom_id": classrooms[0]["id"],
            "semester_id": subjects[1]["semester_id"],
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

    # 2. Student 3 simulates offline marked attendance batch sync
    s3_login = client.post("/api/v1/auth/login", json={"username": "student3", "password": "student123"})
    s3_token = s3_login.json()["access_token"]

    client_uuid1 = str(uuid.uuid4())
    client_uuid2 = str(uuid.uuid4())

    now_iso = datetime.now(timezone.utc).isoformat()

    batch_payload = {
        "items": [
            {
                "attendance_id": client_uuid1,
                "session_id": session_id,
                "subject_id": subjects[1]["id"],
                "classroom_id": classrooms[0]["id"],
                "session_token": raw_token,
                "ble_rssi": -55,
                "device_id": "offline-phone-s3",
                "marked_at": now_iso,
                "verification_source": "BLE"
            },
            {
                "attendance_id": client_uuid2,
                "session_id": "invalid-session-uuid-0000",
                "subject_id": subjects[1]["id"],
                "classroom_id": classrooms[0]["id"],
                "session_token": "wrong-token-for-test",
                "ble_rssi": -55,
                "device_id": "offline-phone-s3",
                "marked_at": now_iso,
                "verification_source": "BLE"
            }
        ]
    }

    sync_res = client.post(
        "/api/v1/sync/attendance",
        json=batch_payload,
        headers={"Authorization": f"Bearer {s3_token}"}
    )
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert sync_data["total_processed"] == 2
    assert sync_data["success_count"] == 1
    assert sync_data["failure_count"] == 1
    assert sync_data["results"][0]["status"] == "SYNCED"
    assert sync_data["results"][1]["status"] == "SYNC_FAILED"
