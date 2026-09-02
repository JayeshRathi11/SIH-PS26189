import os
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from backend.db import get_db, User, AuditLog, UserRole, verify_password, hash_password, compute_audit_hash, GENESIS_HASH

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY is not set. Add it to your .env file before starting the backend "
        "(never hardcode a JWT signing secret in source)."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

# Login rate limiting. Reuses the LOGIN_FAILED rows log_audit() already
# writes on every bad attempt -- counting recent ones needs no new state
# or storage, and unlike an in-process counter, the lockout survives a
# backend restart since it's read straight from the audit table.
LOGIN_LOCKOUT_WINDOW_MINUTES = 15
LOGIN_MAX_ATTEMPTS_PER_ACCOUNT = 5   # per username, regardless of source IP
LOGIN_MAX_ATTEMPTS_PER_IP = 20       # per IP, regardless of which username(s) it tried

def _recent_failed_logins(db: Session, username: str = None, ip_address: str = None) -> int:
    cutoff = datetime.utcnow() - timedelta(minutes=LOGIN_LOCKOUT_WINDOW_MINUTES)
    q = db.query(AuditLog).filter(AuditLog.action == "LOGIN_FAILED", AuditLog.timestamp >= cutoff)
    if username:
        q = q.filter(AuditLog.username == username)
    if ip_address:
        q = q.filter(AuditLog.ip_address == ip_address)
    return q.count()

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
              ip_address: str = None, status: str = "SUCCESS", content_hash: str = None):
    """
    Logs security and investigative audit trails -- and, since this is the
    single choke point every audit entry passes through, this is also
    where the tamper-evident hash chain is extended: each new row links
    to the previous one via prev_hash/entry_hash (see compute_audit_hash
    in backend/db.py). content_hash lets a caller attach the SHA-256 of a
    specific artifact this entry concerns (an uploaded document, an
    exported dossier PDF) so it's baked into that entry's hash too.
    """
    try:
        # Chain from whichever row was chronologically last. Ordering by
        # timestamp is good enough at hackathon/demo scale (datetime.
        # utcnow() has microsecond resolution and this app isn't under
        # heavy concurrent write load) -- a production hardening pass
        # would instead chain off a DB-generated monotonic sequence
        # number under a row lock, to remove any ambiguity under
        # concurrent writers.
        last_entry = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).first()
        prev_hash = last_entry.entry_hash if (last_entry and last_entry.entry_hash) else GENESIS_HASH
        entry_timestamp = datetime.utcnow()
        entry_hash = compute_audit_hash(
            prev_hash, entry_timestamp, user_id, username, action,
            resource_type, resource_id, details, status, content_hash
        )
        log = AuditLog(
            user_id=user_id,
            username=username,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            status=status,
            content_hash=content_hash,
            prev_hash=prev_hash,
            entry_hash=entry_hash,
            timestamp=entry_timestamp
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
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Check the lockout before ever touching the password hash -- both
    # per-account (repeated guesses at one username) and per-IP (one
    # source spraying many usernames), each against its own threshold.
    account_failures = _recent_failed_logins(db, username=login_req.username)
    ip_failures = _recent_failed_logins(db, ip_address=client_ip)
    if account_failures >= LOGIN_MAX_ATTEMPTS_PER_ACCOUNT or ip_failures >= LOGIN_MAX_ATTEMPTS_PER_IP:
        log_audit(
            db, action="LOGIN_BLOCKED", username=login_req.username, ip_address=client_ip, status="BLOCKED",
            details=f"account_failures={account_failures}, ip_failures={ip_failures}"
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Try again in {LOGIN_LOCKOUT_WINDOW_MINUTES} minutes.",
        )

    user = db.query(User).filter(User.username == login_req.username).first()

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
