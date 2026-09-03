from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.config import settings
from app.auth.security import decode_token
from app.models.user import User, UserStatus, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/token", auto_error=False)
http_bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    bearer_auth: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    auth_token = token or (bearer_auth.credentials if bearer_auth else None)
    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(token, settings.SECRET_KEY)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User associated with token not found",
        )
    
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.status == UserStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending administrator approval.",
        )
    if current_user.status in [UserStatus.SUSPENDED, UserStatus.REJECTED]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your account has been {current_user.status.lower()}. Please contact the administrator.",
        )
    return current_user

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of [{', '.join(allowed_roles)}] permissions",
            )
        return current_user
    return role_checker

# Pre-configured role dependencies
require_admin = require_roles([UserRole.ADMIN])
require_teacher = require_roles([UserRole.TEACHER])
require_student = require_roles([UserRole.STUDENT])
require_staff = require_roles([UserRole.ADMIN, UserRole.TEACHER])
require_any_authenticated = Depends(get_current_active_user)
