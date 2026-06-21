def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_search_empty(client):
    response = client.get("/search?q=test")
    assert response.status_code == 200
    assert response.json()["results"] == []


def test_documents_empty(client):
    response = client.get("/documents")
    assert response.status_code == 200
    assert response.json() == []


def test_review_due_empty(client):
    response = client.get("/review/due")
    assert response.status_code == 200
    assert response.json() == []
