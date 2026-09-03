import pytest

def test_admin_login(client):
    response = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["role"] == "ADMIN"

def test_teacher_login(client):
    response = client.post("/api/v1/auth/login", json={
        "username": "teacher1",
        "password": "teacher123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "TEACHER"

def test_student_login(client):
    response = client.post("/api/v1/auth/login", json={
        "username": "student1",
        "password": "student123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "STUDENT"

def test_invalid_password(client):
    response = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_pending_user_cannot_login(client):
    response = client.post("/api/v1/auth/login", json={
        "username": "teacher_pending",
        "password": "teacher123"
    })
    assert response.status_code == 403
    assert "pending administrator approval" in response.json()["detail"]

def test_student_signup_and_admin_approval(client):
    # 1. Student Signup
    signup_res = client.post("/api/v1/auth/register/student", json={
        "full_name": "Test Student New",
        "username": "newstudent99",
        "email": "newstudent99@smartattend.edu",
        "student_id": "MCA-2026-99",
        "phone": "+91-9999999999",
        "password": "password123"
    })
    assert signup_res.status_code == 200
    user_id = signup_res.json()["id"]

    # 2. Try login before approval -> Should fail
    login_attempt = client.post("/api/v1/auth/login", json={
        "username": "newstudent99",
        "password": "password123"
    })
    assert login_attempt.status_code == 403

    # 3. Admin Login
    admin_login = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    admin_token = admin_login.json()["access_token"]

    # Fetch departments & semesters to assign
    depts = client.get("/api/v1/departments", headers={"Authorization": f"Bearer {admin_token}"}).json()
    sems = client.get(f"/api/v1/semesters?department_id={depts[0]['id']}", headers={"Authorization": f"Bearer {admin_token}"}).json()
    secs = client.get(f"/api/v1/sections?semester_id={sems[0]['id']}", headers={"Authorization": f"Bearer {admin_token}"}).json()

    # 4. Admin Approves Student
    approval_res = client.post(
        f"/api/v1/admin/students/{user_id}/approve",
        json={
            "department_id": depts[0]["id"],
            "semester_id": sems[0]["id"],
            "section_id": secs[0]["id"]
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert approval_res.status_code == 200

    # 5. Now student logs in successfully
    success_login = client.post("/api/v1/auth/login", json={
        "username": "newstudent99",
        "password": "password123"
    })
    assert success_login.status_code == 200

def test_role_access_authorization(client):
    # Student cannot access admin endpoints
    student_login = client.post("/api/v1/auth/login", json={
        "username": "student1",
        "password": "student123"
    })
    s_token = student_login.json()["access_token"]
    res = client.get("/api/v1/admin/dashboard", headers={"Authorization": f"Bearer {s_token}"})
    assert res.status_code == 403
