import asyncio
import json
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import WebSocket


class CaseUpdateManager:
    """
    Broadcasts case-level graph/evidence change events to connected
    frontend clients over WebSocket, keyed by domain (the same "domain"
    string used everywhere else as the case identifier -- see
    CASE_TO_DOMAIN_MAP in the frontend). Clients watching one specific
    domain get only that domain's events; clients watching domain=None
    (the "All Domains" master view) get every domain's events too, since
    the master view aggregates all of them.

    Pipeline jobs run inside FastAPI BackgroundTasks, which execute on a
    worker thread, not the asyncio event loop that owns these WebSocket
    connections -- so sync code can't just `await` a broadcast directly.
    The event loop reference captured at startup lets broadcast() hand
    the send off to that loop safely via run_coroutine_threadsafe,
    regardless of what thread it's called from.
    """

    def __init__(self):
        self._connections: Dict[Optional[str], List[WebSocket]] = {}
        self.loop: Optional[asyncio.AbstractEventLoop] = None

    async def connect(self, websocket: WebSocket, domain: Optional[str]):
        await websocket.accept()
        self._connections.setdefault(domain, []).append(websocket)

    def disconnect(self, websocket: WebSocket, domain: Optional[str]):
        conns = self._connections.get(domain)
        if conns and websocket in conns:
            conns.remove(websocket)
            if not conns:
                self._connections.pop(domain, None)

    async def _broadcast(self, domain: Optional[str], event: dict):
        targets = list(self._connections.get(domain, []))
        if domain is not None:
            targets += list(self._connections.get(None, []))
        if not targets:
            return
        payload = json.dumps(event)
        stale = []
        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception:
                stale.append(ws)
        for ws in stale:
            for bucket in list(self._connections.values()):
                if ws in bucket:
                    bucket.remove(ws)

    def broadcast(self, domain: Optional[str], event_type: str, **fields):
        """
        Sync-safe entry point -- call this from a normal request handler
        or a BackgroundTasks function alike. No-ops quietly if the event
        loop isn't up yet (e.g. very early startup) or nobody's listening.
        """
        if self.loop is None or not self.loop.is_running():
            return
        event = {
            "type": event_type,
            "domain": domain,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            **fields,
        }
        asyncio.run_coroutine_threadsafe(self._broadcast(domain, event), self.loop)


manager = CaseUpdateManager()
