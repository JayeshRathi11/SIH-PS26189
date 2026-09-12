from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from jose import JWTError, jwt
from backend.db import SessionLocal, User, RevokedToken
from backend.routers.auth import SECRET_KEY, ALGORITHM
from backend.ws_manager import manager

router = APIRouter(prefix="/ws", tags=["Live Sync"])


def _authenticate_ws_token(token: str) -> Optional[User]:
    """
    Mirrors get_current_user()'s JWT validation (blacklist check included
    -- a token an officer logged out of shouldn't be able to open a live
    feed either), but standalone: a native browser WebSocket client can't
    set an Authorization header on the handshake, so the token travels as
    a query param instead and needs its own lookup path rather than the
    header-based OAuth2PasswordBearer dependency the HTTP routes use.
    """
    db = SessionLocal()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        jti = payload.get("jti")
        if not username:
            return None
        if jti and db.query(RevokedToken).filter(RevokedToken.jti == jti).first():
            return None
        return db.query(User).filter(User.username == username).first()
    except JWTError:
        return None
    finally:
        db.close()


@router.websocket("/case")
async def case_live_sync(
    websocket: WebSocket,
    token: str = Query(...),
    domain: Optional[str] = Query(
        None, description="Domain/case key to watch; omit for the All Domains master view"
    ),
):
    """
    Case-level live sync -- pushes an event whenever this domain's (or,
    for domain=None, any domain's) entities/relationships/evidence
    change server-side, so the corkboard/case view can pick it up
    without the officer manually reloading the page. Deliberately scoped
    to case data only (pipeline completion, investigator feedback);
    nothing else in the app is wired to this channel.
    """
    user = _authenticate_ws_token(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, domain)
    try:
        while True:
            # Server -> client only, but we still need to await something
            # to detect a disconnect -- drain and discard anything the
            # client happens to send (e.g. a keepalive ping).
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, domain)
