from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.api.teacher import router as teacher_router
from app.api.student import router as student_router
from app.api.academic import router as academic_router
from app.api.timetable import router as timetable_router
from app.api.attendance import router as attendance_router
from app.api.sync import router as sync_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(admin_router)
api_router.include_router(teacher_router)
api_router.include_router(student_router)
api_router.include_router(academic_router)
api_router.include_router(timetable_router)
api_router.include_router(attendance_router)
api_router.include_router(sync_router)
