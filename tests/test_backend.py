import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

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
