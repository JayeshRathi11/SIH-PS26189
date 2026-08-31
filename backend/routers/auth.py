import os
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from backend.db import get_db, User, AuditLog, UserRole, verify_password, hash_password

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY is not set. Add it to your .env file before starting the backend "
        "(never hardcode a JWT signing secret in source)."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    username: str
    role: str
    full_name: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: str
    username: str
    role: str
    full_name: Optional[str] = None
    created_at: datetime

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def log_audit(db: Session, action: str, username: str = None, user_id: str = None,
              resource_type: str = None, resource_id: str = None, details: str = None,
              ip_address: str = None, status: str = "SUCCESS"):
    """Helper to log security and investigative audit trails."""
    try:
        log = AuditLog(
            user_id=user_id,
            username=username,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            status=status
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"[AuditLog Error]: {e}")

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def require_role(allowed_roles: List[str]):
    """Decorator / dependency enforcing RBAC role checks."""
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles and current_user.role != UserRole.OFFICER_IN_CHARGE.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Requires one of roles {allowed_roles}. Current role: '{current_user.role}'"
            )
        return current_user
    return role_checker

@router.post("/login", response_model=TokenResponse)
def login(login_req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_req.username).first()
    client_ip = request.client.host if request.client else "127.0.0.1"

    if not user or not verify_password(login_req.password, user.hashed_password):
        log_audit(db, action="LOGIN_FAILED", username=login_req.username, ip_address=client_ip, status="FAILED")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "user_id": user.id}
    )

    log_audit(db, action="LOGIN_SUCCESS", username=user.username, user_id=user.id, ip_address=client_ip, status="SUCCESS")

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
        username=user.username,
        role=user.role,
        full_name=user.full_name
    )

@router.get("/me", response_model=UserProfileResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserProfileResponse(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role,
        full_name=current_user.full_name,
        created_at=current_user.created_at
    )

@router.get("/audit-logs")
def get_audit_logs(limit: int = 50, current_user: User = Depends(require_role([UserRole.OFFICER_IN_CHARGE.value, UserRole.AUDITOR.value])), db: Session = Depends(get_db)):
    """Allows Officer-in-Charge and Auditors to review system audit trail."""
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return logs
