import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_auth_login_and_me():
    # 1. Login with investigator credentials
    login_res = client.post("/auth/login", json={"username": "investigator_01", "password": "Investigate#2026"})
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["role"] == "INVESTIGATOR"
    token = token_data["access_token"]

    # 2. Get /auth/me with Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "investigator_01"

def test_rbac_access_control():
    # 1. Login with auditor
    auditor_login = client.post("/auth/login", json={"username": "judicial_auditor", "password": "Audit#Secure2026"})
    assert auditor_login.status_code == 200
    auditor_token = auditor_login.json()["access_token"]
    auditor_headers = {"Authorization": f"Bearer {auditor_token}"}

    # 2. Auditor can read audit logs
    audit_res = client.get("/auth/audit-logs", headers=auditor_headers)
    assert audit_res.status_code == 200

    # 3. Auditor CANNOT submit investigator feedback (restricted by RBAC)
    fb_res = client.post(
        "/graph/feedback",
        json={"target_type": "ENTITY", "target_id": "ENT_TEST", "verdict": "CONFIRMED"},
        headers=auditor_headers
    )
    assert fb_res.status_code == 403

def test_graph_endpoint():
    response = client.get("/graph")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert "total_nodes" in data

def test_centrality_endpoint():
    response = client.get("/graph/centrality")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_suspicious_patterns_endpoint():
    response = client.get("/patterns/suspicious")
    assert response.status_code == 200
    alerts = response.json()
    assert isinstance(alerts, list)
    if len(alerts) > 0:
        assert "pattern_id" in alerts[0]
        assert "risk_score" in alerts[0]

def test_explainable_pathfinding_endpoint():
    response = client.get("/graph/explain?source_id=Devendra Solanki&target_id=Iliyas Khan")
    assert response.status_code == 200
    data = response.json()
    assert "path_found" in data
    assert "source" in data

def test_investigator_feedback_endpoint():
    login_res = client.post("/auth/login", json={"username": "ncrb_admin", "password": "Admin#MHA2026"})
    admin_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    fb_res = client.post(
        "/graph/feedback",
        json={
            "target_type": "ENTITY",
            "target_id": "ENT_HUB_IQBAL_ANSARI",
            "verdict": "CONFIRMED",
            "officer_notes": "Corroborated by Lead Special Operations Officer."
        },
        headers=headers
    )
    assert fb_res.status_code == 200
    assert fb_res.json()["verdict"] == "CONFIRMED"

def test_court_dossier_pdf_generation():
    login_res = client.post("/auth/login", json={"username": "investigator_01", "password": "Investigate#2026"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/dossier/generate",
        json={"entity_id": "ENT_HUB_IQBAL_ANSARI", "officer_notes": "Official judicial court brief"},
        headers=headers
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert len(response.content) > 1000 # Valid binary PDF

def test_documents_endpoint():
    response = client.get("/documents")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_evaluation_endpoint():
    response = client.get("/evaluation")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
